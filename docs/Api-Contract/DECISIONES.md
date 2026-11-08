# Decisiones del API Contract

Registro de las decisiones de diseño detrás de
[`API_CONTRACT_V5.md`](API_CONTRACT_V5.md), de los puntos que siguen abiertos y
del impacto de cada versión sobre lo implementado. El contrato no las cita: este
archivo existe para que las referencias `D-xx` y `C-xx` del código y de la
documentación sigan teniendo a qué apuntar.

Las decisiones de V3 (D-01 a D-44), de V4 (D-45 a D-86) y de V5 (desde D-87)
conservan su identificador. Cuando el texto dice "esta versión" o "nuevo", se
refiere a la versión de la sección en que está. Las referencias a secciones (§4, §5.3, …) son
de `API_CONTRACT_V5.md`.

## 1. Decisiones tomadas

### Decisiones de V5

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-87 | El alcance es HU 14, 19, 21, 23, 24, 25, 28 y 38 | Sprint "VZ Sprint 4" de Jira (25/10/2026 – 06/11/2026). Coincide con el Story Map del Seguimiento v1.3, salvo el nombre de HU23, que el equipo confirmó como "Descargar Modelo Formal" (C-30) |
| D-88 | V5 es autocontenido y V4 queda sin modificar | Mismo criterio que V4 respecto de V3 (D-46). Lo heredado conserva su redacción; lo nuevo se marca **(V5)** |
| D-89 | HU14 no cambia la forma de `PATCH /lawyers/{lawyerId}`: se precisan los obligatorios (no se vacían), la unicidad de la matrícula (enviar la propia no es conflicto) y que las causas referencian y no copian al abogado. **(Revisión del 27/10/2026)** Cambiar el nombre renombra la carpeta del abogado en Drive (D-104) | Criterios CA-14.1 a CA-14.6 de Jira y formulario "Modificar abogado" del prototipo (Apellido, Nombres, Matrícula, los tres obligatorios). El endpoint está contratado desde V2 y no implementado: no hay nada que migrar. **(Revisión del 05/11/2026)** La matrícula deja de ser obligatoria (D-107) |
| D-90 | HU23 ("Descargar Modelo Formal") es `GET /document-templates/{templateId}/file` de V4, con su restricción a `ADMINISTRATOR` o `LAWYER` | El botón "Descargar" de la pantalla Modelos es ese endpoint, y solo descarga modelos formales: quien no puede ver los modelos no los descarga (respuesta del equipo a C-30). La Secretaría no ve la sección "Modelos" en el prototipo |
| D-91 | **(Revisión del 27/10/2026)** La causa no suma datos para la carátula. El secretario/a del órgano que imprime la hoja es el instructor de la causa (`instructorName`). `court` cambia de rótulo ("Órgano interviniente") pero no de nombre **(Revisado el 31/10/2026: la hoja lleva tres líneas, ver C-35)** | Definido por el equipo. Reemplaza el `courtSecretaryName` de la primera redacción de V5: el instructor ya es el dato que el estudio carga. Renombrar `court` rompería a un cliente de V4 sin ganar nada |
| D-92 | **(Revisión del 27/10/2026)** Nada de la carátula se guarda en la causa: el alta y la modificación quedan como en V4. `GET /cases/{caseId}/cover` arma la hoja con los datos de la causa y las observaciones vacías; al generar el expediente, el cliente envía las observaciones y, en el fuero penal, la parte que no está registrada en la causa (el querellante si el cliente es defensa, el imputado si es querellante) | Definido por el equipo. Reemplaza el `cover` guardado con partes sugeridas (`partiesSuggested`) de la primera redacción de V5. La causa penal solo registra al cliente, así que la otra parte no se puede derivar; pedirla en "Generar expediente" evita guardar un dato que solo usa la hoja |
| D-93 | Hay dos plantillas de carátula, la penal y la administrativa; el amparo usa la administrativa. La plantilla la elige el backend según el fuero y no viaja en la API | Pedido del equipo ("la carátula de administrativo se usa para amparo también") y prototipo (`PLANTILLA_TXT`). Las tres plantillas del estudio comparten la hoja; la de querellante es la penal con otra forma de llenar las partes, que resuelve la regla de partes según el rol procesal. **(Revisión del 27/10/2026)** Se retira el enumerado `CoverTemplate`, que solo existía para el `cover` guardado |
| D-94 | La carátula la genera **el backend** en PDF, siempre con la misma función: para la vista previa y para imprimirla suelta (`GET /cases/{caseId}/cover`), y para la hoja 1 del expediente, con las observaciones y la parte penal que envía el cliente. No se guarda | Mismo criterio que D-20: lo que el usuario ve antes de generar el expediente es lo que se imprime, salvo lo que él mismo completa. HU24 pide "emitir" la carátula para rotular el expediente físico, aunque el prototipo ya no tenga un botón aparte |
| D-95 | **(Revisión del 27/10/2026)** El fuero de una causa no se modifica: `PATCH /cases/{caseId}` rechaza `jurisdiction` con `400 VALIDATION_ERROR`. Una causa registrada en el fuero equivocado se da de baja y se registra de nuevo | Definido por el equipo (C-25). Reemplaza la regla provisoria de la primera redacción de V5, que permitía el cambio y reasignaba el estado procesal. Mismo criterio que D-36 para los estados procesales. Como el SAC se libera con la baja (D-97), registrar de nuevo es posible |
| D-96 | Una causa en estado terminal se puede modificar, salvo las calificaciones legales de una causa "Prescripta" | Corregir un dato mal cargado de una causa archivada es el uso normal de HU19. Las calificaciones son lo que sostiene la declaración de prescripción (D-53, D-74). El fuero no figura porque no se modifica en ninguna causa (D-95) |
| D-97 | La baja de una causa es lógica, la puede hacer cualquier perfil, acepta un motivo opcional en el cuerpo del `DELETE` y deja la causa inexistente para el cliente, con todos sus subrecursos. **(Revisión del 27/10/2026)** El SAC queda libre: es único entre las causas vigentes. La carpeta de Drive no se toca | RN12, matriz de permisos y formulario "Dar de baja la causa" del prototipo ("Motivo (opcional)"). Un cuerpo en el `DELETE` evita un endpoint aparte solo para el motivo. Liberar el SAC lo definió el equipo (C-32): permite volver a registrar bien una causa cargada mal. Se aparta del diccionario de datos, que hace el SAC único "incluidas las causas dadas de baja" |
| D-98 | Modificar un acto procesal recalcula su plazo: con el plazo vigente de la tabla si cambia el estado, con el plazo copiado si no. El acto suma `lastModifiedBy` y `lastModifiedAt` | Si cambia el estado es como registrar de nuevo; si solo se corrige una fecha, el plazo que rige es el que se copió (§3.4, D-08). El prototipo promete "El cambio queda asentado con usuario y fecha" |
| D-99 | Después de modificar un acto, el estado actual de la causa se recalcula con D-14 (el acto más reciente). Corregir el acto que cerró una causa puede reabrirla. Los actos de una causa "Prescripta" no se modifican | Una corrección de fecha no puede dejar a la causa en un estado que no le corresponde. Reabrir es la única forma de corregir un "Archivada" elegido por error, ya que la anulación (HU29) es del Sprint 5. "Prescripta" no la puso un acto (D-54) |
| D-100 | Los documentos de la causa se leen de su carpeta de Drive en cada pedido, sin guardarlos ni paginarlos, y su `id` es el de Drive. El backend opera con el permiso `drive.readonly` | Es lo que describe el prototipo ("esta lista se lee de ahí cada vez que abrís el detalle") y lo que anticipó ADR-003 §4.1. Guardar una copia de la lista crearía dos verdades. El permiso lo confirmó el equipo (C-24) |
| D-101 | El documento no tiene "Presentado", "Recibido" ni "Cargado", y su autor es el que informa Drive (`uploadedBy`), no un usuario del sistema | El prototipo deriva esas etiquetas de datos de ejemplo; Drive no tiene esa clasificación y las personas suben archivos directamente. Inventarla obligaría a mantenerla a mano. Confirmado por el equipo: las etiquetas no van |
| D-102 | El expediente es un PDF sincrónico, guardado en la carpeta de la causa con versión correlativa, que admite PDF, Word, documentos de Google y JPG o PNG, y no admite incluir un expediente anterior. Necesita la carpeta creada | Pantalla "Generar expediente" del prototipo: "un único PDF", "Se convierte a PDF", "Quedó guardado como nueva versión", y la lista que excluye los expedientes. Los tipos son los que el prototipo muestra (PDF, DOC, IMG) |
| D-103 | La descarga de un documento pasa por la API; la de un expediente generado está abierta a los tres perfiles, la de cualquier otro documento solo a `LAWYER` y `SECRETARY`. **(Revisión del 27/10/2026)** La lista de documentos está abierta a los tres perfiles (C-27) | Mismo motivo que D-58. Quien genera el expediente tiene que poder descargarlo e imprimirlo, y un Administrador sin otro rol no tiene acceso a la carpeta en Drive (D-83). El Administrador necesita la lista para elegir los documentos del expediente, pero lo único que descarga es el expediente |
| D-104 | **(Revisión del 27/10/2026)** La carpeta de Drive sigue a la causa: se renombra si cambia la carátula, se mueve a la carpeta del nuevo responsable si cambia el responsable, y la del abogado se renombra si cambia su nombre. Si Drive no responde, la modificación no falla y el cambio se completa después, con `POST /cases/{caseId}/folder` o con el proceso diario. Reemplaza en esto a D-61. **(Revisión del 08/11/2026)** Al dar de baja la causa, su carpeta se mueve a la carpeta `Papelera` de la raíz del estudio (`/VZ Causas/Papelera/`, creada la primera vez que hace falta), con lo que tiene adentro: no se borra ni se purga, y la fila de la carpeta y el vínculo de la causa se conservan. Si Drive no responde, la baja no falla y la carpeta queda como estaba. Reemplaza el "la carpeta no se toca" de HU21 (CA-21.8) | Definido por el equipo (C-26). **Revisión del 08/11/2026: a acordar con el equipo** (cambia CA-21.8; RN9 se sigue cumpliendo, los documentos se conservan). Se mueve en lugar de usar la papelera propia de Drive porque con `drive.file` Drive rechaza (`403 appNotAuthorizedToChild`) mandar a la papelera una carpeta con archivos que no creó la app, como los que suben los abogados a mano; mover no tiene esa limitación. La fila de la carpeta queda con su ubicación anterior, algo que no se lee: para el cliente la causa dada de baja no existe (D-97). Una carpeta que no corresponde a la carátula o al responsable confunde a quien trabaja en Drive. Con `drive.file` alcanza, porque la app creó esas carpetas. No hacer fallar la modificación es el mismo criterio que la creación (D-60, R-03) |
| D-105 | **(Revisión del 27/10/2026)** El cliente de una causa se puede modificar. El backend no recalcula la carátula: el cliente la propone y la envía en `caption`, en la misma petición | Definido por el equipo (C-31). Es la misma regla que el alta (§3.7): la carátula sugerida la arma el cliente |
| D-107 | **(Revisión del 05/11/2026)** La matrícula del abogado es opcional: `registrationNumber` vale `null` si no se cargó, no viaja (o viaja vacía) en el alta, y en `PATCH /lawyers/{lawyerId}` `null` la borra. Sigue siendo única entre los abogados que la tienen. Vale también para la ficha que se registra con `POST /users` | Pedido del equipo. El estudio necesita registrar abogados de los que todavía no tiene la matrícula. Cambia CA-14.4 en lo que respecta a la matrícula; el apellido y los nombres siguen siendo obligatorios |
| D-109 | **(Revisión del 06/11/2026)** `address` y `phone` del cliente son obligatorios en `POST /clients` (no vacíos). Reemplaza el "opcional" de `address` de D-108 y el de `phone` de V4. La regla vive en el dominio y también en la base: las dos columnas son `NOT NULL` | Pedido del equipo (06/11/2026). Los clientes cargados hasta ahora son datos de prueba: se vacía la base y se vuelve a cargar con el seed, así que no hace falta un valor de relleno para los viejos |
| D-108 | **(Revisión del 05/11/2026)** El cliente se identifica con `documentType` (`DNI` o `PASSPORT`) y `documentNumber`, que reemplaza a `dni`, y suma `address` (texto libre, hasta 255 caracteres; obligatoria desde D-109). El documento es único por tipo entre los clientes vigentes. El `409` conserva el código `CLIENT_DNI_ALREADY_EXISTS` | Pedido del equipo: hay clientes extranjeros que no tienen DNI, y el estudio necesita la dirección. Los tipos los eligió el equipo (DNI y pasaporte). Renombrar `dni` es un cambio incompatible que el equipo aceptó; el código de error no se renombra porque no aporta y rompería el manejo de errores de los dos lados |
| D-106 | **(Revisión del 27/10/2026)** En la hoja de carátula, el abogado lleva el prefijo fijo `DR.`, igual para todos. **(Revisado el 29/10/2026: era `DR/DRA.`; se alinea con las plantillas del estudio y con los CA de la HU24, VZ-32)** | Definido por el equipo (C-28). El sistema no sabe si corresponde "Dr." o "Dra." y el estudio prefirió no cargar ese dato en el abogado (C-13). Es una excepción a D-81 porque la hoja la escribe el backend |
| D-109 | **(06/11/2026)** Los modelos formales se guardan en Drive en una subcarpeta por fuero, `/VZ Causas/Modelos formales/{Penal, Administrativo, Amparo}`. Un modelo de varios fueros sigue siendo un solo modelo (D-55) pero su archivo se copia en la subcarpeta de cada uno de sus fueros, y al registrar una causa se copia a su carpeta el de su fuero. **No cambia ningún endpoint, campo ni código de error** | Pedido del equipo: con todos los modelos en una sola carpeta, abrirla en Drive mezclaba los de los tres fueros. D-55 se mantiene porque habla del registro y de la API, no de dónde vive el archivo en Drive. El archivo del primer fuero es el principal (el que se descarga); el de cada fuero se registra en `document_template_files`. Los modelos anteriores se dejan donde están y HU40 los sigue copiando desde su archivo (`ADR-003_GOOGLE_DRIVE.md` §2.2) |

### Decisiones de V4

Sin cambios de redacción. Las que esta versión modifica: D-61 (la carpeta se
renombra y se mueve, D-104) y D-81 (excepción de la hoja de carátula, D-106).

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-45 | El alcance es HU 27, 30, 31, 32, 33, 34, 35, 39, 40, 41, 42, 51 y 52 | Sprint "VZ Sprint 3" de Jira y Story Map del Seguimiento v1.2 (§4.1.2), más HU51 y HU52, incorporadas al sprint por el equipo |
| D-46 | V4 es autocontenido y V3 queda sin modificar | Mismo criterio que V3 respecto de V2 |
| D-47 | ~~HU27 no agrega endpoints~~ **Reemplazada por D-85** | ~~Sus dos endpoints ya estaban en V3 y están implementados. La línea de tiempo del prototipo se completa con los actos interruptivos y el pase a "Prescripta", que tienen su propia fuente; el cliente intercala las tres~~ |
| D-85 | HU27 pasa a ser "Consultar Línea de Vida de la Causa" y absorbe la consulta de actos interruptivos. La línea de vida tiene endpoint propio, `GET /cases/{caseId}/timeline`, sin paginar, con las tres fuentes ya intercaladas (revisión del 19/10/2026) | El usuario nunca consulta actos procesales o interruptivos por separado: los ve en la línea de vida. Intercalando en el cliente, la paginación de los dos listados dejaba la línea de vida incompleta sin ningún error si la causa tenía más actos que la página, y obligaba al cliente a recordar pedir `limit=100`. Los listados de actos procesales e interruptivos, y el `GET` de un acto procesal, se mantienen: ya están implementados, y el de un acto lo necesitan HU28 y HU29 para modificar o anular el acto elegido en la línea de vida |
| D-48 | El acto interruptivo es un recurso propio, anidado en la causa, y no un acto procesal con una marca | No mueve el estado ni abre un plazo, y su formulario pide otros datos. La arquitectura ya lo preveía como `InterruptiveAct` dentro del agregado `Case` |
| D-49 | Un acto interruptivo alcanza a todas las calificaciones de la causa, rige el más reciente y su nombre es texto libre | El formulario no pide elegir una calificación y habla de "la prescripción de la acción". Tomar el más reciente permite cargar actos viejos sin retroceder el cómputo, igual que D-14 |
| D-50 | Los actos interruptivos existen solo en `CRIMINAL` y los registra solo el abogado responsable. Fuera del fuero penal responden `422 PRESCRIPTION_NOT_APPLICABLE` | El prototipo ofrece el botón solo en causas penales y solo al responsable; la matriz de permisos dice lo mismo (HU31). Se usa el mismo código que la marca de prescripción porque el motivo del rechazo es el mismo |
| D-51 | La causa incluye `prescription`, calculada por el backend, con la alerta en un 70 % fijo | El backend necesita ese cálculo para el correo y los tableros; devolverlo deja un único lugar de cálculo, como D-20. Reemplaza la parte de D-19 que dejaba al cliente elegir la calificación y calcular el porcentaje. El 70 % es el "aviso al 70 %" del prototipo |
| D-52 | Marcar una causa como prescripta (HU33) es una acción manual, con fecha y resolución, para `ADMINISTRATOR` o `LAWYER`. El proceso automático detecta el plazo cumplido y avisa, pero no cambia el estado de ninguna causa | Es lo que define el prototipo. Evita que el sistema cierre una causa porque faltó cargar un acto interruptivo |
| D-53 | "Prescripta" es un estado de sistema del fuero `CRIMINAL`: visible en `/procedural-states`, terminal y protegido contra modificación y baja | HU33 necesita un estado de destino que exista siempre. Queda visible, a diferencia de "Iniciada", porque el prototipo lo lista y el filtro de causas lo usa |
| D-54 | Marcar una causa como prescripta no crea un acto procesal, responde `200` con la causa y no tiene reversión | "Prescripta" no es destino de un acto (D-69). Cambian varias partes de la causa a la vez, así que devolverla entera le ahorra al cliente una segunda petición |
| D-55 | Un modelo formal tiene `jurisdictions`, una lista de fueros | El alta del prototipo es de selección múltiple, con "Todos los fueros". Un modelo con varios fueros es un solo registro con un solo archivo |
| D-56 | Los modelos formales los leen y los registran `ADMINISTRATOR` o `LAWYER`. El alta es `multipart/form-data`, solo `.docx`, hasta 10 MB, y atómica. El modelo no tiene tipo | Matriz de permisos y CA-34.8 y CA-35.8; la sección no está en el menú de la Secretaría. Formato y atomicidad: CA-34.3 y CA-34.7. Los 10 MB son el máximo que el prototipo usa para adjuntos |
| D-57 | El listado de modelos está paginado y ordenado por nombre, con filtros `jurisdiction` y `copyToNewCases`. Las tarjetas por fuero las arma el cliente | CA-35.2 a CA-35.5. Evita un endpoint de resumen para un catálogo chico |
| D-58 | El archivo de un modelo se descarga a través de la API, no con un enlace directo a Drive | La Secretaría no puede consultar modelos; un enlace de Drive no respeta los perfiles del sistema |
| D-59 | `createFolder` y `copyTemplates` son opcionales y valen `true` por defecto. Los nombres no mencionan a Drive | Las casillas del prototipo vienen tildadas, y las historias piden que la carpeta se cree "automáticamente". La arquitectura nombra por necesidad y no por tecnología |
| D-60 | Una falla del almacenamiento en la nube no aborta el alta de la causa: queda `folder.status` en `ERROR` y se reintenta con `POST /cases/{caseId}/folder` | La causa es el dato que el estudio no puede perder. Es la mitigación de R-03 de la arquitectura de backend. El mismo endpoint les da carpeta a las causas registradas antes de esta versión |
| D-61 | La carpeta se ubica en `/VZ Causas/{abogado}/{fuero}/` y se llama como la carátula de la causa. No se renombra ni se mueve | Definido por el equipo. La carátula ya reúne al cliente y la calificación o el objeto. Detalle en ADR-003 |
| D-62 | Hay un endpoint por tablero, que devuelve todo en una petición y sin paginar | Son modelos de lectura, lo que la arquitectura asigna a `reporting`. Los indicadores, la cartera por fuero y la carga del equipo son agregados. Las listas están acotadas por las causas activas |
| D-63 | El abogado ve solo el tablero de sus causas; si además es `ADMINISTRATOR`, ve también "Estudio". "Próximos" son 5 días hábiles | Definido por el equipo; CA-41.7 no aplica. Los 5 días hábiles salen de CA-41.2 y del prototipo |
| D-64 | El proceso diario no tiene endpoints. Envía un correo por día con todos los avisos: preaviso y día del vencimiento, alerta de prescripción al 70 % y prescripción cumplida. No avisa los plazos ya vencidos | Nadie lo dispara desde la aplicación. Un resumen diario evita un correo por causa |
| D-65 | Se incorporan `413` y `502` | `502` separa la falla de un servicio externo de un error propio: para el cliente es "reintentar", no "corregir los datos". `413`, porque el límite de tamaño lo aplica el servidor antes de validar el formulario |
| D-66 | No se contrata la lista de documentos de la causa | El prototipo la muestra, pero no es una historia de este sprint. Esta versión entrega el enlace a la carpeta (`folder.url`) |
| D-67 | La causa incluye `clientDetained` (penal), `injunctionGranted`, `harmfulActDate`, `harmfulActRenews`, `harmfulActRenewalDays`, `harmfulActTermDays` y `harmfulActTermDayType` (amparo), `administrativeRemedyExhaustedOn` (administrativo) y `courtFeePaid` (todos). Fuera de su fuero valen `null`; se cargan solo en el alta | Definidos por el equipo. `courtFeePaid` cubre RN10. Modificarlos llega con HU19 |
| D-68 | Usuarios y abogados tienen `lastName` y `firstName` en lugar de `fullName`, también en toda referencia a ellos dentro de otros recursos | Definido por el equipo: toda persona del sistema tiene nombre y apellido separados, como el cliente desde V3 |
| D-69 | Un acto procesal puede llevar la causa a cualquier estado del fuero, terminal o no, salvo "Prescripta". Una causa en estado terminal no admite actos nuevos. Reemplaza a D-15 | A "Archivada" se llega con un acto procesal; "Prescripta" tiene su propio botón (D-52) |
| D-70 | El estado procesal informa `caseCount`, las causas que están en él, activas o no, en lugar de `activeCases` | La columna "Causas" tiene que mostrar también las archivadas y las prescriptas. Se cambió el nombre porque `activeCases` con otro significado confundiría; los demás recursos conservan su `activeCases` |
| D-71 | El nombre de un modelo formal es único, sin distinguir mayúsculas | Definido por el equipo |
| D-72 | HU51 y HU52 son la verificación diaria del proceso automático: detectan los vencimientos en preaviso, del día y vencidos (HU51) y las prescripciones al 70 % y cumplidas (HU52). No tienen endpoints ni pantalla | HU30 y HU32 envían por correo lo que esa verificación encuentra |
| D-73 | Solo sábados y domingos son días no hábiles | Definido por el equipo. Resuelve por ahora P-02 de la arquitectura |
| D-74 | Una causa penal sin calificación legal no prescribe: `prescription` vale `null` y `POST /cases/{caseId}/prescription` responde `422 PRESCRIPTION_NOT_APPLICABLE`. Los amparos no prescriben | Definido por el equipo |
| D-75 | `GET /cases` incluye, sin filtro de estado, también las causas en estados terminales; excluye solo las dadas de baja | Es como está implementado |
| D-76 | El nombre del acto procesal es el del estado que registra; no hay un campo aparte | Confirma D-10 |
| D-77 | La nota de cada estado procesal ("El plazo no corre de oficio…") es un texto fijo del frontend, no un campo del recurso | Definido por el equipo |
| D-78 | En el amparo se calcula `harmfulActDeadline`: la fecha vigente del acto lesivo —la cargada o, si se renueva, la última renovación que no supera hoy— más el plazo que carga el usuario. Se muestra en el detalle, en los tableros y en los avisos, solo mientras la causa está en "Iniciada" | Vencido ese plazo ya no se puede presentar el amparo. La renovación la calcula el sistema, sin historial. El primer acto procesal indica que el amparo ya se presentó |
| D-79 | La casilla de gestión, los días de preaviso, la hora de la corrida y la copia al responsable son configuración del servidor, no de la API | La pantalla para configurarlos no es de este sprint. Valores iniciales: 3 días hábiles, 08:00, con copia |
| D-80 | `clientDetained` aplica en toda causa penal, sea el cliente defensa o querellante | Definido por el equipo |
| D-81 | El tratamiento de los abogados ("Dr.", "Dra.") lo pone el frontend | Definido por el equipo |
| D-82 | En `GET /cases`, el orden por urgencia y el filtro `openDeadline` consideran el vencimiento abierto de la causa, sea del acto procesal o del acto lesivo. Modifica a D-25 | Un amparo con el plazo para presentarse por vencer tiene que verse como urgente en el listado, no solo en los tableros |
| D-83 | El sistema comparte la carpeta raíz `VZ Causas` con los usuarios vigentes con rol `LAWYER` o `SECRETARY`, como editores, y les quita el acceso al dejar de serlo. Las operaciones de usuarios no fallan si Drive no responde; el proceso diario reconcilia | Compartir la raíz respeta RN11 (todos ven todas las causas). Los perfiles salen de la matriz (HU38). Detalle en ADR-003 |
| D-84 | El backend opera con una autorización OAuth de la cuenta de Gmail de gestión del estudio, otorgada una vez, con el permiso `drive.file` | Con una cuenta de Gmail común no hay unidades compartidas y una cuenta de servicio no tiene espacio en Drive. Detalle en ADR-003 |
| D-86 | El `deadline` de un acto procesal suma `manualTimeLimitDays`: los días del plazo que resultan del vencimiento ajustado a mano, contados según `dayType` desde `countsFrom` (excluido) hasta `dueDate` (incluido). Vale `null` sin ajuste manual o con `dayType` `NONE`; una fecha manual en día no hábil cuenta como el hábil anterior (revisión del 23/10/2026) | `timeLimitDays` es el plazo de la tabla y la línea de vida lo mostraba junto a un vencimiento que no salía de él. El cliente no puede contar días hábiles sin replicar el cómputo del backend (D-20). Se calcula en cada lectura con datos ya guardados: no cambia el esquema. Mientras no se excluyan feriados (D-73), un vencimiento corrido por un feriado informa un día de más |

### Decisiones heredadas de V3

Sin cambios de redacción. Las que esta versión modifica: D-10 (confirmada por
D-76), D-15 (reemplazada por D-69), D-19 (en parte, por D-51), D-21 (por D-70,
para los estados procesales) y D-25 (por D-82).

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-01 | El alcance es HU 8, 9, 13, 17, 18, 20, 22, 26, 45 y 46, más el ABMC de calificaciones legales | Story Map actualizado del Seguimiento v1.1 (§4.1.2). La tabla del PDF es difícil de leer por la maquetación, así que la asignación se verificó sumando los puntos: esas diez historias suman exactamente los 112 SP declarados para el Sprint 2 |
| D-02 | V3 es autocontenido y V2 queda sin modificar | Mismo criterio que V2 respecto de V1. `/auth` y `/users` se copian de V2 sin cambios. `PATCH` y `DELETE /lawyers` (HU14 y HU15, sprints 3 y 4) se mantienen porque ya figuraban en V2: quitarlos sería un cambio que nadie pidió |
| D-03 | La lectura de `/lawyers`, `/procedural-states`, `/legal-qualifications`, `/clients` y `/cases` se abre a cualquier usuario autenticado | RN11; el banner del prototipo ("El perfil determina qué se puede operar, no qué se puede ver"); y los formularios de alta de causa y de acto necesitan esos listados. `/users` sigue en `ADMINISTRATOR` ([C-14](#2-puntos-abiertos)) |
| D-04 | **Reemplazada por D-39.** La escritura de estados procesales y calificaciones legales requiere `ADMINISTRATOR` | El prototipo deshabilita esas acciones para los demás perfiles, aunque HU17, HU45 y HU46 digan "Como abogado". Manda el prototipo |
| D-05 | **Reemplazada por D-39.** El alta de cliente requiere `SECRETARY` | Tabla de [permisos por perfil](API_CONTRACT_V5.md#permisos-por-perfil): administrar clientes (HU8 a HU11) es solo de la Secretaría. Reemplaza el criterio del prototipo, que lo restringía al Administrador |
| D-06 | La baja de un estado procesal procede aunque haya causas en él, y se retira `PROCEDURAL_STATE_HAS_DEPENDENCIES` | Nota del prototipo: las causas "conservan el estado que ya tienen registrado". Lo mismo para la baja de calificaciones legales |
| D-07 | ~~`PATCH /procedural-states` admite `jurisdiction`, solo si ninguna causa registra el estado~~. **Revertida por D-36** | El prototipo muestra el selector de fuero al modificar. La restricción evita que causas de un fuero apunten a un estado de otro |
| D-08 | Cambiar el plazo de un estado **no** recalcula vencimientos; cambiar la prescripción de una calificación **sí** recalcula la de sus causas | Las dos notas del prototipo dicen exactamente eso. Por eso el acto copia los valores del plazo y la causa calcula la prescripción en cada lectura |
| D-09 | **Reemplazada por D-34.** Toda causa nacía **sin estado procesal** (`currentState` en `null`, "Sin acto procesal") y sin plazo abierto; el estado lo fija el primer acto. El alta no es un movimiento del ciclo de vida, y se retira `JURISDICTION_WITHOUT_PROCEDURAL_STATES` | Prototipo actualizado: "El estado lo fija el primer acto procesal" en el resumen del alta, y "Todavía no hay actos procesales" en el detalle. El prototipo lo define como un estado de sistema que no pertenece al ciclo parametrizado de ningún fuero; por eso se modela como ausencia de estado y no como un registro de la tabla. Reemplaza al criterio anterior, que derivaba el estado de posición `1` |
| D-10 | El acto procesal se registra como estado resultante, fechas y observaciones, sin un "nombre de acto" aparte | El formulario de HU26 solo pide el estado ("El acto procesal es el que mueve la causa: elegí el estado al que la lleva") ([C-10](#2-puntos-abiertos)) |
| D-11 | El "estado escrito a mano" se modela como `customState`, sin plazo salvo ajuste manual, con su endpoint de valores distintos para el filtro | Es la descripción libre que pide HU22. El prototipo lo muestra en el combo del acto y en el filtro del listado |
| D-12 | En `ADMINISTRATIVE`, `notificationDate` es obligatoria si el estado abre plazo | RN6. El prototipo no habilita "Registrar acto" sin esa fecha, lo que resuelve el pendiente P-04 de la arquitectura: el acto no existe sin vencimiento calculable |
| D-13 | **Reemplazada en parte por D-30.** Solo el rol `LAWYER` registra actos procesales, y el acto se aplica a la causa al registrarse, sin confirmación posterior. No existe un estado del acto | Tabla de [permisos por perfil](API_CONTRACT_V5.md#permisos-por-perfil). Reemplaza el flujo de "pendiente de confirmación" del prototipo (RN13), que dejaba cargar actos a la Secretaría |
| D-14 | El estado actual de la causa es el del acto con la fecha de acto más reciente | Permite cargar actos viejos sin retroceder la causa |
| D-15 | **Reemplazada por D-69.** Los estados terminales no pueden ser destino de un acto | El combo del prototipo los excluye ([C-04](#2-puntos-abiertos)) |
| D-16 | El número de SAC tiene exactamente 8 dígitos y es único en todo el sistema. **Modificada por D-33:** es opcional | Validación del prototipo ("El SAC tiene 8 dígitos"). Resuelve provisoriamente el pendiente P-03 ([C-09](#2-puntos-abiertos)) |
| D-17 | El DNI viaja sin puntos y es único entre los clientes vigentes | Separa el dato de su presentación. La unicidad entre vigentes permite volver a registrar a un cliente dado de baja cuando exista HU11 |
| D-18 | `ProceduralRole` es un enumerado cerrado, con valores válidos por fuero | El prototipo lo trata como lista fija por fuero (`ROLES_FUERO`), no como parametría |
| D-19 | La prescripción se expresa en meses enteros, solo aplica a `CRIMINAL` y se computa **por calificación, desde la fecha del hecho** (`offenseDate`): vence en `prescriptionStartsOn + meses`. `prescriptionStartsOn` vive en cada calificación y en este sprint es igual a `offenseDate` | Prototipo actualizado: cada calificación elegida pide su "Fecha del hecho" y el resumen calcula "8 años desde el …". Se devuelven los dos campos para que los actos interruptivos (HU31, Sprint 3) muevan `prescriptionStartsOn` sin cambiar la estructura. Reemplaza al criterio anterior, que computaba desde `startDate` |
| D-20 | Se incorpora `deadline-preview` | Con un único lugar de cálculo, lo que el usuario ve antes de guardar coincide siempre con lo que se guarda |
| D-21 | `activeCases` deja de valer `0` y se unifica la definición de causa activa | Ver §4 |
| D-22 | Un identificador inexistente en el cuerpo (`clientId`, `responsibleLawyerId`, `legalQualifications[].legalQualificationId`, `proceduralStateId`) responde `400 VALIDATION_ERROR` sobre ese campo | Es un dato del formulario a corregir, no una regla de negocio. Evita agregar un código de error por cada referencia |
| D-23 | Todos los mensajes de error (`message` y `details`) están en castellano, en todos los endpoints | Pedido del equipo. Unifica la redacción de V2 con la de los endpoints nuevos. Ver §5.2 y el impacto en [§8.4](#4-impacto-sobre-lo-ya-implementado) |
| D-24 | Nombres nuevos: `LegalQualification`, `prescriptionMonths`, `lastName`, `firstName`, `dni`, `clientSince`, `caption`, `court`, `instructorName`, `tribunalPhone`, `counterparty`, `subjectMatter`, `offenseDate`, `customState`, `notificationDate`, `dueDate`, `ProceduralRole` | Hay que incorporarlos a `TRADUCCION_DOMINIO.md`. `offenseDate` es la "fecha del hecho": el hecho imputado bajo esa calificación. `caption` y no `CaseCover` porque el glosario ya reserva `CaseCover` para el documento imprimible de HU24; `dni` conserva la sigla como `SacNumber` |
| D-25 | El listado de causas se ordena por urgencia, y `openDeadline=true` incluye las vencidas | Es el orden que usan el tablero y la pantalla de vencimientos del prototipo, y una causa vencida es la que más atención requiere |
| D-26 | `GET /cases` acepta `clientId` | HU9 pide consultar los clientes "con sus causas asociadas"; el prototipo solo muestra la cantidad, pero el filtro evita un endpoint anidado |
| D-27 | Las causas `ADMINISTRATIVE` y `AMPARO` registran `subjectMatter` (objeto del reclamo u objeto del amparo), obligatorio en esos fueros, de hasta 800 caracteres, y `null` en `CRIMINAL` | Pedido del equipo, ya incorporado al prototipo: es donde el abogado escribe qué se reclama y por qué. Un único campo para ambos fueros; el rótulo ("Objeto del reclamo" u "Objeto del amparo") lo pone el cliente según el fuero. El largo es el del prototipo (800). La obligatoriedad es decisión del equipo: el prototipo no lo exige para habilitar "Registrar causa" |
| D-28 | La fecha del hecho (`offenseDate`) es obligatoria en cada calificación legal de una causa penal | Decisión del equipo. El prototipo deja registrar sin ella y muestra "falta la fecha del hecho", pero sin esa fecha la prescripción no se puede computar, que es para lo que se carga la calificación. El formulario debe exigirla |
| D-29 | El filtro "Sin acto procesal" de `GET /cases` es un parámetro propio, `withoutProceduralActs`, excluyente con `proceduralStateId` y `customState` | No es un estado de la tabla ni un estado escrito a mano, sino la ausencia de estado. El prototipo lo ofrece en un grupo aparte, "Causas nuevas", y lo excluye del grupo "Escritos a mano en causas" |
| D-30 | Solo el **abogado responsable de la causa** registra actos procesales y usa `deadline-preview`. Se compara el `lawyerId` del usuario con `responsibleLawyer.id`; un usuario sin ficha de abogado no registra actos. El acto se sigue aplicando sin confirmación | Decisión del equipo (05/10/2026). Ningún otro abogado ni el `ADMINISTRATOR` opera los actos de una causa ajena |
| D-31 | Los estados procesales no tienen posición ni orden: se registran y se listan en el orden en que llegan | Decisión del equipo (05/10/2026) |
| D-32 | `activeCases` de estados procesales y calificaciones legales se devuelve solo en las respuestas de `GET` | Decisión del equipo (05/10/2026): es un dato calculado de consulta, no parte de lo que se registra. Se aplicó también a `PATCH`, que tampoco es una consulta |
| D-33 | `sacNumber`, `legalQualifications` (en `CRIMINAL`), `instructorName` e `instructorExtension` son opcionales. El interno del instructor se separa del teléfono en `instructorExtension` | Decisión del equipo (05/10/2026). RN2 queda condicionada: el SAC identifica la causa cuando se conoce ([C-20](#2-puntos-abiertos)) |
| D-34 | Toda causa nace en el **estado inicial "Iniciada"**, un estado de sistema por fuero: no forma parte de `/procedural-states`, no se modifica ni se da de baja, no es destino de un acto y no se muestra en la línea de tiempo. `currentState` deja de ser anulable y suma `initial` | Decisión del equipo (05/10/2026). Reemplaza a D-09. El nombre es neutral para los tres fueros y describe un estado, no una ausencia |
| D-35 | Se retira `nextDeadline`: el vencimiento es parte del estado actual y viaja en `currentState` | Decisión del equipo (05/10/2026): el vencimiento lo abre el acto que llevó la causa a su estado actual |
| D-36 | El fuero de un estado procesal no es modificable: `PATCH /procedural-states/{stateId}` rechaza `jurisdiction` con `400 VALIDATION_ERROR`, y se retira `PROCEDURAL_STATE_IN_USE`. Revierte D-07 | Decisión del equipo. Un estado figura en la historia de las causas aunque ninguna esté hoy en él, así que el traslado casi nunca procedía y la pantalla no podía anticiparlo. Para trasladarlo: baja y alta en el otro fuero, como en V2 |
| D-37 | Los códigos de `ProceduralRole` van en castellano: `DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA` y `DEMANDADA`. Reemplazan a `DEFENSE`, `PRIVATE_PROSECUTOR`, `APPELLANT`, `PLAINTIFF` y `DEFENDANT` | Decisión del equipo (09/10/2026): son los valores que ya usan el backend y la base de datos |
| D-38 | `startDate` de la causa es anulable: vale `null` mientras la causa no tiene SAC. La regla de entrada no cambia (con SAC es obligatoria, sin SAC no se informa); cambia lo que se guarda | Decisión del equipo (10/10/2026). La fecha de inicio es la de la causa en sede judicial y sin SAC no existe; como la columna era `NOT NULL`, se guardaba la fecha del día, un dato inventado que el detalle de la causa mostraba como real. Ver [C-20](#2-puntos-abiertos) |
| D-39 | El alta de cliente y la escritura de estados procesales y de calificaciones legales se abren a cualquier usuario autenticado. Reemplaza a D-04 y D-05 | Matriz de [permisos por perfil](API_CONTRACT_V5.md#permisos-por-perfil) del 11/10/2026, acordada por el equipo: administrar clientes, estados procesales y calificaciones legales corresponde a los tres perfiles |
| D-40 | `POST /auth/login` bloquea una cuenta al quinto fallo consecutivo contra el mismo usuario, con espera creciente (90 s, 5, 15, 30 y 60 min). Cuenta igual contra un usuario que no existe, para no revelar qué cuentas son reales | Cierra Q-03 de `IMPLEMENTACION_AUTH.md`. El umbral y la escalera son configuración del servidor, no parte del contrato: lo único contractual es el código `TOO_MANY_LOGIN_ATTEMPTS` y que la respuesta trae `Retry-After` |
| D-41 | Toda la API acepta un límite de pedidos por dirección IP (`429 TOO_MANY_REQUESTS`); `/auth/login` y `/auth/refresh` tienen además un límite propio, más estricto | Cierra Q-03. Es independiente del bloqueo de D-40: ese cuenta fallos contra una cuenta, este cuenta volumen desde una dirección, sin mirar a qué apunta |
| D-42 | El mensaje de `INVALID_CREDENTIALS` pasa a "Usuario o contraseña incorrectos." | Pedido del equipo. Sigue siendo el mismo mensaje exista o no exista la cuenta: D-18 de `IMPLEMENTACION_AUTH.md` no cambia, solo el texto |
| D-43 | El `accessToken` deja de aceptarse desde la próxima petición cuando el usuario cierra sesión, es dado de baja, cambia su contraseña (en las demás sesiones) o pasa 30 minutos sin renovar la suya. Antes, en los cuatro casos, seguía válido hasta vencer (máx. 15 min) | El servidor pasó a verificar la sesión contra la base en cada pedido en lugar de confiar solo en la firma del token. Ningún endpoint cambia de forma; cambia cuándo un `401 UNAUTHENTICATED` deja de ser "hay que renovar" para ser "hay que iniciar sesión de nuevo" |
| D-44 | `PATCH /auth/password` rechaza una `newPassword` igual a `currentPassword` con `400 SAME_PASSWORD` | Pedido del equipo (CA-3.5 del seguimiento de HU1-3). Antes solo lo validaba el frontend; un cliente que hablara directo con la API podía dejar la contraseña sin cambios |

## 2. Puntos abiertos

Lo que el contrato **no puede decidir solo**. Cada punto dice qué asume hoy V5,
para que el trabajo no se frene, y con quién hay que cerrarlo. Ninguno bloquea
el Sprint 4.

| ID | Punto | Qué asume hoy el contrato | Con quién | ¿Bloquea? |
| --- | --- | --- | --- | :---: |
| C-34 | **Rótulos de la hoja de carátula.** Los recuadros y sus rótulos ("Expte. / SAC", "Autos", "Actor / querellante", "Demandado / imputado", "Órgano interviniente" con la línea "SECRETARIO/A:", "Observaciones") salen del prototipo. La hoja tiene que usar los de las plantillas del estudio (`Caratula penal.docx`, `Caratula penal QUERELLANTE.docx`, `Caratula administrativo.docx`), que el equipo va a enviar. El prefijo del abogado ya está cerrado: `DR.` (D-106, revisado el 29/10/2026) | Los rótulos del prototipo | Equipo | No |
| C-35 | **Línea "INSTRUCTOR:" del órgano interviniente.** Las plantillas del estudio llevan tres líneas (tribunal, "SECRETARIO/A:" e "INSTRUCTOR:"). Se pidió que las tres estén, pero no se sabe qué dato va en "INSTRUCTOR:". El secretario/a sigue siendo `instructorName` (D-91) | La hoja imprime "INSTRUCTOR:" sin valor | Equipo / estudio | No |
| C-29 | **Límites del expediente.** Un expediente con muchos documentos o muy pesados puede tardar o superar lo que acepta una petición sincrónica | Sin límite contractual. Si hace falta, se agrega un máximo de tamaño con `413 FILE_TOO_LARGE`, que ya existe, o se pasa a generación en segundo plano, como la carpeta | Backend | No |
| C-33 | **HU38 sin beneficio declarado.** Jira la marca: "la historia no declara el beneficio (…) Requiere refinamiento" | El contrato sigue al prototipo, que sí define la tarjeta "Documentación" | PO | No |
| C-20 | **SAC opcional y RN2.** Con el SAC opcional, nada impide registrar dos veces la misma causa sin SAC. Viene de V3 | Sin cambios. Liberar el SAC con la baja (D-97) no lo cambia: afecta a las causas con SAC | Cliente / PO | No |

**Resueltos en la revisión del 27/10/2026**

| ID | Punto | Resolución |
| --- | --- | --- |
| C-23 | (De V4.) Correos que no son de Google | El correo que se exige al registrar el usuario es el que recibe el acceso a Drive: tiene que ser de una cuenta de Google. Si no lo es, el acceso queda pendiente, como antes (§3.2) |
| C-24 | Permiso de Drive para HU38 | `drive.readonly`, además de `drive.file` (D-100) |
| C-25 | Cambio de fuero de una causa | No se permite (D-95) |
| C-26 | La carpeta de Drive ante cambios | Se renombra con la carátula, se mueve con el responsable y la del abogado se renombra con su nombre. Si Drive falla, la modificación no falla y se corrige después (D-104) |
| C-27 | Administrador sin otro rol y "Generar expediente" | Ve la lista de documentos; de ellos, solo descarga los expedientes (D-103) |
| C-28 | Tratamiento en la carátula | Prefijo fijo `DR.` para todos los abogados (D-106, revisado el 29/10/2026; antes `DR/DRA.`) |
| C-30 | HU23 tiene dos nombres y dos permisos | Es "Descargar Modelo Formal", restringida a `ADMINISTRATOR` o `LAWYER` (D-90) |
| C-31 | El cliente de una causa no se modifica | Sí se modifica; la carátula la propone el cliente (D-105) |
| C-32 | SAC de una causa dada de baja | Se libera (D-97) |
| C-13 | (De V3.) Otros datos del abogado | Para la carátula ya no hace falta un dato de tratamiento (D-106). El resto sigue como en V4 |

Los demás puntos de V3 (C-01 a C-22) están resueltos, ya sea por las decisiones
de V4 o porque no corresponden a estos sprints.

## 3. Visto en el prototipo y fuera del contrato

Estos elementos del prototipo **no tienen endpoint ni campo** en V5. Todos son
de otros sprints o no tienen historia:

| Elemento del prototipo | Por qué queda afuera |
| --- | --- |
| "Anular" un acto procesal | HU29, Sprint 5 |
| "Registrar pago de tasa" en el detalle (concepto, monto, comprobante) | Sin historia. La causa solo tiene `courtFeePaid` (D-67), que se cambia con `PATCH /cases/{caseId}` |
| "Adjuntar cédula o comprobante" en el acto procesal | Sin historia; implica subir archivos a Drive desde VZ Causas |
| "Modificar", "Dar de baja" y "Reactivar" un modelo formal | HU36 y HU37, Sprint 5 |
| "Eliminar abogado" con reasignación de sus causas | HU15, Sprint 5. El formulario del prototipo ("Reasignar sus causas a") propone una respuesta a P-05 de la arquitectura, que conviene tomar en ese sprint |
| "Modificar" y "Eliminar" en clientes | HU10 y HU11, Sprint 5 |
| Reportes por abogado y por fuero | HU43 y HU44, Sprint 5 |
| La campana de notificaciones, el panel de avisos y "2 vencimientos hoy" | Sin historia; los avisos van por correo (§4, Proceso automático diario) |
| La pantalla "Vencimientos" y su configuración de avisos | Sus datos están en los tableros; la configuración es del servidor (D-79) |
| "Olvidé mi contraseña" | Sin historia |
| El registro de cambios de una causa o de un abogado ("queda asentado con usuario y fecha") | Se guarda en la auditoría (`AUDITORIA_Y_TRAZABILIDAD.md`), pero ninguna pantalla lo consulta |

Siguen en el contrato, porque ya figuraban en V3, `DELETE /lawyers/{lawyerId}`
y `PATCH` y `DELETE /legal-qualifications/{qualificationId}` (D-02).

**Inconsistencias conocidas del glosario que esta versión no toca.**
`TRADUCCION_DOMINIO.md` todavía lista `fullName` y `position` en sus campos de
la API (reemplazados por D-68 y retirados por D-31) y dice que un `DELETE` "se
reactiva con un `PATCH`", lo que el contrato no permite (§4, Bajas). Se nombran
para que el equipo las corrija; el contrato no las cambia.

## 4. Impacto sobre lo ya implementado

### Impacto de V5

**Nada se rompe.** Lo que ya funciona sigue funcionando; el trabajo es sumar.

**Backend**

- **Esquema (requiere migración).** En `cases`: el motivo de la baja (la
  columna `active` ya existe en `schema.prisma`), y la unicidad del SAC pasa a
  contar solo las causas vigentes (D-97): hoy es un `@unique` sobre
  `sac_number` y tiene que ser un índice único parcial. Una tabla de
  expedientes generados, para numerar las versiones (`version`, el `id` del
  archivo en Drive, quién y cuándo). En `procedural_acts`: quién y cuándo lo
  modificó por última vez. La carátula **no** suma columnas (D-91, D-92). Las
  migraciones las corre el equipo con `npx prisma migrate dev`, según
  `USO_PRISMA.md`.
- **`cases`.** Casos de uso de modificación y baja de causa y de modificación
  de acto, con el recálculo del estado actual (D-99). La modificación avisa a
  `documents` cuando cambian la carátula o el responsable, sin fallar si Drive
  no responde (D-104). Todas las lecturas de causas y de sus subrecursos
  excluyen las dadas de baja; también `reporting` (tableros) y `deadlines`
  (proceso diario).
- **Regla de partes de la carátula.** Una sola función, usada por
  `GET /cases/{caseId}/cover` y por el expediente (D-94).
- **`documents`.** Lectura de la carpeta y descarga de archivos de Drive
  (puerto ya previsto en ADR-003 §4.1), generación del PDF de la carátula y del
  expediente (conversión de Word y documentos de Google con Drive, imágenes a
  A4, unión de PDFs) y guardado del resultado. Mover y renombrar carpetas, y
  la revisión diaria de nombres y ubicaciones (D-104). Dónde vive la
  generación es P-08 de la arquitectura. Hace falta una librería de PDF.
- **Drive.** Sumar `drive.readonly` al cliente OAuth compartido
  (`GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md`) y reautorizar la cuenta de gestión
  (C-24).
- **`PATCH /lawyers/{lawyerId}`.** Está contratado desde V2 pero no
  implementado (el controlador de `people` no tiene `@Patch`). Si cambia el
  nombre, avisa a `documents` para renombrar la carpeta del abogado (D-104).

**Frontend**

- **Tipos y *mocks*.** `lastModifiedBy`, `lastModifiedAt`, el recurso
  documento, el cuerpo y la respuesta del expediente.
- **Formularios.** "Modificar causa" (sin el fuero, con el cliente: al cambiar
  el cliente propone la carátula nueva y la envía en `caption`), "Dar de baja",
  "Modificar acto procesal" y "Modificar abogado".
- **Vista previa de la carátula.** Muestra el PDF de `GET /cases/{caseId}/cover`
  en lugar de dibujarlo sobre la imagen de la plantilla.
- **Generar expediente.** Pide las observaciones y, en una causa penal, la
  parte que no es el cliente; lista de `GET /cases/{caseId}/documents` sin los
  expedientes, orden por arrastre, y envía `cover` y `documentIds` en ese
  orden. La lista se le muestra también al Administrador (C-27).
- **Archivos.** Dos descargas binarias nuevas, con `disposition`.

**Documentación**

- **Glosario.** Faltan `opposingParty`, `CaseFile` como recurso (ya está como
  concepto), `Document`, `uploadedBy`, `convertibleToPdf`, `lastModifiedBy` y
  `lastModifiedAt`, además de lo que V4 dejó pendiente.
- **Diccionario de datos.** `DICCIONARIO_DATOS.md` dice que el SAC es único
  "incluidas las causas dadas de baja" (RN2); D-97 lo cambia.
- **Referencias.** El `CLAUDE.md`, el glosario y la documentación de frontend
  citan V4 (o V3) como contrato vigente: hay que apuntarlos a V5.
- **OpenAPI.** `docs/openapi` tiene que sumar los endpoints nuevos.
- **ADR-003.** §4.1 se cierra con `drive.readonly` (C-24), y la regla de que la
  carpeta no se mueve ni se renombra cambia con D-104. Además, §2.3 y §4 citan
  "C-45" para los correos que no son de Google: es C-23.

### Impacto de la revisión del 06/11/2026

**D-109: `address` y `phone` obligatorios en el alta del cliente.** `POST /clients`
sin alguno de los dos, o con uno vacío o en blanco, responde `400
VALIDATION_ERROR` con el campo en `details`. Rompe a quien hoy da de alta clientes
sin ellos. Las dos columnas son `NOT NULL` en la base. Agregar una columna `NOT NULL`
falla en una tabla con filas y no hay valor con qué completar a los clientes viejos:
la migración supone que la tabla `clients` solo tiene datos de prueba, que se vacía
(`make dev-down-v`) y se vuelve a cargar con el seed. Quien ya haya aplicado una
versión anterior de la migración tiene que hacer lo mismo.

**Límite conocido de D-107 (aceptado el 06/11/2026).** La matrícula era, de hecho,
lo único que identificaba a un abogado sin repetirse. Sin ella, nada impide
registrar dos veces al mismo abogado con el mismo apellido y nombres. Se decidió no
agregar una restricción: el volumen de un estudio es chico y el administrador ve el
listado. Si aparece el problema, las salidas son advertir sin bloquear en el alta o
un índice único parcial por apellido y nombres entre los vigentes (requeriría
migración).

**Backend.** Aplicado en la rama `feat/client-document-address`: `ClientDocument`
(reemplaza a `Dni`), `Client` con `address` y `phone` obligatorios en el alta,
`Lawyer` con matrícula anulable, y la migración
`20261106132157_client_document_address_lawyer_optional_registration` (renombra
`dni` a `document_number`, agrega `address` y vuelve `phone` y `address` `NOT NULL`, y
reemplaza el índice y el CHECK por los de `(document_type, document_number)`).

**Frontend.** Los formularios de cliente tienen que marcar dirección y teléfono como
obligatorios.

### Impacto de la revisión del 05/11/2026

**Se rompe el alta de clientes.** `dni` pasa a `documentType` +
`documentNumber` (D-108): un cliente que siga mandando `dni` recibe `400`.
La matrícula opcional (D-107) no rompe nada: lo que hoy se manda sigue siendo
válido.

**Backend**

- **Esquema (requiere migración).** En `lawyers`, `registration_number` pasa
  a anulable; el `@unique` puede quedar, porque PostgreSQL admite varios
  `NULL`. En `clients`, un enum nuevo y las columnas `document_type` (los
  existentes, `DNI`) y `address`; `dni` pasa a `document_number` y crece
  de largo; el CHECK de solo dígitos pasa a depender del tipo, y el índice
  único parcial `clients_dni_active_key` pasa a `(document_type,
  document_number) WHERE active`. Ese SQL va a mano (`--create-only`, según
  `USO_PRISMA.md`).
- **`people`.** Entidad, value objects, DTOs y mappers del abogado (matrícula
  `null`) y del cliente (documento por tipo, dirección); el `search` de
  clientes busca por `documentNumber`.
- **`identity` y `cases`.** La ficha anidada de `POST /users`, la sesión, el
  usuario y la causa embeben la matrícula como anulable; la causa embebe el
  cliente con los campos nuevos.

**Frontend**

Ya aplicado en la rama `feat/lawyers-clients-fields`: formularios, tablas,
selects, tarjeta del cliente, tipos y *mocks*.

**Documentación**

- **Glosario.** Suma `documentType`, `documentNumber` y `address`.
- **OpenAPI.** `docs/openapi` actualiza los esquemas de abogado y cliente.

### Impacto de V4 (registro)

Se conserva como lo escribió V4.

**Lo que rompe.** Dos cambios obligan a tocar lo que ya funciona, en backend y
frontend a la vez:

- **Nombre y apellido separados** (D-68). `/auth/login`, `/users` y `/lawyers`
  pasan de `fullName` a `lastName` y `firstName`, en las respuestas, en los
  cuerpos y en los filtros de búsqueda; también el `lawyer` del usuario y todo
  `responsibleLawyer` y `registeredBy`. En la base hay que migrar los nombres
  existentes, que hoy están en un solo campo y, en los abogados, con el
  tratamiento adelante.
- **`caseCount` en los estados procesales** (D-70). Cambia el nombre del campo y
  el conteo: deja de filtrar por causa activa.

**Backend**

- **Subsistemas nuevos.** Los que la arquitectura ya tenía previstos:
  `deadlines` (verificación diaria y envío de correo), `documents` (modelos
  formales, carpeta de la causa y acceso a Drive, según ADR-003) y `reporting`
  (tableros). Los actos interruptivos y la marca de prescripción van en `cases`.
- **Esquema.** Tablas nuevas para actos interruptivos, modelos formales con sus
  fueros, carpetas de Drive, carpeta de la causa, copias de modelos y registro de
  avisos enviados. Columnas nuevas en la causa para los datos de D-67 y la
  constancia de prescripción.
- **Estado "Prescripta".** Crearlo como estado de sistema del fuero `CRIMINAL`
  y protegerlo en `PATCH` y `DELETE /procedural-states` (D-53).
- **Actos procesales.** Aceptar estados terminales como destino, salvo
  "Prescripta" (D-69).
- **Cálculos en un solo lugar.** La prescripción (con el acto interruptivo más
  reciente), el vencimiento del acto lesivo y los días hábiles los usan la
  causa, los tableros, el proceso diario y el orden y el filtro de `GET /cases`
  (D-51, D-78, D-82).
- **`POST /cases`.** Valida los datos por fuero. Con `createFolder` en `true` por
  defecto, las pruebas de integración existentes pasan a pedir la carpeta:
  necesitan un adaptador falso de almacenamiento. El caso de uso no debe fallar
  si el adaptador falla (D-60).
- **Usuarios.** El alta, la modificación y la baja de usuarios llaman a
  `documents` para dar o quitar el acceso a Drive, sin fallar si no responde
  (D-83).
- **Integraciones y configuración.** La autorización OAuth de la cuenta de
  gestión y los identificadores de Drive (ADR-003), el servicio de correo, la
  configuración de los avisos (D-79) y el mecanismo que dispara el proceso
  diario.
- **Autorización.** Guards nuevos de "uno de dos roles" y de lectura
  restringida. Los actos interruptivos reutilizan la comprobación de abogado
  responsable de los actos procesales.

**Frontend**

- **Tipos y *mocks*.** `frontend/src/shared/api/contract.ts` y los *mocks* de
  `shared/mocks` suman los campos y recursos nuevos, y cambian `fullName` y el
  `activeCases` de los estados.
- **Formularios.** El alta de causa suma los datos por fuero y la tasa, que no
  están en el prototipo. El alta y la modificación de usuarios y abogados
  separan nombre y apellido. El combo de "Registrar acto procesal" ofrece los
  estados terminales, salvo "Prescripta". El alta de modelo no pide tipo.
- **Barra de prescripción.** Lee `prescription`; deja de elegir la calificación
  y de calcular el porcentaje.
- **Archivos.** Son la primera subida `multipart/form-data` y la primera
  descarga binaria del proyecto: hay que revisar el cliente HTTP compartido,
  pensado hasta ahora para JSON.
- **Menú por perfil.** "Inicio" y "Modelos" no se muestran a la Secretaría; el
  backend responde `403` si igual los pide.

**Documentación**

- **Glosario.** `TRADUCCION_DOMINIO.md` ya tiene `InterruptiveAct`,
  `DocumentTemplate` y `Prescription`. Faltan `CaseFolder`, `CaseFolderStatus`,
  `DeadlineKind`, `Dashboard` y los campos nuevos: `clientDetained`,
  `injunctionGranted`, `harmfulActDate`, `harmfulActRenews`,
  `harmfulActRenewalDays`, `harmfulActTermDays`, `harmfulActTermDayType`,
  `harmfulActDeadline`, `administrativeRemedyExhaustedOn`, `courtFeePaid`,
  `caseCount`, `prescriptionDeclaration`, `elapsedPercentage`,
  `copyToNewCases`, `casesToAdvance` y `usageCount`.
- **Referencias a V3.** El glosario, el `README`, la documentación de frontend
  y el código citan `API_CONTRACT_V3.md` como contrato vigente: hay que
  apuntarlos a este documento.
- **OpenAPI.** `docs/openapi` describe V3 y tiene que actualizarse.
- **Arquitectura de backend.** §6.3 suma el puerto `StudioFolderAccessPort`
  (`identity` → `documents`) y §7.6 reemplaza `GOOGLE_DRIVE_CREDENTIALS` por las
  variables de ADR-003.
