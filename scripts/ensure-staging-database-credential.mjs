#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_ROOT = '/home/ubuntu/solange-client-demo'
const MIN_PASSWORD_LENGTH = 40

function credentialPath(root = process.env.STAGING_DEPLOY_ROOT || DEFAULT_ROOT) {
  return process.env.STAGING_DB_PASSWORD_FILE || join(root, 'state', 'managed-db-password')
}

async function readExisting(path) {
  try {
    const info = await stat(path)
    if (!info.isFile()) return null
    const value = (await readFile(path, 'utf8')).trim()
    if (value.length < MIN_PASSWORD_LENGTH) return null
    if ((info.mode & 0o777) !== 0o600) await chmod(path, 0o600)
    return value
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null
    throw error
  }
}

function generatePassword() {
  return `${randomBytes(36).toString('base64url')}_Aa1`
}

async function rotateDatabasePassword({ token, projectRef, password, fetchImpl = fetch }) {
  const response = await fetchImpl(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/database/password`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    },
  )
  if (!response.ok) throw new Error(`STAGING_DB_PASSWORD_ROTATION_FAILED:${response.status}`)
}

async function persistCredential(path, password) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temp = `${path}.partial-${process.pid}`
  await writeFile(temp, `${password}\n`, { mode: 0o600 })
  await chmod(temp, 0o600)
  await rename(temp, path)
  await chmod(path, 0o600)
}

export async function ensureStagingDatabaseCredential({
  root = process.env.STAGING_DEPLOY_ROOT || DEFAULT_ROOT,
  token = process.env.SUPABASE_ACCESS_TOKEN || '',
  projectRef = process.env.SUPABASE_STAGING_PROJECT_REF || '',
  forceRotate = false,
  fetchImpl = fetch,
} = {}) {
  const path = credentialPath(root)
  if (!forceRotate) {
    const existing = await readExisting(path)
    if (existing) return { path, source: 'existing' }
  }
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED')
  if (!projectRef) throw new Error('SUPABASE_STAGING_PROJECT_REF_REQUIRED')
  const password = generatePassword()
  await rotateDatabasePassword({ token, projectRef, password, fetchImpl })
  await persistCredential(path, password)
  return { path, source: 'rotated' }
}

async function main() {
  const forceRotate = process.argv.includes('--rotate')
  const result = await ensureStagingDatabaseCredential({ forceRotate })
  console.log(`staging_database_credential_ready source=${result.source}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    console.error(`staging_database_credential_failed reason=${message}`)
    process.exitCode = 1
  })
}
