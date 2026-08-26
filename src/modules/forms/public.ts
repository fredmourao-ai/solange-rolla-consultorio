export {
  FORM_FIELD_TYPES,
  validateAnswers,
  type FormClassification,
  type FormField,
  type FormFieldType,
  type FormTemplateVersion,
} from './domain/form-schema'
export { saveDraft } from './application/save-draft'
export { getActiveLegalDocument } from './application/get-active-legal-document'
export { recordLegalAcceptance } from './application/accept-legal-document'
export {
  LEGAL_DOCUMENT_KEYS,
  acceptLegalDocument,
  activateLegalDocument,
  type LegalAcceptance,
  type LegalDocumentKey,
  type LegalDocumentVersion,
} from './domain/legal-document'
