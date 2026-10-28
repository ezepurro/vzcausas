# Refactor de estructura del backend

Registro de los cambios de organización del backend hechos en la rama
`refactor/backend-structure`. Son cambios de estructura, no de comportamiento:
la API, el esquema de la base y los mensajes de error no cambian, y no hay
migración.

El trabajo va en cinco fases, una por problema, en este orden:

| Fase | Problema                                                     | Estado    |
| ---- | ------------------------------------------------------------ | --------- |
| A    | `common/` y `shared/` separados; `SharedModule` mezclado     | Hecha     |
| B    | Puertos y adaptadores de persistencia duplicados en `cases`  | Hecha     |
| C    | Carpetas de `cases` con demasiados archivos                  | Pendiente |
| D    | Funciones sueltas que rompen el paradigma orientado a objetos | Pendiente |
| E    | Tests unitarios mezclados con el código                      | Pendiente |

## Fase A — `common/` dentro de `shared/` y fin de `SharedModule`

**Por qué.** Había dos carpetas para lo transversal (`src/common/` y
`src/shared/`) y dos carpetas `config` (`src/config/` y `src/shared/config/`).
Además, `shared/shared.module.ts` juntaba en un solo módulo cuatro cosas sin
relación entre sí (reloj, transacciones, filtro de errores y middleware de
correlación), mientras que dentro de `shared/infrastructure/` ya existían
módulos propios como `PrismaModule` y `EventsModule`.

**Qué cambió.**

- `src/common/` se eliminó:
  - `paginated-result.ts` → `src/shared/domain/paginated-result.ts`, porque lo
    usan puertos de dominio.
  - `query-pagination.dto.ts` y `paginated-response.dto.ts` →
    `src/shared/infrastructure/http/pagination/`, junto con `pagination.ts`.
  - La clase de `common` pasó a llamarse `DefaultedPaginationQueryDto` para no
    chocar con `PaginationQueryDto`.
- `src/shared/config/parse-ttl.ts` → `src/config/parse-ttl.ts`.
- `shared/shared.module.ts` se eliminó, y cada responsabilidad pasó a su módulo:
  - `CLOCK` → `ClockModule` (`shared/infrastructure/clock/clock.module.ts`).
    Lo importan los subsistemas que leen la hora.
  - `TRANSACTION_MANAGER` → `PrismaModule`, que ya era global y es el dueño
    del cliente de base de datos.
  - El filtro global de errores y el middleware de correlación →
    `HttpKernelModule` (`shared/infrastructure/http/http-kernel.module.ts`),
    que importa solo `AppModule`.

Así `shared/` queda con `domain/` e `infrastructure/{clock, events, google,
http, prisma}`, y cada carpeta de infraestructura tiene su propio módulo.

**Pendiente.** Los dos DTO de paginación no se fusionaron: tienen valores por
defecto y mensajes distintos, y unificarlos cambiaría las respuestas de
`/legal-qualifications` y `/procedural-states`. Esa fusión requiere revisarla
contra el contrato.

## Fase B — Un repositorio por entidad en `cases`

**Por qué.** Cada entidad de `cases` tenía dos puertos de persistencia, uno
para escribir (`CaseRepository`) y otro para leer (`CaseQueryPort`), cada uno
con su adaptador, y lo mismo con los actos procesales y los actos
interruptivos. Eran seis archivos de puerto y seis adaptadores para tres
entidades. Los adaptadores, además, no seguían la convención
`prisma-<nombre>.repository.ts` (`ARQUITECTURA_BACKEND_V1.md` §5.5).

**Qué cambió.**

- Quedó un puerto por entidad, con los métodos de escritura y de lectura:

  | Antes                                                         | Después                          |
  | ------------------------------------------------------------- | -------------------------------- |
  | `case.repository.ts` + `case-query.port.ts`                   | `case.repository.ts`             |
  | `procedural-act.repository.ts` + `procedural-act-query.port.ts` | `procedural-act.repository.ts` |
  | `interruptive-act.repository.ts` + `interruptive-act-query.port.ts` | `interruptive-act.repository.ts` |

  Ya no existen los tokens `CASE_QUERY`, `PROCEDURAL_ACT_QUERY` ni
  `INTERRUPTIVE_ACT_QUERY`. Los tipos de lectura (`CaseListItem`,
  `ProceduralActView`, etc.) siguen en el archivo del puerto.
- Los dos `findById` chocaban: el de escritura devuelve el agregado `Case` y el
  de lectura devuelve `CaseListItem`. El de lectura pasó a llamarse
  `findListItemById`.
- Quedó un adaptador por entidad, en `infrastructure/persistence/prisma/` (como
  en `identity`, `people` y `documents`): `prisma-case.repository.ts`,
  `prisma-procedural-act.repository.ts` y
  `prisma-interruptive-act.repository.ts`. Los adaptadores de lectura que no
  se unificaron también se movieron a `prisma/`, sin renombrarse.
- Los mappers de persistencia (`*-prisma.mapper.ts`) se movieron a
  `infrastructure/persistence/mappers/`, separados de los adaptadores.
- Dobles de test: antes cada stub implementaba solo la mitad del puerto que
  usaba. Ahora `core/test-support/case-fakes.ts` tiene una base por
  repositorio (`UnusedCaseRepository`, `UnusedProceduralActRepository`,
  `UnusedInterruptiveActRepository`) en la que todos los métodos lanzan un
  error. Cada doble la extiende y sobrescribe solo lo que su spec usa, así que
  una llamada inesperada falla en vez de devolver un vacío que pase el test.
  Reemplaza a `CaseQueryCountsUnused`, que hacía lo mismo solo para los conteos.

**Pendiente.** Cuatro puertos de `cases` quedaron afuera de la unificación:
`CaseTimelineQueryPort`, `CriminalPrescriptionQueryPort`,
`OpenDeadlineQueryPort` y `CaseFolderStatePort`. Los tres primeros son lecturas
con un único consumidor cada una. `CaseFolderStatePort` escribe sobre `cases`,
lo usan tres clases y es la compuerta que impide pedir dos carpetas para la
misma causa. La idea es sumarlos también a `CaseRepository`,
pero se decide aparte. Sus adaptadores todavía no siguen la convención de
nombres.
