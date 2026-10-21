# Backend VZ Causas — instrucciones de trabajo

<!-- =====================================================================
     Archivo privado de mmachuca. Vive en .claude/, que está ignorado por
     git (.gitignore:39), así que nada de acá llega a tus compañeros.

     Presupuesto: menos de 200 líneas. Si crece, mové lo específico a
     .claude/rules/ con un `paths:` en el frontmatter.

     Los comentarios HTML de bloque como este se eliminan antes de entrar
     al contexto del modelo: son gratis. Usalos para notas tuyas y para
     los TODO sin gastar tokens.

     Nacido: 06/10/2026. Revisar al cierre de cada sprint.
     ===================================================================== -->

## Cómo trabajamos

Trabajás con **mmachuca**, backend junior.

Escribís código de implementación de funcionalidades, respetando todas las
especificaciones de los archivos de `.claude/` y de los documentos listados
abajo. Pero tu trabajo es sobre todo explicar, especificar, revisar y verificar.

**Toda implementación lleva planificación previa y revisión posterior. No se
aceptan cambios sin planificación.** Si te pido algo y no hay un plan acordado,
proponé el plan primero y esperá mi respuesta antes de escribir código.

## Fuentes de verdad, en orden de precedencia

<!-- Actualizado 18/10/2026: entramos a Sprint 3. V4 existe y es autocontenida
     (D-46), mismo criterio que V3 respecto de V2. V3 queda como registro del
     Sprint 2: no se vuelve a tocar ni se usa como referencia para HU30/HU32. -->

1. **`docs/Api-Contract/API_CONTRACT_V4.md`** — manda sobre todo lo demás. Es la
   superficie compartida con el frontend; cambiarla cuesta una migración de los
   dos lados. `API_CONTRACT_V3.md` es el registro del Sprint 2 y
   `API_CONTRACT_V2.md` el del Sprint 1: ninguno de los dos es referencia
   vigente.
2. **`docs/TRADUCCION_DOMINIO.md`** — glosario de cumplimiento obligatorio.
   Todo identificador que refiera a un concepto del dominio usa su forma.
3. **`docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md`** — el mapa de capas.
   Para Sprint 3 suma `ADR-003_GOOGLE_DRIVE.md` y `ADR-004_EMAIL_GMAIL_API.md`,
   que son decisiones arquitectónicas puntuales, no una revisión del mapa.
4. **`docs/Backend-Architecture/EJEMPLO_CASO_DE_USO.md`** — el molde de un caso
   de uso. Si vas a escribir uno, leelo antes.
5. **`docs/Backend-Architecture/PENDIENTE_DEFINICION.md`** — lo que todavía no
   está decidido. Si tu tarea depende de algo de esta lista, **frená y preguntá**.
6. **`docs/support/cambios-bdd-sprint3.md`** — propuesta de esquema para Sprint 3.
   Todavía no está aplicada a `schema.prisma` ni tiene migración. Es de donde
   sale `sent_notifications` para HU30/HU32.
7. **`docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md`** — plan de
   implementación, decisiones y estado de avance de HU30/HU32. Antes de tocar
   `subsystems/deadlines`, leer esto primero.

Si dos documentos se contradicen, decímelo en vez de elegir uno.

## Mi alcance de trabajo

<!-- Actualizado 20/10/2026: se agrega HU42 al alcance de Sprint 3, que
     seguía sin mencionarla. Mismo fallo que ya quedó registrado en
     HARNESS-LOG.md 2026-10-18 ("el harness no siguió al sprint"): el alcance
     no se actualiza solo entre tareas. -->

Por cada sprint tengo asociadas tareas en Jira. Terminé Sprint 2 (Consultar
Causas, Consultar detalle de causa). Estoy en **Sprint 3**:

- HU30 (Notificar fin de plazo de presentación) y HU32 (Notificar prescripción
  de causa). Las dos son Épica EP-06 y comparten el mismo proceso diario
  (D-72): HU51/HU52 detectan, HU30/HU32 avisan por correo. No tienen pantalla
  ni endpoints propios.
- HU42 (Crear tablero de administrador), Épica EP-08. Endpoint
  `GET /dashboards/administrator` (contrato V4 §3.11). Espeja HU41 (tablero
  del abogado, `GET /dashboards/lawyer`), ya implementada en
  `backend/src/subsystems/reporting/`: mismo módulo, mismo ADR-002
  (`ARQUITECTURA_BACKEND_V1.md` §6.5) — lectura directa de la base, sin
  puertos hacia otros subsistemas.

## Reglas que no se negocian

- **No inventes endpoints.** Si la tarea necesita uno que no está en V3, frená y
  preguntá. No lo "dejes preparado".
- **No corrijas las inconsistencias conocidas por tu cuenta.** El glosario tiene
  una sección "Inconsistencias conocidas" (`ADMINISTATOR`, `SECRETARIAT`,
  `abogadoId` en el frontend). Están ahí a propósito: cambiarlas de un lado sin
  el otro empeora el problema. Si las ves, nombralas, no las arregles.
- **Nunca `delete`, siempre `deactivate`** (RN12). Un `DELETE` de la API pone
  `active: false`; el registro se conserva para no romper las referencias de las
  causas.
- **Nunca `prisma migrate reset`.** Borra mi base de desarrollo y no se recupera.
  Si hace falta, pedímelo.
- **No commitees ni hagas push** salvo que te lo pida.

## Comandos

| Qué                                             | Comando                             | Dónde      |
| ----------------------------------------------- | ----------------------------------- | ---------- |
| Compilar / chequear tipos                       | `npx tsc --noEmit -p tsconfig.json` | `backend/` |
| Tests unitarios                                 | `npm test`                          | `backend/` |
| Tests de integración (PostgreSQL en contenedor) | `npm run test:int`                  | `backend/` |
| Levantar en dev                                 | `npm run start:dev`                 | `backend/` |
| Migración                                       | `npx prisma migrate dev`            | `backend/` |

Los tests de integración levantan la app NestJS completa contra un PostgreSQL
real en contenedor, y verifican comportamiento **y** forma de la respuesta.
Nunca tocan mi base de desarrollo. Ver `backend/test/README.md`.

## Cómo cerrás un turno

Antes de decirme que algo está listo:

1. Chequeá que compila.
2. Corré los tests que correspondan al código que tocaste.
3. Decime **qué verificaste y qué no**. Si una regla de negocio no quedó cubierta
   por un test, nombrala como pendiente de revisión manual. No la des por buena.

Preferí decirme "esto no lo verifiqué" antes que dar por cerrado algo sin probar.

<!-- =====================================================================
     TODO mmachuca #1 — EL DOMINIO EN TUS PALABRAS
     ---------------------------------------------------------------------
     Debajo de este comentario, escribí de 10 a 15 líneas con lo que vos
     sabés del negocio y que NO se puede deducir leyendo el código.

     Pregunta concreta a responder:
       "Si mañana entra un backend nuevo al equipo, ¿qué cuatro o cinco
        cosas del negocio jurídico le tengo que explicar antes de que
        toque algo, para que no escriba una barbaridad?"

     Qué hace BUENA a una respuesta:
       - Es una regla o una distinción, no una definición de diccionario.
       - Tiene una consecuencia: "X es distinto de Y, y si los confundís
         pasa Z".
       - Es algo que ya tuviste que explicar, o corregir, al menos una vez.

     Qué hace MALA a una respuesta:
       - Copiar la tabla del glosario. El glosario ya está apuntado arriba;
         duplicarlo crea dos fuentes de verdad que se van a desincronizar.
       - "El sistema gestiona causas judiciales." Eso no cambia ninguna
         decisión de código.

     Dos ejemplos del formato, sacados del glosario, para que veas el tono.
     Si te sirven, dejalos; si no, borralos y poné los tuyos:

       - Usuario y Abogado son entidades distintas. El usuario es la cuenta
         que inicia sesión; el abogado es la persona matriculada. Se vinculan
         pero no son lo mismo: una secretaría tiene usuario y no tiene ficha
         de abogado. Nunca asumas que un User tiene Lawyer.
       - `Role` (identity, seguridad) no es `ProceduralRole` (el rol de una
         persona dentro de una causa). Son dos conceptos sin relación que
         en castellano se dicen igual.

     Lo tuyo va acá abajo, bajo el encabezado. Después lo reviso.
     ===================================================================== -->
<!-- Tu primer borrador, 07/10/2026. Lo guardo acá adentro en vez de
     borrarlo: dentro de un comentario no gasta contexto, y es tuyo.

       "VZ Causas es un sistema de gestion de causas judiciales y
        administrativas. Una causa es un proceso, litigio o juicio que se
        tramita ante un tribunal. Es un motivo, razón o fundamento
        justificado por la ley para realizar un acto, tomar una decisión
        judicial o exigir un derecho.

        El sistema busca centralizar la información de las causas, manejar
        los plazos procesales, tener un seguimiento y trazabilidad de los
        estados de una causa y realizar informacion estadistica sobre
        cantidad de causas por abogado, evaluar carga de trabajo. Ademas
        controlar fechas de prescripción, vencimiento de plazos y
        notificaciones.

        Un usuario con rol abogado esta obligat"

     Por qué lo saqué de la parte visible: estaba ARRIBA del encabezado, o
     sea que entraba entero en mi contexto —incluida la última frase
     cortada— y es lo que el propio TODO define como mala respuesta: una
     definición de diccionario. "El sistema gestiona causas judiciales" no
     cambia ninguna decisión de código.

     La frase cortada sí me interesa, y no la puedo completar yo. Quedó
     abajo como pregunta.
     ===================================================================== -->

<!-- BORRADOR MÍO, 08/10/2026. Corregí, tachá, reescribí.
     Salió de cruzar las reglas de .claude/rules/ con el contrato V3, no
     de tu cabeza. O sea: es lo que ya está escrito, ordenado como reglas
     con consecuencia. Lo que el TODO pedía de verdad —lo que sabés vos y
     no está en ningún doc— sigue faltando, y lo marqué al final.
     No repito las distinciones Role/ProceduralRole ni User/Lawyer: ya
     están en rules/dominio.md y duplicarlas crea dos fuentes de verdad. -->

## El dominio, en mis palabras

- **Todo el estudio ve todas las causas** (RN11). La diferencia entre
  perfiles está en lo que pueden _operar_, no en lo que pueden _ver_.
  Filtrar un listado por el `lawyerId` del usuario autenticado es un bug,
  no una medida de seguridad.
- **La baja es lógica y asimétrica.** Para el cliente, un registro dado de
  baja no existe: no aparece en listados y el `GET` por id responde 404.
  Pero una causa **sigue mostrando** las entidades dadas de baja que forman
  parte de su historia. Al armar la respuesta de una causa, no filtres por
  `active` las entidades referenciadas. Es el error más fácil de cometer.
- **El estado de una causa lo mueve el acto procesal**, no un `UPDATE` al
  estado. Vive denormalizado en `cases` y lo actualiza la misma transacción
  que registra el acto. Consecuencia: un plazo vencido **sigue abierto**
  hasta que un acto posterior lleve la causa a otro estado. No lo cierres
  ni lo ocultes.
- **Hay cosas que el backend sólo provee y el cliente calcula**: la
  distinción visual entre "vencida", "vence hoy" y "próximos días" (sale de
  `businessDaysRemaining`). Agregar un campo con esa categoría no es una
  mejora: es romper el contrato.
- **La prescripción, en cambio, desde V4 la resuelve el backend.** El recurso
  causa trae `prescription`: la calificación que prescribe primero, el
  porcentaje transcurrido, la alerta del 70 % y si el plazo se cumplió
  (`API_CONTRACT_V4.md:3232-3254`, y `:3338-3340`: "el cliente ya no tiene que
  calcularlos"). Se calcula en cada lectura con `summarizePrescription`
  (`cases/core/domain/prescription.ts:85`), la misma función de los tableros.
  En V3 era al revés; si un documento dice que el cliente la calcula, es de V3.
- **La prescripción sólo se computa en el fuero `CRIMINAL`.** En los demás
  el prototipo informa "No aplica al fuero".
- **El cómputo de días hábiles está incompleto a propósito**: no excluye
  feriados ni feria judicial (P-02). No lo "arregles". Un cómputo que
  parece correcto y no lo es es peor que uno declaradamente incompleto, y
  los tests dan verde igual, lo que esconde el defecto.

<!-- LO QUE FALTA Y SÓLO SABÉS VOS — dos preguntas concretas:

     1. Terminá la frase que dejaste cortada: "Un usuario con rol abogado
        está obligado a ___". Obligado a qué, y qué pasa si no lo hace?
        Eso es exactamente el tipo de regla que el TODO pedía y que no
        está en ningún documento que yo haya leído.

     2. De las seis reglas de arriba, ¿cuál tuviste que explicarle a
        alguien —humano o IA— al menos una vez? Marcala. Las que nadie
        confundió nunca son candidatas a borrar: ocupan contexto sin
        evitar ningún error. -->

<!-- =====================================================================
     TODO mmachuca #2 — TUS CUATRO CORRECCIONES
     ---------------------------------------------------------------------
     Pregunta concreta:
       "¿Cuáles son las últimas 3 o 4 veces que tuve que corregir a la IA
        en el backend?"

     Escribilas abajo como reglas imperativas, una línea cada una.
     Si no te acordás de ninguna, DEJÁ LA SECCIÓN VACÍA y borrala en una
     semana si sigue vacía. Una regla inventada para un problema que nunca
     tuviste es peso muerto: baja la adherencia a las reglas que sí importan.

     Formato: "No hagas X, hacé Y" o "Antes de X, siempre Y".
     ===================================================================== -->

## Correcciones recurrentes

<!-- escribí acá, o dejá vacío -->

- **Nunca se trabaja sobre develop: siempre se hace un branch nuevo.**
  Para una HU o un conjunto de ellas por ejemplo un ABM, o para un fix de bug. Nunca
  se hace un commit directo a develop. La idea es trabajar en una rama que sea de
  formato "feat/suppliers" o "fix/causes" y luego hacer un merge a develop luego de
  hacer que todos los test unitarios y de integración pasen correctamente. Esto es
  para evitar que se rompa el código en develop y que todos los demás compañeros
  puedan seguir trabajando sin problemas.

- **Cuando nombres algo del repo, citá ruta y línea en la misma oración.**
  `stub-data.ts:11`, no "el stub de clientes". El motivo: si me lo das en prosa,
  la única forma que tengo de entenderlo es gastarte un turno preguntándote; con
  la referencia voy, lo leo y sigo. Vale para archivos, clases, tipos, puertos,
  adaptadores y tests, y también para reglas de negocio, criterios y pendientes
  (RN3, CA-20.2, P-02): nombrá el código, no lo describas. Si no tenés la línea,
  buscala antes de escribir la oración — la ruta sola ya sirve, una descripción
  en prosa no. Si lo leo y no lo entiendo, te pregunto: la primera lectura la
  quiero hacer yo.

- **Las migraciones las corro yo, no vos.** Si un cambio necesita tocar
    `prisma/schema.prisma`, preparás el schema y el SQL y me pasás el comando;
    el `prisma migrate dev` lo tiro yo. El motivo está en `USO_PRISMA.md:19`
    y `:22`: `migrate dev` es interactivo y, si detecta un desvío en el
    esquema, **ofrece resetear la base**. Esa confirmación la tengo que ver
    yo. El paso a paso está en `USO_PRISMA.md` §3 y los comandos en §5; si el
    cambio necesita SQL a mano —como un `ALTER TYPE ... RENAME VALUE`— va con
    `--create-only` (§5, línea 115) y después lo edito. Las migraciones por
    tema de seguridad y cambios se realizan en develop. Pero es el unico caso
    por ahora.

- **Antes de proponerme una migración, chequeá que haga falta.** Una
  consulta no lleva migración, por compleja que sea: el SQL crudo de un
  `$queryRaw` vive en el código TypeScript y corre en cada request.
  Migración es sólo cambiar la **estructura**: tablas, columnas, enums.
  Si me propones una migración para algo que se resuelve leyendo, frená.
