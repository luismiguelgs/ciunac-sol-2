# Visibilidad del acceso Google — alumno nuevo

Fecha: 2026-10-15, America/Lima. Trabajo local; revisión documental pendiente de versionar.

Trazabilidad: [SPEC-003 / HU-AN-003, RF-AN-009, CA-AN-009..011](../../ciunac-specs/specs/003-alumno-nuevo/spec.md), [plan](../../ciunac-specs/specs/003-alumno-nuevo/plan.md), [TASK-AN-009 y TASK-AN-014](../../ciunac-specs/specs/003-alumno-nuevo/tasks.md). Alcance vigente: [ADR-006](../../ciunac-specs/architecture/decisions/006-google-otp-microsoft-aplazado.md). Se conserva el [contrato de autenticación](../../ciunac-specs/contracts/auth-alumno-nuevo.openapi.yaml).

Brecha observada: el acceso Google usaba el botón outline por defecto, de 28 px de alto, sin logotipo y con poca separación visual del formulario OTP. El usuario solicita mayor visibilidad.

Plan y tarea local: destacar la alternativa Google con un bloque de fondo suave, botón de ancho adaptable y 52 px de alto, logotipo multicolor, texto legible y estados de foco y carga; separar visualmente la alternativa de correo/OTP. Conservar nombre accesible, disponibilidad del proveedor y acción OAuth. No cambian rutas ni interfaces HTTP.

Implementación local: `modules/solicitud-nuevo/components/verification.tsx`, sobre base `605e1eb` con cambios locales previos. Se mantiene el nombre accesible «Continuar con Google» también durante la carga; el logotipo decorativo no añade texto al lector de pantalla.

Verificación ejecutada el 2026-10-15, America/Lima:

- `pnpm exec eslint modules/solicitud-nuevo/components/verification.tsx`: aprobado.
- `pnpm exec tsc --noEmit`: aprobado.
- `pnpm test:build`: compilación aislada aprobada.
- `pnpm exec playwright test`: 10/10 aprobadas con proveedores simulados; incluye TEST-AN-009/010/011, acceso por correo, cancelación, configuración Google ausente y regresiones de sesión.
- Inspección visual de capturas Edge mediante script temporal de Playwright: escritorio 1366×1000 y móvil 390×844. Botón de 52 px, texto de 16 px y ancho de 462/258 px respectivamente; habilitado, con foco de teclado y sin desbordamiento horizontal. Capturas con fuentes de prueba y recursos externos bloqueados; no validan tipografía de producción ni CAPTCHA real.

Los recorridos de navegador se ejecutaron fuera del sandbox tras comprobar que este bloqueaba sockets localhost. Se usaron exclusivamente datos y proveedores simulados. No acredita OAuth real ni despliegue, ni cierra los criterios completos de la spec.
