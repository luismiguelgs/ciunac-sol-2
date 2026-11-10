import { create } from 'zustand'
import { AppError } from '@/modules/shared/application/errors/app-error'
import { NewStudent, NewStudentBasicData } from './model'
import type { AcademicData, IdentityDocument } from './academic'

export type NewStudentDraft = {
  email: string
  basicData: NewStudentBasicData | null
  academicData: AcademicData | null
  identityDocument: IdentityDocument | null
}

export type NewStudentWriteRisk = 'safe_to_retry' | 'indeterminate'

export type NewStudentWorkflowState =
  | { status: 'initial'; draft: NewStudentDraft }
  | { status: 'editing'; draft: NewStudentDraft }
  | { status: 'submitting'; operation: 'registration'; draft: NewStudentDraft; request: NewStudent }
  | { status: 'submitting'; operation: 'notification' | 'code'; draft: NewStudentDraft; documentNumber: string }
  | { status: 'success'; draft: NewStudentDraft; documentNumber: string; receiptId: string }
  | { status: 'saved_notification_failed'; draft: NewStudentDraft; documentNumber: string; error: AppError }
  | { status: 'code_pending'; draft: NewStudentDraft; documentNumber: string }
  | { status: 'error'; draft: NewStudentDraft; error: AppError; writeRisk: NewStudentWriteRisk }

type NewStudentStore = {
  workflow: NewStudentWorkflowState
  initialize: (email: string) => void
  completeBasicData: (data: NewStudentBasicData) => void
  completeAcademicData: (data: AcademicData) => void
  completeIdentityDocument: (data: IdentityDocument) => void
  markCodePending: (documentNumber: string) => void
  beginRegistration: (request: NewStudent) => void
  completeRegistration: (documentNumber: string, receiptId: string) => void
  markNotificationFailed: (documentNumber: string, error: AppError) => void
  beginNotificationRetry: (documentNumber: string) => void
  beginCodeRetry: (documentNumber: string) => void
  markRegistrationFailed: (error: AppError, writeRisk: NewStudentWriteRisk) => void
  reset: () => void
}

const emptyDraft = (): NewStudentDraft => ({ email: '', basicData: null, academicData: null, identityDocument: null })
const initialWorkflow = (): NewStudentWorkflowState => ({ status: 'initial', draft: emptyDraft() })

const useNewStudentStore = create<NewStudentStore>((set) => ({
  workflow: initialWorkflow(),
  initialize: (email) => set({
    workflow: { status: 'editing', draft: { ...emptyDraft(), email: email.toLowerCase() } },
  }),
  completeBasicData: (basicData) => set((state) => ({
    workflow: { status: 'editing', draft: { ...state.workflow.draft, basicData,
      identityDocument: state.workflow.draft.basicData?.document.number === basicData.document.number
        && state.workflow.draft.basicData?.document.type === basicData.document.type ? state.workflow.draft.identityDocument : null } },
  })),
  completeAcademicData: (academicData) => set((state) => ({ workflow: { status: 'editing', draft: { ...state.workflow.draft, academicData } } })),
  completeIdentityDocument: (identityDocument) => set((state) => ({ workflow: { status: 'editing', draft: { ...state.workflow.draft, identityDocument } } })),
  markCodePending: (documentNumber) => set((state) => ({ workflow: { status: 'code_pending', draft: state.workflow.draft, documentNumber } })),
  beginRegistration: (request) => set((state) => ({
    workflow: { status: 'submitting', operation: 'registration', draft: state.workflow.draft, request },
  })),
  completeRegistration: (documentNumber, receiptId) => set((state) => ({
    workflow: { status: 'success', draft: state.workflow.draft, documentNumber, receiptId },
  })),
  markNotificationFailed: (documentNumber, error) => set((state) => ({
    workflow: { status: 'saved_notification_failed', draft: state.workflow.draft, documentNumber, error },
  })),
  beginNotificationRetry: (documentNumber) => set((state) => ({
    workflow: { status: 'submitting', operation: 'notification', draft: state.workflow.draft, documentNumber },
  })),
  beginCodeRetry: (documentNumber) => set((state) => ({ workflow: { status: 'submitting', operation: 'code', draft: state.workflow.draft, documentNumber } })),
  markRegistrationFailed: (error, writeRisk) => set((state) => ({
    workflow: { status: 'error', draft: state.workflow.draft, error, writeRisk },
  })),
  reset: () => set({ workflow: initialWorkflow() }),
}))

export default useNewStudentStore
