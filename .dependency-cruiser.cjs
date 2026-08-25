/* eslint-disable @typescript-eslint/no-require-imports -- dependency-cruiser loads this file as CommonJS. */
const fs = require('node:fs')
const path = require('node:path')

const moduleRoot = '(?:src|tests/architecture/fixtures)/modules'
const appRoot = '(?:src/app|tests/architecture/fixtures/app)'
const platformRoot = '(?:src/platform|tests/architecture/fixtures/platform)'
const sharedRoot = '(?:src/shared|tests/architecture/fixtures/shared)'

function listModuleDirectories(relativeRoot) {
  const absoluteRoot = path.join(__dirname, relativeRoot)

  if (!fs.existsSync(absoluteRoot)) {
    return []
  }

  return fs
    .readdirSync(absoluteRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const moduleNames = [
  ...new Set([
    ...listModuleDirectories('src/modules'),
    ...listModuleDirectories('tests/architecture/fixtures/modules'),
  ]),
]

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...moduleNames.flatMap((rawModuleName) => {
      const moduleName = escapeRegExp(rawModuleName)

      return [
        {
          name: `domain-outer-layer-dependency-from-${rawModuleName}`,
          comment: 'Domain code must not depend on its outer layers or platform.',
          severity: 'error',
          from: { path: `^${moduleRoot}/${moduleName}/domain(?:/|$)` },
          to: {
            path: `^(?:${appRoot}|${platformRoot}|${moduleRoot}/${moduleName}/(?:application|infrastructure|ui))(?:/|$)`,
          },
        },
        {
          name: `cross-module-internal-import-from-${rawModuleName}`,
          comment: 'Modules may only import another module through public.ts.',
          severity: 'error',
          from: { path: `^${moduleRoot}/${moduleName}(?:/|$)` },
          to: {
            path: `^${moduleRoot}/(?!${moduleName}(?:/|$))[^/]+(?:/|$)`,
            pathNot: `^${moduleRoot}/(?!${moduleName}(?:/|$))[^/]+/public(?:\\.ts)?$`,
          },
        },
      ]
    }),
    {
      name: 'app-module-contracts-only',
      comment: 'App code may import module UI or public contracts only.',
      severity: 'error',
      from: { path: `^${appRoot}(?:/|$)` },
      to: {
        path: `^${moduleRoot}(?:/|$)`,
        pathNot: `^${moduleRoot}/[^/]+/(?:public(?:\\.ts)?$|ui(?:/|$))`,
      },
    },
    {
      name: 'platform-does-not-depend-on-modules',
      comment: 'Platform code must remain independent from domain modules.',
      severity: 'error',
      from: { path: `^${platformRoot}(?:/|$)` },
      to: { path: `^${moduleRoot}(?:/|$)` },
    },
    {
      name: 'shared-does-not-depend-on-modules',
      comment: 'Shared code must remain independent from domain modules.',
      severity: 'error',
      from: { path: `^${sharedRoot}(?:/|$)` },
      to: { path: `^${moduleRoot}(?:/|$)` },
    },
    {
      name: 'no-circular-dependencies',
      comment: 'Circular dependencies are prohibited.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
