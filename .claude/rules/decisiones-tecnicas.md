---
paths:
  - "backend/src/subsystems/cases/**/*.ts"
  - "backend/prisma/schema.prisma"
---

<!-- Decisiones tomadas con mmachuca el 07/10/2026, cruzando los criterios de
     aceptación de HU20/HU22 con API_CONTRACT_V3.md y con prisma/schema.prisma.
     Todo lo de acá está verificado contra el código, no inferido. -->

# Decisiones técnicas de HU20 y HU22

## Cómo se arma `currentState` desde el schema

El dato está **denormalizado en la tabla `cases`** (decidido ya en el schema, no
se rediscute). La causa guarda su estado actual y el acto que la llevó ahí; el
vencimiento sale de ese acto. Lo actualiza la misma transacción que registra el
acto, no es trabajo de lectura.

**La trampa:** el schema y el contrato **no se corresponden campo a campo**. Al
alta, `cases.current_state_id` apunta a la fila del estado inicial "Iniciada"
del fuero (existe en `procedural_states` con `is_initial = true`). Pero el
contrato exige que la API devuelva `proceduralStateId` en **`null`** cuando el
estado es el inicial.

Si mapeás `current_state_id → proceduralStateId` directo, una causa recién
registrada devuelve un id que el frontend va a buscar en `/procedural-states` y
no va a encontrar, porque los estados iniciales **no forman parte de ese
listado**. Es un bug silencioso.

Derivación correcta de cada campo:

| Campo del contrato      | De dónde sale                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `initial`               | `true` si el `ProceduralState` relacionado tiene `isInitial = true`                                                             |
| `custom`                | `true` si `cases.current_custom_state` no es nulo                                                                               |
| `proceduralStateId`     | `cases.current_state_id`, **pero `null` si `initial` o si `custom`**                                                            |
| `name`                  | si `custom`: `cases.current_custom_state`. Si no: el `name` del estado ("Iniciada" en el inicial)                               |
| `proceduralActId`       | `cases.current_procedural_act_id`. `null` en el estado inicial                                                                  |
| `dueDate`               | `COALESCE(act.deadline_manual_due_date, act.deadline_computed_due_date)`. `null` si el estado no abrió plazo o si es el inicial |
| `businessDaysRemaining` | Calculado **en cada respuesta**, contra la fecha del día en Córdoba. `null` si `dueDate` es `null`                              |
| `manuallyAdjusted`      | `true` si `act.deadline_manual_due_date` no es nulo                                                                             |

`currentState` **nunca es `null`.** El CHECK del schema garantiza que siempre hay
exactamente uno de (`current_state_id`, `current_custom_state`).

Un plazo vencido **sigue abierto** y la causa lo sigue mostrando hasta que un
acto posterior la lleve a otro estado. No lo "cierres" ni lo ocultes.

## Búsqueda (CA-20.2): parcial, sin distinguir mayúsculas. Acentos NO

Decidido con mmachuca el 07/10/2026: **`ILIKE '%texto%'` y nada más.**

`gomez`, `GOMEZ`, `Gomez` y `GoMeZ` son lo mismo. Las tildes **no** se ignoran:
`gomez` no encuentra `GÓMEZ`. Se aplica a los tres campos que busca `search`
(`sacNumber`, `caption` y apellido y nombres del cliente).

**Deuda técnica aceptada, no un olvido.** Ignorar acentos requiere la extensión
`unaccent` de PostgreSQL, que hay que habilitar en cada entorno (incluido el
contenedor de los tests de integración) y se evaluará más adelante.

**No lo simules a mano** con `replace()` encadenado por vocal, ni agregues
columnas normalizadas por tu cuenta. Si hace falta, se decide con el equipo.

## Orden por urgencia (CA-20.1): se ordena por dueDate, sin índice nuevo

El orden es por el vencimiento vigente del acto que llevó la causa a su estado
actual: COALESCE(deadline_manual_due_date, deadline_computed_due_date) en
procedural_acts. Ascendente, las vencidas primeras; después las causas sin
vencimiento, por id.

Decidido con mmachuca el 07/10/2026: no se agrega ningún índice. Ordenar por el
vencimiento del acto procesal es lo correcto conceptualmente y el volumen de un
estudio no lo justifica.

Queda anotado que los índices actuales de procedural_acts no sirven para este
orden, así que el listado hace un sort en cada consulta. Es deuda conocida, no
un descuido. No agregues el índice por tu cuenta: sería una migración.

## `activeCases` el campo no es de este alcance; la definición sí

**Corregido el 08/10/2026.** Antes este título decía "`activeCases` no es de
este alcance" sin más, y eso llevaba a la conclusión equivocada. Hay que separar
dos cosas que se dicen parecido:

- **El campo contador `activeCases`** → no es de este alcance. Es de los módulos
  de abogados, estados procesales, calificaciones legales y clientes.
- **La definición de "causa activa"** → **sí es de este alcance**, porque
  `GET /cases/custom-states` devuelve los estados escritos a mano de las causas
  **activas**. Sin la definición no se puede implementar ese endpoint.

O sea: no hay que escribir el contador, pero sí hay que saber qué cuenta como
activa y aplicarlo en `custom-states`.

V3 §8.4 pide que abogados y estados procesales dejen de devolver `0` en
`activeCases`. Eso corresponde a los módulos de **abogados, estados procesales,
calificaciones legales y clientes**, no a HU20/HU22.

Pero el dato vive en `cases`, y un subsistema no puede leer la persistencia de
otro: tiene que pasar por un adaptador en `infrastructure/acl/`. El patrón ya
existe en las dos direcciones (`cases/infrastructure/acl/people-lawyer-lookup.adapter.ts`
y `people/infrastructure/acl/cases-lawyer-lookup.adapter.ts`).

O sea: **el cálculo es de los otros módulos, pero `cases` probablemente tenga
que exponerles un puerto de conteo.** Si alguien te pide eso, es trabajo tuyo
aunque la funcionalidad no lo sea. Avisá antes de empezarlo.

Definición de causa activa, para cuando toque: no dada de baja **y** su estado
actual no es terminal (ni Archivada ni Prescripta). Un estado escrito a mano no
es terminal. El estado inicial tampoco, y cuenta para su abogado, su cliente y
sus calificaciones, pero **no** para el `activeCases` de ningún estado procesal.

## `proceduralRole` es la posición del cliente en esa causa

Confirmado por mmachuca y por el contrato: _"Posición que ocupa el cliente en la
causa"_.

Vive a nivel de la causa (`cases.procedural_role`) y no dentro de `client`
porque **es una propiedad de la relación cliente–causa, no del cliente**: el
mismo cliente puede ser `DEFENSE` en una causa y tener otro rol en otra.

No busques `client.proceduralRole`: no existe, y no lo agregues.

No confundir con `Role`, que es el perfil de seguridad del usuario.
