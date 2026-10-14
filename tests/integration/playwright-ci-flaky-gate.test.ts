import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const fileName = 'playwright.config.ts'
const sourceFile = ts.createSourceFile(
  fileName,
  readFileSync(fileName, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)

function propertyExpression(name: string): string | undefined {
  let expression: string | undefined
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'defineConfig') {
      const config = node.arguments[0]
      if (config && ts.isObjectLiteralExpression(config)) {
        const property = config.properties.find(
          (value): value is ts.PropertyAssignment =>
            ts.isPropertyAssignment(value) && value.name.getText(sourceFile) === name,
        )
        expression = property?.initializer.getText(sourceFile)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return expression
}

describe('Playwright E2E V5 flaky fail-closed contract', () => {
  it('rejects flaky retries as CI success while preserving retry diagnostics', () => {
    expect(propertyExpression('failOnFlakyTests')).toBe('!!process.env.CI')
    expect(propertyExpression('retries')).toBe('process.env.CI ? 2 : 0')
  })
})
