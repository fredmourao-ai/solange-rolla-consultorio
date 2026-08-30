export type PersonResult = {
  id: string
  civilName: string
  preferredName: string | null
  email: string | null
  phone: string | null
}

export function PersonResults({ people }: { people: PersonResult[] }) {
  if (people.length === 0) return <p className="empty-state">Nenhuma pessoa encontrada.</p>
  return <ul className="people-results" aria-label="Pessoas encontradas">
    {people.map((person) => <li key={person.id} className="people-results__item">
      <div>
        <strong>{person.civilName}</strong>
        {person.preferredName ? <span>Nome preferido: {person.preferredName}</span> : null}
      </div>
      <div>
        {person.email || person.phone ? <>
          {person.email ? <span>{person.email}</span> : null}
          {person.phone ? <span>{person.phone}</span> : null}
        </> : <span>Contato não informado</span>}
      </div>
    </li>)}
  </ul>
}
