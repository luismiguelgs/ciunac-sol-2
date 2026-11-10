# Selectores de condición académica

2026-11-09, America/Lima. Revisión documental pendiente de versionar; base `605e1eb` con cambios locales previos. Trazabilidad: SPEC-003, HU-AN-005 / RF-AN-012, CA-AN-016..019, TASK-AN-010/016; [plan vigente](../../ciunac-specs/specs/003-alumno-nuevo/clasificacion-documento-plan.md).

Brecha observada: tipo de alumno, facultad y escuela usaban selectores HTML nativos, distintos de los componentes shadcn del portal. Petición del usuario: usar estos componentes.

Plan/tarea: sustituir los tres selectores con Select/Trigger/Content/Item/Value ya instalados, etiquetas asociadas y ancho adaptable; usar Input y Field del portal para el código. Conservar PG/PRE/POS, IDs numéricos en el dominio, filtros facultad/nivel, conservación al pasar por PG y validaciones. No se cambia HTTP, catálogo, rutas ni estilos globales.

Verificación ejecutada: lint del componente, `pnpm exec tsc --noEmit` y `pnpm test:build` aprobados. `pnpm exec playwright test tests/e2e/auth.spec.ts --grep "PG uploads|PRE filters|POS has|partial provider|academic and document"`: 5/5 aprobadas, con Google/CAPTCHA/backend simulados. Se verificaron PG, escuelas de PRE/POS, conservación al pasar por PG, obligatoriedad de código, recuperación del alta parcial y uso móvil sin desbordamiento. Las pruebas usan apertura del combobox y selección de opciones accesibles; Escape cierra los menús. IDs convertidos de texto a número solo al actualizar el dominio.

Capturas: `.next-e2e/academic-step-desktop.png`, `academic-step-mobile.png` y `academic-select-mobile.png`; las pruebas POS/móvil se repitieron para esperar explícitamente el menú y capturar sin animaciones intermedias. Fuentes ficticias; no validan tipografía de producción. No se modificó el componente Select global, no se añadieron dependencias ni se ejecutaron escrituras reales. No acredita persistencia real ni despliegue.
