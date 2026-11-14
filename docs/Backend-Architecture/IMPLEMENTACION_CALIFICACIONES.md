# Implementación de calificaciones legales — Bitácora

Mismo formato que `IMPLEMENTACION_AUTH.md` y `IMPLEMENTACION_PEOPLE.md`.

Cubre **HU-48** (registrar calificación legal) y **HU-47** (consultar y
buscar calificaciones legales), épica EP-03, Sprint 2. Desde el
13/11/2026 cubre también **HU-49** (modificar) y **HU-50** (dar de baja),
Sprint 5, rama `feat/legal-qualifications-update-deactivate`, contra
`API_CONTRACT_V6.md` §3.5 (D-127). Plan de tests:
`.claude/plans/tests-hu49-hu50-calificaciones.md`.

Las dos historias viven **dentro de `legal-parameters`**, un subsistema
cuya otra mitad —estados procesales y fueros— es de otro autor. Por eso
los identificadores van con sufijo `L`: `L-xx` decisiones, `QL-xx`
preguntas, `CL-xx` correcciones, `TL-xx` deuda. Así no chocan con los
`P-xx`/`C-xx`/`T-xx` de la bitácora de `people`.

**Qué se tocó de otro y qué no.** Archivos nuevos: 14, todos de
calificaciones. Archivos ajenos modificados: **dos, y solo agregando**:

| Archivo | Qué se agregó | Por qué no se podía evitar |
| --- | --- | --- |
| `legal-parameters.module.ts` | El controlador, los tres casos de uso y el binding del repositorio | Un módulo de Nest es el único lugar donde se declara un controlador. Nada de estados procesales se modificó |
| `prisma/seed.ts` | `qualification:create` y `qualification:read` | Un permiso que ningún rol otorga vuelve el endpoint inalcanzable, y sin ellos CA-48.9 no se puede cumplir |

Nada de `cases` se tocó: ni el stub de calificaciones, ni `CasesModule`,
ni las tablas de causas para el conteo. Ver `CL-03` y `TL-01`.

**Al 2026-10-11 eso ya cambió, y desde el otro lado.** El autor de
causas cerró `TL-01`, `CL-02` y `CL-03`: el conteo de causas activas es
real, el stub desapareció y la paginación emite el código del contrato.
Las entradas tachadas más abajo dicen cómo. Lo que sigue sin resolver
son `QL-01` (acentos en la búsqueda), `TL-02` (dos paginadores) y lo que
abrió HU-49/HU-50: `QL-04`, `QL-05`, `TL-04` y `TL-05`.

**HU-49 y HU-50 (13/11/2026): qué se tocó fuera de calificaciones.**
Solo agregando, y nada de `cases`:

| Archivo | Qué se agregó | Por qué |
| --- | --- | --- |
| `prisma/seed.ts` | `qualification:update` y `qualification:delete`, en el catálogo y en `STAFF` | Sin ellos los endpoints son inalcanzables (mismo motivo que L-03). Los tres perfiles, por la matriz §5.1 (D-39) |
| `test/smoke/app.int.spec.ts` | Las dos rutas, para el 401 | El 401 va una sola vez, ahí (`test/README.md` §1.1) |
| `test/subsystems/deadlines/detect-upcoming-prescriptions.int.spec.ts` | Un `it` gemelo del acto interruptivo: cambiar los meses vuelve a avisar con la fecha nueva | Cierra CA-52.8, que `IMPLEMENTACION_DETECCION.md:384` dejaba en revisión manual por falta de este `PATCH`. Decidido con el usuario |
| `find-legal-qualification.spec.ts`, `view-legal-qualifications.spec.ts`, `register-legal-qualification.spec.ts` | `update` en sus dobles del repositorio | El puerto ganó el método |

---

## 1. Decisiones cerradas

| Id | Decisión | Fecha |
| --- | --- | --- |
| L-01 | **Se siguen las convenciones del subsistema, no las propias.** Carpeta `infraestructure` (con la errata), paginador de `src/common/pagination/`, `PaginatedResult<T>`, el estilo de `getStatesQueryDto`. El criterio es que el subsistema se lea como uno solo: dos convenciones conviviendo en la misma carpeta cuesta más que la errata. **La errata se corrigió después en `ef05b92`** y estos archivos se movieron con el resto a `infrastructure`; la decisión de seguir al subsistema es la que hizo que el renombre fuera un solo movimiento y no una reconciliación. | 2026-10-08 |
| L-02 | **Excepción a L-01: el controlador declara permisos.** El de estados procesales no declara ninguno y cumple la matriz por omisión (C-06 de `people`). CA-48.9 exige una denegación real a Abogado y Secretaría, y eso solo lo produce `@RequirePermissions`. Es la única desviación. | 2026-10-08 |
| L-03 | **`qualification:read` va a los tres roles; `qualification:create`, solo al Administrador.** Lo primero por §3.5 y D-03, y por una razón propia: el alta de causa, que opera cualquier perfil, ofrece el selector de calificaciones (CA-47.10). Un abogado sin esa lectura no podría registrar una causa penal. Lo segundo lo hereda la regla general del seed, sin entrada propia: `ADMINISTRATOR` se lleva todo lo que no está en `SECRETARY_ONLY`. | 2026-10-08 |
| L-04 | **`name` no se parte en delito y artículo.** El prototipo los carga en un campo y el buscador filtra por cualquiera de los dos (CA-48.2, CA-47.4). Partirlos obligaría a que la búsqueda recorriera dos columnas para el mismo resultado. El corte de la carátula sugerida (`Hurto simple`) lo hace la interfaz. | 2026-10-08 |
| L-05 | **No hubo migración que escribir.** El índice único parcial `legal_qualifications_name_active_key` sobre `lower(name)` `WHERE active` y el CHECK `prescription_months >= 1` ya venían en `20261005165055_add_indexes_constraints_sprint2`. Se verificó contra la base: el 409 por diferencia de mayúsculas responde de verdad. | 2026-10-08 |
| L-06 | **La unicidad se chequea en el caso de uso *y* la garantiza el índice.** El chequeo existe para devolver el 409 del contrato en vez de una violación cruda de constraint; el índice es lo que aguanta bajo concurrencia. Mismo razonamiento que el DNI del cliente (P-03) y la matrícula del abogado. | 2026-10-08 |
| L-07 | **Una denominación vacía no consulta la unicidad.** El caso de uso saltea `existsActiveByName` cuando el nombre quedó vacío al recortarlo. Si no, dos altas sin denominación darían "ya existe una calificación con esa denominación": un 409 por no haber escrito nada, cuando el criterio aplicable es CA-48.5 y la respuesta correcta es 400 nombrando el campo. | 2026-10-08 |
| L-08 | **`LEGAL_QUALIFICATION_NOT_FOUND` y `..._ALREADY_EXISTS` van sin `details`.** El contrato §3.5 muestra `null` para los dos. Coincide con `CLIENT_NOT_FOUND` (P-09) y difiere de `LAWYER_NOT_FOUND`; ver C-05 de `people`. | 2026-10-08 |
| L-09 | **La respuesta del `POST` no lleva `activeCases`.** El contrato lo marca "solo en las respuestas de `GET`", y el criterio detrás es CA-48.7: el alta no toca ninguna causa, así que no hay conteo que informar. Se modeló con dos DTO, uno extendiendo al otro, en vez de uno con el campo opcional. | 2026-10-08 |
| L-10 | **La baja lógica se filtra en el repositorio, no en el caso de uso.** `active: true` está fijo en el `where` de `findPaginated` y en `findActiveById`, así que ningún llamador futuro puede olvidarse de CA-47.9. El puerto lo dice en el nombre: `findActiveById`, no `findById`. | 2026-10-08 |
| L-12 | **(HU-49) Modificar no toca `cases`.** Las causas referencian la calificación y calculan la prescripción en cada lectura con los meses vigentes (V6 §3.5, D-08): detalle y listado (`prisma-case.repository.ts:713-733`), línea de tiempo, tableros y proceso diario. CA-49.4 se cumple sin escribir nada fuera de `legal_qualifications`; escribir `offenses` desde acá violaría la regla de propiedad del dato (arquitectura §4.4). Ver QL-05. | 2026-11-13 |
| L-13 | **(HU-49) `rename` y `changePrescriptionMonths` reusan las validaciones del alta**, sacadas de `create` a dos métodos privados (`validName`, `assertValidPrescriptionMonths`), con el mismo código `INVALID_LEGAL_QUALIFICATION`. Por HTTP no se alcanzan: el DTO responde antes con `VALIDATION_ERROR`. Decidido con el usuario. | 2026-11-13 |
| L-14 | **(HU-49, HU-50) Escritura en un paso.** `LegalQualificationRepository.update` escribe con `WHERE id AND active` y devuelve si escribió: una calificación dada de baja entre la lectura y la escritura responde 404 en vez de modificarse (CA-49.6) o darse de baja dos veces (CA-50.4). La violación del índice parcial se traduce a 409, como en estados procesales: dos renombres simultáneos al mismo nombre dan 200 y 409, no 500. | 2026-11-13 |
| L-15 | **(HU-49) Un validador por campo en el `PATCH`** (`infrastructure/http/validators/qualification-fields.validator.ts`). El pipe global junta los mensajes de un campo (`app.setup.ts`, `flatten`): con `@IsString` + `@IsNotEmpty` un `null` decía "Debe ser un texto. No puede estar vacío.", y `@IsInt` + `@Min` repetían la frase. Mismo motivo que `people/…/required-text.validator.ts`, que no se importa por ser de otro subsistema (TL-04). | 2026-11-13 |
| L-16 | **(HU-49) `name` vacío en el `PATCH`: "No puede estar vacío."**, el texto del contrato (`API_CONTRACT_V6.md:2867`). El alta sigue con "Es un campo obligatorio.": un campo ausente en el alta sí es "obligatorio". Decidido con el usuario. | 2026-11-13 |
| L-17 | **(HU-49, HU-50) Sin auditoría.** `AUDITORIA_Y_TRAZABILIDAD.md` §4 no lista la parametría jurídica y V6 §3.5 no la pide; estados procesales tampoco audita. Decidido con el usuario. | 2026-11-13 |
| L-18 | **(HU-49, HU-50) Sin migración.** El índice parcial y el CHECK de L-05 alcanzan; `active` ya existía. | 2026-11-13 |
| L-11 | **El orden alfabético y la búsqueda se prueban contra Postgres, no con dobles.** Son comportamiento del repositorio: un test unitario del caso de uso con un mock que devuelve una lista ya ordenada no prueba nada. Los unitarios verifican que el caso de uso no deshaga el orden; los 39 de integración verifican que la base ordene e ignore mayúsculas de verdad. | 2026-10-08 |

---

## 2. Preguntas abiertas

| Id | Pregunta |
| --- | --- |
| QL-01 | **¿La búsqueda debería ignorar acentos?** Hoy `mode: 'insensitive'` resuelve mayúsculas pero no acentos. Las denominaciones penales traen pocos (`Lesiones`, `Amenazas`), pero `Daño — art. 183 CP` no se encuentra escribiendo "dano". Requiere `unaccent` en Postgres. Es la misma Q-03 de `people`: conviene resolverla una vez para todo el proyecto. |
| ~~QL-02~~ | ~~**¿Una calificación dada de baja libera su denominación?**~~ **Resuelta el 13/11/2026: sí.** V6 §3.5 la hace "única entre las vigentes" (`API_CONTRACT_V6.md:2559`). Probado de punta a punta con el `DELETE` real: después de la baja, un `POST` con el mismo nombre responde 201 (`legal-qualifications.int.spec.ts`, describe `DELETE`). |
| ~~QL-03~~ | ~~**¿Qué pasa con el plazo de una calificación que ya tiene causas?**~~ **Resuelta el 13/11/2026: se recalcula, manda el contrato** (V6 §3.5, D-08). El código ya lo hacía: ninguna lectura usa `offenses.prescription_date`. Los comentarios equivocados de `schema.prisma` y `DICCIONARIO_DATOS.md` se corrigieron en `dfeecfe`. Lo que queda de la columna es QL-05. |
| QL-04 | **Una causa que conserva una calificación dada de baja no puede reemplazar su lista manteniéndola.** `PATCH /cases` reemplaza la lista completa (`API_CONTRACT_V6.md`, `PATCH /cases`, `legalQualifications`) y `update-case.use-case.ts:121` rechaza con 400 cualquier calificación dada de baja. Si además está declarada prescripta (D-113, no se puede quitar), la lista queda trabada. Choca con CA-50.3 ("las causas la conservan"). V6 no lo resuelve; es de `cases` y del contrato. Decidido con el usuario: punto abierto, no se toca en HU-49/HU-50. |
| QL-05 | **`offenses.prescription_date` queda desactualizada** después de un cambio de meses (y ya lo estaba después de un acto interruptivo). Nadie la lee para calcular. `docs/support/cambios-bdd-sprint4.md:388` dejó abierto si recalcularla o eliminarla (eliminarla lleva migración). Decidido con el usuario: no se toca en HU-49. |

---

## 3. Correcciones a documentación existente

| Id | Corrección |
| --- | --- |
| ~~CL-01~~ | ~~**El contrato y el schema se contradicen sobre el recálculo de la prescripción.**~~ **Resuelta en `dfeecfe` (13/11/2026):** el texto equivocado era el del schema (y el del diccionario de datos). Ver QL-03. |
| ~~CL-02~~ | ~~**La paginación devuelve `VALIDATION_ERROR` donde el contrato dice `INVALID_PAGINATION`.**~~ **Resuelta.** Se corrigió el lado del código, no el contrato: el `exceptionFactory` de `app.setup.ts` devuelve `InvalidPaginationError` cuando **todo** lo que falló es paginación, y sigue devolviendo `VALIDATION_ERROR` si además falló un campo del recurso —un `?page=0&search=<300 caracteres>` no puede perder el segundo en el camino—. Se decide ahí porque es el único lugar que sabe qué campos fallaron. Vale para los cinco listados, que extienden `PaginationQueryDto`. El spec de integración de calificaciones ya lo verifica. |
| ~~CL-03~~ | ~~**`StubLegalQualificationLookupAdapter` sigue en pie, y ahora sin razón de ser.**~~ **Resuelta.** El stub ya no existe: `legal-parameters` expone `CasesLegalParametersLookupAdapter` bajo `LEGAL_PARAMETERS_LOOKUP`, que es un solo token para los estados procesales y las calificaciones, y `CasesModule` lo recibe importado en vez de declarar un proveedor propio que lo tapara. La dependencia quedó mutua —`cases` pide calificaciones y estado inicial, `legal-parameters` pide el conteo— y las dos mitades llevan `forwardRef`. **Los 4 tests rojos de `POST /cases` están verdes**: eran este stub y el de clientes (C-08 y C-09 de `people`, también cerradas). |
| CL-04 | **El documento de CA marca CA-48.8 para revisar y conviene borrarlo.** El botón "Registrar calificación nueva" del alta de causa es de interfaz: el backend ya lo habilita, porque el `POST` existe y la restricción por perfil que el criterio pide es exactamente CA-48.9. No hay nada que implementar aparte. |

---

## 4. Deuda técnica

| Id | Deuda |
| --- | --- |
| ~~**TL-01**~~ | ~~**CA-47.8 queda incumplido: `activeCases` está fijo en 0.**~~ **Cerrada el 10/10/2026: CA-47.8 cumplido.** El conteo es `ActiveCasesCounterPort.countByQualifications`, que implementa `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts` sobre `CaseQueryPort.countActiveByLegalQualification` — agrupa `offenses` por `legal_qualification_id` con la causa filtrada por activa, así que una causa suma a **cada** una de sus calificaciones sin duplicar (PK compuesta, `schema.prisma:362`). `ViewLegalQualifications` y `FindLegalQualification` devuelven `LegalQualificationWithActiveCases` y el mapper lo lee. El `POST` sigue sin el campo (CA-48.7). Tres cosas que el análisis original dejó abiertas y ya tienen respuesta: la causa en `current_custom_state` **es activa** y cuenta; una calificación dada de baja **sigue contando** sus causas (RN12); y "prescripta" no entra en el predicado — la fecha es por hecho (`offenses.prescription_date`) y el avance lo calcula el cliente. Verificado por la API en `legal-qualifications.int.spec.ts:232`, describe `activeCases de /api/v1/legal-qualifications` (lo que probaba `case-query.int.spec.ts` se mudó ahí el 01/11/2026). |
| TL-02 | **Dos convenciones de paginación conviven en el proyecto.** Acá se sigue la del subsistema (`src/common/pagination/`), que reporta `totalPages: 0` con la colección vacía; la compartida (`shared/infrastructure/http/pagination.ts`, que usa `/clients`) fuerza 1, con el argumento de que la paginación arranca en la página 1 y 0 páginas describe un rango al que ninguna petición válida llega. **Se verificó de punta a punta: `GET /legal-qualifications?search=zzzz` devuelve `totalPages: 0` y `GET /clients` devuelve 1 en el mismo caso.** Las dos son defendibles; que difieran entre recursos del mismo contrato, no. |
| ~~TL-03~~ | ~~**`PATCH` y `DELETE` no existen.**~~ **Cerrada el 13/11/2026** con HU-49 y HU-50. |
| TL-04 | **Dos validadores de "texto requerido" que hacen lo mismo.** `people/…/required-text.validator.ts` y `legal-parameters/…/qualification-fields.validator.ts` (L-15) resuelven el mismo problema del pipe global. Llevar uno genérico a `shared/infrastructure/http` es un refactor aparte. |
| TL-05 | **El hook de cierre (`.claude/hooks/verificar.ps1`) compila con el `node_modules` local**, que está atrasado respecto del contenedor (faltan `nestjs-pino`, `@googleapis/*`, `@cantoo/pdf-lib`), así que marca "no compila" aunque dentro del contenedor compile. Es de la herramienta, no del código. |

---

## 5. Registro de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 2026-10-08 | **HU-48 y HU-47.** Entidad `LegalQualification`, puerto y repositorio Prisma, tres casos de uso, capa HTTP con permisos (L-02), seed con `qualification:*` (L-03). 14 archivos nuevos y dos ajenos tocados solo aditivamente. Sin migración (L-05). **37 tests unitarios y 39 de integración.** Verificado además de punta a punta contra el stack de docker con la base resembrada: alta, 409 por duplicado, 409 por diferencia de mayúsculas, 403 a Abogado y Secretaría, 200 a los tres perfiles en lectura, 401 sin token, orden alfabético, búsqueda por delito y por artículo, colección vacía sin error, 404 por id inexistente y por calificación dada de baja. **CA-47.8 sin cubrir**: ver TL-01. | — |
| 2026-10-10 | **CA-47.8 cumplido.** `activeCases` sale del conteo real de `cases`, por `ActiveCasesCounterPort.countByQualifications`. Nuevo read model `LegalQualificationWithActiveCases`; los dos casos de uso de lectura lo devuelven y el mapper lo lee. El `POST` sigue sin el campo. 2 unitarios nuevos y 4 de integración por la API. Hecho desde `cases` (rama `feat/cases-query`), no por el dueño de este módulo: el conteo es de `cases` y conectarlo pedía tocar acá. | — |
| 2026-11-13 | **HU-49 y HU-50.** `PATCH` y `DELETE /legal-qualifications/{qualificationId}`. Entidad (`rename`, `changePrescriptionMonths`, `deactivate`), puerto (`update` condicional, `existsActiveByName` con `excludingId`), dos casos de uso, DTO con validadores propios, controller, módulo y seed. Sin migración (L-18) y sin tocar `cases` (L-12). Tests primero en rojo (29 unitarios y 21 de integración fallando por las razones esperadas), después verdes: unitarios completos 1682/1682; integración de calificaciones, smoke y detección 48/48. **Integración completa: 470/498**, con 28 fallos en `clients`, `register-case` y `declare-prescription` que no son de esta rama: el CHECK `ck_clients_deactivation_coherent` de las migraciones de Sprint 5 (`e67241b`) rechaza los clientes dados de baja que arman `client.factory.ts:37` y `clients.int.spec.ts`; `clients` deja filas en `audit_log` al fallar y las suites siguientes no pueden borrar `users`. Corridas solas: `declare-prescription` pasa; `clients` y `register-case` fallan por el CHECK. | — |

### Estado de los criterios

| CA | Estado |
| --- | --- |
| 48.1 Alta exitosa | ✅ |
| 48.2 Denominación con la norma | ✅ |
| 48.3 Plazo como total de meses | ✅ |
| 48.4 Denominación única entre vigentes, sin distinguir mayúsculas | ✅ |
| 48.5 Campos obligatorios | ✅ |
| 48.6 Validación de datos | ✅ |
| 48.7 Independencia de las causas | ✅ |
| 48.8 Botón desde el alta de causa | Interfaz — ver CL-04 |
| 48.9 Perfil no habilitado | ✅ |
| 47.1 Listado de vigentes | ✅ (desde 10/10/2026 incluye `activeCases`) |
| 47.2 Plazo en años y meses | Interfaz |
| 47.3 Orden alfabético | ✅ |
| 47.4 Búsqueda por nombre o artículo | ✅ |
| 47.5 Paginación | ✅ |
| 47.6 Sin resultados | ✅ |
| 47.7 Consulta individual | ✅ |
| 47.8 Causas activas | ✅ desde 10/10/2026 — TL-01 cerrada |
| 47.9 Calificaciones dadas de baja | ✅ |
| 47.10 Selector en el alta de causa | Interfaz, servido por el `GET` |
| 47.11 Usuario no autenticado | ✅ |
| 49.1 Modificación exitosa; omitido no cambia; vacío → 400 | ✅ unitario + integración |
| 49.2 Denominación única entre las vigentes | ✅ unitario + integración, con concurrencia (L-14) |
| 49.3 Plazo en meses ≥ 1 | ✅ unitario + integración. "Años y meses de 0 a 11": interfaz |
| 49.4 Cambiar el plazo recalcula la prescripción | ✅ integración: `GET /cases/{id}` y, por CA-52.8, la detección diaria |
| 49.5 `activeCases` no se modifica | ✅ integración |
| 49.6 Inexistente, dada de baja o id inválido | ✅ unitario + integración |
| 50.1 Baja lógica, no se lista, 404, no se reactiva | ✅ unitario + integración |
| 50.2 No se ofrece para causas nuevas | ✅ listado (integración); alta de causa en `register-case.int.spec.ts:407`; modificación en `update-case.use-case.spec.ts:159` |
| 50.3 Las causas la conservan, sin 409 | ✅ integración. **Salvo QL-04**: reemplazar la lista de la causa manteniéndola responde 400 |
| 50.4 Inexistente, ya dada de baja o id inválido | ✅ unitario + integración |

### Tests pendientes de otros

Las dos suites de integración que fallan —`register-case` (4) y
`procedural-states` (14)— ya fallaban antes de estas historias. Se
verificó corriéndolas sin estos cambios. Las causas están documentadas
en `IMPLEMENTACION_PEOPLE.md`: C-07 (el factory de estados procesales no
compila), C-08 y C-09 (los stubs de clientes y de calificaciones con
ids hardcodeados).
