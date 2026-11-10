# Historias de usuario — mejora del flujo de alumno nuevo

Fecha: **2026-10-15, America/Lima**. Estado: **historias objetivo incorporadas a SPEC-003 y SPEC-004; contratos nuevos pendientes de definir**. Revisión documental: **pendiente de versionar**. Implementación, aceptación funcional y despliegue: **no acreditados por este documento**.

Este documento conserva las siete historias y su procedencia. Su elaboración inicial se limitó al portal. Por solicitud posterior del usuario, el 2026-10-15 se incorporan a `ciunac-specs`: SPEC-003 es la autoridad central del comportamiento y SPEC-004 del acceso/autorización. La incorporación solo modifica documentación; no acredita implementación ni cambia contratos, código, aplicaciones vecinas o bases de datos.

## 1. Referencias y trazabilidad

- [SPEC-003 — Registro de alumno nuevo](../../../ciunac-specs/specs/003-alumno-nuevo/spec.md), [plan](../../../ciunac-specs/specs/003-alumno-nuevo/plan.md) y [tareas](../../../ciunac-specs/specs/003-alumno-nuevo/tasks.md).
- [SPEC-004 — Seguridad transversal y BFF](../../../ciunac-specs/specs/004-seguridad-portal/spec.md), [plan](../../../ciunac-specs/specs/004-seguridad-portal/plan.md) y [tareas](../../../ciunac-specs/specs/004-seguridad-portal/tasks.md).
- [Convenciones SDD](../../../ciunac-specs/conventions.md), [memoria estable](../../../ciunac-specs/memory.md), [inventario del portal](../../../ciunac-specs/docs/inventario-portal.md) y [contrato observado](../../../ciunac-specs/contracts/portal-observado.openapi.yaml).

HU-AN-001 y HU-AN-002 conservan su identidad y se amplían en SPEC-003. HU-AN-003 a HU-AN-007 y CA-AN-009 a CA-AN-029 ya están incorporados como OBJETIVO en la documentación central. CA-AN-001 a CA-AN-008 conservan sus IDs/definiciones y su aplicabilidad se aclara allí. En futuras revisiones mantener este documento alineado con la autoridad central, sin duplicar decisiones independientes.

La inspección previa del portal corresponde al commit `605e1ebc2c5c96165139bba2bb8fde67db75c9a4`, con cambios locales y archivos de alumno nuevo sin seguimiento. El flujo observado contiene verificación de correo, datos básicos y registro; no integra todavía las ampliaciones aquí descritas. Esta referencia estática no demuestra ejecución, persistencia en proveedores ni despliegue.

## 2. Estrategia de acceso recomendada

Integrar Google y Microsoft directamente mediante OpenID Connect y bibliotecas mantenidas, con una sesión propia del portal. Conservar el formulario de correo como tercera alternativa. La estrategia evita contratar un servicio intermediario de autenticación y reutiliza el alojamiento y el servicio de correo existentes.

| Alternativa | Alcance |
| --- | --- |
| Continuar con Google | Autenticación mediante cuenta Google, obtención del correo y validación en servidor. Google documenta la configuración con una cuenta y proyecto gratuitos. [Guía oficial](https://codelabs.developers.google.com/codelabs/sign-in-with-google-button). |
| Continuar con Microsoft | Solo cuentas personales, según la decisión confirmada. Microsoft documenta esta audiencia y la disponibilidad sin costo del registro de aplicaciones y autenticación básica. [Tipos de cuenta](https://learn.microsoft.com/en-us/security/zero-trust/develop/identity-supported-account-types), [costos de registro](https://learn.microsoft.com/en-us/answers/questions/407498/azure-ad-app-registration-costing). |
| Continuar con correo | Correo, CAPTCHA y código de verificación mediante el servicio de envío actual. |

Recomendación consultada el 2026-10-15. Requiere registrar las aplicaciones, configurar los retornos y validar las respuestas en servidor. El alcance no incluye contratar servicios adicionales de pago. Solo se solicitan permisos para identificación y correo, sin acceso al buzón. Las contraseñas de Google y Microsoft no se almacenan en CIUNAC.

Las tres alternativas habilitan el mismo flujo. El acceso al portal no sustituye las credenciales de matrícula o de Q10. La autenticación de una cuenta de correo no acredita por sí sola la titularidad del DNI; la recuperación de una ficha aplica la autorización adicional descrita en HU-AN-004.

## 3. Flujo y reglas comunes

**Acceso → consulta por DNI/CE → autorización de la ficha, si existe → registro nuevo o actualización → resultado.**

| Resultado de consulta | Acción disponible | Destino de escritura |
| --- | --- | --- |
| Estudiante no encontrado | Completar datos y confirmar registro | API CIUNAC y Q10 mediante el proceso coordinado de alta |
| Estudiante encontrado y acceso autorizado | Recuperar y actualizar contacto y datos UNAC | Solo API CIUNAC |
| Estudiante encontrado que no desea actualizar | Terminar sin cambios | Ninguno |
| Estudiante encontrado sin autorización para recuperar la ficha | Terminar y contactar al administrador, sin mostrar la ficha | Ninguno |
| Consulta fallida | Reintentar o salir | Ninguno; un error no equivale a estudiante inexistente |

### Clasificación académica

La categoría es obligatoria al guardar un alta o una actualización y se persiste en `estudiantes.tipo_estudiante`: PRE=pregrado UNAC, POS=posgrado UNAC, PG=público general. `codigo` conserva su significado de código de alumno. Terminar sin actualizar no exige completar datos.

| Tipo de público | Facultad | Escuela | Código de alumno |
| --- | --- | --- | --- |
| Público general | No obligatoria; conservar valor previo o `null` si no existe | No obligatoria; conservar valor previo o `null` si no existe | No obligatorio; conservar valor previo o `null` si no existe |
| Pregrado UNAC | Obligatoria | Obligatoria, de pregrado y de la facultad seleccionada | Obligatorio |
| Posgrado UNAC | Obligatoria; comparte catálogo de facultades con pregrado | Obligatoria, de posgrado y de la facultad seleccionada | Obligatorio |

**Corrección acordada de CA-AN-018:** seleccionar público general no borra ni modifica los valores académicos previos, ya estén recuperados de la ficha o presentes en el formulario. Cada campo sin valor permanece en `null`; los campos con valor se conservan también al guardar. No se exige completar los campos faltantes para público general.

La clasificación se guarda explícitamente: tener facultad, escuela o código no convierte automáticamente al estudiante en pregrado o posgrado. El programa de idiomas de Q10 y la escuela académica UNAC son datos distintos.

## 4. Historias de usuario y criterios de aceptación

Las historias se ordenan por recorrido del usuario, conservando los IDs acordados.

### HU-AN-003 — Acceder mediante Google, Microsoft o correo

**Como** solicitante, **quiero** elegir una de las tres alternativas de acceso, **para** continuar con un correo validado.

- **CA-AN-009:** Dado el acceso al flujo, cuando el solicitante elige una alternativa, entonces Google y Microsoft permiten avanzar después de validar la autenticación y obtener un correo utilizable; el formulario conserva la verificación por código. Microsoft admite únicamente cuentas personales.
- **CA-AN-010:** Dado un acceso válido, cuando se inicia el proceso, entonces el correo queda asociado a la sesión y se conserva durante los pasos posteriores. Autenticarse no crea ni actualiza una ficha de estudiante.
- **CA-AN-011:** Dada una cancelación, autenticación inválida, sesión vencida o correo no disponible, cuando se intenta continuar, entonces se impide el avance y se permite reintentar o elegir otra alternativa. Si el proveedor no acredita suficientemente el correo, se utiliza la verificación por código.

La validación de tokens, sesiones y códigos ya está incorporada como objetivo en SPEC-004, RF-SEG-011 a RF-SEG-015; su implementación sigue pendiente. La autenticación social ordinaria no requiere repetir el código del formulario; la comprobación adicional de una ficha con otro correo corresponde a HU-AN-004.

### HU-AN-004 — Consultar al estudiante antes de completar sus datos

**Como** solicitante autenticado, **quiero** consultar mi documento, **para** saber si debo registrarme o recuperar mi ficha.

- **CA-AN-012:** Dado un acceso válido, cuando el solicitante continúa, entonces se solicita el documento antes del formulario personal y académico. Se valida DNI de ocho dígitos y se conserva la alternativa CE existente, de nueve caracteres alfanuméricos.
- **CA-AN-013:** Dado un documento válido, cuando se consulta la API CIUNAC, entonces se distingue entre estudiante encontrado, no encontrado y fallo del servicio. Solo una ausencia confirmada habilita el alta.
- **CA-AN-014:** Dado un estudiante encontrado, cuando el correo validado coincide con el registrado, entonces se permite recuperar la ficha. Si difiere, se exige un código enviado al correo ya registrado antes de mostrar datos o permitir cambios.
- **CA-AN-015:** Dado que no existe correo registrado, el solicitante no tiene acceso a él o no supera la comprobación, cuando intenta recuperar la ficha, entonces no se muestran sus datos ni el correo completo y se permite terminar y contactar al administrador.

La autorización queda vinculada al estudiante consultado. Cambiar el documento obliga a repetir la consulta y las comprobaciones correspondientes. Superar el código del correo registrado no cambia automáticamente el correo de la ficha.

### HU-AN-005 — Registrar la condición académica UNAC

**Como** solicitante, **quiero** identificarme como público general, pregrado o posgrado, **para** completar los datos académicos que me corresponden.

- **CA-AN-016:** Dado un formulario de alta o actualización, cuando se guarda, entonces la categoría es obligatoria y se aplica la matriz académica de este documento.
- **CA-AN-017:** Dada la selección de pregrado o posgrado, cuando se elige o cambia la categoría o facultad, entonces las escuelas se filtran por ambos datos y se invalida una escuela que ya no corresponda. La invalidación no aplica al cambiar a público general: en ese caso se conservan los valores previos conforme a CA-AN-018. Al volver de público general a pregrado o posgrado se valida nuevamente la correspondencia.
- **CA-AN-018:** Dada la selección de público general, cuando el formulario cambia de categoría o se guarda, entonces facultad, escuela y código de alumno conservan sus valores previos. Solo permanecen en `null` los campos que no tenían valor. Estos datos no son obligatorios para público general y no se borran ni reemplazan por cambiar a esa categoría.
- **CA-AN-019:** Dada la selección de pregrado o posgrado, cuando se intenta guardar, entonces se exige facultad, escuela válida y código. Si falta el catálogo correspondiente, se informa la indisponibilidad y no se utilizan opciones de otra categoría.

- **CA-AN-030:** Dado un registro nuevo o una actualización de este flujo, cuando se guarda la categoría, entonces se persiste en CIUNAC como `estudiantes.tipo_estudiante` con `PRE` para pregrado, `POS` para posgrado o `PG` para público general. El formulario/API del flujo rechaza una categoría ausente o distinta; los registros históricos sin clasificar permanecen `NULL` hasta una selección explícita. Guardar `PG` no borra facultad, escuela ni código de alumno.

Posgrado comparte facultades con pregrado, pero utiliza sus propias escuelas. La carga de las escuelas oficiales de posgrado es una dependencia pendiente, no una modificación de base de datos realizada por este documento.

### HU-AN-001 — Registrar un estudiante nuevo

**Ampliación objetivo incorporada a la historia existente en SPEC-003; implementación pendiente.**

**Como** solicitante que no tiene ficha en CIUNAC, **quiero** registrar mis datos personales, de contacto y académicos, **para** continuar los procesos del centro de idiomas.

Se conservan CA-AN-001 a CA-AN-004 y CA-AN-008 de SPEC-003. La ampliación objetivo admite los tres métodos de acceso y la consulta previa, manteniendo las validaciones personales, del programa y de los consentimientos.

- **CA-AN-020:** Dados los datos completos, cuando se presenta el resumen, entonces se muestran el documento consultado, correo validado, datos personales, programa de idiomas y clasificación académica. Se mantienen las confirmaciones de datos y términos.
- **CA-AN-021:** Dado un resumen confirmado, cuando se ejecuta el alta, entonces se conserva el mismo correo en CIUNAC y Q10. Los datos UNAC se almacenan en CIUNAC; a Q10 se envían únicamente los campos admitidos por su contrato. Para público general se respeta la conservación o ausencia de valores establecida en CA-AN-018.
- **CA-AN-022:** Dado un intento de alta, cuando se recibe el resultado, entonces solo se informa registro completo si se confirma el guardado en ambos destinos. Un resultado parcial, incierto o un conflicto por estudiante existente impide repetir automáticamente el alta y ofrece orientación para resolverlo.

El registro de alumno nuevo no constituye matrícula. Una respuesta HTTP genérica del proveedor no acredita por sí sola el cumplimiento de CA-AN-022; se requiere el contrato de resultado descrito entre las dependencias.

### HU-AN-006 — Actualizar la ficha de un estudiante existente

**Como** estudiante con acceso autorizado a mi ficha, **quiero** actualizar mi contacto y datos UNAC, **para** mantenerlos vigentes sin volver a registrarme en Q10.

- **CA-AN-023:** Dado acceso autorizado a una ficha, cuando se abre la actualización, entonces se recuperan los datos actuales y se permite editar celular, correo validado, categoría, facultad, escuela y código. Nombres, apellidos, género, nacimiento y documento permanecen sin edición en este flujo.
- **CA-AN-024:** Dado que se desea cambiar el correo, cuando se confirma la actualización, entonces la nueva dirección debe estar validada y su sustitución debe ser confirmada por el estudiante. La comprobación del correo anterior autoriza el acceso a la ficha, pero no la modifica automáticamente.
- **CA-AN-025:** Dada una ficha existente, cuando se guarda la actualización, entonces se modifica esa misma ficha exclusivamente mediante la API CIUNAC. No se crea otro estudiante ni se ejecutan altas, actualizaciones o sincronizaciones de escritura hacia Q10. La restricción también aplica si la ficha carece de identificador Q10.
- **CA-AN-026:** Dada una actualización, cuando se guarda, entonces se aplican las reglas académicas de la categoría elegida, incluida la conservación de datos para público general. Si falla el guardado, se conserva el formulario y no se muestra éxito. La decisión entre alta y actualización se valida en servidor.

El programa de idiomas de Q10 no se modifica por esta actualización. Si el estudiante no desea completar los datos obligatorios para guardar, puede terminar sin cambios mediante HU-AN-007.

### HU-AN-007 — Terminar sin completar o actualizar datos

**Como** estudiante existente, **quiero** terminar el flujo sin completar mi ficha, **para** continuar con mis trámites o solicitar ayuda.

- **CA-AN-027:** Dado un estudiante existente, cuando elige «Terminar sin actualizar», entonces puede salir aunque existan campos incompletos; se descartan las modificaciones del formulario y no se realizan escrituras en CIUNAC ni Q10. La opción también está disponible si no se puede completar la autorización de acceso a la ficha, sin mostrar sus datos.
- **CA-AN-028:** Dada la salida sin actualizar, cuando se presenta el resultado, entonces se muestra: «Finalizaste sin actualizar tus datos. Revisa tus credenciales para matrícula u otros trámites. Si necesitas ayuda, comunícate con el administrador de CIUNAC».

Esta finalización no declara un alta, una actualización ni una matrícula completada.

### HU-AN-002 — Consultar el resultado y recuperar una notificación fallida

**Ampliación objetivo incorporada a la historia existente en SPEC-003; implementación pendiente.**

**Como** solicitante, **quiero** conocer el resultado real de mi operación y recuperar una notificación fallida, **para** continuar sin repetir el registro.

Se conservan CA-AN-005 a CA-AN-007 de SPEC-003 para el alta nueva: reintentar únicamente la notificación cuando corresponda, mantener la comprobación del recibo y bloquear la repetición de una escritura incierta.

- **CA-AN-029:** Dada la finalización de una operación, cuando se muestra su resultado, entonces se distingue «Registro nuevo completado», «Datos actualizados en CIUNAC» y «Finalizado sin cambios». La actualización y la salida sin cambios no disparan el correo de bienvenida del alta ni anuncian nuevas credenciales. La aceptación del correo por el servicio de envío no se presenta como entrega confirmada al destinatario.

El recibo de notificación mantiene el alcance definido en SPEC-003 y SPEC-004; no sustituye la confirmación de persistencia en CIUNAC y Q10 ni se exige como prueba de una salida sin cambios.

## 5. Dependencias y diferencias con el flujo observado

Estas diferencias quedan registradas en el borrador antes de cualquier implementación. No autorizan modificar contratos, código o datos como parte de esta entrega.

| Área | Diferencia o dependencia para el objetivo |
| --- | --- |
| Acceso | El flujo observado usa OTP; falta integrar Google y Microsoft, registrar aplicaciones y configurar retornos. Las reglas transversales están incorporadas como objetivo en SPEC-004. |
| Consulta y autorización | Falta la consulta previa para alumno nuevo y la autorización de la ficha por correo. La política observada de búsqueda de estudiantes no admite todavía el propósito NUEVO. |
| Catálogos UNAC | Incorporar las escuelas oficiales de posgrado a la tabla correspondiente, asociadas a facultad y nivel académico, conservando los registros de pregrado. No inventar nombres, IDs ni asociaciones. |
| Clasificación | Incorporar una categoría explícita. Los registros históricos sin categoría no se convertirán automáticamente en público general. |
| Valores académicos | Admitir `null` para campos sin datos y preservar los valores previos cuando se selecciona público general. El formulario, el contrato y el guardado deberán coincidir en esta regla. |
| Actualización | Habilitar consulta y actualización autorizadas en el contexto de alumno nuevo, exclusivamente mediante CIUNAC y sin escrituras hacia Q10. |
| Alta coordinada | Definir cómo la API confirma el guardado en CIUNAC y Q10, identifica resultados parciales y evita duplicados. No ejecutar dos altas independientes desde el portal sin coordinación. |
| Contratos y documentación | Documentar las interfaces objetivo de autenticación, consulta, autorización, catálogos y actualización antes de implementar. Conservar el contrato observado como evidencia del estado actual. |

La incorporación documental a SDD está realizada: specs, planes, tareas, inventario y trazabilidad describen el objetivo. Continúa el flujo contrato → desarrollo → verificación → evidencia en trabajos posteriores. Los contratos nuevos quedan como requisitos/pendientes sin rutas ni esquemas definidos ahora; los OpenAPI existentes se conservan. Véase [validación de incorporación](../../../ciunac-specs/docs/validacion-historias-alumno-nuevo-2026-10-15.md).

## 6. Pruebas planificadas y estado de evidencia

Cada criterio nuevo tiene una prueba propuesta con el mismo número: CA-AN-009 → TEST-AN-009, hasta CA-AN-029 → TEST-AN-029. Los IDs de las pruebas existentes se conservan. Las pruebas siguientes están **pendientes de ejecución**.

| Historia | Criterios | Pruebas vinculadas |
| --- | --- | --- |
| HU-AN-003 | CA-AN-009 a CA-AN-011 | TEST-AN-009 a TEST-AN-011 |
| HU-AN-004 | CA-AN-012 a CA-AN-015 | TEST-AN-012 a TEST-AN-015 |
| HU-AN-005 | CA-AN-016 a CA-AN-019 y CA-AN-030 | TEST-AN-016 a TEST-AN-019 y TEST-AN-030 |
| HU-AN-001 | CA-AN-001 a CA-AN-004, CA-AN-008 y CA-AN-020 a CA-AN-022 | TEST-AN homónimos |
| HU-AN-006 | CA-AN-023 a CA-AN-026 | TEST-AN-023 a TEST-AN-026 |
| HU-AN-007 | CA-AN-027 y CA-AN-028 | TEST-AN-027 y TEST-AN-028 |
| HU-AN-002 | CA-AN-005 a CA-AN-007 y CA-AN-029 | TEST-AN homónimos |

Escenarios esenciales, con datos ficticios y proveedores aislados:

- Las tres alternativas de acceso, cancelación, sesión vencida y rechazo de cuentas institucionales de Microsoft.
- DNI/CE encontrado, ausente y consulta fallida; un fallo nunca habilita un alta como si el estudiante no existiera.
- Correo coincidente, correo diferente con código válido o inválido y ficha sin correo; ningún dato de ficha se expone antes de autorizar el acceso.
- Pregrado y posgrado con facultad, escuela y código válidos; escuelas de otra facultad o nivel; catálogo ausente.
- **TEST-AN-018:** público general sin datos previos mantiene los tres campos en `null`; con datos completos conserva los tres valores; con datos parciales conserva cada valor existente y deja en `null` solo los ausentes. Comprobar cambio de categoría, envío y persistencia, tanto en alta como en actualización.
- Paso de pregrado o posgrado a público general sin limpieza; regreso a pregrado o posgrado con validación de la escuela correspondiente.
- Actualización de una ficha existente con y sin identificador Q10: comprobar actualización en CIUNAC y ausencia de cualquier escritura hacia Q10.
- Salida sin actualizar con formulario incompleto o modificado: comprobar ausencia de escrituras y mensaje correcto.
- Alta coordinada, conflicto por duplicado, resultado parcial o incierto, notificación fallida y reintento exclusivo del correo.

No se han ejecutado pruebas funcionales ni se declara implementado o desplegado este comportamiento. Una revisión documental de IDs, enlaces y coherencia no sustituye la aceptación funcional ni certifica servicios externos.

## Precisión de persistencia — 2026-10-22

`tipo_estudiante` usa PRE/POS/PG en CIUNAC. Los históricos quedan NULL sin valor predeterminado; el flujo exigirá elección válida al guardar y PG conserva datos académicos previos. RN-AN-016 y CA/TEST-AN-030 están centralizados en SPEC-003. [SQL manual y guía](../../../ciunac-specs/docs/tipo-estudiante.md); script entregado sin ejecutarlo ni modificar backend/portal, contratos o bases. Las definiciones/decisiones de autenticación posteriores a la incorporación original permanecen con su alcance propio.
