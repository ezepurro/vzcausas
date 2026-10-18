# Implementación de calificaciones legales — Bitácora

Mismo formato que `IMPLEMENTACION_AUTH.md` y `IMPLEMENTACION_PEOPLE.md`.

Cubre **HU-48** (registrar calificación legal) y **HU-47** (consultar y
buscar calificaciones legales), épica EP-03, Sprint 2.

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
son `QL-01` (acentos en la búsqueda), `QL-03`/`CL-01` (la contradicción
sobre el recálculo de la prescripción), `TL-02` (dos paginadores) y
`TL-03` (`PATCH` y `DELETE`).

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
| L-11 | **El orden alfabético y la búsqueda se prueban contra Postgres, no con dobles.** Son comportamiento del repositorio: un test unitario del caso de uso con un mock que devuelve una lista ya ordenada no prueba nada. Los unitarios verifican que el caso de uso no deshaga el orden; los 39 de integración verifican que la base ordene e ignore mayúsculas de verdad. | 2026-10-08 |

---

## 2. Preguntas abiertas

| Id | Pregunta |
| --- | --- |
| QL-01 | **¿La búsqueda debería ignorar acentos?** Hoy `mode: 'insensitive'` resuelve mayúsculas pero no acentos. Las denominaciones penales traen pocos (`Lesiones`, `Amenazas`), pero `Daño — art. 183 CP` no se encuentra escribiendo "dano". Requiere `unaccent` en Postgres. Es la misma Q-03 de `people`: conviene resolverla una vez para todo el proyecto. |
| QL-02 | **¿Una calificación dada de baja libera su denominación?** Hoy sí, por el índice parcial, y está probado. Es coherente con el DNI del cliente y con la matrícula. Pero `DELETE /legal-qualifications` todavía no existe, así que conviene confirmarlo cuando se escriba: una calificación dada de baja sigue siendo la que las causas viejas muestran en su detalle, y dos calificaciones con el mismo nombre en distintas épocas podrían confundir al leer una causa antigua. |
| QL-03 | **¿Qué pasa con el plazo de una calificación que ya tiene causas?** El contrato dice que modificar `prescriptionMonths` **recalcula** la prescripción de las causas que la registran, al revés de lo que pasa con el plazo de un estado procesal. Pero el comentario del modelo `Offense` dice que cada hecho guarda su `prescription_date` calculada al registrar la causa y que cambiar los meses después no la recalcula. **Se contradicen.** No afecta a estas dos historias, que no modifican nada; hay que resolverlo antes del `PATCH`. |

---

## 3. Correcciones a documentación existente

| Id | Corrección |
| --- | --- |
| CL-01 | **El contrato y el schema se contradicen sobre el recálculo de la prescripción.** Ver QL-03. Uno de los dos textos está mal y el `PATCH` va a implementar el que lea quien lo escriba. |
| ~~CL-02~~ | ~~**La paginación devuelve `VALIDATION_ERROR` donde el contrato dice `INVALID_PAGINATION`.**~~ **Resuelta.** Se corrigió el lado del código, no el contrato: el `exceptionFactory` de `app.setup.ts` devuelve `InvalidPaginationError` cuando **todo** lo que falló es paginación, y sigue devolviendo `VALIDATION_ERROR` si además falló un campo del recurso —un `?page=0&search=<300 caracteres>` no puede perder el segundo en el camino—. Se decide ahí porque es el único lugar que sabe qué campos fallaron. Vale para los cinco listados, que extienden `PaginationQueryDto`. El spec de integración de calificaciones ya lo verifica. |
| ~~CL-03~~ | ~~**`StubLegalQualificationLookupAdapter` sigue en pie, y ahora sin razón de ser.**~~ **Resuelta.** El stub ya no existe: `legal-parameters` expone `CasesLegalParametersLookupAdapter` bajo `LEGAL_PARAMETERS_LOOKUP`, que es un solo token para los estados procesales y las calificaciones, y `CasesModule` lo recibe importado en vez de declarar un proveedor propio que lo tapara. La dependencia quedó mutua —`cases` pide calificaciones y estado inicial, `legal-parameters` pide el conteo— y las dos mitades llevan `forwardRef`. **Los 4 tests rojos de `POST /cases` están verdes**: eran este stub y el de clientes (C-08 y C-09 de `people`, también cerradas). |
| CL-04 | **El documento de CA marca CA-48.8 para revisar y conviene borrarlo.** El botón "Registrar calificación nueva" del alta de causa es de interfaz: el backend ya lo habilita, porque el `POST` existe y la restricción por perfil que el criterio pide es exactamente CA-48.9. No hay nada que implementar aparte. |

---

## 4. Deuda técnica

| Id | Deuda |
| --- | --- |
| ~~**TL-01**~~ | ~~**CA-47.8 queda incumplido: `activeCases` está fijo en 0.**~~ **Cerrada el 10/10/2026: CA-47.8 cumplido.** El conteo es `ActiveCasesCounterPort.countByQualifications`, que implementa `cases/infrastructure/acl/legal-parameters-active-cases-counter.adapter.ts` sobre `CaseQueryPort.countActiveByLegalQualification` — agrupa `offenses` por `legal_qualification_id` con la causa filtrada por activa, así que una causa suma a **cada** una de sus calificaciones sin duplicar (PK compuesta, `schema.prisma:362`). `ViewLegalQualifications` y `FindLegalQualification` devuelven `LegalQualificationWithActiveCases` y el mapper lo lee. El `POST` sigue sin el campo (CA-48.7). Tres cosas que el análisis original dejó abiertas y ya tienen respuesta: la causa en `current_custom_state` **es activa** y cuenta; una calificación dada de baja **sigue contando** sus causas (RN12); y "prescripta" no entra en el predicado — la fecha es por hecho (`offenses.prescription_date`) y el avance lo calcula el cliente. Verificado en `test/subsystems/cases/case-query.int.spec.ts` y por la API en `legal-qualifications.int.spec.ts`, describe `activeCases de /api/v1/legal-qualifications`. |
| TL-02 | **Dos convenciones de paginación conviven en el proyecto.** Acá se sigue la del subsistema (`src/common/pagination/`), que reporta `totalPages: 0` con la colección vacía; la compartida (`shared/infrastructure/http/pagination.ts`, que usa `/clients`) fuerza 1, con el argumento de que la paginación arranca en la página 1 y 0 páginas describe un rango al que ninguna petición válida llega. **Se verificó de punta a punta: `GET /legal-qualifications?search=zzzz` devuelve `totalPages: 0` y `GET /clients` devuelve 1 en el mismo caso.** Las dos son defendibles; que difieran entre recursos del mismo contrato, no. |
| TL-03 | **`PATCH` y `DELETE` no existen.** Fuera de alcance por definición de las historias. El `DELETE` es además el que cierra QL-02, y el `PATCH` el que necesita QL-03 resuelto. |

---

## 5. Registro de avance

| Fecha | Qué | Commit |
| --- | --- | --- |
| 2026-10-08 | **HU-48 y HU-47.** Entidad `LegalQualification`, puerto y repositorio Prisma, tres casos de uso, capa HTTP con permisos (L-02), seed con `qualification:*` (L-03). 14 archivos nuevos y dos ajenos tocados solo aditivamente. Sin migración (L-05). **37 tests unitarios y 39 de integración.** Verificado además de punta a punta contra el stack de docker con la base resembrada: alta, 409 por duplicado, 409 por diferencia de mayúsculas, 403 a Abogado y Secretaría, 200 a los tres perfiles en lectura, 401 sin token, orden alfabético, búsqueda por delito y por artículo, colección vacía sin error, 404 por id inexistente y por calificación dada de baja. **CA-47.8 sin cubrir**: ver TL-01. | — |
| 2026-10-10 | **CA-47.8 cumplido.** `activeCases` sale del conteo real de `cases`, por `ActiveCasesCounterPort.countByQualifications`. Nuevo read model `LegalQualificationWithActiveCases`; los dos casos de uso de lectura lo devuelven y el mapper lo lee. El `POST` sigue sin el campo. 2 unitarios nuevos y 4 de integración por la API. Hecho desde `cases` (rama `feat/cases-query`), no por el dueño de este módulo: el conteo es de `cases` y conectarlo pedía tocar acá. | — |

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

### Tests pendientes de otros

Las dos suites de integración que fallan —`register-case` (4) y
`procedural-states` (14)— ya fallaban antes de estas historias. Se
verificó corriéndolas sin estos cambios. Las causas están documentadas
en `IMPLEMENTACION_PEOPLE.md`: C-07 (el factory de estados procesales no
compila), C-08 y C-09 (los stubs de clientes y de calificaciones con
ids hardcodeados).
