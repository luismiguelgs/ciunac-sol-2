# Condición académica y documento de alumno nuevo

Entrega local de 2026-11-06, America/Lima. SPEC-003 HU-AN-005, RF-AN-012/017, CA-AN-016..019/030..035 y TASK-AN-010/016/017. Revisión documental pendiente de versionar. No se modificó backend ni base; no se realizaron altas, correos o uploads reales.

## Recorrido

Google o correo/OTP → Datos básicos → Condición académica → Documento de identidad → Resumen/consentimientos → Registro.

Seleccionar PG (público general), PRE (pregrado UNAC) o POS (posgrado UNAC). PRE/POS requieren facultad, escuela de la facultad/nivel y código de alumno. Las facultades se comparten y las escuelas sin tipo no se ofrecen. Al cambiar a PG se conservan los valores académicos completos/parciales y null solo donde no hay valor. Al volver a PRE/POS se revalida escuela; cambiar facultad invalida escuela. Sin catálogo no se inventan opciones; PG sin datos académicos puede continuar.

Documento obligatorio: un PDF/JPG/PNG legible, ambas caras del DNI o CE, hasta 8 MiB. Se muestra el nombre y preview local de imágenes. Al continuar, el BFF valida sesión NUEVO, Origin, tamaño real, MIME/extensión y firma; fija carpeta DNIS y nombre generado. No admite folder/fileId arbitrarios. Solo avanza después de upload confirmado. Cambiar cuenta/documento invalida la asociación en el borrador y el servidor comprueba correo/documento/viewLink contra comprobante cifrado.

El usuario confirmó usar la política actual de Drive: cualquiera con el enlace puede leer el archivo. Se informa antes de subir. No se solicitan permisos Drive al login Google. Un abandono o reemplazo puede dejar archivos sin asociar; la API no ofrece aquí borrado/compensación automática.

## Contrato consumido

Se consultó exclusivamente OpenAPI del backend configurado, versión 1.4.7, con autorización explícita y sin consultar alumnos. GET facultades/escuelas proporciona catálogos. POST upload/DNIS recibe multipart file/nombre y devuelve success/id/name/folder/viewLink/downloadLink. La referencia a guardar es viewLink como imgDoc; no un campo url.

POST q10/estudiantes admite tipoEstudiante, facultadId, escuelaId e imgDoc; esos campos se guardan solo en CIUNAC (tipo_estudiante para la categoría), no en Q10. Direccion, Lugar_nacimiento, Lugar_residencia, Consecutivo_sedejornada y Consecutivo_periodo son opcionales y los resuelve backend. El portal conserva el payload personal existente y no inventa esos valores.

Codigo no figura en el DTO del alta: el BFF lo separa y, solo tras status COMPLETED, programaRegistrado=true e ID/documento coincidente, ejecuta PATCH estudiantes/{id} con codigo. El ID siempre procede de esa operación y no de un parámetro arbitrario del navegador. PG con codigo null no ejecuta PATCH; con valor previo lo conserva también en CIUNAC.

## Resultados y recuperación

Solo después de alta coordinada confirmada y guardado del código se permite REGISTER para el mismo correo/documento. Si falla PATCH, el resultado CODE_PENDING bloquea una segunda alta y permite reintentar solo el código. El comprobante cifrado permite recuperar ese estado al recargar durante su vigencia de 15 minutos; se requiere sesión vigente del mismo correo. El reintento ignora datos elegidos por el cliente y rechaza campos extra. Tras código confirmado puede reintentarse únicamente el correo si falla.

Fallos parciales/inciertos, respuesta genérica, 204, programa no registrado o documento discordante no son éxito y bloquean repetir Q10 en ese flujo. El portal conserva las guardas de UI y comprobantes por cookie; esto no demuestra idempotencia distribuida ni recuperación durable ante caída del proceso/borrado de cookies. GAP-SEG-002 sigue abierto. El recibo mailer acredita aceptación HTTP, no entrega SMTP.

## Interfaces del portal

- GET /api/solicitud-nuevo/catalogos: requiere Auth.js NUEVO; proyección de catálogos sin relaciones de alumnos.
- POST /api/solicitud-nuevo/documento: multipart file/documentType/documentNumber; emite comprobante HttpOnly y devuelve metadatos validados.
- GET /api/solicitud-nuevo/codigo: estado none/code_pending/completed/indeterminate del mismo correo, no-store.
- POST /api/solicitud-nuevo/codigo: JSON vacío, Origin y comprobante del mismo correo; reintenta únicamente codigo.
- POST /api/ciunac/q10/estudiantes: clasificación, codigo e imgDoc obligatorios en el contrato del portal; codigo se proyecta fuera del payload proveedor.

Las cookies nuevas usan el secreto OTP existente, cifrado AES-GCM, HttpOnly y SameSite Strict; no hay nueva variable de entorno. Los clientes de registro anteriores deben recargar el flujo y completar los pasos nuevos. Se mantiene Google/OTP; Microsoft y edición de fichas existentes siguen pendientes.

Consultar evidencia y resultados de la entrega en [ciunac-specs](../../ciunac-specs/docs/validacion-clasificacion-documento-2026-11-06.md).
