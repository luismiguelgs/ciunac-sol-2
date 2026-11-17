# Diagnóstico seguro de rechazos del alta

Diseño y plan local, 2026-11-17 (America/Lima). Revisión documental pendiente de versionar.

Trazabilidad: [SPEC-003](../../ciunac-specs/specs/003-alumno-nuevo/spec.md), RF-AN-013 / CA-AN-022 / TASK-AN-011 y [SPEC-004](../../ciunac-specs/specs/004-seguridad-portal/spec.md), RF-SEG-010 / CA-SEG-010 / TASK-SEG-004. [Plan de registro](../../ciunac-specs/specs/003-alumno-nuevo/clasificacion-documento-plan.md). El contrato HTTP, las rutas y la disponibilidad no cambian.

Brecha observada: un 400 UPSTREAM_ERROR no identifica la validación fallida. El transporte descarta el cuerpo y el logger registra solo 5xx. La regla observada RN-SEG-009 describe ese comportamiento previo; esta entrega añade exclusivamente una excepción diagnóstica para rechazos 400/409/422 de POST q10/estudiantes. No prueba la causa del incidente ni corrige datos de negocio.

Plan: leer como máximo 16 KiB del error upstream, extraer únicamente códigos y nombres de campos de listas cerradas, adjuntar metadatos seguros al error interno y emitir console.warn con el correlationId de la respuesta pública. Nunca registrar cuerpos, valores, mensajes libres, URLs, cabeceras, cookies o credenciales. Conservar el mismo status y sobre público. No repetir escrituras.

Tareas de esta entrega: implementar extracción limitada y log correlacionado; comprobar privacidad, errores anidados/de validación, cuerpos inválidos/grandes y conservación del rechazo HTTP; verificar regresión del registro. La aceptación de producción requiere desplegar este cambio; los logs anteriores no pueden recuperarse con él. Un código no reconocido o una respuesta sin detalle pueden seguir requiriendo logs del backend.

## Evidencia local

2026-11-17, America/Lima. Base portal `99bbf61` más cambios locales pendientes de versionar.

- `node node_modules/vitest/vitest.mjs run tests/new-student-diagnostics.test.ts tests/new-student-registration.test.ts tests/auth-routes.test.ts`: 46 pruebas aprobadas (9 nuevas de diagnóstico). Cobertura: correlación log/respuesta, status 400/409/422, listas cerradas, privacidad de valores y mensajes, errores anidados, cuerpos vacíos/no JSON, límite de lectura y cancelación, fallo de lectura, no retry, regresión de alta y autenticación.
- `node node_modules/typescript/bin/tsc --noEmit`: aprobado.
- ESLint de los cuatro módulos modificados y `tests/new-student-diagnostics.test.ts`: aprobado.
- `git diff --check`: aprobado.

No hay despliegue ni nuevas altas reales realizadas por esta entrega. Pruebas con proveedor simulado, no acreditan el backend ni resuelven la validación original.

## Lectura operativa tras publicar

En Vercel Logs incluir nivel Warning y buscar `security.new-student.upstream.rejected`. Comparar `correlationId` con la respuesta de Network. `validationFields` contiene exclusivamente nombres de campos conocidos y `upstreamCode` exclusivamente códigos reconocidos; UNRECOGNIZED indica otro código no expuesto. `detail=unavailable` o `too_large` informa que no fue posible extraer el cuerpo. El correlationId correlaciona portal y navegador, no se envía al backend ni se presume presente en sus logs. La captura no recupera incidentes anteriores al despliegue.
