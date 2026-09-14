'use client'

export function PersonSearch({ defaultValue = '' }: { defaultValue?: string }) {
  return <form className="person-search" role="search">
    <label htmlFor="people-query">Buscar paciente</label>
    <input
      id="people-query"
      name="q"
      defaultValue={defaultValue}
      placeholder="Nome, CPF, e-mail ou telefone"
      autoComplete="off"
    />
    <button className="ui-button ui-button--primary" type="submit">Buscar</button>
  </form>
}
