'use client'

import React from 'react'
import { getSession, signOut, useSession } from 'next-auth/react'
import { isVerifiedNewStudentSession } from '@/modules/security/domain/new-student-auth'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Stepper } from '@/components/stepper'
import { normalizeAppError } from '@/modules/shared/application/errors/app-error'
import type { NewStudentProgramOption } from '../model'
import type { IBasicInfoSchema } from './basic-info.schema'
import { toNewStudentBasicData } from './new-student-form.mapper'
import useNewStudentStore from '../store'
import Verification from './verification'
import BasicData from './basic-data'
import Register from './register'
import AcademicDataStep from './academic-data'
import IdentityDocumentStep from './identity-document'
import { requestJson } from '@/modules/shared/infrastructure/http/browser-http'

const STEPS = ['Verificación', 'Datos básicos', 'Condición académica', 'Documento', 'Registro']

type Props = {
  programs: NewStudentProgramOption[]
  providers: { google: boolean }
  serverNow: number
}

export default function NewStudentProcess({ programs, providers, serverNow }: Props) {
  const { data: session, update } = useSession()
  const workflow = useNewStudentStore((state) => state.workflow)
  const initialize = useNewStudentStore((state) => state.initialize)
  const completeBasicData = useNewStudentStore((state) => state.completeBasicData)
  const reset = useNewStudentStore((state) => state.reset)
  const completeAcademicData = useNewStudentStore((state) => state.completeAcademicData)
  const completeIdentityDocument = useNewStudentStore((state) => state.completeIdentityDocument)
  const [activeStep, setActiveStep] = React.useState(() => isVerifiedNewStudentSession(session, serverNow) ? 1 : 0)
  const [now, setNow] = React.useState(serverNow)
  const [switching, setSwitching] = React.useState(false)
  const validSession = isVerifiedNewStudentSession(session, now)
  const email = validSession ? session?.user?.email : null

  React.useEffect(() => {
    reset()
  }, [reset])

  React.useEffect(() => {
    if (email && useNewStudentStore.getState().workflow.draft.email !== email) initialize(email)
  }, [email, initialize])
  React.useEffect(() => {
    if (!email) return
    let cancelled = false
    void requestJson<{ status: string; documentNumber?: string }>('/api/solicitud-nuevo/codigo', 'GET').then((result) => {
      if (cancelled || !result.documentNumber) return
      const store = useNewStudentStore.getState()
      if (result.status === 'code_pending') store.markCodePending(result.documentNumber)
      if (result.status === 'completed') store.markNotificationFailed(result.documentNumber, normalizeAppError(new Error(), 'El registro está guardado. Puedes reintentar únicamente la notificación.'))
      if (result.status === 'indeterminate') store.markRegistrationFailed(normalizeAppError(new Error(), 'Hay un registro pendiente de confirmar. Contacta a CIUNAC antes de volver a registrar.'), 'indeterminate')
    }).catch(() => { /* Protected writes still validate recovery state on the server. */ })
    return () => { cancelled = true }
  }, [email])

  React.useEffect(() => {
    const expiresAt = session?.newStudent?.expiresAt
    if (!expiresAt) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, expiresAt - Date.now()) + 1)
    return () => window.clearTimeout(timer)
  }, [session?.newStudent?.expiresAt])

  const handleVerification = async () => {
    const confirmed = await getSession()
    if (!isVerifiedNewStudentSession(confirmed)) {
      toast.add({ type: 'warning', title: 'Debes validar tu correo para continuar.' })
      return
    }
    if (useNewStudentStore.getState().workflow.draft.email !== confirmed!.user!.email) initialize(confirmed!.user!.email!)
    await update()
    setNow(Date.now())
    setActiveStep(1)
  }

  const writeBlocked = workflow.status === 'submitting' || workflow.status === 'success'
    || workflow.status === 'code_pending'
    || workflow.status === 'saved_notification_failed'
    || (workflow.status === 'error' && workflow.writeRisk === 'indeterminate')
  const changeAccount = async () => {
    setSwitching(true)
    try {
      await signOut({ redirect: false })
      reset()
      setActiveStep(0)
      await update()
    } finally { setSwitching(false) }
  }

  const handleBasicData = (values: IBasicInfoSchema) => {
    try {
      completeBasicData(toNewStudentBasicData(values, programs))
      setActiveStep(2)
    } catch (error) {
      toast.add({
        type: 'error',
        title: normalizeAppError(error, 'Los datos del alumno no son válidos.').message,
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center">
      {session?.newStudent && <div className="flex flex-wrap items-center justify-center gap-3 p-3">
        <span>{validSession ? `Correo validado: ${email}` : 'Verifica tu correo antes de continuar.'}</span>
        <Button type="button" variant="outline" disabled={switching || writeBlocked} onClick={() => void changeAccount()}>Cambiar de cuenta</Button>
      </div>}
      {!validSession && workflow.draft.email && <p role="alert">Tu sesión venció. Verifica de nuevo el mismo correo para continuar.</p>}
      <Stepper steps={STEPS} activeStep={validSession ? (writeBlocked ? 4 : activeStep) : 0}>
        <Verification
          handleNext={handleVerification}
          providers={providers}
        />
        <BasicData
          programs={programs}
          defaultData={workflow.draft.basicData}
          activeStep={activeStep}
          steps={STEPS}
          setActiveStep={setActiveStep}
          handleNext={handleBasicData}
        />
        <AcademicDataStep activeStep={2} steps={STEPS} setActiveStep={setActiveStep} defaultData={workflow.draft.academicData}
          handleNext={(data) => { completeAcademicData(data); setActiveStep(3) }} />
        {workflow.draft.basicData ? <IdentityDocumentStep document={workflow.draft.basicData.document}
          saved={workflow.draft.identityDocument} onBack={() => setActiveStep(2)}
          onComplete={(data) => { completeIdentityDocument(data); setActiveStep(4) }} /> : <p>Completa tus datos básicos.</p>}
        <Register activeStep={4} steps={STEPS} setActiveStep={setActiveStep} />
      </Stepper>
    </div>
  )
}
