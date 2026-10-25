---
paths:
  - "backend/src/**/*.ts"
---

<!-- Se carga solo cuando se lee/escribe un .ts del backend. Fuera de eso no
     gasta contexto. Fuente: docs/TRADUCCION_DOMINIO.md -->

# Vocabulario del dominio

El glosario `docs/TRADUCCION_DOMINIO.md` es **de cumplimiento obligatorio**.
Todo identificador que refiera a un concepto del dominio usa su forma exacta.

Regla de precedencia: si el glosario y `API_CONTRACT_V3.md` no coinciden,
**manda el contrato**. El glosario se adapta al contrato, no al revés.

De ahí sale la regla que más se viola: **un concepto que viaja por la API se
nombra igual en el dominio y en el contrato.** Tener `TimeLimit` en el código y
`timeLimitDays` en el JSON es correcto porque el contrato lo dice; inventar un
tercer nombre no.

## Confusiones que hay que evitar

| No confundir                                 | con                                      | Por qué importa                                                                                                                               |
| -------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`                                       | `ProceduralRole`                         | `Role` es el perfil de seguridad de identity. `ProceduralRole` es el rol de una persona dentro de una causa. Sin relación.                    |
| `User`                                       | `Lawyer`                                 | El usuario es la cuenta; el abogado es la ficha profesional matriculada. Se vinculan, pero una secretaría tiene usuario sin ficha de abogado. |
| `TimeLimit` (el plazo configurado, la regla) | `Deadline` (la fecha concreta calculada) | Son dos cosas distintas en el modelo.                                                                                                         |

## Sin traducción

`Amparo` y `SacNumber` se dejan como están. No son descuidos: no tienen
equivalente en inglés. `SacNumber` conserva la sigla (Sistema de Administración
de Causas del Poder Judicial de Córdoba).

## Roles

`ADMINISTRATOR`, `LAWYER`, `SECRETARY`. **Un usuario puede tener más de un rol**
(`roles`, en plural). Cuando hay que mostrar uno solo, gana el de mayor peso:
`ADMINISTRATOR` › `SECRETARY` › `LAWYER`.

## Alta y baja: nunca borrar

`deactivate` / `active: boolean`, **nunca `delete`** (RN12).

`DELETE` en la API no borra: pone `active` en `false`. El registro se conserva
para no romper las referencias de las causas, y se reactiva con un `PATCH` que
ponga `active` en `true`. Los listados devuelven sólo los activos salvo que se
pida lo contrario con el parámetro `active`.

Si ves un `prisma.delete()` o un `DELETE FROM` sobre una entidad de negocio,
es un bug. Avisá.

## Inconsistencias conocidas: NO corregir

El glosario tiene una sección "Inconsistencias conocidas" con vocabulario viejo
que todavía vive en `frontend/src/features/users/` (`ADMINISTATOR`,
`SECRETARIAT`, `role` en singular, `abogadoId`).

Están documentadas y pendientes de acuerdo con el equipo. **No las arregles por
tu cuenta**: cambiarlas de un lado sin el otro empeora el problema. Si tu tarea
las toca, nombralas y pará.

<!-- =====================================================================
     TODO #3 — BORRADOR MÍO, 08/10/2026. Corregí o tachá.

     Leelo con la desconfianza correcta: esto NO salió de tu cabeza. Salió
     de leer identity.errors.ts, los tres .vo.ts y los siete ports de
     identity, y cruzarlos con los ports de cases. Es lo que el código ya
     dice, puesto en palabras. Lo que el TODO te pedía de verdad —lo que
     vos sabés y el código no muestra— sigue faltando. Lo que te ahorré es
     la redacción.

     Hallazgo que cambió el encuadre: casi nada de esto es específico de
     identity. Las bases de error viven en @shared, y el corte
     .port/.repository se verifica igual en cases. Por eso quedó acá y no
     en una regla aparte scopeada a identity.

     Las dos últimas secciones son preguntas, no reglas. No las contesté yo
     a propósito: una es una renombrada tuya y la otra necesita mirar el
     frontend.
     ===================================================================== -->

## Convenciones de código que el glosario no cubre

El glosario cubre los conceptos del **negocio**. Esto es la convención de
**código**, que el glosario no menciona. Verificado contra `identity` y
`cases` el 08/10/2026.

### Errores: el nombre de la clase y el `code` no coinciden, a propósito

La clase se llama `<Problema>Error` y extiende una de las cinco bases de
`@shared/domain/domain-error`:

| Base                | HTTP | Cuándo                                                            |
| ------------------- | ---- | ----------------------------------------------------------------- |
| `ValidationError`   | 400  | el pedido está mal formado                                        |
| `UnauthorizedError` | 401  | no se pudo autenticar                                             |
| `NotFoundError`     | 404  | no existe, o fue dado de baja (RN12)                              |
| `ConflictError`     | 409  | choca con algo que ya existe                                      |
| `BusinessRuleError` | 422  | el pedido es válido y el dominio rechaza el **estado resultante** |

**El status HTTP lo elige la clase base, no el controller.** Por eso elegir
base es una decisión semántica: `LastAdministratorError` es 422 y no 400
porque el request está perfecto — lo que el dominio no acepta es el estado
al que llevaría.

Y la que más fácil se rompe: **el `code` sale del contrato, no del nombre de
la clase.** No coinciden, deliberadamente:

| Clase                     | `code`                   |
| ------------------------- | ------------------------ |
| `SessionExpiredError`     | `UNAUTHENTICATED`        |
| `InvalidUserIdError`      | `INVALID_PATH_PARAMETER` |
| `EmptyUpdateRequestError` | `VALIDATION_ERROR`       |
| `UnknownRoleFilterError`  | `INVALID_REQUEST`        |

El nombre de la clase es para el que lee el código; el `code` es superficie
de API. **No "alinees" uno con el otro**: tocar el `code` para que se
parezca al nombre de la clase rompe el contrato.

Los docstrings citan la decisión (`D-09`), el CA (`CA-6.3`), la RN (`RN12`) o
el § del contrato que los justifica. Esa cita es lo que permite borrar la
regla cuando el motivo deja de aplicar: mantenela.

### Value objects: `create` es el único camino

`.vo.ts`, `private constructor`, `static create(raw)`, **normaliza y después
valida**, expone `toString()` y `equals()`. `Email`, `Username` y
`Permission` siguen el molde exacto. Lo que compra: toda instancia que
exista en memoria es válida, porque no hay otra forma de construirla.

**El VO tira `ValidationError` inline** con código `INVALID_<ALGO>`
(`INVALID_EMAIL`), no usa las clases de `identity.errors.ts` — esas son de
casos de uso y entidades. Un VO que importe `identity.errors` es olor.

Cuándo VO y cuándo string pelado: **inferencia mía, no lo encontré escrito.**
Hay VO cuando la normalización tiene que valer en todo el sistema, la
búsqueda incluida — `UserRepository.findByUsername` recibe un `Username` y
no un string justamente para que el lookup no pueda saltearse la
normalización (D-17). `fullName` no tiene regla de normalización y es
string. Si la regla real es otra, corregime.

### Token de DI y sufijo de archivo

`export const SCREAMING_SNAKE = Symbol("SCREAMING_SNAKE")`, el mismo string
adentro, declarado al lado de la interfaz que identifica (D-09,
`IMPLEMENTACION_AUTH.md` §7.1).

Sufijo de **archivo**, consistente en identity y en cases:

- `.repository.ts` → persistencia de un agregado **propio** del subsistema
  (`user.repository.ts`, `role.repository.ts`, `case.repository.ts`).
- `.port.ts` → todo lo demás.

Los dos viven en `core/domain/ports/`.

### Dos desalineaciones: nombralas, no las normalices

1. **El sufijo del nombre de la interfaz no es consistente.** En la misma
   carpeta de identity convive `PasswordHasher`, `TokenIssuer` y
   `RefreshTokenStore` (sin sufijo) con `LawyerLookupPort` y
   `LawyerRegistrarPort` (con sufijo). En `cases` igual: `CaseRepository`
   sin, los cinco lookups con, y `CurrentDatePort` con sufijo sin ser un
   lookup. No hay regla que explique el corte, y `puertos-acl.md` documenta
   `LawyerLookupPort` como si el sufijo fuera la convención. Unificar es
   decisión de equipo.

2. **`ProcStateLookupPort` / `PROC_STATE_LOOKUP` abrevia `ProceduralState`**,
   concepto del glosario, que es de cumplimiento obligatorio. Es el único
   lookup abreviado de `cases`: los otros son `ClientLookupPort`,
   `LegalQualificationLookupPort`, `LawyerLookupPort`. Está en tu código, así
   que es tuyo para arreglar — pero es una renombrada, no un fix al pasar.

### El idioma de los mensajes

Los mensajes tendran que ser **en español**. El idioma de los mensajes de error es una decisión
de negocio, no técnica. El contrato de API dice que el `message` es para el usuario final, y
el usuario final es un abogado Argentino. No hay que traducirlo al inglés.

**Hoy el código no cumple, y es a propósito.** Estado al 08/10/2026,
verificado: de las 16 clases de `identity.errors.ts`, unas 13 tienen el
`message` en inglés (`"Invalid credentials."`, `"Session expired or
invalid."`…) y sólo 2 o 3 en castellano (`LawyerAlreadyLinkedError`,
`UnknownRoleFilterError`).

**Es una migración pendiente, no una inconsistencia a preservar.** Se van a
pasar todas al castellano en una corrida dedicada, más adelante. Hasta
entonces:

- **No las traduzcas al pasar.** Un archivo traducido a medias es peor que uno
  consistentemente en inglés, y la corrida en bloque da un diff único y
  revisable. Si tocás un error existente por otro motivo, dejale el mensaje
  como está.
- **Si escribís un error nuevo, va en castellano.** La regla aplica de acá en
  adelante.

Esto **no** es lo mismo que `ADMINISTATOR` o `abogadoId`: ésas no se arreglan
porque arreglarlas de un lado empeora el problema. Acá sí se va a arreglar,
sólo que no hoy y no de a pedacitos.

Alcance, verificado en el frontend el 08/10/2026: **ninguna lógica depende del
texto.** `shared/api/ApiError.ts` matchea contra `code` (`this.code === code`),
y no hay un match literal de los mensajes en inglés en todo `frontend/src`. El
`message` se usa sólo para mostrar (`{t.message}` en el toast,
`setBanner(error.message)` en el login). Traducir cambia texto visible y no
rompe ningún flujo.

El `code` **no se traduce nunca**: es identificador del contrato, SCREAMING_SNAKE
en inglés. La migración toca `message` y `details`, no `code`.
