# Alineación de fecha de nacimiento — alumno nuevo

Fecha: 2026-10-15, America/Lima. Trabajo local sobre base `605e1eb` con cambios previos; revisión documental pendiente de versionar.

Trazabilidad: [SPEC-003](../../ciunac-specs/specs/003-alumno-nuevo/spec.md), HU-AN-001 / RF-AN-003 / CA-AN-003, [plan](../../ciunac-specs/specs/003-alumno-nuevo/plan.md), [TASK-AN-004](../../ciunac-specs/specs/003-alumno-nuevo/tasks.md). Corrección visual solicitada por el usuario; no cambia rutas, disponibilidad, contrato HTTP ni reglas de fecha.

Brecha observada: `DatePicker` agregaba `mt-2` al contenedor `Field`, desplazando etiqueta y control 8 px respecto a los demás campos de `BasicData`.

Plan/tarea local: retirar únicamente ese margen, conservando la altura mínima compartida y los cambios locales previos del calendario. Comprobar lint, TypeScript, alineación en escritorio y móvil, apertura y selección de fecha.

Verificación ejecutada el 2026-10-15, America/Lima:

- `pnpm exec eslint components/forms/date-picker.new.tsx`: aprobado.
- `pnpm exec tsc --noEmit`: aprobado.
- `node test-results/qa-birth-date.mjs` (script local temporal, no versionado): aprobado en Edge contra `next dev --webpack`, con sesión ficticia y proveedores aislados. Escritorio 1366×1000: fecha, segundo nombre y teléfono comienzan en Y=383,5 px, con 28 px de alto. Tablet 760×1000: fecha y teléfono comienzan en Y=461,5 px. Móvil 390×844: controles en una columna. Margen superior de fecha 0 px y sin desbordamiento horizontal en los tres tamaños.
- Apertura del calendario, visibilidad de selectores mes/año, selección de día, actualización `dd/MM/yyyy` y cierre del panel: aprobados en los tres tamaños. Capturas locales revisadas en escritorio y móvil; fuentes de prueba, sin validar tipografía de producción.

Alcance: corrección visual y comprobación puntual del calendario; no se ejecutó TEST-AN-003 completo ni se acredita aceptación completa de SPEC-003 o despliegue. El sandbox bloquea sockets localhost; la comprobación de navegador utilizó la ejecución autorizada fuera del sandbox y exclusivamente datos ficticios.
