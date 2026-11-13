# Splash exclusivo de Verificación

2026-11-13, America/Lima. SPEC-003, HU-AN-003 / RF-AN-009 / CA-AN-036 / TEST-AN-036 / TASK-AN-018. Revisión documental pendiente de versionar. Código base cec3350618723e2a0b47c015b5d7346fdefd8463 más trabajo local.

La pantalla de Verificación muestra el formulario a la izquierda y la imagen vigente `/images/splash.jpg` a la derecha desde 1024 px. Por debajo, solo se muestra el formulario. El panel es local a este paso y usa `next/image` con fill, recorte centrado y proporciones conservadas; CSS controla su visibilidad sin reiniciar el estado.

Se mantiene durante correo, OTP y correo verificado. Al avanzar a Datos básicos desaparece y al regresar reaparece. No se modifican Stepper, encabezado, demás pasos, finalización, consultas, recursos de imagen, autenticación, APIs ni dependencias. Los cambios locales previos de consultas, imágenes y package.json se preservan.

## Verificación

- Build de producción Webpack aislada aprobada con servicios y fuentes simulados.
- Lint de verification.tsx, verification-splash.tsx y tests/e2e/auth.spec.ts aprobado.
- TypeScript aprobado tras terminar la build. El primer intento simultáneo encontró archivos generados eliminados durante la build; se repitió secuencialmente y aprobó.
- TEST-AN-036: 390/768/1023 px ocultan la imagen; 1024/1366/1920 px muestran dos columnas. Sin desbordamiento horizontal y con correo conservado al redimensionar.
- OTP conserva el código parcial al pasar escritorio → móvil → escritorio. Imagen presente en OTP y correo verificado, ausente en Datos básicos y presente al regresar. Google simulado sigue navegando al formulario sin Splash.
- Capturas en `.next-e2e/verification-splash/`: email en los seis anchos, OTP y correo verificado en escritorio. Inspección visual de 390/1024/1920 px y estados OTP/verificado realizada.

Las fuentes, CAPTCHA y proveedores son simulados; no se acredita su apariencia o integración real. El resultado de regresión se registra en la evidencia de esta entrega. La primera build no pudo crear un directorio temporal por EPERM del sandbox; la ejecución con permiso adicional aprobó. No hay despliegue ni operaciones externas reales.

## Resultado E2E y límite encontrado

`node node_modules/@playwright/test/cli.js test`: 27 aprobadas y 1 fallida (1.6 minutos). Falló la prueba existente «New student text controls enforce names 80, phone 9, DNI 8, CE 9 and student code 10»: tras pasar CE → DNI, el campo quedó con seis dígitos y la validación impidió avanzar; agotó el tiempo esperando Tipo de alumno. El fallo sucede en Datos básicos, donde el Splash ya está desmontado. No se modifica la lógica ni esa prueba por este cambio visual; no se afirma que la suite completa esté aprobada ni se atribuye el fallo a una causa raíz no investigada.

Verificación específica posterior: `node node_modules/@playwright/test/cli.js test --grep 'TEST-AN-036|Google verified OAuth return and reload'`: 3/3 aprobadas en 6.6 s (dos escenarios nuevos más retorno Google). Las pruebas existentes de correo/OTP, accesibilidad y navegación también aprobaron en la ejecución amplia.

[Evidencia JSON y hashes](evidencia-splash-verificacion-2026-11-13.json). [Criterio](../../ciunac-specs/specs/003-alumno-nuevo/spec.md) y [tarea](../../ciunac-specs/specs/003-alumno-nuevo/tasks.md) en ciunac-specs.
