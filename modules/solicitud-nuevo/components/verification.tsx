'use client'

import React from 'react'
import { signIn, useSession } from 'next-auth/react'
import ReCAPTCHA from 'react-google-recaptcha'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { isVerifiedNewStudentSession } from '@/modules/security/domain/new-student-auth'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requestOtp, verifyOtp } from '@/modules/security/client/security-client'
import { useOtpTimers } from '@/modules/security/client/use-otp-timers'
import { initialValues, type IVerificationSchema, verificationSchema } from '@/modules/shared/schemas/verification.schema'
import EmailVerificationPanel from './email-verification-panel'

type Props = {
  handleNext: () => Promise<void>
  providers: { google: boolean }
}

export default function Verification({ handleNext, providers }: Props) {
  const { data: session } = useSession()
  const [socialPending, setSocialPending] = React.useState(false)
  const [authError, setAuthError] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [announcement, setAnnouncement] = React.useState('')
  const [requesting, setRequesting] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [codeRequested, setCodeRequested] = React.useState(false)
  const [compactCaptcha, setCompactCaptcha] = React.useState(true)
  const captchaRef = React.useRef<ReCAPTCHA>(null)
  const focusAfterTransition = React.useRef<'email' | 'code' | null>(null)
  const otpTimers = useOtpTimers()
  const blocked = requesting || verifying || socialPending
  const form = useForm<IVerificationSchema>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { ...initialValues, email: session?.user?.email ?? '' },
  })

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 479px)')
    const update = () => setCompactCaptcha(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  React.useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error')
    if (error) window.requestAnimationFrame(() => setAuthError(true))
  }, [])

  React.useEffect(() => {
    if (!blocked && focusAfterTransition.current) {
      form.setFocus(focusAfterTransition.current)
      focusAfterTransition.current = null
    }
  }, [blocked, codeRequested, form])

  React.useEffect(() => {
    if (!otpTimers.expired) return
    form.setValue('code', '')
    form.clearErrors('code')
  }, [form, otpTimers.expired])

  const socialSignIn = async () => {
    if (blocked || !providers.google) return
    setAuthError(false)
    setSocialPending(true)
    try { await signIn('google', { redirectTo: '/solicitud-nuevo' }) }
    catch { setAuthError(true); setSocialPending(false) }
  }

  const onSubmit = async (data: IVerificationSchema) => {
    if (blocked || !codeRequested || otpTimers.expired) return
    setError(null)
    setVerifying(true)
    try {
      await verifyOtp(data.email, 'NUEVO', data.code)
      await handleNext()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo verificar el código. Intenta nuevamente.')
      focusAfterTransition.current = 'code'
    } finally { setVerifying(false) }
  }

  const requestCode = async () => {
    if (blocked || (codeRequested && !otpTimers.canResend)) return
    setError(null)
    if (!await form.trigger('email', { shouldFocus: true })) return
    const captchaToken = captchaRef.current?.getValue()
    if (!captchaToken) {
      setError('Confirma que no eres un robot antes de solicitar el código.')
      return
    }
    setRequesting(true)
    try {
      const email = form.getValues('email').trim()
      const timing = await requestOtp(email, 'NUEVO', captchaToken)
      form.setValue('email', email)
      form.setValue('code', '')
      form.clearErrors('code')
      focusAfterTransition.current = 'code'
      setCodeRequested(true)
      otpTimers.start(timing)
      setAnnouncement(codeRequested ? 'Solicitamos un nuevo código. Revisa tu correo.' : 'Revisa tu correo e ingresa el código de 6 dígitos.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo enviar el código. Intenta nuevamente.')
    } finally {
      captchaRef.current?.reset()
      setRequesting(false)
    }
  }

  const changeEmail = () => {
    if (blocked) return
    focusAfterTransition.current = 'email'
    setCodeRequested(false)
    otpTimers.reset()
    form.setValue('code', '')
    form.clearErrors('code')
    setError(null)
    setAuthError(false)
    setAnnouncement('Puedes corregir tu correo y solicitar un nuevo código.')
    captchaRef.current?.reset()
  }

  const captcha = <div className="flex justify-center">
    <ReCAPTCHA key={compactCaptcha ? 'compact' : 'normal'} size={compactCaptcha ? 'compact' : 'normal'}
      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string} ref={captchaRef} />
  </div>

  const alternatives = <div className="space-y-5">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center sm:p-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Accede con tu cuenta de Google</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Usa tu cuenta y continúa con tu registro.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-13 w-full cursor-pointer gap-2 rounded-xl border-slate-300 bg-white px-2 text-sm sm:text-base font-semibold text-slate-800 shadow-sm hover:border-primary/50 hover:bg-blue-50 hover:text-slate-900 hover:shadow-md focus-visible:border-primary focus-visible:ring-primary/30 dark:bg-white"
            disabled={!providers.google || blocked}
            aria-busy={socialPending}
            onClick={() => void socialSignIn()}
          >
            {socialPending ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : (
              <svg aria-hidden="true" focusable="false" className="size-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.31.32-1.92V7.49H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.51l3.34-2.59Z" />
                <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59C7.18 7.71 9.39 5.95 12 5.95Z" />
              </svg>
            )}
            <span>Continuar con Google</span>
          </Button>
          {socialPending && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">Conectando con Google...</p>}
          {!providers.google && <p className="text-sm text-slate-600 dark:text-slate-300">Google aún no está configurado. Puedes acceder con correo y código.</p>}
        </div>

    {session?.newStudent && !session.newStudent.emailVerified && <p role="status" className="text-center text-sm">Para continuar, verifica tu correo con un código.</p>}
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <p className="text-center text-sm text-slate-600 dark:text-slate-300">O usa tu correo electrónico</p>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  </div>

  return (
    <form noValidate onSubmit={(event) => {
      event.preventDefault()
      if (codeRequested) void form.handleSubmit(onSubmit)()
      else void requestCode()
    }} className="mx-auto w-full max-w-lg min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-7">
      {authError && <p role="alert" className="mb-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive">No se completó el acceso. Puedes reintentar o elegir otra alternativa.</p>}
      {isVerifiedNewStudentSession(session) ? <div className="space-y-4 text-center">
        <ShieldCheck aria-hidden="true" className="mx-auto size-10 text-primary" />
        <h2 className="text-2xl font-semibold">Tu correo está verificado</h2>
        <p className="break-all text-sm">Correo validado: {session?.user?.email}</p>
        <Button type="button" className="min-h-12 w-full text-base" disabled={blocked}
          onClick={async () => {
            setVerifying(true)
            setError(null)
            try { await handleNext() }
            catch { setError('No se pudo continuar. Vuelve a verificar tu correo.') }
            finally { setVerifying(false) }
          }}>Continuar con este correo</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div> : <EmailVerificationPanel form={form} codeRequested={codeRequested}
        requesting={requesting} verifying={verifying} blocked={blocked}
        expired={otpTimers.expired} canResend={otpTimers.canResend}
        expirationSeconds={otpTimers.expirationSeconds} resendSeconds={otpTimers.resendSeconds}
        error={error} announcement={otpTimers.expired ? 'El código expiró. Solicita uno nuevo para continuar.' : announcement} captcha={captcha} alternatives={alternatives}
        onRequestCode={() => void requestCode()} onChangeEmail={changeEmail} />}
    </form>
  )
}
