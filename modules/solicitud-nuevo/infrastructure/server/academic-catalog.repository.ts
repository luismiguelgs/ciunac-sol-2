import 'server-only'
import { ciunacRequest } from '@/modules/security/server/ciunac-client'
import { academicCatalogSchema } from '../../academic'

export async function getAcademicCatalog() {
  const [facultades, escuelas] = await Promise.all([ciunacRequest('facultades'), ciunacRequest('escuelas')])
  return academicCatalogSchema.parse({ facultades, escuelas })
}
