import type { DefaultSession } from 'next-auth'
import 'next-auth/jwt'
import type { NewStudentAuth } from './domain/new-student-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user']
    newStudent?: NewStudentAuth
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    newStudent?: NewStudentAuth
  }
}
