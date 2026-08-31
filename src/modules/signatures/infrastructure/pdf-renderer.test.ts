import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { renderSignedFormPdf } from './pdf-renderer'

const input = {
  formName: 'Pré-consulta sintética',
  formVersion: 2,
  declarationVersion: 'truth-v2',
  typedName: 'Pessoa Sintética',
  signedAt: '2026-08-30T04:00:00.000Z',
  verificationCode: 'verify-12345678',
  fields: [
    { label: 'Como está hoje?', value: 'SIGNED_DOC_SENSITIVE_SENTINEL' },
    { label: 'Preferências', value: ['Opção A', 'Opção B'] },
  ],
}

describe('renderSignedFormPdf', () => {
  it('renders a valid PDF entirely in memory', async () => {
    const bytes = await renderSignedFormPdf(input)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.byteLength).toBeGreaterThan(500)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1)
  })

})

  it('produces identical bytes for identical signed input', async () => {
    const first = await renderSignedFormPdf(input)
    const second = await renderSignedFormPdf(input)
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true)
  })

  it('pins PDF creation and modification dates to the signature timestamp', async () => {
    const bytes = await renderSignedFormPdf(input)
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false })
    expect(pdf.getCreationDate()?.toISOString()).toBe(input.signedAt)
    expect(pdf.getModificationDate()?.toISOString()).toBe(input.signedAt)
  })
