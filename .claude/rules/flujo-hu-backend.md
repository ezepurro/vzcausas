---
paths:
  - "backend/src/subsystems/**/*.ts"
  - "backend/test/**/*.ts"
---

<!-- Escrito el 21/10/2026, al implementar HU33 (Registrar prescripción) con mmachuca.
     Recoge el flujo que se usó ahí y las dos lecciones de la auditoría de la rama
     fix/cases-contract-v4 (.claude/audit/rama-fix-cases-contract-v4.md): tests que
     daban verde porque fijaban el incumplimiento, y lógica de dominio en funciones
     sueltas (`withDeadlines`). -->

# Cómo se implementa una HU de backend

## El flujo, en este orden

1. **Criterios de aceptación y contrato.** Cada CA se cruza con su endpoint en
   `docs/Api-Contract/API_CONTRACT_V5.md`: código HTTP, `code`, `message` y
   `details` textuales. Si el contrato y la HU no coinciden, se frena y se pregunta.
2. **Documento del plan de tests**, en `.claude/plans/tests-<hu>-<nombre>.md`, **antes de
   escribir código**. Una tabla CA → test (unitario o integración, o por qué no lleva
   test) y la lista de respuestas textuales del contrato. Molde:
   `.claude/plans/tests-hu33-registrar-prescripcion.md`.
3. **Dominio**: entidades y value objects, con sus specs.
4. **Caso de uso**, que coordina y no decide (`EJEMPLO_CASO_DE_USO.md`).
5. **Unitarios** del caso de uso: solo lo esencial; el detalle de las reglas ya está
   en los specs del dominio.
6. **Adaptadores**: repositorio, ACL, DTO, controller, módulo.
7. **Integración, escrita desde el documento del paso 2, no desde el código.**
8. **Verificación**: `tsc`, `npm test`, la suite de integración del recurso y la
   completa si se tocó el dominio. Al cerrar, la tabla CA → test con su estado y lo
   que queda para revisión manual.

## Arquitectura y POO

- **El comportamiento va en el agregado.** Si un caso de uso tiene un `if` sobre una
  regla del negocio, esa decisión es de una entidad. El caso de uso lee las
  referencias, llama al agregado, persiste y responde.
- **Polimorfismo, no `if` sobre el fuero.** Lo que solo hace un fuero se declara en
  `Case` con el rechazo por defecto y lo sobreescribe la subclase:
  `Case.declarePrescription` lanza `PRESCRIPTION_NOT_APPLICABLE` y `CriminalCase` lo
  implementa; `Case.harmfulActDeadline` devuelve `null` y `Amparo` lo calcula.
- **Value object para un dato que se valida al crearse** y no tiene identidad ni ciclo
  de vida: `create` valida y junta todos los errores, `hydrate` reconstruye sin
  validar, getters sin setters, `equals`. Molde:
  `cases/core/domain/value-objects/prescription/prescription-declaration.vo.ts`. Entidad solo si
  tiene identidad propia y cambia en el tiempo.
- **Ninguna función suelta nueva** que decida reglas o arme respuestas pieza por pieza.
  `withDeadlines` (`list-cases.use-case.ts`) y las funciones de `prescription.ts` son
  **deuda nombrada, no un modelo a copiar**. Si una respuesta ya la arma otro caso de
  uso, se reutiliza (`DeclarePrescription` devuelve lo que da `GetCase`).
- **Quién puede hacer algo** también es regla de dominio. Si no depende del recurso, se
  chequea antes de leerlo (403 antes que 404).
- **Orden de los chequeos**: 401 → 400 de forma (pipe) → 403 → 404 → 422 → 400 de
  contenido. El negocio antes que los datos, como HU31 y HU33. **Un pedido rechazado
  no escribe nada.**
- **Escritura en un paso**: si dos pedidos simultáneos pueden ganar los dos, el
  repositorio escribe con un `WHERE` condicional y devuelve si escribió
  (`saveDeclaredPrescription`).

## Nombres de archivo

Los archivos siguen `ARQUITECTURA_BACKEND_V1.md:386-396`: `.vo.ts`, `.entity.ts`,
`<verbo>-<sustantivo>.use-case.ts`, `<caso-de-uso>.request.dto.ts`. En `cases` los
archivos que no la seguían (`cases.ts`, `harmful-act.ts`, `case-prisma.repository.ts`)
se renombraron en el refactor de estructura (`docs/support/refactor-estructura-backend.md`,
fases B y C, 28/10/2026). La regla del 21/10/2026 sigue valiendo para el resto: un
renombre no se mezcla con una HU, va en un refactor aparte.

## Tests contra los criterios y el contrato, no contra el código

Un test que se escribe mirando la implementación confirma lo que el código hace, no lo
que el contrato promete, y da verde aunque el endpoint esté mal. Esa fue la causa de
los falsos positivos de `list-cases.int.spec.ts` y `register-case.int.spec.ts`.

Lista contra falsos positivos:

- **Forma exacta del recurso**: `Object.keys(data).sort()` contra la lista del
  contrato, o `toEqual` completo. `toMatchObject` solo para mirar un campo puntual
  después de haber fijado la forma en otro test.
- **`code` y `message` textuales del contrato** en cada error. `expectError` solo mira
  el código y que el `message` sea un texto.
- **`details` exacto** (`toEqual`), no solo que el campo exista.
- **La base sin cambios después de un error**: leer el estado antes y comparar después.
- **Nunca un "falta a propósito"** ni un test que fije un desvío del contrato como
  esperado. Si el código no cumple, el test falla y se arregla el código, o se nombra
  el desvío y se deja el test sin fijarlo.
- **Cada `it` cita su CA** en un comentario o en el título.
- **Reloj fijo** (`withFixedClock`) cuando el resultado depende de hoy, con los valores
  exactos calculados en el documento.

## Límites

- Integración: **hasta 5 `describe` de hasta 3 `it`** por HU. Es flexible si hace
  falta, sin pasarse: la suite completa ya tarda. Usar `it.each` para variantes del
  mismo caso.
- Proporción orientativa: **~70 % unitarios, ~30 % integración**.
- Un CA que ya cubre otro spec no se duplica: se cita en la tabla del documento.
