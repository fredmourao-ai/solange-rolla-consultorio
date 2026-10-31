import { createHash, createHmac } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('../../scripts/host-disk-guard.sh', import.meta.url))
const workflowPath = fileURLToPath(new URL('../../.github/workflows/host-disk-guard.yml', import.meta.url))
const diskGuard = readFileSync(scriptPath, 'utf8')
const workflow = readFileSync(workflowPath, 'utf8')

function runWithStubs(home, diskUsage, dockerExitCode) {
  const bin = path.join(home, 'bin')
  mkdirSync(bin)
  const dfPath = path.join(bin, 'df')
  const dockerPath = path.join(bin, 'docker')
  writeFileSync(dfPath, `#!/bin/sh
echo 'Filesystem 1K-blocks Used Available Use% Mounted on'
echo '/dev/fake 100 90 10 ${diskUsage}% /'
`)
  writeFileSync(dockerPath, `#!/bin/sh
exit ${dockerExitCode}
`)
  chmodSync(dfPath, 0o755)
  chmodSync(dockerPath, 0o755)
  return spawnSync('bash', [scriptPath], {
    encoding: 'utf8',
    env: {
      HOME: home,
      PATH: `${bin}:${process.env.PATH ?? '/usr/bin:/bin'}`,
      EXECUTION_PROVENANCE_HMAC_KEY: 'unit-test-key-never-production',
      EXECUTION_PROVENANCE_KEY_ID: 'unit-test-key-v1',
    },
  })
}

function verifyRecord(record, key) {
  const payload = [
    `execution_id=${record.execution_id}`,
    `origin_type=${record.origin_type}`,
    `origin_ref=${record.origin_ref}`,
    `actor=${record.actor}`,
    `repo=${record.repository}`,
    `ref=${record.ref}`,
    `sha=${record.sha}`,
    `host=${record.host}`,
    'action=host_disk_guard',
    `result=${record.result}`,
    `exit_code=${record.exit_code}`,
    `disk_before=${record.disk_before}`,
    `disk_after=${record.disk_after}`,
    `cache_actions=${record.cache_actions}`,
    `started_utc=${record.started_utc}`,
    `timestamp_utc=${record.timestamp_utc}`,
  ].join('|')
  expect(record.payload_sha256).toBe(createHash('sha256').update(payload).digest('hex'))
  expect(record.signature).toBe(createHmac('sha256', key).update(payload).digest('hex'))
}

describe('host disk guard safety', () => {
  it('does not delete Docker volumes without explicit ownership provenance', () => {
    expect(diskGuard).not.toMatch(/docker\s+volume\s+(?:rm|prune)\b/u)
    expect(diskGuard).not.toContain('removed_anonymous_volumes')
  })

  it('requires externally provisioned signing material before cleanup', () => {
    expect(diskGuard).not.toContain('openssl rand -hex 32')
    const keyGate = diskGuard.indexOf('EXECUTION_PROVENANCE_HMAC_KEY')
    const firstCleanup = diskGuard.indexOf('rm -rf --')
    expect(keyGate).toBeGreaterThanOrEqual(0)
    expect(keyGate).toBeLessThan(firstCleanup)
    expect(diskGuard).toContain('EXECUTION_PROVENANCE_KEY_ID')
  })

  it('does not create host state or clean up without signing material', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'disk-guard-no-key-'))
    try {
      const result = spawnSync('bash', [scriptPath], {
        encoding: 'utf8',
        env: { HOME: home, PATH: process.env.PATH ?? '/usr/bin:/bin' },
      })
      expect(result.status).toBe(78)
      expect(readdirSync(home)).toEqual([])
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('persists independently verifiable STARTED and COMPLETED records before and after work', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'disk-guard-success-'))
    const key = 'unit-test-key-never-production'
    try {
      const result = runWithStubs(home, 50, 0)
      expect(result.status, result.stderr).toBe(0)
      const logPath = path.join(home, '.local/state/shopvivaliz/execution-provenance.jsonl')
      const records = readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
      expect(records.map((record) => record.result)).toEqual(['STARTED', 'COMPLETED'])
      records.forEach((record) => verifyRecord(record, key))
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('persists a signed FAILED record if cleanup exits unsuccessfully', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'disk-guard-failure-'))
    const key = 'unit-test-key-never-production'
    try {
      const result = runWithStubs(home, 90, 23)
      expect(result.status).toBe(23)
      const logPath = path.join(home, '.local/state/shopvivaliz/execution-provenance.jsonl')
      const records = readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
      expect(records.map((record) => record.result)).toEqual(['STARTED', 'FAILED'])
      records.forEach((record) => verifyRecord(record, key))
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('keeps host cleanup manual and behind the staging environment gate', () => {
    expect(workflow).not.toContain('schedule:')
    expect(workflow).toContain('environment: staging')
    expect(workflow).toContain('secrets.EXECUTION_PROVENANCE_HMAC_KEY')
    expect(workflow).toContain('vars.EXECUTION_PROVENANCE_KEY_ID')
  })
})
