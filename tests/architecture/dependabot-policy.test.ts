import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '../..')

describe('Dependabot pull request policy', () => {
  it('does not open automated pull requests for npm or GitHub Actions', () => {
    const text = fs.readFileSync(path.join(root, '.github/dependabot.yml'), 'utf8')
    const limits = [...text.matchAll(/open-pull-requests-limit:\s*(\d+)/g)].map((match) => Number(match[1]))
    expect(limits).toHaveLength(2)
    expect(limits).toEqual([0, 0])
  })
})
