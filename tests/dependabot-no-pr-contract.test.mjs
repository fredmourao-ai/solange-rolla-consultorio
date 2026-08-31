import fs from 'node:fs';
import assert from 'node:assert/strict';
const text = fs.readFileSync('.github/dependabot.yml', 'utf8');
const limits = [...text.matchAll(/open-pull-requests-limit:\s*(\d+)/g)].map(m => Number(m[1]));
assert.ok(limits.length >= 2, 'expected limits for npm and github-actions');
assert.ok(limits.every(v => v === 0), `dependabot PR limits must be zero: ${limits.join(',')}`);
console.log('dependabot-no-pr-contract: ok');
