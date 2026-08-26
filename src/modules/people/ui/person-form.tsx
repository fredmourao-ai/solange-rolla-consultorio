'use client'

export function PersonForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return <form className="person-form" action={action}>
    <label htmlFor="civil-name">Nome civil</label>
    <input id="civil-name" name="civil_name" required />
    <label htmlFor="preferred-name">Nome preferido</label>
    <input id="preferred-name" name="preferred_name" />
    <label htmlFor="birth-date">Data de nascimento</label>
    <input id="birth-date" name="birth_date" type="date" required />
    <label htmlFor="cpf">CPF</label>
    <input id="cpf" name="cpf" inputMode="numeric" autoComplete="off" />
    <label htmlFor="email">E-mail</label>
    <input id="email" name="email" type="email" />
    <label htmlFor="phone">Telefone</label>
    <input id="phone" name="phone" inputMode="tel" />
    <button type="submit">Cadastrar pessoa</button>
  </form>
}
