'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function NewStudentAuthProvider({ session, children }: {
  session: Session | null
  children: React.ReactNode
}) {
  return <SessionProvider session={session} refetchInterval={30}>{children}</SessionProvider>
}
