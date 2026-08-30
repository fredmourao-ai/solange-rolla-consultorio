export {
  FORM_FIELD_TYPES,
  validateAnswers,
  type FormClassification,
  type FormField,
  type FormFieldType,
  type FormTemplateVersion,
} from './domain/form-schema'
export { saveDraft } from './application/save-draft'
export { startSubmission, type FormSubmissionHeader, type FormSubmissionStatus } from './application/start-submission'
export { readSubmission, type StoredFormSubmission } from './application/read-submission'
export { submitForm } from './application/submit-form'
export { FormRenderer, type FormRendererProps } from './ui/form-renderer'
export { getActiveLegalDocument } from './application/get-active-legal-document'
export { recordLegalAcceptance } from './application/accept-legal-document'
export { LegalTermsStep } from './ui/legal-terms-step'
export {
  LEGAL_DOCUMENT_KEYS,
  acceptLegalDocument,
  activateLegalDocument,
  type LegalAcceptance,
  type LegalDocumentKey,
  type LegalDocumentVersion,
} from './domain/legal-document'
