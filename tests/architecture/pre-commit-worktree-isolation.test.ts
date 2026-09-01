import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
const isolatedGitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: '1',
}

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', env: isolatedGitEnv }).trim()
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

      writeFileSync(path.join(worktree, 'feature.txt'), 'feature\n')
      git(worktree, ['add', 'feature.txt'])
      const result = spawnSync(
        'git',
        ['-c', 'core.hooksPath=.githooks', 'commit', '--quiet', '-m', 'feature'],
        {
          cwd: worktree,
          encoding: 'utf8',
          env: isolatedGitEnv,
        },
      )

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(git(worktree, ['log', '-1', '--pretty=%s'])).toBe('feature')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('preserves the temporary staged index used by partial commits', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'precommit-partial-index-'))
    const repo = path.join(root, 'repo')
    mkdirSync(repo)
    try {
      git(repo, ['init', '--quiet'])
      git(repo, ['config', 'user.email', 'outer@example.test'])
      git(repo, ['config', 'user.name', 'Outer Test'])
      writeFileSync(path.join(repo, 'selected.txt'), 'base\n')
      writeFileSync(path.join(repo, 'other.txt'), 'base\n')
      git(repo, ['add', '.'])
      git(repo, ['commit', '--quiet', '-m', 'base'])
      git(repo, ['checkout', '--quiet', '-b', 'feature'])

      const hooks = path.join(repo, '.githooks')
      const scripts = path.join(repo, 'scripts')
      mkdirSync(hooks)
      mkdirSync(scripts)
      const hook = path.join(hooks, 'pre-commit')
      copyFileSync(path.join(projectRoot, '.githooks/pre-commit'), hook)
      makeExecutable(hook)
      const validator = path.join(scripts, 'repository-governance-validate.sh')
      const observed = path.join(repo, 'observed-index.txt')
      const validatorBody = [
        '#!/usr/bin/env bash',
        'set -Eeuo pipefail',
        `GIT_INDEX_FILE="$SOLANGE_GIT_INDEX_FILE" git diff --cached --name-only > ${JSON.stringify(observed)}`,
        '',
      ].join('\n')
      writeFileSync(validator, validatorBody)
      makeExecutable(validator)

      writeFileSync(path.join(repo, 'selected.txt'), 'selected\n')
      writeFileSync(path.join(repo, 'other.txt'), 'other\n')
      git(repo, ['add', 'selected.txt', 'other.txt'])
      const result = spawnSync(
        'git',
        ['-c', 'core.hooksPath=.githooks', 'commit', '--quiet', '--only', 'selected.txt', '-m', 'partial'],
        {
          cwd: repo,
          encoding: 'utf8',
          env: isolatedGitEnv,
        },
      )

      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      expect(execFileSync('git', ['show', '--pretty=', '--name-only', 'HEAD'], { cwd: repo, encoding: 'utf8', env: isolatedGitEnv }).trim()).toBe('selected.txt')
      expect(execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: repo, encoding: 'utf8', env: isolatedGitEnv }).trim()).toBe('other.txt')
      expect(execFileSync(process.execPath, ['-e', `process.stdout.write(require('node:fs').readFileSync(${JSON.stringify(observed)}, 'utf8'))`], { encoding: 'utf8' }).trim()).toBe('selected.txt')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
