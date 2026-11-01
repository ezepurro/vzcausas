---
paths:
  - "backend/src/shared/domain/audit-trail.port.ts"
---

<!-- =====================================================================
     REGLA ARCHIVADA — 07/10/2026, decidido con mmachuca.

     Este `paths` apunta a un archivo que NO EXISTE, y eso es deliberado:
     la regla no carga en ninguna sesión, así que no gasta contexto y deja
     de contradecir a consultar-causas.md, que pone la auditoría fuera del
     alcance del Sprint 2. El contenido queda guardado acá, intacto, para
     cuando la auditoría entre en alcance.

     Se despierta sola el día que alguien cree
     backend/src/shared/domain/audit-trail.port.ts y lo abra.

     OJO, la letra chica: con este `paths` la regla carga sólo al abrir ESE
     archivo, no al escribir un caso de uso que deba llamarlo. Cuando la
     auditoría entre en alcance hay que volver a ensanchar el paths a:
       "backend/src/subsystems/**/use-cases/**/*.ts"

     Estado verificado el 07/10/2026: no existe audit-trail.port.ts, no hay
     ni una referencia a AuditTrail en todo backend/src, y
     src/shared/infrastructure/audit/ contiene sólo un .gitkeep. O sea: todo
     lo que esta regla manda llamar todavía está sin escribir.

     Fuente del contenido: docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md,
     que es el único doc de auditoría. Había además un AUDITORY_TRAIL.md, pero
     estaba vacío y se borró el 01/11/2026.
     ===================================================================== -->

# Auditoría y trazabilidad

## Por qué existe

Tres exigencias convergen, y ninguna es negociable:

- **Ley 25.326**: el sistema almacena datos personales y sensibles de causas
  penales. Debe garantizar confidencialidad y control de acceso.
- **Secreto profesional**: la información no puede ser accesible a usuarios
  ajenos al estudio.
- **RN12 y trazabilidad histórica**: las bajas son lógicas, preservando la
  trazabilidad histórica.

Un control de acceso sin registro de qué se hizo es un control que no se puede
demostrar.

## La auditoría se invoca desde el caso de uso

Nunca desde un interceptor HTTP genérico. La razón no es estilística:

- Un interceptor registra *"llegó un PATCH a /cases/123"*. Eso es un log de
  acceso.
- El caso de uso registra *"el abogado X cambió la causa Y del estado A al
  estado B"*. Eso es auditoría.

El puerto es `src/shared/domain/audit-trail.port.ts`, con `record({ actorUserId,
action, entityType, entityId, occurredAt, metadata? })`. `actorUserId` es
`number | null`: nulo en el login fallido y en el proceso diario, como en el
modelo `AuditLog` de `schema.prisma`. El `correlationId` no lo pasa el caso de
uso: lo completa el adaptador desde el contexto de la petición
(`AUDITORIA_Y_TRAZABILIDAD.md` §3).

El `action` usa la forma `entidad.verbo-en-pasado`: `case.status-changed`,
`user.deactivated`.

## Qué se audita obligatoriamente

| Acción | Fundamento |
|---|---|
| Inicio de sesión exitoso **y fallido** | Ley 25.326 — control de acceso |
| Alta, modificación y baja de usuarios y de sus permisos | Ley 25.326 |
| Cambio de estado procesal de una causa | RN13 |
| Registro de acto interruptivo | RN8 — reinicia la prescripción |
| Registro de causa como prescripta | HU33 — consecuencia jurídica severa |
| Baja lógica de cliente, causa o abogado | RN12 |
| Acceso al detalle de una causa | Secreto profesional |

Las dos primeras filas caen de lleno en mis historias. **El login fallido se
audita igual que el exitoso**: es el caso que más se olvida y es el que la ley
pide para detectar intentos de acceso indebido.

## El metadata nunca lleva datos sensibles

El `metadata` **nunca contiene el contenido de los documentos ni datos del caso
más allá de identificadores**. La auditoría registra *que* se accedió, no *qué*
se leyó.

Nunca en el metadata: contraseñas (ni hasheadas), tokens, el cuerpo de un
documento, datos personales del cliente. Sí: identificadores, estados de origen
y destino, timestamps.

Si vas a agregar un campo al metadata y dudás, preguntame. Es más fácil agregarlo
después que sacarlo de una tabla que por diseño no se borra.

## No confundir con el historial de estados

`case_status_history` es otra cosa: es propiedad del subsistema `cases`, forma
parte del agregado `Case`, y existe por una **necesidad funcional** (HU23, la
línea de tiempo de la causa), no por un requisito legal.

La línea de tiempo se construye leyendo esa tabla, **no la de auditoría**.

<!-- TODO #5 — respondido por mmachuca. Bloque de preguntas retirado.
     Las tres decisiones de abajo son de identity (HU1, HU2, cambio de
     contraseña), o sea Sprint 1: quedaron escritas antes de que la
     auditoría saliera del alcance. Son las que valen cuando se reactive
     esta regla; no se re-discuten salvo que cambie el motivo. -->

## Auditoría en HU1, HU2 y cambio de contraseña

Decidido por mmachuca. Cada decisión lleva su motivo al lado, que es lo que
permite borrarla el día que el motivo deje de aplicar.

En HU1 (login), cuando el login falla, se audita con `actorUserId` nulo y el `metadata` contiene el `username` que intentó iniciar sesión. Esto permite rastrear intentos de acceso sin comprometer la identidad del usuario.

<!-- Nota mía, 08/10/2026: esto no choca con la regla del metadata de más
     arriba. El username que se intentó no es dato personal del cliente, y
     sin él el registro del login fallido no sirve para lo que la Ley 25.326
     lo pide (detectar intentos de acceso indebido): "alguien falló" sin
     decir contra qué cuenta no es información. -->


El logout (HU2) **no se audita** ya que no aporta información relevante para la auditoría de seguridad ni para el cumplimiento de la Ley 25.326. La acción de cerrar sesión no implica un cambio de estado crítico ni acceso a datos sensibles.

En el cambio de contraseña, se audita con `actorUserId` del usuario que realiza el cambio y el `metadata` indica que la contraseña fue cambiada, sin incluir la nueva contraseña ni datos sensibles. Esto asegura que se registre la acción sin comprometer la seguridad del usuario.


