import { renderTemplate, type MessageTemplate } from '../domain/template'

export type TemplateRepository = { find(key: string, channel: 'whatsapp' | 'email', version: number): Promise<MessageTemplate | null> }

export async function renderVersionedTemplate(input: { key: string; channel: 'whatsapp' | 'email'; version: number; values: Record<string, string> }, repository: TemplateRepository): Promise<string> {
  const template = await repository.find(input.key, input.channel, input.version)
  if (!template) throw new Error('MESSAGE_TEMPLATE_NOT_FOUND')
  return renderTemplate(template, input.values)
}
