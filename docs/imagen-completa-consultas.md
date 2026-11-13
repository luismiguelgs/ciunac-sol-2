# Imagen completa en consultas

2026-11-13, America/Lima. Revisión documental pendiente de versionar. Trazabilidad: SPEC-001 y SPEC-002, presentación de las entradas `/consulta-certificado` y `/consulta-solicitud`. Cambio visual solicitado y plan aprobado por el usuario; sin cambio HTTP, navegación, formularios ni disponibilidad.

Brecha: object-cover conservaba proporciones pero recortaba la fotografía al variar el panel en pantallas grandes. Decisión: priorizar la imagen completa, admitiendo espacios de fondo neutro.

Implementación: Image con fill, sizes adaptable, object-contain y centrado en el panel compartido relativo, sin desbordamiento. Se conserva splash.jpg y su texto alternativo, dos columnas desde 1024 px e imagen oculta en móvil. No cambia la lectura de certificados por QR ni la consulta de solicitudes.

## Evidencia ejecutada

- `node node_modules/eslint/bin/eslint.js modules/shared/presentation/consulta-wrapper.tsx`: aprobado.
- `node node_modules/typescript/bin/tsc --noEmit`: aprobado.
- `node test-results/qa-consulta-image.mjs` (script temporal de QA no versionado): 12/12 escenarios aprobados en Edge contra `next dev --webpack`. Ambas entradas se revisaron a 1024×768, 1366×768, 1920×1080, 2560×1080, 3840×2160 y 390×844.
- En los diez escenarios de escritorio: JPG cargado, object-fit contain, centrado 50%/50%, foto completa dentro del panel y sin desbordamiento horizontal. A 390 px la imagen permanece oculta en las dos rutas. Encabezados y texto de QR visibles; el campo de documento acepta entrada en solicitud. No se enviaron consultas ni se usaron documentos reales.
- Capturas generadas en `.next-e2e/consulta-imagen/`; inspección visual de solicitud en portátil/4K, certificado ultrapanorámico y ambas vistas móviles. Se conserva toda la fachada y los estudiantes, con espacio de fondo neutro. Métricas persistidas en [evidencia JSON](evidencia-imagen-consultas-2026-11-13.json).

Limitaciones: fuentes y CAPTCHA simulados en QA, sin certificar su apariencia real ni funcionalidad del proveedor. No se ejecutó una nueva build de producción por este ajuste CSS. pnpm no pudo acceder a su base SQLite en el entorno restringido; se ejecutaron directamente los binarios instalados de lint y TypeScript, sin modificar dependencias. Navegador/servidor local ejecutados fuera del sandbox mediante la autorización de ejecución correspondiente. Sin despliegue ni aceptación funcional completa de SPEC-001/002.

## Decisión posterior: llenar el panel sin bordes

2026-11-13. El usuario pide eliminar los espacios de fondo y aprueba ampliar la escena lateralmente y usar dos variantes adaptables con recortes del entorno. Esta decisión sustituye la preferencia anterior por contain.

Edición imagegen sobre splash.jpg para añadir entorno lateral y margen alrededor de edificio/estudiantes. Variante nueva splash-wide.jpg en JPG calidad 95; se conserva la vertical. El componente compartido usa picture/source con getImageProps para optimizar la variante ancha desde relación de pantalla 3:2; por debajo conserva la vertical. object-cover y centrado llenan el panel sin deformar; los márgenes generados absorben el recorte. Carga eager y fetchPriority evitan precargar de forma obligatoria una variante distinta de la elegida por picture. Se mantiene oculta la imagen en móvil, sin cambios HTTP o de formulario. Es una ampliación generada con IA, no documentación fotográfica del entorno real.

Variante JPG: 1448×1086 px, 584101 bytes. sizes considera el ancho necesario para cubrir por altura (134vh en la variante 4:3, 71vh en la vertical) y por ancho en proporciones mayores, para evitar pedir miniaturas basadas únicamente en la mitad del viewport. picture tiene posición absoluta y ocupa todo el panel, conforme al requisito de fill de Next Image.

Verificación final de esta iteración: lint y TypeScript ejecutados directamente desde los binarios instalados, aprobados. `node test-results/qa-consulta-wide.mjs` (script temporal): 12/12 escenarios aprobados, ambas consultas en los seis tamaños anteriores. Imagen visible cubre todo el panel sin bandas ni desbordamiento; selección comprobada por currentSrc (vertical a 1024×768, ancha en los otros cuatro escritorios), y oculta en móvil. Sin advertencia de posicionamiento de Next Image en la revisión final. Se comprobaron entrada de documento y texto de QR, sin enviar consultas reales. Capturas inspeccionadas en portátil, ultrapanorámico y 4K: letreros, edificio y seis estudiantes visibles; el recorte afecta al entorno añadido.

Capturas actualizadas en `.next-e2e/consulta-imagen-ancha/` y métricas en [evidencia de variante ancha](evidencia-imagen-ancha-consultas-2026-11-13.json). Se mantienen las limitaciones de fuentes/CAPTCHA simulados y ausencia de nueva build de producción o despliegue. No se modificaron rutas, formularios ni contratos HTTP.
