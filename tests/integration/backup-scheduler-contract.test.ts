import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const deploy = path.join(root, 'ops/backup/run-demo-scheduler.sh')
const workflow = path.join(root, '.github/workflows/staging-promote.yml')
const diagnostic = path.join(root, '.github/workflows/diag-staging-host.yml')

describe('durable backup scheduler contract', () => {
  it('deploys the scheduler against the persistent VM backup directory with health monitoring', () => {
    const script = readFileSync(deploy, 'utf8')
    expect(script).toContain('solange-backup-scheduler')
    expect(script).toContain('$DEMO/backups:$DEMO/backups')
    expect(script).toContain('SOLANGE_BACKUP_DEST="$DEMO/backups"')
    expect(script).toContain('SOLANGE_BACKUP_MAX_AGE_SECONDS=90000')
    expect(script).toContain('--health-cmd')
    expect(script).toContain('/check-backup-health.sh')
    expect(script).not.toContain('/mnt/fredwin-backup')
  })

  it('diagnoses the canonical persistent backup destination instead of the retired Fred-Win mount', () => {
    const yaml = readFileSync(diagnostic, 'utf8')
    expect(yaml).toContain('/home/ubuntu/solange-client-demo/backups')
    expect(yaml).toContain('solange-backup-scheduler')
    expect(yaml).not.toContain('/mnt/fredwin-backup')
  })

  it('refreshes the durable scheduler only after staging acceptance succeeds', () => {
    const yaml = readFileSync(workflow, 'utf8')
    const acceptance = yaml.indexOf('Real UI staging homologation')
    const scheduler = yaml.indexOf('Refresh durable backup scheduler')
    const rollback = yaml.indexOf('Rollback staging release after failed validation')
    expect(scheduler).toBeGreaterThan(acceptance)
    expect(scheduler).toBeLessThan(rollback)
    expect(yaml).toContain('ops/backup/run-demo-scheduler.sh')
  })
})
