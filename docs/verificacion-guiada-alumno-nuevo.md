# Verificación guiada de alumno nuevo

Fecha: 2026-11-09, America/Lima. Revisión documental pendiente de versionar. Alcance autorizado: solo alumno nuevo; compartir la versión definitiva con otros trámites queda para una entrega posterior.

Trazabilidad: [SPEC-003](../../ciunac-specs/specs/003-alumno-nuevo/spec.md), CA-AN-002 y CA-AN-009..011, TASK-AN-009/014; [SPEC-004](../../ciunac-specs/specs/004-seguridad-portal/spec.md), CA-SEG-003..006 y CA-SEG-011/012. Plan y tareas de ambas specs consultados. Contratos HTTP y disponibilidad de rutas sin cambios.

Brecha: dos pasos simultáneos, controles pequeños, instrucciones extensas y acciones separadas del formulario dificultan saber qué hacer. Plan aprobado: tarjeta centrada, Google o correo al inicio, código tras solicitarlo, destino visible, cambio de correo, reenvío y expiración explícitos. Errores locales y foco accesible sin anunciar cada segundo del contador.

Tarea local: mantener coordinación en Verification y separar presentación OTP dentro de alumno nuevo. No modificar formulario compartido, estilos globales ni stepper. Conservar endpoints, propósitos, CAPTCHA, validación y sesiones. Verificación prevista: lint, TypeScript, build aislada, regresiones Google/OTP, estados de error/reenvío/expiración y capturas a 320/390/768/1366 px con proveedores ficticios.

## Implementación local

Base Git `605e1eb`, con cambios locales previos. Coordinación en `modules/solicitud-nuevo/components/verification.tsx`; presentación en `email-verification-panel.tsx` dentro del mismo módulo. Se retiraron del consumidor únicamente las props de navegación que la verificación ya no usa. Los campos y acciones están agrupados por etapa; CAPTCHA compacto en pantallas menores de 480 px. Solo se admite avanzar tras verificar; errores de envío/verificación permiten recuperar la interacción.

Los tiempos siguen viniendo de la respuesta del servidor; los contadores son informativos, no autorizan acciones. La expiración limpia el código y muestra la solicitud de reenvío. Cambiar correo limpia la UI y sus contadores, sin atribuir revocación al desafío del servidor. Se conserva la biblioteca OTP para entrada, pegado y teclado; no hay autoenvío al completar seis dígitos.

## Evidencia ejecutada

Fecha: 2026-11-09, America/Lima. Todas las comprobaciones contra proveedores ficticios, sin correos ni registros reales.

| Comprobación | Resultado |
| --- | --- |
| `pnpm exec eslint` sobre Verification, EmailVerificationPanel, NewStudentProcess y la nueva suite E2E | Aprobado |
| `pnpm exec tsc --noEmit` | Aprobado |
| `pnpm test` | 62/62 pruebas aprobadas |
| `pnpm test:build` | Build aislada Webpack aprobada |
| `pnpm exec playwright test` | 24/24 E2E aprobadas: 15 regresiones existentes y 9 nuevas |
| Axe sobre el formulario, etapas correo/código, a 320/390/768/1366 px | Sin violaciones detectadas en los ocho escenarios |
| Capturas y geometría | Sin desbordamiento horizontal; entrada email de 16 px y botones principales de al menos 44 px |
| Comparación SHA-256 de los dos componentes compartidos, stepper y CSS global | Sin cambios respecto al inicio de esta implementación |

Regresión cubierta: Google verificado y pendiente, cancelación/state inválido, proveedor sin configuración, OTP real contra mailer simulado, rechazo de sesiones inválidas/vencidas y resto del registro con proveedores aislados. Nuevas pruebas en `tests/e2e/verification.spec.ts`: validación/CAPTCHA, destino y foco, cambio de correo, tiempos/expiración/reenvío, fallos de servicio/código incorrecto y bloqueo durante envío/verificación. Los selectores de las pruebas existentes se adaptaron a «Enviar código».

Capturas reproducibles en `.next-e2e/verification-{email,code}-{320,390,768,1366}.png`; inspección visual de ambas etapas en los cuatro anchos. El CAPTCHA se reemplaza por un control de prueba y las fuentes son ficticias: las capturas no validan tipografía de producción ni el widget CAPTCHA real. Las comprobaciones automatizadas de accesibilidad no equivalen a una evaluación manual completa con lector de pantalla.

La compilación inicial dentro del sandbox fue bloqueada con EPERM al crear archivos generados. La build final y los navegadores se ejecutaron mediante la ejecución autorizada fuera del sandbox. No acredita OAuth real, entrega de correo, aceptación completa de specs ni despliegue. Los flujos compartidos permanecen para una entrega posterior.

## Ajuste posterior: ilustración adaptable

Petición del usuario el 2026-11-09: mostrar la imagen en computadora y ocultarla en celular. Se reutiliza `email-verification.png`, decorativa y de 112×112 px, en ambas etapas desde 768 px. En tamaños inferiores se conserva el icono compacto. Se mantiene el alcance exclusivo de alumno nuevo.

Verificación del ajuste: lint aprobado; `pnpm test:build` aprobado, incluido TypeScript; `pnpm exec playwright test tests/e2e/verification.spec.ts --grep "layout and accessibility"`: 4/4 aprobadas. En ambas etapas se comprobó imagen oculta a 320/390 px, visible y cargada a 768/1366 px, sin desbordamiento y sin violaciones Axe detectadas en el formulario. Capturas de escritorio y móvil inspeccionadas. Conserva las limitaciones de fuentes y CAPTCHA simulados de la evidencia anterior; no se repitió la suite funcional completa por este ajuste visual.
