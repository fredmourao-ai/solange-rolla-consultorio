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

    <fieldset className="person-form__fiscal" aria-describedby="fiscal-address-help">
      <legend>Dados fiscais</legend>
      <p id="fiscal-address-help">Preencha o endereço completo quando a pessoa precisar receber NFS-e.</p>
      <label htmlFor="fiscal-street">Logradouro</label>
      <input id="fiscal-street" name="fiscal_street" autoComplete="street-address" />
      <label htmlFor="fiscal-number">Número</label>
      <input id="fiscal-number" name="fiscal_number" />
      <label htmlFor="fiscal-district">Bairro</label>
      <input id="fiscal-district" name="fiscal_district" />
      <label htmlFor="fiscal-city">Cidade</label>
      <input id="fiscal-city" name="fiscal_city" autoComplete="address-level2" />
      <label htmlFor="fiscal-state">UF</label>
      <input id="fiscal-state" name="fiscal_state" maxLength={2} autoComplete="address-level1" />
      <label htmlFor="fiscal-postal-code">CEP</label>
      <input id="fiscal-postal-code" name="fiscal_postal_code" inputMode="numeric" autoComplete="postal-code" />
    </fieldset>

    <button type="submit">Cadastrar pessoa</button>
  </form>
}
