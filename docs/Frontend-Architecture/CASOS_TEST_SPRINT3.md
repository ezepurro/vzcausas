# Casos de test del Sprint 3 (propuesta)

Lista para revisar **antes** de escribir los tests (TESTING.md §11). Sale del
contrato V4, del prototipo del 13/10/2026 y de los criterios cargados en Jira
al 17/10/2026. Queda afuera **HU-27 (Consultar línea de vida)**, que sigue
cambiando.

Cada caso dice de dónde sale: un `CA-x.y` de Jira, o **[V4 …]** / **[proto]**
cuando la historia no tiene criterios (HU-33, HU-40 y HU-42 no tienen ninguno).
Los criterios que prueba el backend van marcados `@backend` y no tienen test
acá.

Los textos entre comillas son los del prototipo o del contrato: el test los
fija y la pantalla tiene que usarlos.

## Quién programa cada pantalla (subtareas "frontend" de Jira)

| HU | Frontend | Pantalla | Archivo de test |
| --- | --- | --- | --- |
| 31 Actos interruptivos | Ezequiel Purro | Detalle de causa (modal) | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` |
| 33 Marcar prescripta | Ezequiel Purro | Detalle de causa (modal) | `components/cases/CaseDetailPage.prescription.test.tsx` |
| 34 y 35 Modelos formales | Luciano Cipolla | Modelos (`/modelos`) | `components/documents/DocumentTemplatesPage.test.tsx` |
| 39 y 40 Carpeta y modelos | Luciano Cipolla | Registrar causa, detalle, registrar acto | `components/cases/RegisterCasePage.folder.test.tsx`, `components/cases/CaseDetailPage.folder.test.tsx`, `components/proceedings/RegisterProceduralActPage.attachment.test.tsx` |
| 41 Tablero del abogado | Facundo Fiorani | Inicio, "Mi día" | `components/home/HomePage.lawyer.test.tsx` |
| 42 Tablero del administrador | Facundo Fiorani | Inicio, "Estudio" | `components/home/HomePage.administrator.test.tsx` |
| 30 y 32 Avisos por correo | — (sólo backend) | — | Sin tests de pantalla. HU-32 se ve en la barra de prescripción y en los tableros, y se prueba ahí |

**Por qué el detalle de causa se parte en tres archivos** y no uno por
pantalla, como pide TESTING.md: suma tres historias de dos personas distintas.
En un solo archivo pasaría los 12 tests del techo y Ezequiel y Luciano se
pisarían en el mismo archivo.

Los nombres que fijan los tests (si no te cierran, se cambian ahora):

| Qué | Nombre |
| --- | --- |
| Página de modelos | `DocumentTemplatesPage` en `@/features/documents/pages/` |
| Inicio | `HomePage` de `@/features/home/pages/` (ya existe), con los tableros de `features/dashboard/` adentro |
| Esquema del acto interruptivo | `validateInterruptiveAct` en `@/features/cases/schemas/interruptiveAct.schema` |
| Esquema de la marca de prescripción | `validatePrescriptionDeclaration` en `@/features/cases/schemas/prescriptionDeclaration.schema` |
| Esquema del modelo formal | `validateDocumentTemplate` en `@/features/documents/schemas/documentTemplate.schema` |
| Esquema del adjunto | `validateAttachment` en `@/features/proceedings/schemas/attachment.schema` |
| Acción "Marcar prescripta" | `cases.declarePrescription` en `ACTION_ACCESS` |

Los esquemas del acto interruptivo y de la prescripción van en `cases/` y no en
`proceedings/`: los modales se abren desde el detalle de la causa, y `cases` no
puede importar de `proceedings` (las dependencias van `proceedings → cases`).

---

## HU-31 · Registrar actos interruptivos

`components/cases/CaseDetailPage.interruptiveAct.test.tsx`, con el reloj en el
15/09/2026.

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | `mrios` registra "Citación a juicio" el 15/09/2026 en la causa 1: aviso "Acto interruptivo registrado. La prescripción se reinició desde el 15/09/2026." y la barra pasa a 15/09/2026 → 15/09/2034, con la nota "Cómputo reiniciado por el acto interruptivo registrado el 15/09/2026." | CA-31.1, CA-31.2 |
| 2 | Enviado vacío: "El acto interruptivo es obligatorio." en su campo | CA-31.8 |
| 3 | Un `400` del servidor se muestra en su campo | TESTING §5 (400 por formulario) |
| 4 | En la causa 9 (archivada, de `mrios`) el servidor responde `422`: se muestra "La causa se encuentra en un estado terminal y no admite esta operación." | CA-31.10 |
| 5 | `fvazquez` (no es el responsable de la causa 1) toca "Registrar acto interruptivo": ve "Solo el abogado responsable de la causa (Dra. Malena Ríos) registra actos interruptivos." y no se abre el formulario | CA-31.11, [proto] |
| 6 | Una causa de amparo (22) no ofrece "Registrar acto interruptivo" | CA-31.9, [proto] |
| 7 | La barra lee `prescription`: la causa 1 muestra 04/07/2024 → 04/07/2032, "27 %" y "Cómputo reiniciado por el acto interruptivo registrado el 04/07/2024."; la 4, "Sin actos interruptivos registrados." | CA-31.2, [V4 §3.7] |

`unit/cases/interruptiveAct.schema.test.ts`: nombre obligatorio y de hasta 255
(256 se rechaza), observaciones de hasta 2000, fecha obligatoria y no futura
(hoy sí, mañana no). Cuatro tests. Fuente: CA-31.8.

`@backend`: CA-31.3 (alcanza a todas las calificaciones), CA-31.4 (rige el más
reciente), CA-31.5 (nunca antes del hecho), CA-31.6 (no mueve la causa),
CA-31.7 (causa sin calificaciones), CA-31.12 (orden de la consulta), CA-31.14
(causa inexistente) y CA-31.15 (sin sesión).

**Queda sin test, a propósito, el criterio 31.13** (los actos interruptivos en
la línea de tiempo): la línea de tiempo es HU-27, que dejamos afuera. Se escribe
junto con ella.

## HU-33 · Registrar causa como prescripta

`components/cases/CaseDetailPage.prescription.test.tsx`. HU-33 no tiene
criterios en Jira: todo sale del contrato (§3.7, D-52 a D-54) y del modal del
prototipo.

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | `mrios` (abogada, no es la responsable) marca la causa 4: fecha 15/09/2026, "Resolución que la declara" y fundamento. Aviso "Causa marcada como prescripta. Se cerraron los plazos abiertos."; el encabezado muestra "Prescripta" y "Sin plazo abierto" | [V4 §3.7], [proto] |
| 2 | Sin resolución: "La resolución que declara la prescripción es obligatoria." en su campo | [V4 §3.7] |
| 3 | Un `422` del servidor se muestra en el modal | TESTING §5 |
| 4 | La Secretaría (`gestion`) no ve "Marcar prescripta" | [proto] (lo esconde), [V4 §4] |
| 5 | Una causa administrativa (2) no ofrece "Marcar prescripta" | [proto], [V4 §3.7] |

`unit/cases/prescriptionDeclaration.schema.test.ts`: fecha obligatoria y no
futura, resolución obligatoria y de hasta 255, fundamento de hasta 2000. Tres
tests.

`unit/app/actionAccess.test.ts`: `cases.declarePrescription` lo tienen
Administrador y Abogado, y no la Secretaría. Un test.

## HU-34 y HU-35 · Modelos formales

`components/documents/DocumentTemplatesPage.test.tsx`, en `/modelos`.

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | Las tres tarjetas por fuero: "Penal · 6 modelos vigentes · Actualizado 21/08/2026", Administrativo 4 (08/09/2026), Amparo 2 (09/09/2026) | CA-35.1, CA-35.4 |
| 2 | Al entrar a "Penal": los 6 modelos con nombre, archivo, tipo ("Escrito de fondo"), "Última versión 21/08/2026", autor y "12 usos", y el total "6 modelos" | CA-35.1, CA-35.2, CA-35.4, CA-34.6 |
| 3 | Un fuero sin modelos: "Todavía no hay modelos en este fuero." y "0 modelos" | CA-35.5 |
| 4 | "Descargar" pide el archivo del modelo (`GET /document-templates/2/file`) | CA-35.6 |
| 5 | Si Drive no responde al descargar: "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos." | CA-35.6, [V4 §3.10] |
| 6 | Error de carga del listado | TESTING §11 (mínimo) |
| 7 | Alta para un fuero (nombre, Penal, tipo "Recurso", `.docx`, casilla tildada): aviso 'Modelo "Recurso de queja" registrado para el fuero Penal.' y aparece en la lista | CA-34.1, CA-34.2, CA-34.5 |
| 8 | Alta para dos fueros: 'Modelo "…" registrado para los fueros Penal y Amparo.' | [V4 D-55], [proto] |
| 9 | Enviado vacío: "El nombre del modelo es obligatorio." y los demás en sus campos | CA-34.4 |
| 10 | Un `400` del servidor sobre el archivo se muestra en su campo ("El archivo tiene que ser .docx.") | CA-34.3, TESTING §5 |
| 11 | Si Drive no responde: aviso de error y el modelo no aparece en la lista | CA-34.7 |

`unit/documents/documentTemplate.schema.test.ts`: sólo `.docx` (un `.pdf` no),
hasta 10 MB, nombre de hasta 150, al menos un fuero, tipo obligatorio. Cinco
tests. Fuente: CA-34.3, CA-34.4.

`unit/app/access.test.ts`: `/modelos` lo ven Administrador y Abogado, y la
Secretaría no. **Cambia un test que ya existe**, que hoy dice que `/modelos`
es de los tres perfiles. Fuente: CA-34.8, CA-35.8, [V4 §8.4].

`@backend`: CA-35.3 (orden alfabético), CA-35.7 (bajas), CA-35.9 (sin
sesión: lo cubre la guarda que ya está probada).

## HU-39 y HU-40 · Carpeta en la nube y modelos en la carpeta

`components/cases/RegisterCasePage.folder.test.tsx`:

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | Con las dos casillas tildadas (vienen así), el alta crea la carpeta: aviso "Causa 14200315 registrada. El estado lo fija el primer acto procesal · carpeta creada en Drive con 6 modelos." | CA-39.1, [V4 D-61], [proto] |
| 2 | El resumen muestra "Carpeta en Drive: /VZ Causas/2026/Penal/14200315 — GÓMEZ" y la casilla de modelos dice "6 modelos parametrizados para el fuero Penal." | [V4 D-63], [V4 §3.10], [proto] |
| 3 | Al destildar "Crear la carpeta de la causa en Drive" se destilda también la copia, el resumen dice "No se creará carpeta" y la causa se registra sin carpeta | [V4 §3.7], [proto] |
| 4 | Tildar la copia sin la carpeta: aviso "Primero hay que crear la carpeta en Drive para poder copiar los modelos." y la casilla sigue destildada | [proto] |
| 5 | Si Drive no responde, la causa se registra igual y el aviso dice que la carpeta no pudo crearse | CA-39.5, [V4 D-62] |
| 6 | La Secretaría ve las dos casillas y su alta también crea la carpeta | Perfiles de HU-39, [V4 C-31] |

`components/cases/CaseDetailPage.folder.test.tsx`:

| # | Caso | Fuente |
| --- | --- | --- |
| 7 | La causa 1 tiene "Abrir carpeta en Drive", un enlace a su carpeta que abre en otra pestaña | CA-39.4 |
| 8 | La causa 22 dice "Carpeta pendiente"; "Crear carpeta" la crea y aparece "Abrir carpeta en Drive" (como `gestion`) | CA-39.6 |
| 9 | Si Drive vuelve a fallar: "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos." y sigue "Crear carpeta" | CA-39.6, [V4 §3.7] |

`components/proceedings/RegisterProceduralActPage.attachment.test.tsx` (el
adjunto lo puso V3 en HU-39; **falta confirmar que entra en el sprint**, C-33):

| # | Caso | Fuente |
| --- | --- | --- |
| 10 | `mrios` adjunta un PDF en la causa 1 y registra el acto: el acto queda con su cédula | [V4 §3.8, D-64], [proto] |
| 11 | Un archivo que no es PDF: "El archivo tiene que ser un PDF." en su campo | [V4 §3.8] |
| 12 | En la causa 17 (sin carpeta), el acto se registra igual y se avisa "La causa no tiene una carpeta en la nube donde guardar el archivo." | [V4 §3.8, D-64] |

`unit/proceedings/attachment.schema.test.ts`: sólo `.pdf` y hasta 10 MB. Dos
tests.

`@backend`: CA-39.2 (nombre), CA-39.3 (ubicación), CA-39.7 (una sola carpeta),
CA-39.8 (privacidad), CA-39.9 (auditoría).

**Cambia un test que ya existe**: en `RegisterCasePage.test.tsx`, el aviso del
alta con SAC pasa a terminar en "· carpeta creada en Drive con 6 modelos.",
porque desde V4 la carpeta se crea por defecto.

## HU-41 · Tablero del abogado ("Mi día")

`components/home/HomePage.lawyer.test.tsx`, en `/inicio`, con el reloj en el
15/09/2026.

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | `mrios`: "Buen día, Malena Ríos" y "Martes 15 de septiembre de 2026 · tus causas pendientes y los plazos por vencer" | CA-41.1, [proto] |
| 2 | Los cuatro indicadores de `mrios`: Vencen hoy 0, Vencidos 1, Próx. 5 días hábiles 1, Mis causas activas 2 | CA-41.2 |
| 3 | "Lo primero de hoy" es la causa 17, "Venció hace 7 días · 04/09/2026", y lleva a su detalle | CA-41.3 |
| 4 | La agenda "Septiembre 2026" muestra cada plazo en su día y lleva al detalle | CA-41.3, [proto] |
| 5 | `fvazquez`: en "Causas para impulsar", ACOSTA con "71 días", su estado y "última actuación 06/07/2026"; "Ver detalle" lleva a la causa 4 | CA-41.4 |
| 6 | Sin pendientes: "Todas tus causas tienen un plazo en curso." (`mrios`) y "Sin plazos abiertos" | CA-41.8 |
| 7 | Alertas de prescripción: `fvazquez` ve ACOSTA con "78 % transcurrido" y "Restan 1 año 4 meses"; `mrios` ve "Ninguna causa superó el 70 % de su plazo de prescripción." | [V4 D-66], [proto], HU-32 |
| 8 | Después de registrar un acto, al volver al inicio el tablero muestra el estado y el vencimiento nuevos | CA-41.9 |
| 9 | Error de carga | TESTING §11 |
| 10 | Quien es Administrador y Abogado (`fvazquez`) ve las pestañas "Mi día" y "Estudio" y arranca en "Mi día" | [V4 §3.11], [proto] |

`unit/app/access.test.ts`: `/inicio` lo ven Administrador y Abogado, no la
Secretaría (el prototipo la lleva a Causas). **Cambia el mismo test que ya
existe.** Fuente: CA-41.10, [V4 §3.11].

`@backend`: CA-41.5 (días hábiles; además está abierto C-24) y CA-41.6 (sólo
causas activas).

## HU-42 · Tablero del administrador ("Estudio")

`components/home/HomePage.administrator.test.tsx`, como `supervision`
(Administrador que no ejerce). HU-42 no tiene criterios en Jira: sale del
contrato (§3.11) y del prototipo.

| # | Caso | Fuente |
| --- | --- | --- |
| 1 | Sin pestañas, directo a "Estudio": indicadores Causas activas 20, Vencen hoy 2, Vencidos 2, Próx. 5 días hábiles 5 | [V4 §3.11], [proto] |
| 2 | "Cartera por fuero": 20 causas; Penal 9, Administrativo 5, Amparo 6 | [V4 §3.11] |
| 3 | "Vencimientos del estudio": cada plazo con carátula, estado, SAC, responsable y "Hace 7 días" / "Vence hoy"; "Ver causa" lleva al detalle | [V4 §3.11], [proto] |
| 4 | Filtro por urgencia: Todos 14, Vencidos 2, Hoy 2, Esta semana 5, Después 5; "Vencidos" deja sólo los dos vencidos | [proto] |
| 5 | "Carga del equipo": tocar a la Dra. Malena Ríos deja sólo sus plazos, con el título "Vencimientos del responsable"; tocar el chip lo limpia | [proto] |
| 6 | Una selección sin plazos: "No hay plazos en esta selección." | [proto] |
| 7 | Alertas de prescripción de todo el estudio: FUNES (prescripción cumplida) y ACOSTA | [V4 §3.11], HU-32 |
| 8 | Error de carga | TESTING §11 |

---

## Lo que tenés que decidir

1. **Jira contra el contrato.** Los criterios que Jira cargó hoy (17/10) chocan
   con V4 en cuatro puntos. Propongo seguir el contrato y dejar la diferencia
   anotada en el test:
   - CA-39.2: Jira nombra la carpeta con el id interno y la carátula. V4 (D-63)
     y el prototipo la nombran con el SAC y el apellido.
   - CA-39.5: Jira pide un reintento automático. V4 tiene sólo el manual,
     `POST /cases/{caseId}/folder`.
   - CA-41.7: Jira pide que el abogado pueda ver "todo el estudio". V4 (D-66) y
     el prototipo no lo ofrecen (C-34).
   - CA-41.10 y el "fuera de alcance" de HU-41 sacan las alertas de
     prescripción, pero el prototipo las muestra (C-34).
2. **HU-51 y HU-52** ("Verificar vencimiento de plazo de presentación" y
   "Verificar plazo de prescripción") están en el sprint de Jira, pero no tienen
   descripción ni subtareas y no figuran en V4. Las dejo afuera.
3. **El adjunto de la cédula** (casos 10 a 12 de HU-39) depende de C-33.
4. **Los tres tests que ya existen y cambian**: `access.test.ts` (`/inicio` y
   `/modelos`) y el aviso de `RegisterCasePage.test.tsx`. Además,
   `CaseDetailPage.test.tsx` (CA-22.3) espera la nota vieja de la barra de
   prescripción. Lo dejo como está y, si el texto de V4 la reemplaza, se cambia
   cuando se programe.
