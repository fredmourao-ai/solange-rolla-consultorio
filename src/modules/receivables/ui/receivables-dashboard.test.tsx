import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReceivablesDashboard } from './receivables-dashboard'

describe('ReceivablesDashboard', () => {
  it('renders totals and payer details', () => {
    const html = renderToStaticMarkup(<ReceivablesDashboard rows={[{
      id: 'rec-1', personName: 'Paciente Demo', payerName: 'Responsável Demo',
      sourceType: 'appointment', originalAmountCents: 30000, paidCents: 10000, status: 'partial',
    }]} />)
    expect(html).toContain('R$ 300,00')
    expect(html).toContain('R$ 100,00')
    expect(html).toContain('R$ 200,00')
    expect(html).toContain('Paciente Demo')
    expect(html).toContain('Responsável Demo')
    expect(html).toContain('Parcial')
  })
})
