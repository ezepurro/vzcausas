# Refactor de estructura del backend

Registro de los cambios de organización del backend hechos en la rama
`refactor/backend-structure`. Son cambios de estructura, no de comportamiento:
la API, el esquema de la base y los mensajes de error no cambian, y no hay
migración.

El trabajo va en cinco fases, una por problema, en este orden:

| Fase | Problema                                                     | Estado    |
| ---- | ------------------------------------------------------------ | --------- |
| A    | `common/` y `shared/` separados; `SharedModule` mezclado     | Hecha     |
| B    | Puertos y adaptadores de persistencia duplicados en `cases`  | Pendiente |
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
