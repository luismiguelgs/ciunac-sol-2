# Límites de campos de alumno nuevo

2026-11-10, America/Lima. Base `605e1eb` con cambios previos; revisión documental pendiente de versionar. SPEC-003 / RF-AN-012, CA-AN-016..019/030, TASK-AN-010/016; [plan vigente](../../ciunac-specs/specs/003-alumno-nuevo/clasificacion-documento-plan.md).

Brecha: código de alumno permitía hasta 50 caracteres. Decisión del usuario: máximo 10 caracteres. Plan/tarea: compartir el límite y schema entre formulario/dominio/BFF, usar Input y FieldDescription existentes y documentar la restricción del contrato observado del portal. Mantener caracteres alfanuméricos y signos aceptados; no convertirlo en un campo exclusivamente numérico ni exigir longitud exacta. Conservar null para PG y obligatoriedad PRE/POS. No truncar silenciosamente datos de borradores existentes al validar ni cambiar el contrato del proveedor externo.

El usuario confirmó mantener nombres/apellidos hasta 80, teléfono 9, DNI 8 y CE 9 caracteres. Se aplican maxLength mediante InputField existente y máscaras de @react-input/mask. Se corrige la discrepancia de máscaras de nombres (30/31 frente a los 80 del schema) y se usa una referencia independiente por campo. Documento cambia longitud y máscara según DNI/CE; no se recortan datos existentes al cambiar de tipo, que deben volver a validarse. No se modifican componentes compartidos ni el código de programa/idioma.

## Evidencia ejecutada

Lint de los componentes/schemas modificados y `pnpm test:build` (incluido TypeScript) aprobados. `pnpm test`: 65/65 aprobadas; los tres escenarios nuevos PG/PRE/POS aceptan código de 10 y rechazan 11 tanto en dominio como en schema de transporte del BFF.

`pnpm exec playwright test tests/e2e/auth.spec.ts --grep "New student text controls|PRE filters|POS has|academic and document"`: 4/4 aprobadas con Google/CAPTCHA/backend simulados. Se verificó inserción de cadenas completas de 81 letras en cada nombre/apellido (resultado 80), teléfono de 10 dígitos (resultado 9), DNI de 9 (resultado 8), CE alfanumérico largo (resultado 9), cambio DNI/CE, código de 11 (resultado 10) e intento de agregar un carácter al completar el máximo. El formulario permite avanzar con estos límites; PRE/POS, conservación al pasar por PG y móvil continúan funcionando.

Contrato observado actualizado en `ciunac-specs/contracts/portal-observado.openapi.yaml`: `codigo.maxLength` pasa de 50 a 10. Esta restricción corresponde al portal; no certifica ni modifica al proveedor. No se alteran los comprobantes de recuperación previamente emitidos. No se ejecutaron registros reales ni despliegue; revisión documental pendiente de versionar.
