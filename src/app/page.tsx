import Image from 'next/image'
import Link from 'next/link'

const features = [
  ['Agenda com clareza', 'Consultas, confirmações e prazos reunidos em uma rotina simples de acompanhar.'],
  ['Cuidado com organização', 'Pessoas, documentos e jornadas administrativas conectados sem misturar dados clínicos.'],
  ['Financeiro conectado', 'Recebíveis, eventos, fiscal e indicadores operacionais no mesmo ambiente de trabalho.'],
]

export default function HomePage() {
  return <main className="home-page">
    <section className="home-hero">
      <div className="home-brandbar">
        <Image className="brand-logo" src="/brand/solange-rolla-logo.png" alt="Solange Rolla" width={245} height={60} priority />
        <span>Ambiente privado</span>
      </div>
      <div className="home-hero__copy">
        <p className="eyebrow">Gestão integrada do consultório</p>
        <h1>Consultório Solange Rolla</h1>
        <p className="home-hero__lead">Tecnologia para organizar a rotina do consultório com a mesma acolhida, delicadeza e identidade da marca Solange Rolla.</p>
      </div>
      <div className="home-hero__actions">
        <Link className="ui-button ui-button--primary" href="/login">Acessar sistema</Link>
        <Link className="ui-button ui-button--outline" href="/dashboard">Ir para o painel</Link>
      </div>
      <div className="home-feature-grid">
        {features.map(([title, description]) => <article className="home-feature" key={title}><strong>{title}</strong><p>{description}</p></article>)}
      </div>
      <small className="home-privacy-note">Acesso restrito, rastreabilidade e separação dos dados clínicos.</small>
    </section>
  </main>
}
