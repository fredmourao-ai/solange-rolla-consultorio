import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DocumentStatus } from './document-status'

describe('DocumentStatus', () => {
  it('renders a secure download action only when the signed document is ready', () => {
    const html = renderToStaticMarkup(
      <DocumentStatus status="ready" downloadUrl="https://signed.example.test/document.pdf" />,
    )
    expect(html).toContain('Documento assinado pronto')
    expect(html).toContain('Baixar PDF')
    expect(html).toContain('https://signed.example.test/document.pdf')
  })

  it('renders retry guidance without a download link for retryable failures', () => {
    const html = renderToStaticMarkup(<DocumentStatus status="failed_retryable" />)
    expect(html).toContain('Geração temporariamente indisponível')
    expect(html).not.toContain('Baixar PDF')
  })

  it('renders processing state without exposing a URL', () => {
    const html = renderToStaticMarkup(<DocumentStatus status="processing" />)
    expect(html).toContain('Gerando documento assinado')
    expect(html).not.toContain('href=')
  })
})
