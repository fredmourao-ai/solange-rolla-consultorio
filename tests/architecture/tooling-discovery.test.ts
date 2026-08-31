import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

function readProjectFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)), "utf8")
}

describe("tooling discovery boundaries", () => {
  it("keeps Vitest out of linked worktrees and partial dependency trees", () => {
    const config = readProjectFile("vitest.config.mts")

    expect(config).toContain(".worktrees/**")
    expect(config).toContain("**/node_modules/**")
    expect(config).toContain("**/node_modules.npm-partial/**")
  })

  it("keeps ESLint out of linked worktrees and partial dependency trees", () => {
    const config = readProjectFile("eslint.config.mjs")

    expect(config).toContain(".worktrees/**")
    expect(config).toContain("**/node_modules.npm-partial/**")
  })
})
