import 'server-only'
import { createServiceRoleSupabaseClient } from '../../../platform/supabase/service-role'
import type { LegalAcceptance, LegalDocumentKey, LegalDocumentVersion } from '../domain/legal-document'

type LegalClient = ReturnType<typeof createServiceRoleSupabaseClient>

function errorCode(error: unknown): string | undefined {
  return error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : undefined
}

function databaseError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message?: unknown }).message ?? fallback))
  }
  return new Error(fallback)
}

export function createSupabaseLegalRepository(
  capabilityId: string,
  client: LegalClient = createServiceRoleSupabaseClient(),
) {
  return {
    async findActive(key: LegalDocumentKey): Promise<LegalDocumentVersion | null> {
      const { data: document, error: documentError } = await client
        .from('legal_documents')
        .select('id,key')
        .eq('key', key)
        .maybeSingle()
      if (documentError) throw databaseError(documentError, 'LEGAL_DOCUMENT_LOOKUP_FAILED')
      if (!document) return null
      const { data: version, error: versionError } = await client
        .from('legal_document_versions')
        .select('id,version,content,content_hash_sha256,effective_from,supersedes_id,is_draft')
        .eq('document_id', document.id)
        .eq('is_draft', false)
        .lte('effective_from', new Date().toISOString())
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (versionError) throw databaseError(versionError, 'LEGAL_DOCUMENT_VERSION_LOOKUP_FAILED')
      if (!version) return null
      return {
        id: version.id,
        key,
        version: version.version,
        content: version.content,
        contentHash: version.content_hash_sha256,
        effectiveFrom: version.effective_from,
        supersedesId: version.supersedes_id ?? undefined,
      }
    },

    async insert(acceptance: LegalAcceptance): Promise<LegalAcceptance> {
      const { error } = await client.from('legal_acceptances').insert({
        person_id: acceptance.personId,
        document_version_id: acceptance.documentVersionId,
        content_hash_sha256: acceptance.contentHash,
        accepted_at: acceptance.acceptedAt,
        channel: acceptance.channel,
        capability_id: capabilityId,
      })
      if (error && errorCode(error) !== '23505') throw databaseError(error, 'LEGAL_ACCEPTANCE_WRITE_FAILED')
      return acceptance
    },
  }
}
