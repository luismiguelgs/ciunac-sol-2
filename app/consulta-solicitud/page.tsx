import { ConsultaForm } from '@/modules/consultas'
import ConsultaPage from "@/modules/shared/presentation/consulta-wrapper"

export default function ConsultaSolicitudPage() 
{
	return (
		<ConsultaPage>
			<ConsultaForm solicitud='CERTIFICADO' />
		</ConsultaPage>
	)
}

