import Link from 'next/link'

const features = [
  ['Agenda inteligente', 'Consultas, confirmações, reagendamentos e prazos de cancelamento em um só fluxo.'],
  ['Gestão financeira', 'Recebíveis, eventos, documentos fiscais e indicadores operacionais conectados.'],
  ['Jornada protegida', 'Formulários, assinatura e documentos com links seguros e dados clínicos isolados.'],
]

export default function HomePage() {
  return <main className="home-page">
    <section className="home-hero">
      <p className="eyebrow">Gestão integrada do consultório</p>
      <h1>Solange Rolla</h1>
      <p className="home-hero__lead">Agenda, pessoas, financeiro, eventos e documentos em um ambiente único, privado e preparado para a rotina do consultório.</p>
      <div className="home-hero__actions">
        <Link className="ui-button ui-button--primary" href="/dashboard">Abrir painel</Link>
        <Link className="ui-button ui-button--outline" href="/login">Acesso interno</Link>
      </div>
      <div className="home-feature-grid">
        {features.map(([title, description]) => <article className="home-feature" key={title}>
          <strong>{title}</strong><p>{description}</p>
        </article>)}
      </div>
      <small className="home-privacy-note">Ambiente privado com controles de acesso e rastreabilidade.</small>
    </section>
  </main>
}
