import React from 'react'
import { normalizeAppError } from '@/modules/shared/application/errors/app-error'
import {
  registerNewStudent,
  retryNewStudentNotification,
} from '../client'
import { NewStudent } from '../model'
import useNewStudentStore, { NewStudentWriteRisk } from '../store'
import { retryStudentCode, sendNewStudentNotification } from '../infrastructure/new-student-client'

export type NewStudentRegisterDialogState = 'SAVE' | 'EMAIL' | 'EMAIL_ERROR' | 'CODE' | 'CODE_ERROR' | 'ERROR'

export function useRegisterNewStudent(onSuccess: (receiptId: string) => void) {
  const workflow = useNewStudentStore((state) => state.workflow)
  const beginRegistration = useNewStudentStore((state) => state.beginRegistration)
  const completeRegistration = useNewStudentStore((state) => state.completeRegistration)
  const markNotificationFailed = useNewStudentStore((state) => state.markNotificationFailed)
  const beginNotificationRetry = useNewStudentStore((state) => state.beginNotificationRetry)
  const beginCodeRetry = useNewStudentStore((state) => state.beginCodeRetry)
  const markRegistrationFailed = useNewStudentStore((state) => state.markRegistrationFailed)
  const [open, setOpen] = React.useState(false)
  const inFlight = React.useRef(false)
  const markCodePending = useNewStudentStore((state) => state.markCodePending)

  const submit = async (student: NewStudent) => {
    if (inFlight.current) return
    if (
      workflow.status === 'submitting'
      || workflow.status === 'saved_notification_failed'
      || workflow.status === 'success'
      || workflow.status === 'code_pending'
      || (workflow.status === 'error' && workflow.writeRisk === 'indeterminate')
    ) return

    inFlight.current = true
    beginRegistration(student)
    setOpen(true)
    try {
      const result = await registerNewStudent({ student })
      if (result.status === 'code_pending') {
        markCodePending(result.documentNumber)
        return
      }
      if (result.status === 'saved_notification_failed') {
        markNotificationFailed(result.documentNumber, result.error)
        return
      }
      completeRegistration(result.documentNumber, result.notificationReceiptId)
      setOpen(false)
      onSuccess(result.notificationReceiptId)
    } catch (error) {
      const appError = normalizeAppError(error, 'No se pudo confirmar el registro del estudiante.')
      const writeRisk: NewStudentWriteRisk = appError.code === 'NETWORK' || appError.code === 'EXTERNAL_SERVICE' || appError.status === 409
        ? 'indeterminate'
        : 'safe_to_retry'
      markRegistrationFailed(appError, writeRisk)
    } finally { inFlight.current = false }
  }

  const retryCode = async () => {
    if (inFlight.current || workflow.status !== 'code_pending') return
    inFlight.current = true
    const documentNumber = workflow.documentNumber
    beginCodeRetry(documentNumber)
    setOpen(true)
    try {
      const confirmedDocument = await retryStudentCode()
      try {
        const receiptId = await sendNewStudentNotification(confirmedDocument)
        completeRegistration(confirmedDocument, receiptId); setOpen(false); onSuccess(receiptId)
      } catch (cause) { markNotificationFailed(confirmedDocument, normalizeAppError(cause, 'El código se guardó; la notificación sigue pendiente.')) }
    } catch { markCodePending(documentNumber) }
    finally { inFlight.current = false }
  }

  const retryEmail = async () => {
    if (inFlight.current || workflow.status !== 'saved_notification_failed') return
    inFlight.current = true
    const documentNumber = workflow.documentNumber
    beginNotificationRetry(documentNumber)
    setOpen(true)
    try {
      const receiptId = await retryNewStudentNotification(documentNumber)
      completeRegistration(documentNumber, receiptId)
      setOpen(false)
      onSuccess(receiptId)
    } catch (error) {
      markNotificationFailed(
        documentNumber,
        normalizeAppError(error, 'No se pudo procesar el correo de confirmacion.'),
      )
    } finally { inFlight.current = false }
  }

  const loading = workflow.status === 'submitting'
  const writeBlocked = workflow.status === 'saved_notification_failed'
    || workflow.status === 'code_pending'
    || workflow.status === 'success'
    || (workflow.status === 'error' && workflow.writeRisk === 'indeterminate')
  const dialogState: NewStudentRegisterDialogState = workflow.status === 'submitting'
    ? workflow.operation === 'notification' ? 'EMAIL' : workflow.operation === 'code' ? 'CODE' : 'SAVE'
    : workflow.status === 'code_pending' ? 'CODE_ERROR'
    : workflow.status === 'saved_notification_failed'
      ? 'EMAIL_ERROR'
      : workflow.status === 'error'
        ? 'ERROR'
        : 'SAVE'
  const message = workflow.status === 'code_pending'
    ? 'El estudiante fue registrado. Falta guardar su código de alumno en CIUNAC; reintenta solo ese guardado.'
    : workflow.status === 'saved_notification_failed'
    ? `${workflow.error.message} El estudiante con documento ${workflow.documentNumber} ya fue registrado.`
    : workflow.status === 'error'
      ? workflow.writeRisk === 'indeterminate'
        ? `${workflow.error.message} No vuelva a enviar el formulario; comuníquese con CIUNAC para confirmar el registro.`
        : workflow.error.message
      : ''

  return {
    workflow,
    loading,
    writeBlocked,
    open,
    setOpen,
    dialogState,
    message,
    submit,
    retryEmail,
    retryCode,
  }
}
