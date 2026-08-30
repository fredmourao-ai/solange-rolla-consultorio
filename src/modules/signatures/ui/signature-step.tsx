export type SignatureLegalDocument = {
  id: string
  key: string
  version: number
  content: string
}

function legalTitle(key: string): string {
  if (key === 'cancellation_policy') return 'Política de cancelamento e faltas'
  if (key === 'truthfulness_declaration') return 'Declaração de veracidade'
  if (key === 'privacy_notice') return 'Aviso de privacidade'
  return 'Termos do serviço'
}

export function SignatureStep({
  actionToken,
  legalDocuments,
  hasError = false,
}: {
  actionToken: string
  legalDocuments: SignatureLegalDocument[]
  hasError?: boolean
}) {
  return <>
    {hasError && <p role="alert" className="ui-error">
      Não foi possível concluir. Revise os aceites e tente novamente.
    </p>}
    <form method="post" action="/api/public/formulario/sign" className="public-flow__form">
      <input type="hidden" name="_sign_token" value={actionToken} />
      {legalDocuments.map((document) => (
        <section className="ui-card" key={document.id} aria-labelledby={`legal-${document.key}`}>
          <h2 id={`legal-${document.key}`} className="ui-card__title">{legalTitle(document.key)}</h2>
          <p className="public-flow__legal-text">{document.content}</p>
          <label className="choice-control">
            <input className="ui-checkbox" type="checkbox" name={`accept_${document.key}`} value="true" required />
            <span>Li e concordo com este documento (versão {document.version}).</span>
          </label>
        </section>
      ))}
      <div className="form-field">
        <label className="form-field__label" htmlFor="typed-name">Digite seu nome completo para assinar</label>
        <input className="ui-input" id="typed-name" name="typed_name" type="text" autoComplete="name" required maxLength={160} />
      </div>
      <p className="public-flow__privacy">
        Ao confirmar, suas respostas revisadas serão bloqueadas contra edição e a evidência da assinatura será registrada.
      </p>
      <button className="ui-button" type="submit">Confirmar e assinar</button>
    </form>
  </>
}
