# Plan de tests — HU11 Registrar baja de cliente

`DELETE /api/v1/clients/{clientId}` · contrato `docs/Api-Contract/API_CONTRACT_V6.md` §3.6
· D-122, D-134 · columnas de la baja: migración `20261113211309_setup_for_sprint5` y
`ck_clients_deactivation_coherent` (`20261113211334_sprint5_manual_constraints`).

**Escrito antes del código.** Sin parte de Drive: no existe carpeta de cliente.

## Respuestas que el contrato fija (textuales)

| Situación | HTTP | `code` | `message` | `details` |
|---|---|---|---|---|
| Éxito | 204 | — | — | sin cuerpo |
| Sin token | 401 | `UNAUTHENTICATED` | "La autenticación es requerida." | `null` (smoke) |
| `clientId` no entero | 400 | `INVALID_PATH_PARAMETER` | "El identificador del cliente no es válido." | `{ clientId: "Debe ser un número entero válido." }` |
| Motivo de más de 500 | 400 | `VALIDATION_ERROR` | "Los datos enviados no son válidos." | `{ reason: "Debe tener hasta 500 caracteres." }` |
| Inexistente o ya dado de baja | 404 | `CLIENT_NOT_FOUND` | "No se encontró el cliente solicitado." | `null` |
| Con causas activas | 409 | `CLIENT_HAS_ACTIVE_CASES` | "No se puede dar de baja el cliente porque tiene causas activas." | `null` |

Causa activa: no dada de baja y en un estado no terminal (el inicial y uno escrito a mano cuentan).

## Qué queda escrito

| Dónde | Qué |
|---|---|
| `clients.active` | `false` |
| `clients.deactivated_at` / `deactivated_by_user_id` | ahora / quien la dio de baja |
| `clients.deactivation_reason` | el motivo recortado; `null` sin motivo o en blanco |
| `audit_log` | `client.deactivated`, con el usuario, la fecha y la correlación, **sin el motivo** |

## Tabla CA → test

| CA | Test | Tipo |
|---|---|---|
| 11.1 | 204; fila dada de baja; fuera de `GET /clients`; `GET /clients/{id}` 404 | INT |
| 11.1 | `Client.deactivate` deja `active` en false con su registro; dos veces lanza | unitario |
| 11.2 | con una causa activa → 409 textual y no cambia nada | INT + unitario (caso de uso) |
| 11.2 | con causas solo terminales o dadas de baja → 204 | INT |
| 11.3 | `POST /cases` con su `clientId` → 400 | INT |
| 11.4 | su causa terminal sigue mostrándolo en `GET /cases/{id}` | INT |
| 11.5 | auditoría con usuario y fecha; motivo en la columna | INT + unitario |
| 11.6 | los tres perfiles, con login real (seed) | INT |
| 11.7 | sin cuerpo y con 500 → 204; 501 → 400 sin escribir; en blanco → `null` | INT + unitario (VO) |
| 11.8 | otro cliente con su documento → 201 | INT |
| 11.9 | segunda baja e inexistente → 404; `abc` → 400 | INT + unitario |
