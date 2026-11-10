'use client'

import { useId, type ReactNode } from 'react'
import Image from 'next/image'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { ArrowRight, Loader2, Mail, Pencil, RotateCw, ShieldCheck } from 'lucide-react'
import InputField from '@/components/forms/input.field'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { formatOtpTime } from '@/modules/security/client/use-otp-timers'
import type { IVerificationSchema } from '@/modules/shared/schemas/verification.schema'

type Props = {
  form: UseFormReturn<IVerificationSchema>
  codeRequested: boolean
  requesting: boolean
  verifying: boolean
  blocked: boolean
  expired: boolean
  canResend: boolean
  expirationSeconds: number | null
  resendSeconds: number | null
  error: string | null
  announcement: string
  captcha: ReactNode
  alternatives: ReactNode
  onRequestCode: () => void
  onChangeEmail: () => void
}

const actionClass = 'min-h-12 w-full gap-2 rounded-xl px-3 text-sm sm:text-base whitespace-normal'

/** Local presentation only. Authentication, requests and navigation belong to Verification. */
export default function EmailVerificationPanel({
  form, codeRequested, requesting, verifying, blocked, expired, canResend,
  expirationSeconds, resendSeconds, error, announcement, captcha, alternatives,
  onRequestCode, onChangeEmail,
}: Props) {
  const id = useId()
  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <Image src="/images/email-verification.png" alt="" aria-hidden="true" width={112} height={112}
          className="mx-auto hidden size-28 object-contain md:block" />
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary md:hidden">
          {codeRequested ? <Mail aria-hidden="true" className="size-6" /> : <ShieldCheck aria-hidden="true" className="size-6" />}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">{codeRequested ? 'Revisa tu correo' : 'Verifica tu correo'}</h2>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {codeRequested ? 'Ingresa el código de 6 dígitos para continuar.' : 'Usaremos este correo para continuar con tu registro.'}
        </p>
      </div>

      {!codeRequested && alternatives}

      <ol aria-label="Pasos de verificación por correo" className="flex items-center justify-center gap-3 text-sm">
        <li aria-current={!codeRequested ? 'step' : undefined} className="flex items-center gap-3">
          <span className={!codeRequested ? 'font-semibold text-primary' : 'text-slate-600 dark:text-slate-300'}><span aria-hidden="true">1. </span>Correo</span>
          <ArrowRight aria-hidden="true" className="size-4 text-slate-600 dark:text-slate-300" />
        </li>
        <li aria-current={codeRequested ? 'step' : undefined} className={codeRequested ? 'font-semibold text-primary' : 'text-slate-600 dark:text-slate-300'}>
          <span aria-hidden="true">2. </span>Código
        </li>
      </ol>

      {/* Only meaningful events are announced; countdowns below are deliberately not live. */}
      <p role="status" aria-atomic="true" className="sr-only">{announcement}</p>
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      {!codeRequested ? (
        <div className="space-y-4">
          <InputField control={form.control} name="email" type="email" autoComplete="email"
            label="Correo electrónico" placeholder="tu.correo@ejemplo.com" readOnly={blocked}
            className="h-12 rounded-xl text-base md:text-base" />
          <p className="text-sm text-slate-600 dark:text-slate-300">Confirma que no eres un robot y solicita tu código.</p>
          {captcha}
          <Button type="submit" disabled={blocked} aria-busy={requesting} className={actionClass}>
            {requesting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Mail aria-hidden="true" className="size-4" />}
            {requesting ? 'Enviando código...' : 'Enviar código'}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border bg-muted/40 p-4 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-300">Correo de destino</p>
            <p className="mt-1 break-all text-base font-semibold">{form.getValues('email')}</p>
            <Button type="button" variant="ghost" disabled={blocked} onClick={onChangeEmail}
              className="mt-1 min-h-11 gap-2 text-sm text-primary">
              <Pencil aria-hidden="true" className="size-4" />Cambiar correo
            </Button>
          </div>
          <Controller control={form.control} name="code" render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id}>Código de verificación</FieldLabel>
              <InputOTP {...field} id={id} value={field.value ?? ''} maxLength={6} inputMode="numeric"
                autoComplete="one-time-code" pattern="^[0-9]*$" disabled={blocked || expired}
                aria-invalid={fieldState.invalid} aria-describedby={`${id}-help${fieldState.error ? ` ${id}-error` : ''}`}
                containerClassName="w-full justify-center" className="text-base">
                <InputOTPGroup className="w-full max-w-80">
                  {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index}
                    className="h-12 w-auto min-w-0 flex-1 text-xl" aria-invalid={fieldState.invalid} />)}
                </InputOTPGroup>
              </InputOTP>
              <p id={`${id}-help`} className="text-center text-sm text-slate-600 dark:text-slate-300">Puedes escribir o pegar el código completo.</p>
              {fieldState.error && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
            </Field>
          )} />
          <p className={`text-center text-sm ${expired ? 'font-medium text-destructive' : 'text-slate-600 dark:text-slate-300'}`}>
            {expired ? 'El código expiró. Solicita uno nuevo para continuar.' : <>Código válido por <span className="font-medium tabular-nums">{formatOtpTime(expirationSeconds)}</span></>}
          </p>
          {!expired && <Button type="submit" disabled={blocked} aria-busy={verifying} className={actionClass}>
            {verifying ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
            {verifying ? 'Verificando...' : 'Verificar código y continuar'}
          </Button>}
          <div className="space-y-3 border-t pt-4">
            <p className="text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">¿No encuentras el mensaje? Revisa tu carpeta de spam o correo no deseado.</p>
            {canResend ? <>
              <p className="text-center text-sm text-slate-600 dark:text-slate-300">Confirma que no eres un robot para solicitar otro código.</p>
              {captcha}
              <Button type="button" variant={expired ? 'default' : 'outline'} disabled={blocked}
                aria-busy={requesting} onClick={onRequestCode} className={actionClass}>
                {requesting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RotateCw aria-hidden="true" className="size-4" />}
                {requesting ? 'Enviando código...' : 'Reenviar código'}
              </Button>
            </> : <p className="text-center text-sm text-slate-600 dark:text-slate-300">Podrás reenviar el código en <span className="font-medium tabular-nums">{formatOtpTime(resendSeconds)}</span>.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
