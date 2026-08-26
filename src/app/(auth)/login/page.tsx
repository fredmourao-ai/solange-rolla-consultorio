import { LoginForm } from '@/modules/identity/ui/login-form'

export default function LoginPage() {
  return <main className="auth-page">
    <section className="auth-panel" aria-labelledby="login-title">
      <p className="eyebrow">Acesso interno</p>
      <h1 id="login-title">Entrar no consultório</h1>
      <LoginForm />
    </section>
  </main>
}
