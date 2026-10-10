# ERD — Base de datos del Sprint 2

Diseño de la base para el Sprint 2 (revisión 3, 05/10/2026). Coincide con
`backend/prisma/schema.prisma` y con `API_CONTRACT_V3.md` (revisión del
05/10/2026, §7.8): sin `position` en estados procesales, `activeCases` solo
calculado en los `GET`, SAC / instructor / interno / calificación legal
opcionales, estado inicial "Iniciada" por fuero y vencimiento dentro de
`currentState`.

> **Estado:** `schema.prisma` actualizado. **Falta la migración** (incluido el
> SQL manual de abajo) y adaptar el código y el seed que usan `position`.
>
> **Cambio del 06/10/2026:** la tabla intermedia `case_legal_qualifications`
> pasa a llamarse `offenses` (hechos de la causa, modelo `Offense`) y suma la
> columna `prescription_date`. Falta la migración de ese cambio: debe
> renombrar la tabla (y su clave primaria, índice y claves foráneas) en lugar
> de borrarla y crearla, y completar `prescription_date` de las filas que ya
> existan.

```mermaid
---
id: 4aaecd7b-b929-49e0-8f6c-b781b17167c8
---
erDiagram
    %% ───────── identity ─────────
    users {
        int id PK
        varchar username UK
        varchar full_name
        varchar email UK "lowercase"
        varchar password_hash
        int lawyer_id FK "null"
        bool active
        timestamptz last_login_at "null"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "null"
    }
    refresh_tokens {
        uuid id PK
        varchar token_hash UK
        int user_id FK
        uuid family_id
        uuid replaced_by FK "null"
        timestamptz expires_at
        timestamptz revoked_at "null"
    }
    roles {
        int id PK
        varchar name UK
        bool is_system
    }
    permissions {
        int id PK
        varchar name UK "resource:action"
    }
    user_roles {
        int user_id PK, FK
        int role_id PK, FK
    }
    role_permissions {
        int role_id PK, FK
        int permission_id PK, FK
    }

    %% ───────── people ─────────
    lawyers {
        int id PK
        varchar full_name
        varchar registration_number UK
        bool active
        timestamptz created_at
        timestamptz updated_at
    }
    clients {
        int id PK
        varchar last_name
        varchar first_name
        varchar dni "UK entre vigentes, 7-8 digitos"
        varchar phone "null"
        varchar email "null"
        date client_since "la asigna la app"
        bool active
        timestamptz created_at
        timestamptz updated_at
    }

    %% ───────── legal-parameters ─────────
    jurisdictions {
        int jurisdiction_id PK
        text name UK "CRIMINAL, ADMINISTRATIVE, AMPARO"
        bool is_active
    }
    procedural_states {
        int state_id PK
        text name "UK por fuero entre vigentes"
        int jurisdiction_id FK
        int time_limit_days ">= 0"
        day_type day_type "NOT NULL, coherente con dias"
        bool terminal
        bool is_initial "uno por fuero: Iniciada"
        bool is_active
        timestamptz created_at
        timestamptz updated_at
    }
    legal_qualifications {
        int id PK
        varchar name "UK lower(name) entre vigentes"
        int prescription_months ">= 1"
        bool active
        timestamptz created_at
        timestamptz updated_at
    }

    %% ───────── cases ─────────
    cases {
        int id PK
        char sac_number UK "null, 8 digitos"
        varchar caption
        varchar court "null"
        int jurisdiction_id FK
        procedural_role procedural_role "codigo en castellano"
        varchar instructor_name "null"
        varchar instructor_phone "null"
        varchar instructor_extension "null"
        varchar counterparty "null"
        varchar subject_matter "null, max 800"
        int client_id FK
        int responsible_lawyer_id FK
        date start_date "null mientras no hay SAC"
        int current_state_id FK "null, xor custom"
        varchar current_custom_state "null, xor state"
        int current_procedural_act_id FK "null = estado inicial"
        bool active
        int created_by_user_id FK
        timestamptz created_at
        timestamptz updated_at
    }
    offenses {
        int case_id PK, FK
        int legal_qualification_id PK, FK
        date offense_date "fecha del hecho"
        date prescription_date "offense_date + meses de la calificacion"
    }
    procedural_acts {
        int id PK
        int case_id FK
        int procedural_state_id FK "null, xor custom"
        varchar custom_state "null, xor state"
        date act_date
        date notification_date "null, solo ADMINISTRATIVE"
        varchar notes "null, max 2000"
        int deadline_time_limit_days "copia de la tabla"
        day_type deadline_day_type "copia de la tabla"
        date deadline_counts_from
        date deadline_computed_due_date "null, calculado por la tabla"
        date deadline_manual_due_date "null, ajuste del abogado"
        int registered_by_user_id FK
        int registered_by_lawyer_id FK "responsable al momento"
        timestamptz registered_at
    }

    %% ───────── relaciones ─────────
    users }o--o| lawyers : "ficha profesional"
    users ||--o{ refresh_tokens : "sesiones"
    refresh_tokens |o--o| refresh_tokens : "rotacion"
    users ||--o{ user_roles : ""
    roles ||--o{ user_roles : ""
    roles ||--o{ role_permissions : ""
    permissions ||--o{ role_permissions : ""

    jurisdictions ||--o{ procedural_states : "define"
    jurisdictions ||--o{ cases : "fuero"

    clients ||--o{ cases : "es cliente de"
    lawyers ||--o{ cases : "responsable (RN3)"
    users ||--o{ cases : "dio de alta"
    procedural_states |o--o{ cases : "estado actual"
    cases }o--o| procedural_acts : "acto vigente"

    cases ||--o{ offenses : "hechos"
    legal_qualifications ||--o{ offenses : ""

    cases ||--o{ procedural_acts : "linea de tiempo"
    procedural_states |o--o{ procedural_acts : "estado resultante"
    users ||--o{ procedural_acts : "registro"
    lawyers ||--o{ procedural_acts : "responsable al registrar"
```

## Restricciones que el diagrama no muestra

Van en una migración manual (`migrate dev --create-only`), porque Prisma no
las expresa:

- **Índices únicos parciales**
    - `clients (dni) WHERE active`
    - `legal_qualifications (lower(name)) WHERE active`
    - `procedural_states (jurisdiction_id, lower(name)) WHERE is_active`
    - `procedural_states (jurisdiction_id) WHERE is_initial`
- **Exclusión mutua (xor)**
    - `cases`: `num_nonnulls(current_state_id, current_custom_state) = 1`
    - `procedural_acts`: `num_nonnulls(procedural_state_id, custom_state) = 1`
- **CHECK**
    - `procedural_states`: `(time_limit_days = 0) = (day_type = 'NONE')`, `time_limit_days >= 0`
    - `procedural_states`: `NOT is_initial OR (NOT terminal AND time_limit_days = 0 AND day_type = 'NONE')`
    - `cases`: `sac_number IS NULL OR sac_number ~ '^\d{8}$'`
    - `clients`: `dni ~ '^\d{7,8}$'`
    - `legal_qualifications`: `prescription_months >= 1`
    - `procedural_acts`: `notification_date >= act_date`, `deadline_manual_due_date IS NULL OR deadline_manual_due_date >= deadline_counts_from`

## Reglas que quedan en el dominio

- Solo el abogado responsable de la causa (`users.lawyer_id = cases.responsible_lawyer_id`) registra actos y usa `deadline-preview`. Ni siquiera el administrador.
- `offenses.prescription_date` es `offense_date` más `prescription_months` de la calificación legal, y no se recalcula si esos meses cambian después. La calcula el caso de uso Registrar Causa antes de guardar el hecho; si el mes de llegada es más corto, cae en su último día.
- El estado de un acto pertenece al fuero de la causa, está vigente, no es terminal ni es el inicial.
- `custom_state` no coincide con el nombre de un estado vigente del fuero.
- El rol procesal corresponde al fuero de la causa.
- Si `current_procedural_act_id` no es nulo, el estado de la causa es el estado resultante de ese acto. Se actualiza en la misma transacción, y solo si `act_date` es mayor o igual al del acto vigente.
- `client_since` se asigna con `ClockPort.today()` (Córdoba), nunca con `CURRENT_DATE` de la base. `start_date` solo existe con SAC: la informa el usuario y, sin SAC, queda en `NULL` (D-38).

## Vencimiento del acto

- `deadline_computed_due_date`: el que resulta de la tabla del fuero (`deadline_counts_from` + `deadline_time_limit_days` según `deadline_day_type`). `null` si el estado no abre plazo.
- `deadline_manual_due_date`: solo si el abogado ajustó el vencimiento a mano.
- **Vencimiento vigente** = `COALESCE(deadline_manual_due_date, deadline_computed_due_date)`, calculado al leer.
- **Ajustado a mano** = `deadline_manual_due_date IS NOT NULL`. No hay columna booleana.
- `deadline_counts_from` es `notification_date` en `ADMINISTRATIVE` (RN6) y `act_date` en los demás fueros.

## Enumerado `procedural_role`

Los valores se guardan y viajan por la API en castellano (API Contract V3 §7.9, D-37): son la excepción a la convención de códigos en inglés de `TRADUCCION_DOMINIO.md`. El rótulo de pantalla lo resuelve el frontend:

| Código                   | Rótulo (frontend)      | Fueros                       |
| ------------------------ | ---------------------- | ---------------------------- |
| `DEFENSA`                | Defensa                | `CRIMINAL`, `ADMINISTRATIVE` |
| `QUERELLANTE_PARTICULAR` | Querellante particular | `CRIMINAL`                   |
| `RECURRENTE`             | Recurrente             | `ADMINISTRATIVE`             |
| `ACTORA`                 | Actora                 | `AMPARO`                     |
| `DEMANDADA`              | Demandada              | `AMPARO`                     |

## Correspondencia con el API Contract

`currentState` de la causa (§3.7 del contrato) se arma así:

| Campo de la API | Origen en la base |
|---|---|
| `proceduralStateId` | `cases.current_state_id`, salvo que el estado sea el inicial (`is_initial`): entonces `null` |
| `name` | `procedural_states.name` o `cases.current_custom_state` |
| `custom` | `cases.current_custom_state IS NOT NULL` |
| `initial` | `procedural_states.is_initial` del estado actual |
| `proceduralActId` | `cases.current_procedural_act_id` |
| `dueDate` | `COALESCE(deadline_manual_due_date, deadline_computed_due_date)` del acto vigente |
| `businessDaysRemaining` | Calculado al leer, contra la fecha del día en Córdoba |
| `manuallyAdjusted` | `deadline_manual_due_date IS NOT NULL` del acto vigente |

`activeCases` de estados procesales y calificaciones legales no se guarda: se
calcula con una agregación al responder los `GET`.
