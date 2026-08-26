import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const seedPath = path.join(root, 'supabase/seed.sql')
const manifestPath = path.join(root, 'tests/fixtures/seed-manifest.json')
const seed = fs.readFileSync(seedPath, 'utf8')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const errors = []

for (const pattern of manifest.forbiddenPatterns ?? []) {
  if (seed.includes(pattern)) errors.push(`forbidden seed pattern: ${pattern}`)
}

const emailLiterals = seed.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []
for (const email of emailLiterals) {
  const domain = email.split('@').at(-1)?.toLowerCase()
  if (!manifest.allowedEmailDomains.includes(domain)) {
    errors.push(`non-synthetic email domain: ${domain}`)
  }
}

const phoneLiterals = seed.match(/\+\d{8,15}/g) ?? []
for (const phone of phoneLiterals) {
  if (!manifest.syntheticPhonePrefixes.some((prefix) => phone.startsWith(prefix))) {
    errors.push(`phone is outside the synthetic namespace: ${phone}`)
  }
}

if (manifest.status === 'bootstrap-empty' && seed.split('\n').some((line) => line.trim() && !line.trim().startsWith('--'))) {
  errors.push('bootstrap-empty seed must contain comments only until domain tables exist')
}

if (errors.length) {
  process.stderr.write(`synthetic seed verification failed:\n- ${errors.join('\n- ')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write('synthetic seed verification passed\n')
}
