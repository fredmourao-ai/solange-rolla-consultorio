import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const migrationNamePattern = /^(?<timestamp>\d{14})_(?<description>[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\.sql$/u

function parseArguments(argumentsList) {
  const options = { baseRef: undefined }

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    const value = argumentsList[index + 1]

    if (argument === '--base-ref' && value) {
      options.baseRef = value
      index += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`)
    }
  }

  return options
}

function runGit(argumentsList) {
  const result = spawnSync('git', argumentsList, {
    encoding: 'utf8',
  })

  if (result.error) {
    throw result.error
  }

  return result
}

function resolveBaseRef(options) {
  return [
    options.baseRef,
    process.env.MIGRATION_BASE_REF,
    process.env.GITHUB_EVENT_PULL_REQUEST_BASE_SHA,
    'origin/main',
  ].find((candidate) => candidate?.trim())
}

function resolveCommit(ref) {
  const result = runGit(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])

  if (result.status !== 0) {
    throw new Error(`unable to resolve migration base ref: ${ref}`)
  }

  return result.stdout.trim()
}

function migrationDirectory() {
  const directory = path.resolve('supabase/migrations')

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new Error('migration directory does not exist: supabase/migrations')
  }

  return directory
}

function migrationDirectoryPathspec(directory) {
  const relativePath = path.relative(process.cwd(), directory)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('migration directory must be within the repository root')
  }

  return relativePath.split(path.sep).join('/')
}

function currentMigrations(directory, directoryPathspec) {
  const errors = []
  const migrations = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) {
      errors.push(`${entry.name}: migration entries must be SQL files`)
      continue
    }

    const match = entry.name.match(migrationNamePattern)
    if (!match?.groups) {
      errors.push(
        `${entry.name}: must match YYYYMMDDHHMMSS_description.sql with a lowercase snake_case description`,
      )
      continue
    }

    const timestamp = match.groups.timestamp
    if (!isRealUtcTimestamp(timestamp)) {
      errors.push(
        `${entry.name}: timestamp is not a real UTC date and time`,
      )
      continue
    }

    migrations.push({
      name: entry.name,
      path: `${directoryPathspec}/${entry.name}`,
      timestamp,
    })
  }

  migrations.sort((left, right) => left.name.localeCompare(right.name))
  return { errors, migrations }
}

function isRealUtcTimestamp(timestamp) {
  const year = Number(timestamp.slice(0, 4))
  const month = Number(timestamp.slice(4, 6))
  const day = Number(timestamp.slice(6, 8))
  const hour = Number(timestamp.slice(8, 10))
  const minute = Number(timestamp.slice(10, 12))
  const second = Number(timestamp.slice(12, 14))

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return false
  }

  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function validateTimestampOrder(migrations) {
  const errors = []
  let previousTimestamp

  for (const migration of migrations) {
    if (previousTimestamp && migration.timestamp <= previousTimestamp) {
      if (migration.timestamp === previousTimestamp) {
        errors.push(`duplicate migration timestamp: ${migration.timestamp}`)
      } else {
        errors.push('migration timestamps must be strictly increasing')
      }
    }
    previousTimestamp = migration.timestamp
  }

  return errors
}

function baseMigrationBlobs(baseCommit, directoryPathspec) {
  const result = runGit([
    'ls-tree',
    '-r',
    '-z',
    baseCommit,
    '--',
    directoryPathspec,
  ])

  if (result.status !== 0) {
    throw new Error(`unable to list migrations from base ref: ${baseCommit}`)
  }

  return result.stdout
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(?<mode>\d+) (?<type>\w+) (?<blob>[0-9a-f]+)\t(?<path>.+)$/u)
      if (!match?.groups || match.groups.type !== 'blob') {
        throw new Error('unable to parse migration blobs from git ls-tree')
      }

      return {
        blob: match.groups.blob,
        path: match.groups.path,
      }
    })
}

function currentBlobHash(migrationPath) {
  const result = runGit(['hash-object', '--', migrationPath])

  if (result.status !== 0) {
    throw new Error(`unable to hash migration: ${migrationPath}`)
  }

  return result.stdout.trim()
}

function validateBaseHistory(baseMigrations, migrations) {
  const errors = []
  const currentPaths = new Map(migrations.map((migration) => [migration.path, migration]))
  const basePaths = new Set(baseMigrations.map((migration) => migration.path))
  let latestBaseTimestamp

  for (const migration of baseMigrations) {
    const current = currentPaths.get(migration.path)
    if (!current) {
      errors.push(`base migration was deleted: ${migration.path}`)
      continue
    }

    if (currentBlobHash(migration.path) !== migration.blob) {
      errors.push(`base migration was modified: ${migration.path}`)
    }

    const baseName = path.posix.basename(migration.path)
    const match = baseName.match(migrationNamePattern)
    if (match?.groups?.timestamp) {
      latestBaseTimestamp =
        !latestBaseTimestamp || match.groups.timestamp > latestBaseTimestamp
          ? match.groups.timestamp
          : latestBaseTimestamp
    }
  }

  if (latestBaseTimestamp) {
    for (const migration of migrations) {
      if (!basePaths.has(migration.path) && migration.timestamp <= latestBaseTimestamp) {
        errors.push(
          `new migration must be forward-only after ${latestBaseTimestamp}: ${migration.path}`,
        )
      }
    }
  }

  return errors
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  const directory = migrationDirectory()
  const directoryPathspec = migrationDirectoryPathspec(directory)
  const baseCommit = resolveCommit(resolveBaseRef(options))
  const current = currentMigrations(directory, directoryPathspec)
  const errors = [
    ...current.errors,
    ...validateTimestampOrder(current.migrations),
    ...validateBaseHistory(
      baseMigrationBlobs(baseCommit, directoryPathspec),
      current.migrations,
    ),
  ]

  if (errors.length > 0) {
    throw new Error(`migration checks failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
