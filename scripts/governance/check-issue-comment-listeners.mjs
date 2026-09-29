#!/usr/bin/env node
// Governance guard: at most one active GitHub Actions workflow may declare a
// direct top-level `issue_comment` trigger. Direct `issue_comment` listeners
// react to arbitrary comment text on issues/PRs; more than one active
// listener in the same repository makes it impossible to reason about which
// workflow owns comment-triggered automation (duplicate runs, race
// conditions on comment-driven commands, etc.).
//
// Usage:
//   node scripts/governance/check-issue-comment-listeners.mjs [workflowsDir]
//
// Exit code: 0 when 0 or 1 direct issue_comment listeners are found,
// 1 when 2 or more are found (or a workflow file fails to parse).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const loadYaml = /** @type {{ load: (content: string) => unknown }} */ (require('js-yaml')).load

const DISABLED_SUFFIX = '.disabled'
const SKIPPED_DIR_NAMES = new Set(['archive', 'historical'])

/**
 * Recursively lists workflow definition files under `dir`, skipping
 * disabled workflows (renamed with a `.disabled` suffix) and any
 * archive/historical subdirectories that hold retired workflow copies
 * rather than active ones.
 *
 * @param {string} dir
 * @returns {string[]} absolute paths of candidate workflow files
 */
export function listCandidateWorkflowFiles(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files = []
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIPPED_DIR_NAMES.has(entry.name.toLowerCase())) continue
      files.push(...listCandidateWorkflowFiles(entryPath))
      continue
    }
    if (!entry.isFile()) continue
    if (!/\.ya?ml$/u.test(entry.name)) continue
    if (entry.name.endsWith(DISABLED_SUFFIX)) continue
    files.push(entryPath)
  }
  return files
}

/**
 * @param {unknown} parsed
 * @returns {boolean} true when the workflow's `on:` config declares
 * `issue_comment` as a direct top-level trigger key/entry.
 */
function declaresDirectIssueCommentTrigger(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false
  const triggerConfig = /** @type {Record<string, unknown>} */ (parsed).on

  if (triggerConfig === 'issue_comment') return true
  if (Array.isArray(triggerConfig)) return triggerConfig.includes('issue_comment')
  if (triggerConfig && typeof triggerConfig === 'object') {
    return Object.prototype.hasOwnProperty.call(triggerConfig, 'issue_comment')
  }
  return false
}

/**
 * @typedef {{ file: string }} IssueCommentListener
 */

/**
 * Scans every candidate workflow file under `workflowsDir` and returns the
 * ones that declare a direct top-level `issue_comment` trigger.
 *
 * @param {string} workflowsDir
 * @returns {IssueCommentListener[]}
 */
export function findDirectIssueCommentListeners(workflowsDir) {
  const listeners = []
  for (const file of listCandidateWorkflowFiles(workflowsDir)) {
    const content = readFileSync(file, 'utf8')
    let parsed
    try {
      parsed = loadYaml(content)
    } catch (error) {
      throw new Error(`Failed to parse workflow YAML at ${file}: ${/** @type {Error} */ (error).message}`)
    }
    if (declaresDirectIssueCommentTrigger(parsed)) {
      listeners.push({ file })
    }
  }
  return listeners.sort((a, b) => a.file.localeCompare(b.file))
}

function isMain() {
  try {
    return statSync(process.argv[1] ?? '').isFile() && import.meta.url === `file://${path.resolve(process.argv[1])}`
  } catch {
    return false
  }
}

if (isMain()) {
  const workflowsDir = path.resolve(process.argv[2] ?? path.join(fileURLToPath(new URL('../../', import.meta.url)), '.github/workflows'))
  const listeners = findDirectIssueCommentListeners(workflowsDir)
  const relative = (file) => path.relative(process.cwd(), file)

  console.log(`Direct issue_comment listeners found: ${listeners.length}`)
  for (const listener of listeners) {
    console.log(`  - ${relative(listener.file)}`)
  }

  if (listeners.length > 1) {
    console.error(
      `BLOCKED: ${listeners.length} active workflows declare a direct issue_comment trigger; at most 1 is allowed.`,
    )
    process.exit(1)
  }

  process.exit(0)
}
