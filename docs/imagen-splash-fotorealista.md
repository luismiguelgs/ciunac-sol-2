# Imagen splash fotorealista

2026-11-13, America/Lima. Revisión documental pendiente de versionar. Cambio visual del recurso usado por `modules/shared/presentation/consulta-wrapper.tsx` (presentación compartida de consulta; SPEC-002). Sin cambios de comportamiento, rutas disponibles ni contratos HTTP.

Brecha señalada por el usuario: aspecto de render 3D y personas repetidas. Edición mediante la habilidad imagegen y la herramienta integrada, tomando `public/images/splash.jpg` como referencia. Objetivo: edificio y encuadre reconocibles, luz/texturas más naturales y seis estudiantes con apariencias, ropa, mochilas y poses distintas.

Resultado: `public/images/splash-fotorealista.png`, imagen generada/editada con IA, no una fotografía documental del edificio o de sus alumnos. Se conserva `splash.jpg` original y el consumidor apunta a la versión nueva. Se mejora el texto alternativo. Inspección visual realizada sobre el resultado: letreros principales legibles, composición vertical y personas diferenciadas. No se certifica reproducción exacta de cada detalle arquitectónico o del emblema.

Verificación: PNG de 1055×1491 px y 2512512 bytes comprobado, con dimensiones correspondientes en Next Image; lint del consumidor y comprobación de espacios del diff aprobados. No se ejecutó una nueva build por la sustitución visual. No requiere cambios de backend ni datos reales; no se despliega.

## Fachada pulcra — ajuste posterior 2026-11-13

El usuario aprobó el realismo y la variedad de personas, pero pidió una fachada pulcra: pintura uniforme y limpia en lugar de envejecida. Nueva edición dirigida sobre `splash-fotorealista.png`, conservando encuadre, arquitectura, letreros y estudiantes. Resultado inspeccionado visualmente: paredes azules sin manchas, desconchados o parches y cubierta de entrada limpia, con textura mate y sombras fotográficas.

Versión vigente del portal: `public/images/splash-fachada-pulcra.png`, PNG de 1055×1491 px y 2531908 bytes. Se conservan tanto el original JPG como la primera edición PNG; el consumidor apunta a la variante pulcra. Sigue siendo una imagen editada/generada con IA. Formato, dimensiones, lint del consumidor y espacios del diff verificados. Sin cambios HTTP, nuevas dependencias ni despliegue.

## Entrega en JPG — 2026-11-13

Por petición posterior del usuario, la versión vigente es `public/images/splash.jpg`, convertida desde el archivo actual `public/images/splash.png`. Conversión con el codificador JPEG de System.Drawing, calidad 95, manteniendo las dimensiones del PNG. Se conserva el PNG; el consumidor apunta al JPG. Archivo abierto y verificado como JPEG válido. No se regeneró ni modificó la composición de la imagen. Los nombres de archivos de las secciones anteriores corresponden a sus entregas históricas.
