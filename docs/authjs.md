# Autenticación de alumno nuevo

Implementación local parcial de HU-AN-003 (SPEC-003) y RF-SEG-011/012 (SPEC-004): Google y correo/OTP. Microsoft aplazado por decisión del usuario para una siguiente iteración, incluso si existen sus variables de entorno. Revisión documental: pendiente de versionar. No acredita autorización de ficha, alta coordinada CIUNAC/Q10, aceptación OAuth real o despliegue.

## Configuración privada

Configurar fuera de Git, sin copiar valores al chat ni documentación:

| Variable | Uso |
| --- | --- |
| `AUTH_SECRET` | Secreto independiente de al menos 32 bytes para Auth.js |
| `APP_BASE_URL` | Origen permitido de escrituras y retornos del flujo |
| `AUTH_URL` | URL pública del portal; debe coincidir con APP_BASE_URL al operar detrás de un proxy |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Cliente OAuth Google |
| `OTP_SESSION_SECRET`, `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Desafío OTP y CAPTCHA existentes |
| `API_URL`, `API_KEY`, `API_KEY_Q10` | Mailer, BFF CIUNAC y catálogo Q10 existentes |

Registrar el retorno exacto sobre el origen configurado: `/api/auth/callback/google`. Solicitudes OIDC limitadas a `openid profile email`, con PKCE, state y nonce. Microsoft no se registra ni aparece en UI; sus variables se ignoran y sus sesiones previas dejan de ser válidas.

Google se habilita solo con ambos valores presentes. Sin sus credenciales, su botón queda deshabilitado y se ofrece correo/OTP. AUTH_SECRET sigue siendo obligatorio también para correo. Para una prueba local, configurar APP_BASE_URL y AUTH_URL como http://localhost:3000, registrar http://localhost:3000/api/auth/callback/google y reiniciar `pnpm dev --port 3000` después de modificar el entorno.

## Sesión y compatibilidad

Google y correo/OTP emiten la misma sesión JWT cifrada Auth.js, con plazo absoluto de 15 minutos. La cookie HttpOnly utiliza SameSite Lax para permitir el retorno OAuth y Secure en producción; las cookies anteriores mantienen SameSite Strict. El navegador recibe solo email, proveedor, estado de acreditación y vencimiento, sin access/refresh/id tokens.

Google acepta email_verified booleano y Gmail o hd de Workspace. Si falta evidencia o correo, el acceso queda pendiente y requiere CAPTCHA/OTP. El estado pendiente no autoriza registro ni notificación REGISTER. Microsoft permanece como requisito objetivo pendiente y no como proveedor activo.

`POST /api/security/otp/verify` mantiene `{email,purpose,code}` y `{ok:true}`. Para NUEVO usa Credentials; otros propósitos conservan su sesión. El BFF de registro Q10 y REGISTER requieren Auth.js verificado y ya no aceptan la cookie antigua NUEVO. No se amplían permisos de búsqueda, actualización o documentos. Los clientes antiguos deben recargar y volver a verificar el correo.

Cambiar de cuenta descarta el borrador editable. La sesión se recupera tras OAuth/recarga; el borrador continúa siendo efímero. El cambio de cuenta se bloquea durante operaciones y resultados que requieren evitar una nueva escritura. Login no crea estudiantes ni envía bienvenida. La notificación y el recibo mantienen sus limitaciones anteriores.

GAP-SEG-002 continúa abierto: cuotas, intentos y consumo del OTP dependen de cookie; no hay revocación central contra borrado/replay. Logout elimina la sesión del navegador, sin revocación distribuida de copias anteriores. No se agregó infraestructura ni base de autenticación.

## Pruebas aisladas

- `pnpm test`: políticas de correo, callbacks Auth.js, OTP y rutas/guardas con dobles.
- `pnpm test:e2e`: recorridos de navegador con Edge, OIDC/CAPTCHA/CIUNAC/Q10 simulados y bloqueo de red externa del servidor.
- `pnpm test:build`: build Webpack aislada, con fuentes de prueba y proveedores simulados; usa `.next-e2e`.
- `pnpm exec tsc --noEmit` y `pnpm lint`: comprobaciones estáticas.

El arnés de E2E reemplaza la configuración privada en su proceso hijo y precarga dobles desde tests; no hay bypass de autenticación en el código de aplicación. Los tokens y códigos de los fixtures son ficticios. Se necesita Microsoft Edge instalado para Playwright; el navegador de QA no modifica aplicaciones OAuth. La build aislada usa fuentes ficticias y no sirve para despliegue ni validación tipográfica.

La aceptación social contra Google real requiere credenciales/retorno configurados y comprobación posterior. No ejecutar altas, correos o escrituras reales como parte de estas suites. Microsoft se retomará en una iteración posterior.

La ampliación de [clasificación y documento](clasificacion-documento.md) conserva esta autenticación y agrega comprobantes cifrados para asociación del archivo y recuperación del código. REGISTER exige una operación completada del mismo correo/documento, además de la sesión Auth.js.
