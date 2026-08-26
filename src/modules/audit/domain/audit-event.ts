const sensitiveKeyPattern = /(content|answer|note|token|secret|diagnos|clinical|signature)/i

export type AuditMetadata = {
  [key: string]: string | number | boolean | null | AuditMetadata | AuditMetadata[]
}

export type CreateAuditEventInput = {
  actorId: string
  action: string
  entityType: string
  entityId: string
  correlationId: string
  metadata: Record<string, unknown>
}

export type AuditEvent = CreateAuditEventInput & {
  metadata: AuditMetadata
  createdAt: string
}

function sanitizeValue(value: unknown, keyPath: string): AuditMetadata[string] {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, `${keyPath}[${index}]`)) as AuditMetadata[]
  }

  if (typeof value === 'object') {
    return buildAuditMetadata(value as Record<string, unknown>, keyPath)
  }

  throw new Error(`INVALID_AUDIT_METADATA at ${keyPath}`)
}

export function buildAuditMetadata(
  metadata: Record<string, unknown>,
  parentPath = 'metadata',
): AuditMetadata {
  const sanitized: AuditMetadata = {}

  for (const [key, value] of Object.entries(metadata)) {
    const path = `${parentPath}.${key}`
    if (sensitiveKeyPattern.test(key)) {
      throw new Error(`SENSITIVE_AUDIT_METADATA at ${path}`)
    }
    sanitized[key] = sanitizeValue(value, path)
  }

  return sanitized
}

export function createAuditEvent(input: CreateAuditEventInput): AuditEvent {
  if (!input.actorId || !input.action || !input.entityType || !input.entityId || !input.correlationId) {
    throw new Error('INVALID_AUDIT_EVENT')
  }

  return {
    ...input,
    metadata: buildAuditMetadata(input.metadata),
    createdAt: new Date().toISOString(),
  }
}
