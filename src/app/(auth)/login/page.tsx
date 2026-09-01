import Image from 'next/image'
import { LoginForm } from '@/modules/identity/ui/login-form'

export default function LoginPage() {
  return <main className="auth-page">
    <section className="auth-panel" aria-labelledby="login-title">
      <div className="auth-brand">
        <Image className="brand-logo" src="/brand/solange-rolla-logo.png" alt="Solange Rolla" width={245} height={60} priority />
        <span>Gestão do consultório</span>
      </div>
      <p className="eyebrow">Acesso interno</p>
      <h1 id="login-title">Entrar no consultório</h1>
      <p className="auth-panel__lead">Entre com suas credenciais para acessar a rotina administrativa com segurança.</p>
      <LoginForm />
    </section>
  </main>
}
