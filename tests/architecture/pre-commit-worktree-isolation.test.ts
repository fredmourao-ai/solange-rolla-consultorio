import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function makeExecutable(file: string) {
  try {
    chmodSync(file, 0o755)
  } catch {
    // Windows may ignore POSIX mode bits.
  }
}

describe('pre-commit worktree isolation', () => {
  it('does not leak the parent worktree Git context into nested repositories', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'precommit-worktree-'))
    const repo = path.join(root, 'repo')
    const worktree = path.join(root, 'worktree')
    mkdirSync(repo)
    try {
      git(repo, ['init', '--quiet'])
      git(repo, ['config', 'user.email', 'outer@example.test'])
      git(repo, ['config', 'user.name', 'Outer Test'])
      writeFileSync(path.join(repo, 'base.txt'), 'base\n')
      git(repo, ['add', 'base.txt'])
      git(repo, ['commit', '--quiet', '-m', 'base'])
      git(repo, ['worktree', 'add', '--quiet', '-b', 'feature', worktree])

      const hooks = path.join(worktree, '.githooks')
      const scripts = path.join(worktree, 'scripts')
      mkdirSync(hooks)
      mkdirSync(scripts)
      const hook = path.join(hooks, 'pre-commit')
      copyFileSync(path.join(projectRoot, '.githooks/pre-commit'), hook)
      makeExecutable(hook)
      const validator = path.join(scripts, 'repository-governance-validate.sh')
      const validatorBody = [
        '#!/usr/bin/env bash',
        'set -Eeuo pipefail',
        'nested="$(mktemp -d)"',
        `trap 'rm -rf "$nested"' EXIT`,
        'cd "$nested"',
        'git init --quiet',
        'git config user.email nested@example.test',
        "git config user.name 'Nested Test'",
        'echo nested > nested.txt',
        'git add nested.txt',
        'git commit --quiet -m nested',
        '',
      ].join('\n')
      writeFileSync(validator, validatorBody)
      makeExecutable(validator)
      git(worktree, ['config', 'core.hooksPath', '.githooks'])

      writeFileSync(path.join(worktree, 'feature.txt'), 'feature\n')
      git(worktree, ['add', 'feature.txt'])
      const result = spawnSync('git', ['commit', '--quiet', '-m', 'feature'], {
        cwd: worktree,
        encoding: 'utf8',
      })

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(git(worktree, ['log', '-1', '--pretty=%s'])).toBe('feature')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
