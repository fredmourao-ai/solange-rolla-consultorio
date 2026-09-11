import Link from 'next/link'

export type PersonResult = {
  id: string
  civilName: string
  preferredName: string | null
  cpf: string | null
  email: string | null
  phone: string | null
}

function formatCpf(value: string | null) {
  if (!value || value.length !== 11) return null
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function PersonResults({
  people,
  canAccessClinical = false,
  canCreateAppointments = false,
}: {
  people: PersonResult[]
  canAccessClinical?: boolean
  canCreateAppointments?: boolean
}) {
  if (people.length === 0) return <p className="empty-state">Nenhum paciente encontrado.</p>

  return <ul className="people-results" aria-label="Pacientes encontrados">
    {people.map((person) => <li key={person.id} className="people-results__item">
      <div>
        <strong>{person.preferredName || person.civilName}</strong>
        {person.preferredName ? <span>Nome civil: {person.civilName}</span> : null}
        {formatCpf(person.cpf) ? <span>CPF: {formatCpf(person.cpf)}</span> : null}
      </div>
      <div>
        {person.email || person.phone ? <>
          {person.email ? <span>{person.email}</span> : null}
          {person.phone ? <span>{person.phone}</span> : null}
        </> : <span>Contato não informado</span>}
      </div>
      <div className="people-results__actions">
        <Link className="ui-button ui-button--primary" href={`/pessoas/${person.id}`}>Abrir ficha</Link>
        {canCreateAppointments ? <Link className="ui-button ui-button--outline" href={`/agenda/gerenciar?personId=${person.id}`}>Nova consulta</Link> : null}
        {canAccessClinical ? <Link className="ui-button ui-button--secondary" href={`/clinico/${person.id}`}>Prontuário</Link> : null}
      </div>
    </li>)}
  </ul>
}
