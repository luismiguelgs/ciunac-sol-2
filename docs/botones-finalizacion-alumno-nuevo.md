# Botones de finalización de alumno nuevo

2026-11-10, America/Lima. Revisión documental pendiente de versionar; base `605e1eb` con trabajo local previo. SPEC-003, CA-AN-004/008, TASK-AN-004/014; [plan](../../ciunac-specs/specs/003-alumno-nuevo/plan.md).

Brecha: Anterior/Finalizar usaban la altura predeterminada de 28 px y texto pequeño. Cambio solicitado: ampliar las acciones de la pantalla final.

Plan/tarea: variante opcional `size="lg"` en StepperControl, activada únicamente por Register de alumno nuevo. Altura mínima 48 px, texto 16 px, espacio entre botones y ancho completo en móvil con Finalizar primero. Mantener estilo previo por defecto en los demás consumidores, navegación, consentimiento y bloqueos durante registro. No cambian HTTP ni rutas.

Verificación ejecutada: lint de StepperControl y Register aprobado; `pnpm test:build` aprobado, incluido TypeScript. `pnpm exec playwright test tests/e2e/auth.spec.ts --grep "PG uploads|document selection|partial provider"`: 3/3 aprobadas con proveedores simulados. Se midieron botones de al menos 48 px y texto de 16 px en finalización; a 390 px ambos botones ocupan su fila y no hay desbordamiento. Captura `.next-e2e/final-actions-mobile.png` inspeccionada. Continúan funcionando los consentimientos, finalización y bloqueo tras registro parcial. No se ejecutaron registros reales ni despliegue.

## Extensión a los demás pasos de alumno nuevo — 2026-11-10

Petición posterior del usuario: unificar Anterior/Siguiente de todos los pasos. Se activa la misma variante grande en datos básicos y condición académica; la navegación del documento adopta también texto de 16 px, altura mínima de 48 px, padding, peso y redondeado iguales a Finalizar. En móvil las acciones ocupan todo el ancho y se apilan; en escritorio los botones cortos tienen un mínimo de 144 px de ancho y las etiquetas largas pueden crecer. Los consumidores fuera de alumno nuevo mantienen el tamaño por defecto. No cambian callbacks, validaciones ni contratos.

Verificación de esta extensión: lint de los tres componentes y `pnpm test:build` (incluido TypeScript) aprobados. `pnpm exec playwright test tests/e2e/auth.spec.ts --grep "PG uploads|academic and document"`: 2/2 aprobadas. Los recorridos miden altura mínima 48 px y texto 16 px en datos básicos, condición académica y documento, además de finalización; comprueban navegación y registro con proveedores ficticios. Capturas móviles de condición académica y documento inspeccionadas; sin desbordamiento horizontal a 390 px. No se ejecutaron escrituras reales ni despliegue.
