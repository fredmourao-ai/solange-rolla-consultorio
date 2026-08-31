export const metadata = {
  robots: { index: false, follow: false },
  title: 'Formulário concluído',
}

export default function CompletedFormPage() {
  return (
    <main className="capability-page">
      <section className="public-flow public-flow--success" aria-labelledby="completed-title">
        <p className="eyebrow">Concluído</p>
        <h1 id="completed-title">Formulário enviado e assinado</h1>
        <p>Obrigada. Suas informações foram recebidas com segurança.</p>
        <p>Este link de acesso foi encerrado e não pode mais ser usado para alterar as respostas.</p>
      </section>
    </main>
  )
}
