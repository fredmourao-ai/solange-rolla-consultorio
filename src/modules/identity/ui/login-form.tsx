'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/platform/supabase/browser'
import { normalizeLoginCredentials } from './login-identifier'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const credentials = normalizeLoginCredentials(
      String(form.get('email') ?? ''),
      String(form.get('password') ?? ''),
      process.env.NEXT_PUBLIC_TEMP_ADMIN_LOGIN_ENABLED === 'true',
    )
    const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword(credentials)
    if (signInError) setError('Não foi possível entrar com essas credenciais.')
    else { router.replace('/dashboard'); router.refresh() }
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
