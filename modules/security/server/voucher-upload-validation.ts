import 'server-only'

import { voucherFilePolicy } from '@/modules/shared/domain/voucher-file-policy'
import { validateFileUpload } from '@/modules/shared/infrastructure/server/file-upload-validation'

/** Aplica la politica comun de voucher y firma binaria; valida el archivo, no lo persiste. */
export function validateVoucherUpload(formData: FormData): Promise<File> {
  return validateFileUpload(formData, voucherFilePolicy)
}
