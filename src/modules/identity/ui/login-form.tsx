'use client'

import { FormEvent, useState } from 'react'
import { createBrowserSupabaseClient } from '@/platform/supabase/browser'
import { normalizeLoginIdentifier } from './login-identifier'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const email = normalizeLoginIdentifier(String(form.get('email') ?? ''))
    const password = String(form.get('password') ?? '')
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password })
    if (signInError) setError('Não foi possível entrar com essas credenciais.')
    else window.location.assign('/dashboard')
    setPending(false)
  }

  return <form className="auth-form" onSubmit={submit}>
    <label htmlFor="email">Usuário ou e-mail</label>
    <input id="email" name="email" type="text" autoComplete="username" required />
    <label htmlFor="password">Senha</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required />
    {error ? <p role="alert">{error}</p> : null}
    <button type="submit" disabled={pending}>{pending ? 'Entrando...' : 'Entrar'}</button>
  </form>
}
