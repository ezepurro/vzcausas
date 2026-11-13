# Audit backend: baseline de tests (13/11/2026)

Rama `develop`. Todo de solo lectura: no se modificó código.

## Resultado del baseline

| Chequeo | Dónde corrió | Resultado |
|---|---|---|
| Unitarios (`npm test`) | host | OK: 151 suites, 1653 tests |
| `tsc --noEmit` | host | Falla, **falso positivo** (ver "Nota sobre el entorno") |
| `tsc --noEmit` | contenedor `causas-backend` | OK, limpio |
| Integración, corrida 1 | contenedor `causas-backend` | **27 tests fallan en 3 de 27 suites** (454 pasan), 532 s. Solo se conserva el final del log: se sabe que `register-case` es una de las 3, no cuáles son las otras 2 |
| Integración, corrida 2 | contenedor `causas-backend` | **97 tests fallan en 7 de 27 suites** (384 pasan), 578 s. Log completo. `register-case` **pasó** esta vez |

Dos corridas del mismo código dan conjuntos de suites rojas distintos: el resultado
depende del orden en que Jest las ejecuta (intermitente).

## Nota sobre el entorno

Los comandos de Prisma corren dentro del contenedor del backend (`Makefile:162-167`),
así que el cliente generado vive en el `node_modules` del contenedor y no en el del
host. Correr `tsc` en el host da errores de tipos de Prisma (`prescriptionDeclaredOn`,
`prescriptionResolution`, etc. en `case-prisma.mapper.ts`, `prisma-case.repository.ts`)
que no dicen nada del código: el schema los define (`schema.prisma:524-525`) y en el
contenedor compila limpio. **El baseline de tipos y de integración se corre en el
contenedor.**

La integración no toca la base de dev: `test/shared/harness/global-setup.ts:107` pisa
siempre `DATABASE_URL` con la de un PostgreSQL efímero de Testcontainers (verificado
leyendo el código, no en runtime).

## Problema 1: `register-case.int.spec.ts` falla por FK con `audit_log`

**Síntoma**

```
register-case.int.spec.ts:70  await prisma.user.deleteMany();
Foreign key constraint violated on the constraint: `audit_log_actor_user_id_fkey`
```

**Causa (verificada leyendo el código)**

- `audit_log.actor_user_id` referencia a `users` con `onDelete: Restrict`
  (`backend/prisma/schema.prisma:938`).
- El `beforeEach` de `backend/test/subsystems/cases/register-case.int.spec.ts:55-73`
  borra ofensas, causas, actos, usuarios, abogados y clientes, pero **no limpia
  `audit_log`**. El archivo no menciona `audit_log` en ningún lado.
- **Corrección:** una versión anterior de este documento decía que `update-case`,
  `deactivate-case` y otras dejaban filas de auditoría. Es falso: `update-case`,
  `deactivate-case` y `update-procedural-act` hacen `purgeAuditLog()` en su `afterAll`
  (`update-case.int.spec.ts:53-54`). Quien las deja es `clients.int.spec.ts`: su
  `afterAll` solo hace `stopTestApp()` (`:51-53`) y el único purge está en el
  `beforeEach` (`:62`), así que tras su último test quedan filas.
- Como `beforeEach` falla, falla cada `it` de la suite, lo que explica buena parte de
  los 27 tests rojos.

Es un problema de aislamiento de los tests, no un bug del backend. Es el mismo patrón
que el comentario de `register-case.int.spec.ts:58-63` ya describe para
`cases_current_procedural_act_id_fkey`: el resultado depende del orden en que Jest
corre las suites.

**Confirmado por la corrida 2:** es intermitente, y no es solo de `register-case`.
Todos los errores de FK del log son la misma constraint, `audit_log_actor_user_id_fkey`,
y salen del setup de otras seis suites (línea del `deleteMany` de usuarios según el
stack, sin releer cada spec):

| Suite | Línea del stack |
|---|---|
| `legal-parameters/procedural-states.int.spec.ts` | `:84` |
| `legal-parameters/legal-qualifications.int.spec.ts` | `:78` |
| `people/lawyers.int.spec.ts` | `:60` |
| `cases/case-cover.int.spec.ts` | `:54` |
| `deadlines/daily-run.int.spec.ts` | `:80` |
| `deadlines/detect-upcoming-prescriptions.int.spec.ts` | `:129` y `:136` |

Nota: el log imprime cada error dos veces (194 apariciones para 97 tests), así que las
apariciones por suite no son cantidad de tests.

**Inferido, no leído:** que cada una de esas suites borre usuarios sin limpiar
`audit_log`. Lo deduzco del error, no abrí cada spec.

## Problema 2: `interruptive-acts.int.spec.ts` agota el timeout (causa distinta)

En la corrida 2, un solo test de esa suite falla, con otra causa: no es FK sino
`Exceeded timeout of 30000 ms for a test` en
`test/subsystems/cases/interruptive-acts.int.spec.ts:133`, el test "reinicia la
prescripción desde la fecha del acto, en el detalle y en el listado" (30481 ms; los
demás tests de la suite tardan menos de 1,2 s). **Causa desconocida.** No se investigó.
Hay que reproducirlo solo y mirar si cuelga siempre o solo bajo carga.

## Cómo arreglarlo (propuesta, sin aplicar ni verificar)

**Corrección (esta propuesta se reescribió):** una versión anterior de este documento
sugería `prisma.auditLog.deleteMany()`. Eso falla: `audit_log` es de solo alta y un
trigger rechaza `DELETE` y `TRUNCATE` (`backend/test/shared/harness/audit-log.ts:4-8`).
El helper correcto ya existe: `purgeAuditLog()` (`audit-log.ts:13`), que activa
`vzcausas.audit_purge` dentro de una transacción.

El arreglo es llamar a `purgeAuditLog()` antes de cada `user.deleteMany()` que hoy no
lo hace. Las suites que ya lo hacen (`update-lawyer`, `clients`, `deactivate-case`,
`update-case`, `update-procedural-act` y `resetDatabaseForCaseFolders` en
`case-folder-scenario.ts:39`) no fallan por esto.

## Resultado del arreglo (rama `fix/test-aislamiento-audit-log`, sin commitear)

Cambio: `await purgeAuditLog()` antes de cada `user.deleteMany()` que no lo tenía (10
sitios, uno es el helper compartido `procedural-act-scenario.ts:39`) y en el `afterAll`
de `clients.int.spec.ts`, que era quien dejaba las filas. 21 líneas en 11 archivos de
test, nada en `src/`.

- RED: con `clients` forzado a correr primero, `case-cover` y `register-case` fallaban
  (21 tests, `audit_log_actor_user_id_fkey`).
- GREEN con el mismo orden: 3 suites, 48 tests en verde.
- Corrida completa 1 tras el arreglo: **27 de 27 suites, 481 de 481 tests, exit 0**.
- Corrida completa 2: interrumpida a medias (ver abajo), con un rojo de otra causa.
- Corrida completa 3: no se hizo.

**Hallazgo nuevo, otra causa:** en la corrida 2 falló
`cases/case-folder.int.spec.ts:170`, "sin la estructura del estudio configurada, la arma
y la carpeta de la causa queda CREATED": recibió `status: "CREATING"` y `path: null`
en vez de `CREATED` con ruta. No es la FK. Pasó en la corrida 1. Hipótesis, sin
verificar: la carpeta se termina de crear en segundo plano y el test lee antes (carrera
de tiempo), agravado porque la máquina estaba con poca memoria. Hay que reproducirlo solo
varias veces.

## Pendiente

- Las otras 2 suites rojas de la corrida 1 no se identificaron (log perdido salvo el final).
- Abrir cada suite roja y confirmar la causa del FK (hoy es inferida).
- Investigar el timeout de `interruptive-acts.int.spec.ts:133`.
- Con el arreglo aplicado, correr la integración completa más de una vez: un verde
  único no prueba nada si el síntoma depende del orden.
- Repetir los unitarios dentro del contenedor (`make test-unit`) para consistencia.

Hasta que esto esté arreglado, **el verde de la integración no es una señal confiable**
para el audit: puede haber reglas de negocio sin cubrir por una suite que falla antes de
probarlas.
