import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('.github/dependabot.yml', 'utf8');

describe('dependabot pull request policy', () => {
  it('keeps automatic dependency PR creation disabled for every ecosystem', () => {
    const limits = [...text.matchAll(/open-pull-requests-limit:\s*(\d+)/g)].map((match) => Number(match[1]));
    expect(limits.length).toBe(2);
    expect(limits).toEqual([0, 0]);
  });
});
