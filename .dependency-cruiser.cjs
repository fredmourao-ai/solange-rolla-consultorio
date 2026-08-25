const moduleNames = [
  'identity',
  'people',
  'appointments',
  'forms',
  'signatures',
  'receivables',
  'payables',
  'events',
  'messaging',
  'fiscal',
  'clinical',
  'automations',
  'reports',
  'audit',
]

const moduleRoot = '(?:src|tests/architecture/fixtures)/modules'
const internalLayer = '(?:domain|application|infrastructure|ui)'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    ...moduleNames.flatMap((moduleName) => [
      {
        name: `domain-outer-layer-dependency-from-${moduleName}`,
        comment: 'Domain code must not depend on its outer layers or platform.',
        severity: 'error',
        from: { path: `^${moduleRoot}/${moduleName}/domain(?:/|$)` },
        to: {
          path: `^(?:src/(?:app|platform)|${moduleRoot}/${moduleName}/(?:application|infrastructure|ui))(?:/|$)`,
        },
      },
      {
        name: `cross-module-internal-import-from-${moduleName}`,
        comment: 'Modules may only import another module through public.ts.',
        severity: 'error',
        from: { path: `^${moduleRoot}/${moduleName}(?:/|$)` },
        to: {
          path: `^${moduleRoot}/(?!${moduleName}(?:/|$))[^/]+/${internalLayer}(?:/|$)`,
        },
      },
    ]),
    {
      name: 'app-module-contracts-only',
      comment: 'App code may import module UI or public contracts only.',
      severity: 'error',
      from: { path: '^src/app(?:/|$)' },
      to: {
        path: '^src/modules(?:/|$)',
        pathNot: '^src/modules/[^/]+/(?:public(?:\\.ts)?$|ui(?:/|$))',
      },
    },
    {
      name: 'platform-does-not-depend-on-modules',
      comment: 'Platform code must remain independent from domain modules.',
      severity: 'error',
      from: { path: '^src/platform(?:/|$)' },
      to: { path: '^src/modules(?:/|$)' },
    },
    {
      name: 'shared-does-not-depend-on-modules',
      comment: 'Shared code must remain independent from domain modules.',
      severity: 'error',
      from: { path: '^src/shared(?:/|$)' },
      to: { path: '^src/modules(?:/|$)' },
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
