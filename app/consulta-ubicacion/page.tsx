import { ConsultaForm } from '@/modules/consultas'
import ConsultaPage from '@/modules/shared/presentation/consulta-wrapper'

export default function ConsultaUbicacionPage() {
	return (
		<ConsultaPage>
			<ConsultaForm solicitud='EXAMEN' />
		</ConsultaPage>
	)
}

