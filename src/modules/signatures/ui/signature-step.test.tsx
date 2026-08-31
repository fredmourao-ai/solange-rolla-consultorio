import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SignatureStep } from './signature-step'

describe('SignatureStep', () => {
  it('renders legal acceptances, typed name and final signature action', () => {
    const html = renderToStaticMarkup(<SignatureStep
      actionToken="action-token"
      legalDocuments={[{
        id: 'legal-1', key: 'cancellation_policy', version: 1,
        content: 'Cancelamentos fora do prazo podem ser cobrados.',
      }]}
    />)

    expect(html).toContain('Política de cancelamento e faltas')
    expect(html).toContain('Cancelamentos fora do prazo podem ser cobrados.')
    expect(html).toContain('Digite seu nome completo para assinar')
    expect(html).toContain('Confirmar e assinar')
    expect(html).toContain('action-token')
  })
})
