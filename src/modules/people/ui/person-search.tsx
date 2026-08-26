'use client'

export function PersonSearch() {
  return <form className="person-search" role="search">
    <label htmlFor="people-query">Buscar pessoa</label>
    <input id="people-query" name="q" placeholder="Nome, e-mail ou telefone" />
    <button type="submit">Buscar</button>
  </form>
}
