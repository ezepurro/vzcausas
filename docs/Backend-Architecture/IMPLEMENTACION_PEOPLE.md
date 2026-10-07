# Implementación de `people` (Clientes y Abogados) — Bitácora

Mismo formato que `IMPLEMENTACION_AUTH.md`. Cubre el subsistema
`people` y lo que sus historias obligaron a tocar fuera de él.

Historias: **HU-8** (registrar cliente), **HU-9** (consultar y buscar
clientes), **HU-12** (registrar abogado).

---

## 1. Decisiones cerradas

| Id | Decisión | Fecha |
| --- | --- | --- |
| P-01 | **`clientSince` sale de `ClockPort.today()`, no de `CURRENT_DATE`.** La fecha de alta es una fecha civil del calendario del estudio; `CURRENT_DATE` corre en la zona del servidor de base y puede caer un día antes o después. El comentario del modelo `Client` ya lo prohibía. | 2026-10-07 |
| P-02 | **`today()` se implementa con `Intl`, no con aritmética sobre el offset.** El offset de Córdoba no es constante; hardcodear `-03:00` corre la fecha el día que cambie la regla. Cierra la decisión D-15 de la bitácora de auth, que difería `today()` "hasta que el primer caso de uso lo necesite". | 2026-10-07 |
| P-03 | **El DNI se guarda solo con dígitos y el value object normaliza al crear.** `34.812.905` y `34812905` son el mismo documento: comparar el texto crudo dejaría registrar dos clientes con el mismo DNI escribiéndolo distinto, que es justo lo que CA-8.4 evita. El DTO, en cambio, **rechaza** los puntos en vez de limpiarlos: aceptar dos grafías en el borde haría que la unicidad dependiera de cómo tipeó el llamador. | 2026-10-07 |
| P-04 | **`ADMINISTRATOR` queda excluido de `client:create`.** CA-8.9 es explícito: administrar clientes es solo de Secretaría. La regla previa del seed ("el administrador se lleva todo el catálogo") se lo habría dado solo, y el criterio habría fallado en silencio: el endpoint respondería 201 al rol equivocado. | 2026-10-07 |
| P-05 | **La lectura de `/clients` y `/lawyers` va a los tres roles.** La matriz por recurso del contrato las pone en "cualquier usuario autenticado", y RN11 dice por qué: todo el estudio ve todo, la diferencia entre perfiles está en lo que pueden **operar**. Ver C-02. | 2026-10-07 |
| P-06 | **`GET /cases` se construye reducido**: filtro por `clientId`, con estado procesal y vencimiento. CA-9.4 pide "su estado procesal y su vencimiento" y no menciona días hábiles. Ver C-03 y C-04. | 2026-10-07 |
| P-07 | **El listado de causas usa un modelo de lectura, no el agregado.** `Case` es abstracta con una subclase por fuero; reconstruirla para aplanarla en un DTO es lo que §"Modelos de lectura" de la arquitectura desaconseja. Esa decisión está escrita para `reporting`; acá se extiende a una consulta de solo lectura en `cases`. **Conviene que el equipo la valide.** | 2026-10-07 |
| P-08 | **El puerto de consulta (`CaseQueryPort`) va separado de `CaseRepository`.** Uno carga y guarda el agregado, que es lo que una escritura necesita; el otro responde consultas con proyecciones planas, que es lo que un listado necesita. | 2026-10-07 |
| P-09 | **`ClientNotFoundError` va sin `details`.** El contrato §3.6 muestra `null`. Devolver el id pedido no agrega nada —el cliente acaba de enviarlo— y lo repite en el cuerpo, que es lo que CT-6 evita para un dato personal. Difiere de `LawyerNotFoundError` y `UserNotFoundError`, que sí lo incluyen; ver C-05. | 2026-10-07 |
| P-10 | **Los criterios de acceso se prueban con login real, no con `loginAs`.** Ese helper firma el token con los permisos que se le pasen: prueba el guard, no la matriz — diría que un rol puede leer aunque el seed no le haya dado nada. El test crea el usuario con su rol y lo loguea, así la cadena va entera: seed → `role_permissions` → login → claims → guard. | 2026-10-07 |

---

## 2. Preguntas abiertas

| Id | Pregunta |
| --- | --- |
| Q-01 | **¿Un cliente dado de baja libera su DNI?** Hoy sí: el índice único es parcial (`clients_dni_active_key ... WHERE active`). Es coherente con el abogado y con la matrícula, pero HU-11 (baja de cliente) todavía no existe y conviene confirmarlo cuando se escriba. |
| Q-02 | **¿Qué pasa con un cliente que tiene causas cuando se lo da de baja?** La FK de `cases.client_id` es `Restrict`, así que un borrado físico no puede ocurrir; la baja lógica sí dejaría causas apuntando a un cliente no vigente. Decisión de HU-11. |
| Q-03 | **¿El listado debería ignorar acentos al buscar?** Hoy `mode: "insensitive"` resuelve mayúsculas pero no acentos: buscar "gomez" no encuentra "GÓMEZ". Requiere `unaccent` en Postgres. |

---

## 3. Correcciones a documentación existente

| Id | Corrección |
| --- | --- |
| C-01 | **`DICCIONARIO_DATOS.md` quedó desactualizado.** Su §9.3 afirma que la tabla `clients` "no existe en la base" y ya existe, con su migración. Fue generado contra las migraciones de Sprint 1. Conviene regenerarlo. |
| C-02 | **El seed incumplía la matriz de permisos en dos lugares.** `lawyer:read` estaba solo en `ADMINISTRATOR` y `client:read` solo en `SECRETARY`, mientras la matriz pone ambas lecturas en "cualquier autenticado". Con `LAWYER: []`, un abogado no podía ni consultar el listado de abogados. **Corregido en HU-9** (P-05); el de abogados excede HU-9 en sentido estricto, pero era un defecto vigente. |
| C-03 | **`GET /cases` es HU-20, no HU-9.** El contrato lo rotula así. CA-9.4 lo necesita para las causas de un cliente, de ahí el endpoint reducido (P-06). |
| C-04 | **`businessDaysRemaining` no se puede calcular.** El campo que el contrato muestra en `currentState` necesita el calendario judicial de días inhábiles, y no existe ni esa tabla ni el subsistema `deadlines`. Queda fuera hasta HU-20. |
| C-05 | **Los `*_NOT_FOUND` no son consistentes entre recursos.** El contrato muestra `details: null` para `CLIENT_NOT_FOUND`, pero `LawyerNotFoundError` y `UserNotFoundError` devuelven el id en `details`. O el contrato está incompleto para esos dos, o ellos están de más. |
| C-06 | **`/procedural-states` cumple la matriz por omisión.** Su controlador no declara ningún permiso, así que cualquier autenticado pasa — que es lo que la matriz pide, pero por accidente y no por decisión. El día que alguien le agregue un `@RequirePermissions` sin mirar la matriz, lo rompe. |
| C-07 | **`test/shared/factories/procedural-state.factory.ts` no compila.** Escribe `dayType: DayTypeCode \| null` donde el schema espera `DayType`, y además una columna `position` que el schema ya no tiene. **La suite de integración de `procedural-states` no corre.** Viene de `167b6d2` (HU-16); no se tocó para no tapar lo que esa suite quiere probar. |

---

## 4. Deuda técnica

| Id | Deuda |
| --- | --- |
| **T-01** | **`activeCases` está fijo en 0.** El campo aparece en las respuestas de cliente y de abogado y **parece correcto**, que es lo que lo vuelve peligroso: nadie va a sospechar que está clavado. El conteo real necesita un puerto `people` → `cases` y que `CasesModule` exporte algo. Hoy devolvería 0 igual, porque no hay causas cargadas. **Cuando se construya el subsistema de causas hay que volver acá.** |
| T-02 | El resto de los filtros de `GET /cases` (`jurisdiction`, `responsibleLawyerId`, `proceduralStateId`, `customState`, `withoutProceduralActs`, `openDeadline`) y su orden por urgencia. Son de HU-20. |
| T-03 | El lado de escritura de `cases` sigue sin cablear: `CaseRepository` no tiene adaptador y sus lookups hacia `people` y `legal-parameters` no tienen implementación. |
| **T-04** | **`GET /cases` no tiene test de integración.** Sus 6 unitarios corren contra un fake del puerto, así que prueban el caso de uso pero **no el adaptador de Prisma**, que es donde está la consulta compleja: el `include` de cliente, abogado y estado procesal, y el `COALESCE(manual, computed)` del vencimiento. Esa consulta **nunca se ejecutó contra Postgres**: la verificación manual devolvió una colección vacía porque no hay causas cargadas. Escribirlo exige un `case.factory.ts` con su cadena de dependencias (fuero, estado procesal, cliente, abogado, usuario creador, y un acto procesal que aporte el vencimiento). **Queda para quien lleve el subsistema de causas**, que es de donde salen las HU-18 en adelante. |

---

## 5. Alcance

**Entregado**

- `POST /clients` (HU-8), `GET /clients` y `GET /clients/{clientId}` (HU-9).
- `GET /cases?clientId=` reducido (CA-9.4).
- `POST /lawyers`, `GET /lawyers`, `GET /lawyers/{lawyerId}` (HU-12).
- La matriz de permisos del contrato, cumplida.

**Fuera de alcance**

- HU-10 y HU-11 (modificar y dar de baja cliente), Sprint 4.
- Los campos `fuerza` y `suscripción` del prototipo: el contrato los
  excluye explícitamente (punto C-15 del contrato).
- `esPersonaJuridica` / `razonSocial`: decisión P3 del modelo de
  dominio, pendiente; chocan con `apellido` y con el DNI de 7–8 dígitos.
- CT-8 (auditoría). El propio `AUDITORIA_Y_TRAZABILIDAD.md` §4 lista
  qué se audita obligatoriamente y el **alta** de cliente no está, solo
  su baja lógica. No existe ni el puerto, ni el adaptador, ni la tabla.

---

## 6. Bitácora de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 2026-10-07 | **HU-8.** `Dni`, `Client`, puerto y repositorio, caso de uso, capa HTTP. `ClockPort.today()` (P-01, P-02). Seed con `client:create` reservado a Secretaría (P-04). 22 tests. | `1eb62fe` |
| 2026-10-07 | **Arreglo transversal del filtro de errores.** El `details` de validación se indexaba `error_0`, `error_1`, perdiendo el nombre del campo; se deducía tomando la primera palabra del mensaje, lo que funciona con los textos de fábrica de `class-validator` y se rompe con cualquiera propio. Ahora el `exceptionFactory` usa `error.property`. **Afectaba a todos los endpoints.** Lo encontró la prueba end-to-end, no los 200 unitarios. | `1eb62fe` |
| 2026-10-07 | **HU-9.** Listado y consulta de clientes, `GET /cases` reducido, primera infraestructura de `cases` (P-06 a P-08), matriz de permisos completa (P-05, C-02). 19 unitarios + 21 de integración. | _(pendiente)_ |
