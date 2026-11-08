# Plan de tests — D-110 (operación de la causa) y D-111 (cliente fijo)

Contrato: `API_CONTRACT_V5.md` §4 "Operación de la causa" (`:8132`); `DECISIONES.md` D-110, D-111.
Orden de chequeos: 400 de forma (pipe, incluye `clientId`) → 404 → 403 → 422 → 400 de contenido.

## Respuestas textuales

| Endpoint | Status | code | message |
| --- | --- | --- | --- |
| `PATCH /cases/{id}` | 403 | `FORBIDDEN` | Solo el abogado responsable de la causa puede modificarla. |
| `DELETE /cases/{id}` | 403 | `FORBIDDEN` | Solo el abogado responsable de la causa puede darla de baja. |
| `POST /cases/{id}/folder` | 403 | `FORBIDDEN` | Solo el abogado responsable de la causa puede operar su carpeta. |
| `POST /cases/{id}/prescription` (LAWYER ajeno) | 403 | `FORBIDDEN` | Solo el abogado responsable de la causa puede marcarla como prescripta. |
| `POST /cases/{id}/prescription` (SECRETARY sola) | 403 | `FORBIDDEN` | Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación. |
| `PATCH` con `clientId` | 400 | `VALIDATION_ERROR` | details `{ clientId: "El cliente de una causa no se puede modificar." }` |

## Unitarios (dominio) — `case.entity.spec.ts`

| Caso | Test |
| --- | --- |
| `assertCanBeOperatedBy`: responsable | pasa |
| otro abogado | `NotResponsibleLawyerError` con el mensaje dado |
| ADMINISTRATOR sin ficha | pasa |
| SECRETARY | pasa |
| LAWYER + SECRETARY no responsable | pasa |
| LAWYER sin ficha | `NotResponsibleLawyerError` |
| `assertCanDeclarePrescriptionBy`: ADMINISTRATOR | pasa |
| LAWYER responsable | pasa |
| LAWYER ajeno | `NotResponsibleLawyerError` (mensaje de prescripción) |
| LAWYER ajeno + ADMINISTRATOR | pasa |
| SECRETARY sola | `CannotDeclarePrescriptionError` |

`prescription-declaration.vo.spec.ts`: se retiran los tests de `assertCanBeDeclaredBy` (la regla pasa a la entidad).

## Unitarios (casos de uso)

- `update-case`, `deactivate-case`, `request-case-folder`, `declare-prescription`: causa inexistente / dada de baja → 404 aunque el actor no pueda operar; abogado ajeno → 403 y **no escribe** (ni guarda, ni audita, ni publica evento, ni `startCreating`).
- `request-case-folder` sin `actor` (lo llama `RegisterCase`): no evalúa permiso.
- `update-case`: `clientId` ya no se busca ni se aplica.

## Integración (una suite por recurso)

- `update-case.int.spec.ts`: 403 exacto de LAWYER ajeno y base sin cambios; SECRETARY y ADMINISTRATOR ajenos modifican; `clientId` → 400 exacto con la base sin cambios.
- `deactivate-case.int.spec.ts`: 403 exacto y causa sigue activa; ADMINISTRATOR/SECRETARY ajenos dan de baja.
- `case-folder.int.spec.ts`: 403 exacto, carpeta no pasa a `CREATING`; SECRETARY ajena opera.
- `declare-prescription.int.spec.ts`: LAWYER ajeno → 403 de abogado responsable; SECRETARY → 403 de rol; ADMINISTRATOR ajeno marca; 404 antes que 403 (SECRETARY sola, causa inexistente → 404).

El 401 sin token ya lo cubre `test/smoke/app.int.spec.ts`.

## Revisión manual / no cubierto

Comportamiento real contra Drive; coherencia con el frontend (mocks).
