import { NewStudentProcess } from '@/modules/solicitud-nuevo'
import { getNewStudentPrograms } from '@/modules/solicitud-nuevo/server'
import EmptyState from '@/modules/shared/presentation/empty-state'
import { readNewStudentPageSession } from '@/modules/security/server/new-student-session'
import { availableNewStudentProviders } from '@/modules/security/server/auth-config'
import NewStudentAuthProvider from '@/modules/solicitud-nuevo/components/auth-provider'

export const dynamic = 'force-dynamic'

export default async function NewStudentPage() {
    const { session, serverNow } = await readNewStudentPageSession()
    const programs = await getNewStudentPrograms()

    if (programs.length === 0) {
        return (
            <main className="flex min-h-[60vh] items-center justify-center p-4">
                <EmptyState
                    title="No hay programas disponibles"
                    description="Q10 no tiene programas habilitados para el registro en este momento."
                    href="/"
                />
            </main>
        )
    }

    return (
        <>
            <NewStudentAuthProvider session={session}>
                <NewStudentProcess programs={programs} providers={availableNewStudentProviders()} serverNow={serverNow} />
            </NewStudentAuthProvider>
        </>
    )
}
