# Diseño de carga del documento de identidad

2026-11-10, America/Lima. Revisión documental pendiente de versionar; base `605e1eb` con cambios locales previos. Alcance: alumno nuevo. SPEC-003 / RF-AN-017, CA-AN-031..033, TASK-AN-016; [plan vigente](../../ciunac-specs/specs/003-alumno-nuevo/clasificacion-documento-plan.md).

Brecha observada: instrucciones en párrafos, selector de archivos nativo sin jerarquía visual y acciones pequeñas. Petición del usuario: una página de carga más amigable.

Plan/tarea local: tarjetas shadcn, zona para seleccionar o arrastrar un archivo, nombre/tamaño/estado, cambio y retirada de selección, vista previa de imágenes y guía breve para ambas caras. Mantener el aviso de acceso por enlace antes de la acción de subida. Diseño adaptable y botones accesibles; conservar formatos, máximo 8 MiB, archivo único, carga al continuar, asociación al documento y recuperación tras fallo. No cambiar rutas, HTTP, backend, Drive ni estilos globales.

## Verificación ejecutada

- Lint del componente y `pnpm exec tsc --noEmit`: aprobados.
- `pnpm test:build`: compilación aislada aprobada.
- `pnpm exec playwright test tests/e2e/auth.spec.ts --grep "PG uploads|PRE filters|POS has|partial provider|academic and document|document selection"`: 6/6 aprobadas, con Google/CAPTCHA/backend y archivos ficticios.
- Nueva prueba CA-AN-031/032: formato inválido bloquea avance; selección de PNG muestra vista previa; quitar limpia selección; arrastrar un PDF lo selecciona; durante la subida se bloquean controles; fallo conserva archivo y permite reintentar; solo upload confirmado habilita resumen.
- Capturas inspeccionadas: `.next-e2e/document-upload-empty.png` (escritorio), `document-step-mobile.png` (móvil sin archivo) y `document-upload-image-mobile.png` (móvil con imagen ficticia). Sin desbordamiento horizontal a 390 px. Las fuentes y proveedores de las capturas son de prueba; la imagen de muestra es un PNG ficticio de un píxel, no un documento real.

La selección, retirada y arrastre solo afectan al archivo local; la subida conserva el endpoint, timeout de 75 segundos y validación de correspondencia de documento. El estado ya cargado permite continuar sin otra subida. Los object URLs se liberan al cambiar la vista previa o desmontar. Se conserva íntegro el aviso de Drive antes de la acción de subida. No se modificaron componentes globales ni se añadieron dependencias.

No se ejecutaron uploads/registros reales ni se acredita aceptación completa de la spec, persistencia externa o despliegue.

## Corrección de requisito del paso 4 — 2026-11-10

Decisión explícita posterior del usuario: solicitar solo una cara del documento y retirar por el momento el aviso de acceso al archivo. Sustituye para la UI del paso 4 las instrucciones anteriores de ambas caras y de mostrar el aviso, incluidas las del plan central del 2026-11-06; esa revisión documental central sigue pendiente de versionar/actualizar. Se actualizan encabezado, guía, ilustración, ayuda PDF y error de archivo múltiple para evitar contradicciones. El almacenamiento, contrato HTTP, formatos, tamaño y asociación al documento no cambian.

Verificación de esta corrección: lint y build aislada (incluido TypeScript) aprobados. `pnpm exec playwright test tests/e2e/auth.spec.ts --grep "PG uploads|document selection|academic and document"`: 3/3 aprobadas con proveedores ficticios. Se verifican una sola cara, ausencia de referencias a ambas caras/parte posterior/aviso de acceso, selección/arrastre/reintento y continuidad del flujo. Captura móvil actualizada e inspeccionada. Sin escrituras reales ni despliegue.
