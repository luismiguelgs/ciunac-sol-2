# CIUNAC — Portal público

Portal Next.js para consulta pública de certificados, seguimiento de solicitudes y registro de alumno nuevo. Documentación consolidada al **2026-10-15**; distingue código observado, cambios locales y aceptación pendiente.

## Documentación y flujo SDD

La fuente central es [ciunac-specs](../ciunac-specs/README.md). Leer primero [memoria estable](../ciunac-specs/memory.md), [convenciones SDD](../ciunac-specs/conventions.md) e [inventario de rutas y funcionalidades](../ciunac-specs/docs/inventario-portal.md).

| Spec | Capacidad | Situación del corte |
| --- | --- | --- |
| [SPEC-001](../ciunac-specs/specs/001-consulta-certificado/spec.md) | Certificado por QR | Código observado; aceptación integral pendiente |
| [SPEC-002](../ciunac-specs/specs/002-consulta-solicitud/spec.md) | Solicitudes, cargo PDF y documentos digitales | Código observado; aceptación pendiente |
| [SPEC-003](../ciunac-specs/specs/003-alumno-nuevo/spec.md) | Registro de alumno nuevo | Baseline local; siete historias objetivo incorporadas; desarrollo pendiente |
| [SPEC-004](../ciunac-specs/specs/004-seguridad-portal/spec.md) | Seguridad y BFF | Código confirmado/local; brechas abiertas |

La portada anuncia cinco flujos cuyas rutas todavía no existen; consultar el inventario antes de asumir disponibilidad. El registro de alumno nuevo no constituye matrícula.

Para cada cambio: **especificación → contrato → plan → tareas → implementación → verificación → evidencia**. Vincular spec y revisión documental real, actualizar contrato cuando cambie HTTP y registrar criterios/pruebas. No marcar una spec implementada solo por encontrar código.

## Desarrollo local

Usar pnpm 11.22.0, conforme a package.json, y Node compatible con la versión instalada de Next.js.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

El portal usa `app/` y `modules/`. Leer las guías locales de Next.js indicadas en [AGENTS.md](AGENTS.md) antes de modificar código.

[Entorno y variables](../ciunac-specs/docs/entorno-portal.md) documenta configuración privada, CAPTCHA y dependencias CIUNAC/Q10. Mantener valores de `.env` fuera de Git y documentación. No ejecutar registros o envíos reales para comprobar una entrega documental.

Scripts disponibles: `pnpm lint`, `pnpm build`, `pnpm start`, `pnpm test`, `pnpm test:e2e` y `pnpm test:build`. Las suites nuevas verifican autenticación de alumno nuevo con proveedores aislados; consultar la [guía Auth.js](docs/authjs.md) y la [estrategia de pruebas](../ciunac-specs/docs/estrategia-pruebas-portal.md).

## Arquitectura y contratos

[Arquitectura](../ciunac-specs/architecture/overview.md) · [OpenAPI observado del portal](../ciunac-specs/contracts/portal-observado.openapi.yaml) · [Contrato objetivo de backend QR](../ciunac-specs/contracts/openapi.yaml) · [Brechas](../ciunac-specs/docs/trazabilidad-y-pendientes.md) · [Validación de la entrega](../ciunac-specs/docs/validacion-entrega.md).

Cada aplicación conserva Git y dependencias independientes. Esta documentación no prueba el estado operativo del backend, administración, bases o despliegues.

## Historias objetivo de alumno nuevo

Las [siete historias](docs/historias-usuario/alumno-nuevo.md) están incorporadas a SPEC-003 y SPEC-004, con consulta/autorización de ficha, clasificación UNAC, alta coordinada, actualización solo CIUNAC y salida sin cambios. Son ampliaciones pendientes de contrato/implementación; los OpenAPI observados y el código actual no cambian por esta actualización documental.

Entrega funcional posterior: [autenticación con Auth.js](docs/authjs.md) ofrece Google y correo/OTP bajo una sesión común. Microsoft personal queda aplazado para una siguiente iteración por decisión del usuario. [Contrato](../ciunac-specs/contracts/auth-alumno-nuevo.openapi.yaml). La aceptación OAuth real requiere configuración/verificación; las otras historias y la persistencia coordinada continúan pendientes.

La [iteración de condición académica y documento](docs/clasificacion-documento.md) añade PG/PRE/POS, facultad/escuela/código y carga previa del DNI/CE a Drive. El portal consume el backend existente; la verificación local usa servicios simulados y no certifica persistencia o entrega de correo reales.
