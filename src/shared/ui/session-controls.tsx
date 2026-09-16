'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '../../platform/supabase/browser'
import { Button } from './button'

export function SessionControls({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setBusy(true); setError('')
    const { error: signOutError } = await createBrowserSupabaseClient().auth.signOut({ scope: 'local' })
    if (signOutError) { setBusy(false); setError('Não foi possível encerrar a sessão.'); return }
    onNavigate?.()
    router.replace('/login')
    router.refresh()
  }

  return <div className="session-controls">
    <Link className="ui-button ui-button--ghost" href="/seguranca" onClick={onNavigate}>Segurança</Link>
    <Button variant="ghost" type="button" onClick={signOut} disabled={busy}>Sair</Button>
    {error && <span role="alert" className="form-field__error">{error}</span>}
  </div>
}
