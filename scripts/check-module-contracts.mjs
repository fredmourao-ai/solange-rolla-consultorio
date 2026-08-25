import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const requiredReadmeSections = [
  'Responsabilidade',
  'Public API',
  'Owns',
  'Consumes',
  'Invariantes',
  'Dados sensíveis',
  'Proibições',
]
const sourceFilePattern = /\.(?:[cm]?ts|[cm]?tsx)$/

function parseArguments(argumentsList) {
  const options = {
    modulesRoot: path.resolve('src/modules'),
    project: path.resolve('tsconfig.json'),
  }

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index]
    const value = argumentsList[index + 1]

    if (argument === '--modules-root' && value) {
      options.modulesRoot = path.resolve(value)
      index += 1
    } else if (argument === '--project' && value) {
      options.project = path.resolve(value)
      index += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${argument}`)
    }
  }

  return options
}

function listModuleDirectories(modulesRoot) {
  if (!fs.existsSync(modulesRoot)) {
    return []
  }

  return fs
    .readdirSync(modulesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function listSourceFiles(directory) {
  const files = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(filePath))
    } else if (entry.isFile() && sourceFilePattern.test(entry.name)) {
      files.push(filePath)
    }
  }

  return files
}

function readCompilerOptions(projectPath) {
  if (!fs.existsSync(projectPath)) {
    throw new Error(`TypeScript project not found: ${projectPath}`)
  }

  const config = ts.readConfigFile(projectPath, ts.sys.readFile)

  if (config.error) {
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
  }

  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path.dirname(projectPath),
    undefined,
    projectPath,
  )

  const configurationErrors = parsed.errors.filter(
    (diagnostic) => diagnostic.code !== 18003,
  )

  if (configurationErrors.length > 0) {
    throw new Error(
      configurationErrors
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
        .join('\n'),
    )
  }

  return {
    compilerOptions: parsed.options,
    projectDirectory: path.dirname(projectPath),
  }
}

function moduleNameFor(filePath, modulesRoot, moduleNames) {
  const relativePath = path.relative(modulesRoot, filePath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined
  }

  const [moduleName] = relativePath.split(path.sep)
  return moduleNames.has(moduleName) ? moduleName : undefined
}

function moduleSpecifiersIn(sourceFile) {
  const specifiers = []

  function addSpecifier(node) {
    if (node && ts.isStringLiteralLike(node)) {
      specifiers.push(node.text)
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addSpecifier(node.moduleSpecifier)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      addSpecifier(node.moduleReference.expression)
    } else if (
      ts.isCallExpression(node) &&
      ((node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1) ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require' &&
          node.arguments.length === 1))
    ) {
      addSpecifier(node.arguments[0])
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return specifiers
}

function isPublicContract(filePath, providerName, modulesRoot) {
  return (
    path.relative(modulesRoot, filePath) ===
    path.join(providerName, 'public.ts')
  )
}

function markdownHeadings(markdown) {
  const headings = new Set()
  let fence

  for (const line of markdown.split(/\r?\n/u)) {
    if (fence) {
      const closingFence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/u)?.[1]
      if (
        closingFence &&
        closingFence[0] === fence[0] &&
        closingFence.length >= fence.length
      ) {
        fence = undefined
      }
      continue
    }

    const openingFence = line.match(/^\s{0,3}(`{3,}|~{3,})/u)?.[1]
    if (openingFence) {
      fence = openingFence
      continue
    }

    const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/u)
    if (headingMatch) {
      headings.add(headingMatch[1].replace(/\s+#+\s*$/u, '').trim())
    }
  }

  return headings
}

function unresolvedCrossModuleName(
  specifier,
  sourcePath,
  modulesRoot,
  moduleNames,
  compilerOptions,
  projectDirectory,
) {
  if (specifier.startsWith('.')) {
    return moduleNameFor(
      path.resolve(path.dirname(sourcePath), specifier),
      modulesRoot,
      moduleNames,
    )
  }

  const pathBase = compilerOptions.baseUrl ?? projectDirectory

  for (const [pattern, replacements] of Object.entries(
    compilerOptions.paths ?? {},
  )) {
    const wildcardIndex = pattern.indexOf('*')
    let wildcardValue

    if (wildcardIndex === -1) {
      if (pattern !== specifier) {
        continue
      }
      wildcardValue = ''
    } else {
      const prefix = pattern.slice(0, wildcardIndex)
      const suffix = pattern.slice(wildcardIndex + 1)
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
        continue
      }
      wildcardValue = specifier.slice(prefix.length, specifier.length - suffix.length)
    }

    for (const replacement of replacements) {
      const mappedPath = replacement.replace('*', wildcardValue)
      const mappedModuleName = moduleNameFor(
        path.resolve(pathBase, mappedPath),
        modulesRoot,
        moduleNames,
      )
      if (mappedModuleName) {
        return mappedModuleName
      }
    }
  }

  const normalizedSpecifier = specifier.replaceAll('\\', '/')
  const moduleMatch = normalizedSpecifier.match(
    /(?:^|\/)modules\/([^/]+)(?:\/|$)/u,
  )
  const moduleName = moduleMatch?.[1]

  return moduleName && moduleNames.has(moduleName) ? moduleName : undefined
}

function checkReadmes(modulesRoot, moduleNames) {
  const errors = []

  for (const moduleName of moduleNames) {
    const readmePath = path.join(modulesRoot, moduleName, 'README.md')

    if (!fs.existsSync(readmePath)) {
      errors.push(`${moduleName}: missing README.md`)
      continue
    }

    const headings = markdownHeadings(fs.readFileSync(readmePath, 'utf8'))
    for (const section of requiredReadmeSections) {
      if (!headings.has(section)) {
        errors.push(
          `${moduleName}: README.md is missing required section "${section}"`,
        )
      }
    }
  }

  return errors
}

function checkCrossModuleImports(
  modulesRoot,
  moduleNames,
  compilerOptions,
  projectDirectory,
) {
  const errors = []
  const reportedErrors = new Set()
  const moduleResolutionCache = ts.createModuleResolutionCache(
    process.cwd(),
    ts.sys.useCaseSensitiveFileNames ? (value) => value : (value) => value.toLowerCase(),
    compilerOptions,
  )

  function report(message) {
    if (!reportedErrors.has(message)) {
      reportedErrors.add(message)
      errors.push(message)
    }
  }

  for (const consumerName of moduleNames) {
    const consumerPath = path.join(modulesRoot, consumerName)

    for (const sourcePath of listSourceFiles(consumerPath)) {
      const sourceFile = ts.createSourceFile(
        sourcePath,
        fs.readFileSync(sourcePath, 'utf8'),
        ts.ScriptTarget.Latest,
        false,
      )

      for (const specifier of moduleSpecifiersIn(sourceFile)) {
        const resolution = ts.resolveModuleName(
          specifier,
          sourcePath,
          compilerOptions,
          ts.sys,
          moduleResolutionCache,
        ).resolvedModule

        if (!resolution) {
          const unresolvedProviderName = unresolvedCrossModuleName(
            specifier,
            sourcePath,
            modulesRoot,
            moduleNames,
            compilerOptions,
            projectDirectory,
          )

          if (unresolvedProviderName && unresolvedProviderName !== consumerName) {
            report(
              `${consumerName}: unresolved cross-module import "${specifier}"`,
            )
          }
          continue
        }

        const providerPath = path.resolve(resolution.resolvedFileName)
        const providerName = moduleNameFor(providerPath, modulesRoot, moduleNames)

        if (!providerName || providerName === consumerName) {
          continue
        }

        if (!fs.existsSync(path.join(modulesRoot, providerName, 'public.ts'))) {
          report(`${providerName}: cross-module contract requires public.ts`)
        }

        if (!isPublicContract(providerPath, providerName, modulesRoot)) {
          report(
            `${consumerName}: imports ${providerName} internal file "${path
              .relative(modulesRoot, providerPath)
              .split(path.sep)
              .join('/')}"`,
          )
        }
      }
    }
  }

  return errors
}

function main() {
  const { modulesRoot, project } = parseArguments(process.argv.slice(2))
  const moduleDirectories = listModuleDirectories(modulesRoot)
  const moduleNames = new Set(moduleDirectories)
  const { compilerOptions, projectDirectory } = readCompilerOptions(project)
  const errors = [
    ...checkReadmes(modulesRoot, moduleDirectories),
    ...checkCrossModuleImports(
      modulesRoot,
      moduleNames,
      compilerOptions,
      projectDirectory,
    ),
  ]

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`Module contract violation: ${error}`)
    }
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  console.error(
    error instanceof Error ? `Module contract check failed: ${error.message}` : error,
  )
  process.exitCode = 1
}
