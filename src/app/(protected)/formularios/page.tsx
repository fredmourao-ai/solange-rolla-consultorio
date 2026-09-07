import { authorizeStaffSession, getStaffSession } from '@/modules/identity/public'
import { FORM_FIELD_TYPES } from '@/modules/forms/public'
import { createServerSupabaseClient } from '@/platform/supabase/server'
import { PageHeader } from '@/shared/ui/page-header'
import { createFormTemplateAction } from './actions'
import { FormLinkGenerator } from './form-link-generator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const fieldLabels: Record<(typeof FORM_FIELD_TYPES)[number], string> = {
  short_text: 'Texto curto',
  long_text: 'Texto longo',
  date: 'Data',
  single_choice: 'Escolha única',
  multi_choice: 'Múltipla escolha',
  boolean: 'Sim/Não',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
  declaration: 'Declaração',
}

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const session = await getStaffSession()
  authorizeStaffSession(session, ['psychologist_owner', 'secretary'])
  const client = await createServerSupabaseClient()
  const [{ data: people, error: peopleError }, { data: templates, error: templatesError }, { data: versions, error: versionsError }] = await Promise.all([
    client.from('people').select('id,civil_name,preferred_name').order('civil_name'),
    client.from('form_templates').select('id,name,active_version').order('name'),
    client.from('form_template_versions').select('id,template_id,version').order('version', { ascending: false }),
  ])
  if (peopleError || templatesError || versionsError) throw new Error('FORMS_MANAGEMENT_READ_FAILED')
  const params = await searchParams
  const versionByTemplate = new Map((versions ?? []).map((version) => [`${version.template_id}:${version.version}`, version]))
  const personOptions = (people ?? []).map((person) => ({
    id: person.id,
    label: person.preferred_name || person.civil_name,
  }))
  const templateOptions = (templates ?? []).flatMap((template) => {
    const version = versionByTemplate.get(`${template.id}:${template.active_version}`)
    return version ? [{ id: version.id, label: `${template.name} · v${version.version}` }] : []
  })

  return <>
    <PageHeader title="Formulários" description="Crie modelos versionados e gere links seguros para preenchimento sem login." />
    {params.created === '1' ? <p role="status">Formulário criado com sucesso.</p> : null}

    <section aria-labelledby="create-template-heading">
      <h2 id="create-template-heading">Novo formulário</h2>
      <form action={createFormTemplateAction} className="stack-form">
        <label>Nome do formulário<input name="name" required /></label>
        <label>Classificação
          <select name="classification" defaultValue="sensitive">
            <option value="sensitive">Sensível</option>
            <option value="administrative">Administrativa</option>
          </select>
        </label>
        <p>Preencha ao menos um campo. Para escolhas, separe as opções por vírgula.</p>
        {[1, 2, 3, 4, 5].map((index) => <fieldset key={index} className="card">
          <legend>Campo {index}</legend>
          <label>Pergunta {index}<input name={`field_label_${index}`} /></label>
          <label>Tipo {index}
            <select name={`field_type_${index}`} defaultValue="short_text">
              {FORM_FIELD_TYPES.map((type) => <option key={type} value={type}>{fieldLabels[type]}</option>)}
            </select>
          </label>
          <label>Opções {index}<input name={`field_options_${index}`} placeholder="Opção A, Opção B" /></label>
          <label><input type="checkbox" name={`field_required_${index}`} value="yes" /> Obrigatório</label>
        </fieldset>)}
        <button type="submit">Criar formulário</button>
      </form>
    </section>

    <section aria-labelledby="issue-link-heading">
      <h2 id="issue-link-heading">Gerar link seguro</h2>
      {templateOptions.length === 0 ? <p>Crie um formulário antes de gerar o primeiro link.</p> : null}
      {personOptions.length === 0 ? <p>Cadastre uma pessoa antes de gerar um link.</p> : null}
      <FormLinkGenerator people={personOptions} templates={templateOptions} />
    </section>
  </>
}
