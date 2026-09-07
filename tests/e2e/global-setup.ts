import { assertExternalBuild, resolveE2eRuntime } from './runtime-config'

export default async function globalSetup() {
  const runtime = resolveE2eRuntime()
  await assertExternalBuild(runtime)
}
