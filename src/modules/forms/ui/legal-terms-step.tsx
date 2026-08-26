'use client'

type LegalTermsStepProps = {
  cancellationText: string
  truthfulnessText: string
  cancellationAccepted: boolean
  truthfulnessAccepted: boolean
  onCancellationChange: (accepted: boolean) => void
  onTruthfulnessChange: (accepted: boolean) => void
}

export function LegalTermsStep(props: LegalTermsStepProps) {
  return (
    <section aria-labelledby="legal-terms-title">
      <h2 id="legal-terms-title">Termos e declarações</h2>
      <p>{props.cancellationText}</p>
      <label>
        <input
          type="checkbox"
          checked={props.cancellationAccepted}
          onChange={(event) => props.onCancellationChange(event.target.checked)}
        />
        Li e estou de acordo com as condições de agendamento, cancelamento, faltas e cobrança.
      </label>
      <p>{props.truthfulnessText}</p>
      <label>
        <input
          type="checkbox"
          checked={props.truthfulnessAccepted}
          onChange={(event) => props.onTruthfulnessChange(event.target.checked)}
        />
        Declaro que as informações fornecidas por mim são verdadeiras e correspondem ao que informei neste formulário.
      </label>
    </section>
  )
}
