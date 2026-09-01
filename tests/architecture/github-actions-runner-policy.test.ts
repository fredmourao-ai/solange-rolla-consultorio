import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const workflowsDir = fileURLToPath(new URL('../../.github/workflows/', import.meta.url))
const runnerLine = 'runs-on: [self-hosted, Linux, ARM64, solange-ci]'
const sameRepoGuard = 'github.event.pull_request.head.repo.full_name == github.repository'

function workflows(): Array<{ name: string; content: string }> {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => ({
      name,
      content: readFileSync(path.join(workflowsDir, name), 'utf8'),
    }))
}

function jobLevelCondition(lines: string[]): string {
  const ifIndex = lines.findIndex((line) => /^    if:\s*/u.test(line))
  if (ifIndex === -1) return ''

  const inline = lines[ifIndex]?.replace(/^    if:\s*/u, '') ?? ''
  if (!/^[>|][+-]?\s*$/u.test(inline)) return inline

  const continuations: string[] = []
  for (const line of lines.slice(ifIndex + 1)) {
    if (/^    \S/u.test(line)) break
    if (/^\s{6,}\S/u.test(line)) continuations.push(line.trim())
  }
  return continuations.join(' ')
}

function runnerJobs(content: string): Array<{ name: string; block: string; condition: string }> {
  const lines = content.split(/\r?\n/u)
  const jobsStart = lines.findIndex((line) => /^jobs:\s*$/u.test(line))
  if (jobsStart === -1) return []

  const jobs: Array<{ name: string; block: string; condition: string }> = []
  let currentName: string | undefined
  let currentLines: string[] = []

  function flush() {
    if (currentName && currentLines.some((line) => line.trim() === runnerLine)) {
      jobs.push({
        name: currentName,
        block: currentLines.join('\n'),
        condition: jobLevelCondition(currentLines),
      })
    }
  }

  for (const line of lines.slice(jobsStart + 1)) {
    if (/^\S/u.test(line) && line.trim() !== '' && !line.startsWith('#')) break

    const job = line.match(/^  ([A-Za-z_][A-Za-z0-9_-]*):\s*$/u)
    if (job) {
      flush()
      currentName = job[1]
      currentLines = [line]
      continue
    }
    if (currentName) currentLines.push(line)
  }
  flush()
  return jobs
}

function yamlIndent(line: string): number {
  return line.length - line.trimStart().length
}

function stripYamlComment(value: string): string {
  let quote = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote === "'") {
      if (char === "'" && value[index + 1] === "'") {
        index += 1
        continue
      }
      if (char === "'") quote = ''
      continue
    }
    if (quote === '"') {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === '"') quote = ''
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === '#') return value.slice(0, index).trimEnd()
  }
  return value
}

function flowCollectionDepth(value: string): number {
  let depth = 0
  let quote = ''
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote === "'") {
      if (char === "'" && value[index + 1] === "'") {
        index += 1
        continue
      }
      if (char === "'") quote = ''
      continue
    }
    if (quote === '"') {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === '"') quote = ''
      continue
    }
    if (char === "'" || char === '"') {
      quote = char
      continue
    }
    if (char === '{' || char === '[') depth += 1
    if (char === '}' || char === ']') depth -= 1
  }
  return depth
}

function hasPullRequestTrigger(content: string): boolean {
  const lines = content.split(/\r?\n/u)
  const onIndex = lines.findIndex((line) => /^(?:on|"on"|'on')\s*:\s*/u.test(line))
  if (onIndex === -1) return false

  const inline = stripYamlComment(
    lines[onIndex]?.replace(/^(?:on|"on"|'on')\s*:\s*/u, '') ?? '',
  ).trim()
  const triggerToken = /(?:^|[\s,\[{])["']?pull_request["']?(?=\s*(?::|[,}\]]|$))/u

  if (inline.startsWith('{') || inline.startsWith('[')) {
    const flowLines = [inline]
    let depth = flowCollectionDepth(inline)
    for (const line of lines.slice(onIndex + 1)) {
      if (depth <= 0) break
      const stripped = stripYamlComment(line.trim()).trim()
      if (!stripped) continue
      flowLines.push(stripped)
      depth += flowCollectionDepth(stripped)
    }
    return triggerToken.test(flowLines.join(' '))
  }

  if (inline) return triggerToken.test(inline)

  const childLines: string[] = []
  for (const line of lines.slice(onIndex + 1)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (yamlIndent(line) === 0) break
    childLines.push(line)
  }

  const candidates = childLines.filter((line) => {
    const stripped = stripYamlComment(line.trim()).trim()
    return stripped && !stripped.startsWith('#')
  })
  if (candidates.length === 0) return false
  const minimumIndent = Math.min(...candidates.map(yamlIndent))
  return candidates
    .filter((line) => yamlIndent(line) === minimumIndent)
    .some((line) =>
      /^(?:-\s*)?["']?pull_request["']?(?:\s*:|\s*$)/u.test(
        stripYamlComment(line.trim()).trim(),
      ),
    )
}

function splitTopLevel(expression: string, operator: '&&' | '||'): string[] {
  const parts: string[] = []
  let start = 0
  let depth = 0
  let inString = false

  for (let index = 0; index < expression.length; index += 1) {
    const char = expression[index]
    if (inString) {
      if (char === "'" && expression[index + 1] === "'") {
        index += 1
        continue
      }
      if (char === "'") inString = false
      continue
    }
    if (char === "'") {
      inString = true
      continue
    }
    if (char === '(') {
      depth += 1
      continue
    }
    if (char === ')') {
      depth -= 1
      continue
    }
    if (depth === 0 && expression.startsWith(operator, index)) {
      parts.push(expression.slice(start, index).trim())
      index += operator.length - 1
      start = index + 1
    }
  }
  parts.push(expression.slice(start).trim())
  return parts
}

function stripOuterParens(expression: string): string {
  let current = expression.trim()
  for (;;) {
    if (!current.startsWith('(') || !current.endsWith(')')) return current

    let depth = 0
    let inString = false
    let enclosesWholeExpression = true
    for (let index = 0; index < current.length; index += 1) {
      const char = current[index]
      if (inString) {
        if (char === "'" && current[index + 1] === "'") {
          index += 1
          continue
        }
        if (char === "'") inString = false
        continue
      }
      if (char === "'") {
        inString = true
        continue
      }
      if (char === '(') depth += 1
      if (char === ')') {
        depth -= 1
        if (depth === 0 && index !== current.length - 1) {
          enclosesWholeExpression = false
          break
        }
      }
    }

    if (!enclosesWholeExpression || depth !== 0) return current
    current = current.slice(1, -1).trim()
  }
}

function branchRequiresPositiveSameRepoGuard(expression: string): boolean {
  const normalized = stripOuterParens(expression)
  return splitTopLevel(normalized, '&&').some(
    (conjunct) => stripOuterParens(conjunct) === sameRepoGuard,
  )
}

function conditionRequiresSameRepoOnPullRequest(condition: string): boolean {
  const normalized = condition
    .replace(/^\$\{\{\s*/u, '')
    .replace(/\s*\}\}$/u, '')
    .replace(/\s+/gu, ' ')
    .trim()

  const branches = splitTopLevel(stripOuterParens(normalized), '||')
  if (branches.length === 1) return branchRequiresPositiveSameRepoGuard(branches[0] ?? '')
  if (branches.length !== 2) return false
  if (stripOuterParens(branches[0] ?? '') !== "github.event_name != 'pull_request'") return false
  return branchRequiresPositiveSameRepoGuard(branches[1] ?? '')
}

describe('GitHub Actions runner policy', () => {
  it('routes every workflow job through the Solange self-hosted runner', () => {
    for (const workflow of workflows()) {
      const runsOnLines = workflow.content.match(/^\s*runs-on:.*$/gmu) ?? []
      for (const line of runsOnLines) {
        expect(line.trim(), `${workflow.name}: ${line.trim()}`).toBe(runnerLine)
      }
    }
  })

  it('guards every pull-request runner job at job level', () => {
    for (const workflow of workflows()) {
      if (!hasPullRequestTrigger(workflow.content)) continue

      for (const job of runnerJobs(workflow.content)) {
        expect(conditionRequiresSameRepoOnPullRequest(job.condition), `${workflow.name}:${job.name}`).toBe(true)
      }
    }
  })

  it('rejects a same-repository guard that can be bypassed by an OR branch', () => {
    const workflow = [
      'jobs:',
      '  exposed:',
      '    if: ${{ ' + sameRepoGuard + " || github.event_name == 'pull_request' }}",
      `    ${runnerLine}`,
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(conditionRequiresSameRepoOnPullRequest(job?.condition ?? '')).toBe(false)
  })

  it('rejects negated or comparison forms of the same-repository predicate', () => {
    expect(conditionRequiresSameRepoOnPullRequest(`!${sameRepoGuard}`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`${sameRepoGuard} == false`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`!(${sameRepoGuard})`)).toBe(false)
    expect(conditionRequiresSameRepoOnPullRequest(`(${sameRepoGuard}) == false`)).toBe(false)
  })

  it('rejects false comparisons around compound guarded groups', () => {
    expect(
      conditionRequiresSameRepoOnPullRequest(
        `github.event_name != 'pull_request' || (${sameRepoGuard} && true) == false`,
      ),
    ).toBe(false)
  })

  it('rejects OR bypasses after a backslash inside an expression string', () => {
    expect(conditionRequiresSameRepoOnPullRequest(`${sameRepoGuard} && 'x\\' || true`)).toBe(false)
  })

  it('recognizes inline and quoted pull-request trigger syntax', () => {
    expect(hasPullRequestTrigger('on: [push, pull_request]\n')).toBe(true)
    expect(hasPullRequestTrigger('"on":\n  "pull_request":\n')).toBe(true)
    expect(hasPullRequestTrigger("'on':\n  - 'pull_request'\n")).toBe(true)
    expect(hasPullRequestTrigger('on: {pull_request: {}, push: {}}\n')).toBe(true)
  })

  it('recognizes commented pull-request trigger syntax', () => {
    expect(hasPullRequestTrigger('on: pull_request # PR checks\n')).toBe(true)
    expect(hasPullRequestTrigger('on:\n  - pull_request # PR checks\n')).toBe(true)
  })

  it('recognizes multiline flow collections regardless of entry indentation', () => {
    expect(hasPullRequestTrigger('on: {\n  pull_request: {},\n  push: {}\n}\n')).toBe(true)
    expect(hasPullRequestTrigger('on: {\npull_request: {},\npush: {}\n}\n')).toBe(true)
    expect(hasPullRequestTrigger('on: [\npull_request,\npush\n]\n')).toBe(true)
  })

  it('recognizes block triggers with arbitrary indentation and key separation', () => {
    expect(hasPullRequestTrigger('on:\n    pull_request:\n')).toBe(true)
    expect(hasPullRequestTrigger('on :\n  pull_request:\n')).toBe(true)
    expect(hasPullRequestTrigger('on:\n  push:\n    branches:\n      - pull_request\n')).toBe(false)
  })

  it('recognizes pull-request triggers after multiline quoted flow values', () => {
    const workflow = [
      'on: {',
      'push: {branches: ["main\\',
      '}"]},',
      'pull_request: {}',
      '}',
    ].join('\n')

    expect(hasPullRequestTrigger(workflow)).toBe(true)
  })

  it('decodes escaped YAML trigger keys', () => {
    expect(hasPullRequestTrigger('on:\n  "pull\\u005frequest": {}\n')).toBe(true)
  })

  it('resolves YAML aliases used as trigger names', () => {
    const workflow = ['concurrency:', '  group: &pr-event pull_request', 'on: [*pr-event]'].join('\n')

    expect(hasPullRequestTrigger(workflow)).toBe(true)
  })

  it('guards pull_request_target workflows as fork-controlled PR events', () => {
    expect(hasPullRequestTrigger('on: pull_request_target\n')).toBe(true)
  })

  it('accepts a folded job-level runner guard', () => {
    const workflow = [
      'jobs:',
      '  guarded:',
      '    if: >-',
      "      github.event_name != 'pull_request' ||",
      `      ${sameRepoGuard}`,
      `    ${runnerLine}`,
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(job?.condition).toContain(sameRepoGuard)
  })

  it('does not let duplicate guards in one job cover an unguarded runner job', () => {
    const workflow = [
      'jobs:',
      '  guarded:',
      '    if: ${{ ' + sameRepoGuard + ' && ' + sameRepoGuard + ' }}',
      `    ${runnerLine}`,
      '  exposed:',
      `    ${runnerLine}`,
    ].join('\n')
    const jobs = runnerJobs(workflow)

    expect(jobs).toHaveLength(2)
    expect(jobs[0]?.condition).toContain(sameRepoGuard)
    expect(jobs[1]?.condition).not.toContain(sameRepoGuard)
  })

  it('does not accept a step-level guard as a job-level runner guard', () => {
    const workflow = [
      'jobs:',
      '  exposed:',
      `    ${runnerLine}`,
      '    steps:',
      '      - if: ${{ ' + sameRepoGuard + ' }}',
      '        run: echo guarded-step',
    ].join('\n')
    const [job] = runnerJobs(workflow)

    expect(job?.block).toContain(sameRepoGuard)
    expect(job?.condition).not.toContain(sameRepoGuard)
  })
})
