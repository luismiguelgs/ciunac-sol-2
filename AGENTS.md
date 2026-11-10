<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Documentación del portal y flujo SDD

La documentación central está en la carpeta hermana [ciunac-specs](../ciunac-specs/README.md). Antes de cambiar comportamiento, leer [memoria estable](../ciunac-specs/memory.md), [convenciones](../ciunac-specs/conventions.md), [inventario](../ciunac-specs/docs/inventario-portal.md) y la spec aplicable con su plan y tareas.

Seguir especificación → contrato → plan → tareas → implementación → verificación → evidencia. Mantener IDs y enlazar spec, revisión documental real (o pendiente de versionar), criterios y pruebas en cada cambio. Actualizar el contrato si cambia HTTP y el inventario si cambia una ruta o disponibilidad.

Documentar el portal actual en `app/` y `modules/`; no renombrar a `features/` por seguir referencias antiguas. Distinguir código observado, trabajo local, aceptación verificada y despliegue. No marcar pruebas ejecutadas ni specs implementadas sin evidencia. Registrar diferencias con el objetivo como brechas antes de decidir un cambio.

Las [referencias históricas](../ciunac-specs/references/README.md) se conservan con su manifiesto y no son instrucciones vigentes por defecto. El [contrato observado del portal](../ciunac-specs/contracts/portal-observado.openapi.yaml) y el contrato objetivo del backend tienen alcances distintos; describir consumo no certifica al proveedor.

Guardar contexto estable en memory.md; tareas, estados y resultados en sus documentos especializados. Nunca copiar valores de `.env`, credenciales, cookies reales, OTP ni datos personales a la documentación. No modificar aplicaciones vecinas o bases por una tarea documental del portal.
