import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dependabot pull request policy', () => {
  it('keeps automatic dependency PR creation disabled for npm and GitHub Actions', () => {
    const text = readFileSync(resolve(process.cwd(), '.github/dependabot.yml'), 'utf8');
    const limits = [...text.matchAll(/open-pull-requests-limit:\s*(\d+)/g)].map((match) => Number(match[1]));

    expect(limits).toHaveLength(2);
    expect(limits).toEqual([0, 0]);
  });
});
