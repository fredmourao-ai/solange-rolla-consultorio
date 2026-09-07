'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserSupabaseClient } from '@/platform/supabase/browser'

type Enrollment = { factorId: string; qrCode: string; secret: string }
type Mode = 'loading' | 'unenrolled' | 'challenge' | 'enrollment' | 'verified'

function safeReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export function MfaPanel({ returnTo }: { returnTo?: string }) {
  const client = useMemo(() => createBrowserSupabaseClient(), [])
  const [mode, setMode] = useState<Mode>('loading')
  const [factorId, setFactorId] = useState('')
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const destination = safeReturnTo(returnTo)

  useEffect(() => {
    let active = true
    async function load() {
      const [aal, factors] = await Promise.all([client.auth.mfa.getAuthenticatorAssuranceLevel(), client.auth.mfa.listFactors()])
      if (!active) return
      if (aal.error || factors.error) { setError('Não foi possível verificar a segurança da sessão.'); setMode('unenrolled'); return }
      if (aal.data.currentLevel === 'aal2') { setMode('verified'); return }
      const verified = factors.data.totp[0]
      if (verified) { setFactorId(verified.id); setMode('challenge'); return }
      setMode('unenrolled')
    }
    void load()
    return () => { active = false }
  }, [client])

  async function enroll() {
    setBusy(true); setError('')
    const { data, error: enrollError } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Solange Rolla' })
    setBusy(false)
    if (enrollError) { setError('Não foi possível iniciar a configuração do autenticador.'); return }
    setFactorId(data.id)
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setMode('enrollment')
  }

  async function verify() {
    if (!factorId || !/^\d{6}$/.test(code.trim())) { setError('Informe o código de 6 dígitos do autenticador.'); return }
    setBusy(true); setError('')
    const { error: verifyError } = await client.auth.mfa.challengeAndVerify({ factorId, code: code.trim() })
    if (verifyError) { setBusy(false); setError('Código inválido ou expirado. Gere um novo código e tente novamente.'); return }
    const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
    setBusy(false)
    if (aalError || aal.currentLevel !== 'aal2') { setError('A confirmação não elevou a sessão para AAL2.'); return }
    setMode('verified')
    window.location.assign(destination)
  }

  return <section className="ui-card mfa-panel" aria-labelledby="mfa-title">
    <h2 id="mfa-title" className="ui-card__title">Autenticação em duas etapas</h2>
    <p>O acesso ao prontuário clínico exige um código temporário além da senha.</p>
    {mode === 'loading' && <p aria-live="polite">Verificando segurança da sessão…</p>}
    {mode === 'verified' && <p role="status">MFA verificado nesta sessão. O acesso clínico está liberado.</p>}
    {mode === 'unenrolled' && <button className="ui-button ui-button--primary" type="button" onClick={enroll} disabled={busy}>Configurar autenticador</button>}
    {mode === 'enrollment' && enrollment && <div className="mfa-enrollment">
      <p>Escaneie o QR code no aplicativo autenticador. Se preferir, digite a chave manualmente.</p>
      {/* Supabase returns a data URI containing only the enrollment secret for this signed-in user. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mfa-qr" src={enrollment.qrCode} alt="QR code para configurar o autenticador" />
      <label className="form-field"><span className="form-field__label">Chave secreta</span><input className="ui-input" type="text" readOnly value={enrollment.secret} autoComplete="off" /></label>
    </div>}
    {(mode === 'challenge' || mode === 'enrollment') && <div className="mfa-challenge">
      {mode === 'challenge' && <p>Abra o autenticador já configurado e informe o código atual.</p>}
      <label className="form-field"><span className="form-field__label">Código de 6 dígitos</span><input className="ui-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
      <button className="ui-button ui-button--primary" type="button" onClick={verify} disabled={busy}>{mode === 'enrollment' ? 'Ativar MFA' : 'Confirmar MFA'}</button>
    </div>}
    {error && <p role="alert" className="form-field__error">{error}</p>}
  </section>
}
