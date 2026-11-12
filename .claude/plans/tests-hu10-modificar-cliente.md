# Plan de tests — HU10 Modificar cliente

`PATCH /api/v1/clients/{clientId}` · contrato `docs/Api-Contract/API_CONTRACT_V6.md:3301` (§3.6)
· D-108, D-109, D-121, D-130 (`docs/Api-Contract/DECISIONES.md`) · auditoría
`AUDITORIA_Y_TRAZABILIDAD.md` §3 y §4.

**Escrito antes del código.** Los tests de integración se escriben leyendo este
documento, no la implementación.

## Datos fijos

- Reloj fijo: ahora es **06/10/2026 12:30 en Córdoba** (`2026-10-06T15:30:00Z`).
- Cliente de referencia: **GÓMEZ, Ariel Fernando**, DNI `34812905`, dirección y teléfono cargados.
- Modifica una **secretaria**: cualquier perfil puede (CA-10.6).
- Sus causas, para CA-10.9:
  1. vigente, "GÓMEZ, Ariel Fernando p.s.a. Robo calificado" → **GÓMEZ PAZ, Ariel Fernando p.s.a. Robo calificado**;
  2. vigente en "Archivada", "Gómez, Ariel Fernando c/ APROSS s/ amparo" → **GÓMEZ PAZ, Ariel Fernando c/ APROSS s/ amparo** (sin distinguir mayúsculas, estado terminal incluido);
  3. dada de baja, "GÓMEZ, Ariel Fernando p.s.a. Hurto" → **sin cambios**;
  4. vigente, "Ariel GÓMEZ c/ PÉREZ" → **sin cambios** (escrita de otra forma);
  5. vigente, "GÓMEZ, Ariel Fernando " + relleno hasta 254 caracteres → **sin cambios** (con el nombre nuevo pasaría de 255).

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 200 | — | — | `{ data: <cliente> }`, igual que `GET /clients/{clientId}` |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` (smoke) |
| `clientId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del cliente no es válido." | `{ clientId: "Debe ser un número entero válido." }` |
| Inexistente o dado de baja | 404 | `CLIENT_NOT_FOUND` | "No se encontró el cliente solicitado." | `null` |
| Documento de otro cliente vigente | 409 | `CLIENT_DNI_ALREADY_EXISTS` | "Ya existe un cliente registrado con ese DNI." | (el del alta) |
| Datos inválidos | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | por campo |

`details` de `VALIDATION_ERROR` (los textos del alta):

| Campo | Falla | Texto |
|---|---|---|
| `body` | ningún campo | "Debe enviarse al menos un campo para modificar." |
| `lastName` / `firstName` | vacío o `null` | "El apellido es obligatorio." / "Los nombres son obligatorios." |
| `address` | vacía o `null` | "La dirección es obligatoria." |
| `phone` | vacío o `null` | "El teléfono es obligatorio." |
| `documentNumber` | no respeta el tipo resultante (DNI) | "Debe contener 7 u 8 dígitos, sin puntos." |
| `documentNumber` | no respeta el tipo resultante (PASSPORT) | "Debe contener de 6 a 20 letras mayúsculas y dígitos, sin espacios." |
| `clientSince` | enviado | "No es un campo admitido." (pipe global) |

## Tabla CA → test

| CA | Test | Tipo |
|---|---|---|
| 10.1 | omitido no cambia; `email: null` lo borra; cuerpo vacío 400 | unitario (`Client.update`) + INT |
| 10.1 | 200 con la forma de `GET /clients/{id}` | INT |
| 10.2 | dato guardado una vez: `GET /cases/{id}` muestra el cliente nuevo | INT (con 10.9) |
| 10.3 | solo `documentType: DNI` sobre un pasaporte con letras (`AB123456`) → 400 sobre `documentNumber`; tipo y número juntos → 200. (Un DNI siempre es un pasaporte válido: el caso inverso no falla.) | unitario + INT |
| 10.4 | cada obligatorio vacío o `null` → 400; todos los errores juntos | unitario + INT |
| 10.5 | `client.updated` con `changedFields`, usuario y fecha; `case.updated` `['caption']` por cada carátula que cambió | unitario (caso de uso) + INT |
| 10.6 | una secretaria modifica | INT |
| 10.7 | documento de otro vigente → 409 sin cambios; el propio → 200; el de uno dado de baja → 200 | INT |
| 10.8 | `clientSince` → 400 | INT |
| 10.9 | las cinco causas de arriba; cambiar solo el teléfono no toca carátulas | unitario (`ClientCaptionName`, `Case.followClientRename`) + INT |
| 10.10 | carpeta renombrada en Drive; si Drive falla, el `PATCH` 200 igual | unitario (anuncio) + INT (`google-stack`) |
| 10.10 | "el proceso diario renombra después" | **no cubierto**: no existe la revisión diaria de carpetas |
| 10.11 | inexistente o dado de baja → 404; `abc` → 400 | INT |
