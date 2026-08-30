import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type SignedFormPdfInput = {
  formName: string
  formVersion: number
  declarationVersion: string
  typedName: string
  signedAt: string
  verificationCode: string
  fields: Array<{ label: string; value: unknown }>
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const BODY_SIZE = 10
const LINE_HEIGHT = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

function normalizeText(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalizeText).join(', ')
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.replace(/\s+/gu, ' ').trim().split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width || current === '') current = candidate
    else { lines.push(current); current = word }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export async function renderSignedFormPdf(input: SignedFormPdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN
  document.removePage(0)

  const newPage = () => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN
    page.drawText('Solange Rolla - Comprovante de formulário assinado', {
      x: MARGIN, y, size: 14, font: bold, color: rgb(0.12, 0.12, 0.12),
    })
    y -= 28
  }
  const ensure = (height: number) => { if (y - height < MARGIN) newPage() }
  const line = (text: string, options: { bold?: boolean; size?: number } = {}) => {
    const size = options.size ?? BODY_SIZE
    const font = options.bold ? bold : regular
    for (const part of wrap(text, font, size, CONTENT_WIDTH)) {
      ensure(LINE_HEIGHT)
      page.drawText(part, { x: MARGIN, y, size, font })
      y -= LINE_HEIGHT
    }
  }

  newPage()
  line(input.formName, { bold: true, size: 12 })
  line(`Versão do formulário: ${input.formVersion}`)
  line(`Versão da declaração: ${input.declarationVersion}`)
  line(`Assinado por: ${input.typedName}`)
  line(`Data da assinatura: ${new Date(input.signedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
  line(`Código de verificação: ${input.verificationCode}`)
  y -= 12
  line('Respostas', { bold: true, size: 12 })
  y -= 4
  for (const field of input.fields) {
    line(field.label, { bold: true })
    line(normalizeText(field.value))
    y -= 8
  }

  line('Este documento foi gerado a partir da versão assinada e imutável do formulário.')
  document.setTitle(`Comprovante assinado - ${input.formName}`)
  document.setSubject('Comprovante de formulário assinado')
  document.setCreator('Solange Rolla Consultório')
  return document.save({ useObjectStreams: false })
}
