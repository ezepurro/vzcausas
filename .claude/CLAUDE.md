# Backend VZ Causas — instrucciones de trabajo

## Cómo trabajamos

Trabajás con un integrante del equipo de backend. Escribís implementación, pero
tu trabajo es sobre todo **explicar, especificar, revisar y verificar**.

**Sin plan acordado no hay código.** Ante cualquier pedido de implementación,
proponé el plan (qué endpoints/HU, qué capas y archivos, qué tests, si hace
falta migración) y esperá la respuesta. Después de implementar, revisión.

## Fuentes de verdad (en orden de precedencia)

1. **`docs/Api-Contract/API_CONTRACT_V5.md`** — contrato vigente (Sprint 4).
   Manda sobre todo. V2, V3 y V4 son registro histórico: no los uses como
   referencia. Lo que más se consulta: §1 índice de endpoints, §4 reglas
   transversales (Autorización `:8106`, Causa activa `:8242`, Cómputo de días
   `:8264`, Prescripción `:8278`, Carpeta `:8304`, Proceso diario `:8379`,
   Bajas `:8437`), §5.3 códigos de error, §8.1 decisiones (D-xx), §8.2 puntos
   abiertos (C-xx), §8.4 impacto sobre lo implementado.
2. **`docs/TRADUCCION_DOMINIO.md`** — glosario obligatorio para todo
   identificador del dominio. Si no coincide con el contrato, manda el contrato.
3. **`docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md`** — capas,
   subsistemas (§4), anatomía hexagonal (§5), comunicación entre subsistemas
   (§6; ADR-002 de `reporting` en §6.5). ADRs puntuales: `ADR-003` (Drive),
   `ADR-004` (Gmail), `ADR-005` (eventos de integración).
4. **Moldes**: `EJEMPLO_CASO_DE_USO.md` antes de escribir un caso de uso;
   `EJEMPLO_TEST_INTEGRACION.md` y `backend/test/README.md` antes de un test.
5. **`PENDIENTE_DEFINICION.md`** — P-02, P-04, P-05, P-06, P-08. Si la tarea
   depende de uno, **frená y preguntá**.
6. **`IMPLEMENTACION_<TEMA>.md`** (auth, calificaciones, detección,
   notificaciones, people) — decisiones y estado de cada subsistema. Leé el
   que corresponda antes de tocarlo.
7. Apoyo: `DICCIONARIO_DATOS.md` (esquema), `USO_PRISMA.md` (migraciones),
   `AUDITORIA_Y_TRAZABILIDAD.md`, `docs/prototypes/` (fuente del contrato).

Si dos documentos se contradicen, **decímelo en vez de elegir uno**.

`.claude/rules/*.md` se cargan solos según el archivo que toques (`paths:` en
su encabezado). Varios citan V3/V4: si una regla choca con V5, avisame.

## Mapa del código

`backend/src/subsystems/`: `cases`, `deadlines`, `documents`, `health`,
`identity`, `legal-parameters`, `people`, `reporting`. Cada uno es un hexágono
(`core/domain`, `core/application/use-cases`, `infrastructure/{http,persistence,acl}`).
Entre subsistemas: puertos o eventos, nunca imports cruzados.
`reporting` lee la base directo (ADR-002). Kernel compartido: `backend/src/shared/`.

## Reglas que no se negocian

- **No inventes endpoints ni campos.** Si no está en V5, frená y preguntá.
- **No corrijas inconsistencias conocidas por tu cuenta** (glosario con
  `fullName`/`position`, V5 §8.3; `abogadoId` en `frontend/src/shared/mocks/contract.ts:12`).
  Nombralas, no las arregles: cambiar un lado sin el otro empeora.
- **Nunca `delete`, siempre `deactivate`** (RN12): `active: false`.
- **Nunca `prisma migrate reset`. Las migraciones las corro yo.** Vos preparás
  `schema.prisma` y, si hace falta SQL a mano, indicás `--create-only`
  (`USO_PRISMA.md` §5); yo corro `npx prisma migrate dev` porque puede ofrecer
  resetear la base (`USO_PRISMA.md` §2). Antes de proponer una migración,
  confirmá que cambia **estructura** (tablas, columnas, enums, índices): una
  consulta, por compleja que sea, no lleva migración.
- **Nunca se trabaja sobre `develop`**: rama `feat/<tema>` o `fix/<tema>`,
  merge a `develop` con unitarios e integración en verde.
- **No commitees ni hagas push** salvo que te lo pida.

## Dominio: lo que más se rompe

- **Todo el estudio ve todas las causas** (RN11). Los perfiles difieren en lo
  que _operan_, no en lo que _ven_. Filtrar por el `lawyerId` del usuario es un bug.
- **Baja lógica y asimétrica.** Para el cliente un registro dado de baja no
  existe (no se lista, `GET` → 404, no se reactiva por API). Pero una causa
  **sigue mostrando** estados y calificaciones dados de baja que son parte de
  su historia: no filtres por `active` las entidades referenciadas.
- **Causa dada de baja (V5, D-97)**: arrastra sus subrecursos (todos → `404
  CASE_NOT_FOUND`) y desaparece de tableros (`reporting`) y del proceso diario
  (`deadlines`). Su SAC queda libre: único solo entre causas vigentes.
- **El estado de una causa lo mueve el acto procesal**, no un `UPDATE` directo.
  Vive denormalizado en `cases` y lo actualiza la misma transacción del acto
  (al modificar un acto se recalcula, D-99). Un plazo vencido **sigue abierto**
  hasta que otro acto mueva la causa: no lo cierres ni lo ocultes.
- **El backend calcula, el cliente muestra** — con una excepción: la categoría
  "vencida / vence hoy / próximos días" la arma el cliente desde
  `businessDaysRemaining`. Agregar ese campo rompe el contrato.
- **Prescripción**: sólo fuero `CRIMINAL` (en los demás `prescription: null`).
  La calcula el backend en cada lectura con `summarizePrescription`
  (`cases/core/domain/prescription.ts:169`), la misma función que usan tableros
  y proceso diario. Nada se guarda calculado.
- **Días hábiles incompletos a propósito** (P-02): no excluyen feriados ni
  feria judicial. No lo "arregles"; los tests dan verde igual.
- **Drive nunca hace fallar la operación de negocio** (D-60, D-83, D-104): si
  Drive no responde, la causa/usuario/abogado se guarda y se corrige después.

## Estado del esquema

Sprint 3 aplicado (`backend/prisma/migrations/`). V5 **todavía requiere
migración** (V5 §8.4): motivo de baja en `cases`, SAC con índice único parcial
(hoy `@unique` en `schema.prisma:350`), tabla de expedientes versionados y
`lastModifiedBy`/`lastModifiedAt` en `procedural_acts`.

## Comandos (en `backend/`)

| Qué                    | Comando                             |
| ---------------------- | ----------------------------------- |
| Chequear tipos         | `npx tsc --noEmit -p tsconfig.json` |
| Unitarios              | `npm test`                          |
| Integración (Postgres en contenedor, no toca la base de dev) | `npm run test:int` |
| Levantar en dev        | `npm run start:dev`                 |

## Cómo citás y cómo cerrás un turno

- **Todo lo que nombres del repo, con ruta y línea en la misma oración**
  (`prescription.ts:169`, no "la función de prescripción"). Vale también para
  reglas y decisiones: RN3, CA-20.2, D-97, P-02. Si no tenés la línea, buscala.
- Antes de decir que algo está listo: compila, corriste los tests del código
  que tocaste, y decís **qué verificaste y qué no**. Una regla de negocio sin
  test queda nombrada como pendiente de revisión manual. "No lo verifiqué" es
  mejor que darlo por cerrado sin probar.
