import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const workflow = readFileSync(path.join(process.cwd(), '.github/workflows/staging-promote.yml'), 'utf8')
const workers = [
  'ops/document-worker/Dockerfile',
  'ops/messaging-worker/Dockerfile',
  'ops/recurring-payables-worker/Dockerfile',
].map((file) => readFileSync(path.join(process.cwd(), file), 'utf8'))

describe('staging Node runtime pin', () => {
  it('uses the exact supported Node patch for web build/runtime and workers', () => {
    expect(workflow).not.toContain('node:24-bookworm-slim')
    expect(workflow.match(/node:24\.19\.0-bookworm-slim/g)?.length).toBeGreaterThanOrEqual(3)
    for (const dockerfile of workers) {
      expect(dockerfile).toContain('FROM node:24.19.0-bookworm-slim')
    }
  })
})
