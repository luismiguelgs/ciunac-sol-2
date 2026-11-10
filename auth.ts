import NextAuth from 'next-auth'
import { createAuthConfig } from '@/modules/security/server/auth-config'

export const { handlers, auth, signIn, signOut } = NextAuth(() => createAuthConfig())
