# ADR-005 — Eventos de integración (publish & subscribe)

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Estado       | Aceptada                                                                                  |
| Fecha        | 19/10/2026                                                                                |
| Subsistemas  | `cases` y `documents` (el mecanismo es de `shared/`, lo puede usar cualquiera)            |
| Historias    | HU39 (carpeta en la nube). Sirve de base para HU40                                        |
| Relacionado  | `ARQUITECTURA_BACKEND_V1.md` (§6.1, §7.5) · `ADR-003_GOOGLE_DRIVE.md`                      |

Este documento explica **por qué** dos subsistemas se avisan con eventos en vez de
llamarse directamente, y **cómo** funciona, sin entrar en el código. Está pensado
para quien llega al proyecto y quiere entender la idea antes de leer los archivos.

---

## 1. El problema

Cuando se registra una causa, el sistema tiene que crearle una carpeta en Google
Drive (HU39). Eso lo hace el subsistema `documents`; la causa es de `cases`.

La forma más simple sería que `cases` llame a `documents` y espere:

```text
cases ──llama──▶ documents ──llama──▶ Google Drive
   ◀── espera ──        ◀── espera ──
```

Tiene tres problemas:

1. **`cases` queda atado a `documents`** y, por atrás, a Google. Si mañana el
   almacenamiento cambia, `cases` se entera.
2. **Drive es lento y puede fallar.** Crear tres carpetas anidadas lleva varios
   segundos. Registrar una causa no puede quedar colgado, ni fallar, porque Drive
   no responde: la causa es el dato que el estudio no puede perder (CA-39.5).
3. **No hay dónde dejar constancia** de que la carpeta está en camino o falló.

## 2. La decisión

`cases` **no llama** a `documents`. Publica un **hecho** —"se registró una causa"—
y `documents`, que está suscripto a ese hecho, reacciona. Cuando termina, publica
otro hecho —"la carpeta quedó lista" o "no se pudo crear"— y `cases` lo recibe.

Esto es *publish & subscribe*: quien publica no sabe quién escucha, y quien escucha
no sabe quién publicó. Se acuerdan por el **contrato del evento**, no por
conocerse.

Por qué la creación de la carpeta es **asíncrona**: porque el trabajo lento (Drive)
ocurre del lado de `documents`, sin que `cases` tenga que esperarlo para seguir. Lo
que sí le toca a `cases` es decidir **qué responderle al usuario mientras tanto**
(ver §5).

## 3. Cómo funciona, paso a paso

El caso de la carpeta de una causa:

```text
 Usuario            cases                          documents                 Drive
   │  POST /cases    │                                │                        │
   │────────────────▶│ 1. guarda la causa             │                        │
   │                 │    (folder_status = PENDING)   │                        │
   │                 │ 2. cierra la "compuerta":      │                        │
   │                 │    PENDING ─▶ CREATING         │                        │
   │                 │ 3. publica ┌───────────────┐   │                        │
   │                 │ ─────────▶ │ CaseRegistered│──▶│ 4. crea abogado,       │
   │                 │            └───────────────┘   │    fuero y carpeta ───▶│
   │   (espera un    │                                │◀── ids y enlaces ──────│
   │    máximo de    │            ┌──────────────────┐│ 5. publica el          │
   │    10 s)        │◀─────────  │DocumentSpace-    ││    resultado           │
   │                 │            │Assigned / Failed ││                        │
   │                 │            └──────────────────┘│                        │
   │                 │ 6. guarda el resultado:        │                        │
   │                 │    CREATED (con el enlace)     │                        │
   │                 │    o ERROR                     │                        │
   │◀────────────────│ 7. responde 201 con la carpeta │                        │
```

1. **Se guarda la causa.** Siempre, pase lo que pase después.
2. **La compuerta.** El estado de la carpeta (`folder_status`) pasa de `PENDING` a
   `CREATING` en una sola operación de base de datos. Solo quien logra el cambio
   puede pedir la carpeta. Así, aunque lleguen dos pedidos a la vez (por ejemplo
   el reintento automático y el botón "Crear carpeta"), **una causa nunca tiene
   dos carpetas en camino**.
3. **Se publica `CaseRegistered`**, con lo que `documents` necesita: el número de
   la causa, la carátula, el abogado y el fuero.
4. **`documents` crea la carpeta**: `Causas/{abogado}/{fuero}/{carátula}`,
   reutilizando lo que ya exista.
5. **`documents` publica el resultado**: `DocumentSpaceAssigned` (con el
   identificador y el enlace) o `DocumentSpaceCreationFailed` (con el motivo).
6. **`cases` guarda el resultado** en la causa: `CREATED` con el enlace, o `ERROR`.
7. **Se responde al usuario** (ver §5).

Los estados de la carpeta de una causa son `PENDING` (todavía no se pidió),
`CREATING` (en camino), `CREATED` (lista) y `ERROR` (falló; se reintenta).

## 4. Las piezas, sin código

| Pieza | Qué es | Dónde vive |
| --- | --- | --- |
| **Evento de integración** | Un hecho ya ocurrido, con un nombre único y versionado, un identificador propio y la fecha en que pasó | `shared/infrastructure/events/` |
| **`EventPublisher`** | El "buzón" para publicar. Quien publica solo conoce esto, no sabe qué hay debajo | `shared/infrastructure/events/` |
| **Bus en memoria** | Lo que hay debajo hoy: el emisor de eventos de NestJS, dentro del mismo proceso | `shared/infrastructure/events/` |
| **Contrato del evento** | La descripción exacta de los datos del evento. La define **quien publica** | `core/domain/ports/events/` del subsistema que publica |
| **Listener** | El que se suscribe a un evento. Solo traduce el evento, llama al caso de uso y atrapa los errores. No decide nada de negocio | `infrastructure/acl/events/` del subsistema que escucha |
| **Caso de uso** | Hace el trabajo y **anuncia el resultado**, venga el pedido de un evento o de un botón | `core/application/` |

Quién anuncia el resultado importa: lo hace el **caso de uso** y no el listener. Así,
si mañana un endpoint llama al mismo caso de uso (el reintento manual), `cases`
también se entera, y la causa no queda en `CREATING` para siempre.

Los tres eventos de la carpeta:

| Evento | Lo publica | Significa |
| --- | --- | --- |
| `cases.case-registered.v1` | `cases` | Se pidió la carpeta de esta causa |
| `documents.document-space-assigned.v1` | `documents` | La carpeta existe (con su identificador y enlace) |
| `documents.document-space-creation-failed.v1` | `documents` | No se pudo crear, con el motivo: transitorio, autorización, datos inválidos, configuración o interno |

## 5. Qué se responde mientras la carpeta se crea

El contrato de la API muestra la carpeta ya creada en la respuesta de `POST /cases`.
Como la creación ahora es asíncrona, el alta hace una **espera acotada**:

- Pide la carpeta y espera el resultado hasta **10 segundos** (configurable con
  `CASE_FOLDER_WAIT_MS`).
- Si llega a tiempo, responde `201` con la carpeta `CREATED` (o `ERROR` si falló),
  exactamente como dice el contrato. Es lo habitual.
- Si no llega a tiempo, responde `201` con la carpeta en `CREATING`. La creación
  **sigue en segundo plano** y el cliente la ve terminada consultando
  `GET /cases/{caseId}`.

En todos los casos la causa queda registrada: la carpeta es un complemento.

`POST /cases/{caseId}/folder` (reintento) usa el mismo mecanismo. Si la carpeta ya
existe o ya se está creando, no pide nada nuevo y devuelve su estado.

## 6. Reglas para quien agregue un evento

1. **Nombre en pasado**, porque es un hecho (`CaseRegistered`, no `RegisterCase`).
2. **Tipo versionado**: `subsistema.hecho.v1`. Si el contrato cambia de forma que
   rompe a los suscriptores, se crea `v2`; no se modifica la `v1`.
3. **Solo datos primitivos**: textos, números, fechas en formato ISO. Tiene que
   poder convertirse a JSON sin perder nada. Nunca un objeto del dominio: si el
   evento llevara la entidad `Case`, los suscriptores quedarían atados a su
   estructura interna.
4. **Todo `readonly`.** Un hecho que ya pasó no se modifica.
5. **Lo define quien publica**; los suscriptores se adaptan al contrato.
6. **Se publica después de confirmar la base de datos**, nunca dentro de una
   transacción: un suscriptor no debe reaccionar a algo que luego se deshace.
7. **Un listener nunca deja escapar una excepción.** La atrapa, la registra en el
   log con el identificador del evento y de la causa, y sigue.
8. **Hay que registrar el listener en el módulo** (`providers`). Si falta, nunca se
   ejecuta y NestJS no avisa.
9. **Los listeners son idempotentes.** Un evento puede llegar dos veces; procesarlo
   de nuevo no debe duplicar nada.

## 7. Límites conocidos

- **Se pierde si cae el proceso.** El bus vive en memoria: un evento publicado que
  todavía no se procesó desaparece. Una causa puede quedar en `CREATING`. El camino
  de evolución es un *outbox* (guardar los eventos en la base antes de enviarlos),
  que no cambia a quienes publican ni escuchan, porque solo se reemplaza lo que hay
  debajo de `EventPublisher`.
- **Una sola instancia.** La espera acotada del alta también está en memoria, así
  que hoy sirve con un único proceso del backend. Con varios habría que reemplazarla
  por una consulta a la base.
- **Sin orden ni reintentos automáticos entre eventos.** Los reintentos son del caso
  de uso y del usuario (botón "Crear carpeta"), no del bus.

El mecanismo no reemplaza a las llamadas directas por puertos: el resto de la
comunicación entre subsistemas sigue siendo síncrona (`ARQUITECTURA_BACKEND_V1.md`
§6). Los eventos se usan cuando quien pide no tiene por qué esperar el trabajo
lento de otro subsistema.
