import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const eslintBin = fileURLToPath(
  new URL('../node_modules/eslint/bin/eslint.js', import.meta.url),
)
const requestedFiles = process.argv.slice(2)
const eslintArguments =
  requestedFiles.length > 0
    ? requestedFiles
    : ['.', '--ignore-pattern', 'tests/architecture/fixtures/**']

const result = spawnSync(process.execPath, [eslintBin, ...eslintArguments], {
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

process.exitCode = result.status ?? 1
