# Cambios en la base de datos — Sprint 3

Propuesta de cambios en la base de datos para dar soporte al Sprint 3, según
`API_CONTRACT_V4.md` (14/10/2026) y `ADR-003_GOOGLE_DRIVE.md`. Parte del
esquema del Sprint 2 (`ERD_SPRINT_2.md` y `backend/prisma/schema.prisma`).

Este documento **no incluye índices ni constraints**. Las referencias (→)
indican claves foráneas, que se mantienen porque definen la estructura.

> **Estado:** propuesta. Todavía no se modificó `schema.prisma` ni se creó la
> migración.

## Decisiones de diseño

- **La base es independiente del almacenamiento en la nube.** Ningún nombre de
  tabla, columna o enumerado menciona Drive: se usa `cloud_folder` y
  `cloud_file`.
- **Todas las carpetas de la nube van en una sola tabla, `cloud_folders`**, cuya
  clave primaria es el identificador que la carpeta tiene en la nube
  (`cloud_folder_id`).
- **La carpeta de cada causa también es una carpeta en la nube** (tipo `CASE`).
  Si su creación falla queda pendiente y todavía no tiene `cloud_folder_id`.
  Como ese identificador es la clave primaria, una carpeta pendiente no puede
  tener fila en `cloud_folders`: el estado `PENDING` / `CREATED` va en
  `cases.folder_status`.
- **La declaración de prescripción (HU33) va en la causa**, no en una tabla
  aparte: es 1 a 1, se carga una sola vez y no se revierte.
- **El cómputo de la prescripción no se guarda**: se calcula en cada lectura
  (ver [Prescripción](#prescripción)).

---

## 1. Tabla `cases` completa

| Columna | Tipo | Nulo | Origen | Descripción |
|---|---|:-:|---|---|
| `id` | `SERIAL` | No | S2 | Clave primaria |
| `sac_number` | `CHAR(8)` | Sí | S2 | Número de SAC, opcional |
| `caption` | `VARCHAR(255)` | No | S2 | Carátula |
| `court` | `VARCHAR(255)` | Sí | S2 | Tribunal o dependencia |
| `jurisdiction_id` | `INT` → `jurisdictions` | No | S2 | Fuero |
| `procedural_role` | `procedural_role` | No | S2 | Rol procesal del cliente |
| `instructor_name` | `VARCHAR(150)` | Sí | S2 | Instructor |
| `instructor_phone` | `VARCHAR(50)` | Sí | S2 | Teléfono (`tribunalPhone` en la API) |
| `instructor_extension` | `VARCHAR(20)` | Sí | S2 | Interno |
| `counterparty` | `VARCHAR(255)` | Sí | S2 | Contraparte (ADMINISTRATIVE y AMPARO) |
| `subject_matter` | `VARCHAR(800)` | Sí | S2 | Objeto del reclamo o del amparo |
| `client_detained` | `BOOLEAN` | Sí | **S3** | Si el cliente está preso. Solo CRIMINAL |
| `injunction_granted` | `BOOLEAN` | Sí | **S3** | Si se hizo lugar a la medida cautelar. Solo AMPARO |
| `harmful_act_date` | `DATE` | Sí | **S3** | Fecha del acto lesivo. Solo AMPARO |
| `harmful_act_renews` | `BOOLEAN` | Sí | **S3** | Si el acto lesivo se renueva |
| `harmful_act_renewal_days` | `INT` | Sí | **S3** | Cada cuántos días corridos se renueva |
| `harmful_act_term_days` | `INT` | Sí | **S3** | Plazo para presentar el amparo |
| `harmful_act_term_day_type` | `day_type` | Sí | **S3** | `BUSINESS` o `CONSECUTIVE` |
| `administrative_remedy_exhausted_on` | `DATE` | Sí | **S3** | Agotamiento de la vía administrativa. Solo ADMINISTRATIVE |
| `court_fee_paid` | `BOOLEAN` | No | **S3** | Tasa de justicia pagada (por defecto `false`) |
| `client_id` | `INT` → `clients` | No | S2 | Cliente |
| `responsible_lawyer_id` | `INT` → `lawyers` | No | S2 | Abogado responsable |
| `start_date` | `DATE` | Sí | S2 | Inicio en sede judicial; `null` sin SAC |
| `current_state_id` | `INT` → `procedural_states` | Sí | S2 | Estado actual de la tabla |
| `current_custom_state` | `VARCHAR(255)` | Sí | S2 | Estado escrito a mano |
| `current_procedural_act_id` | `INT` → `procedural_acts` | Sí | S2 | Acto vigente. `null` en "Iniciada" y en "Prescripta" |
| `folder_status` | `case_folder_status` | Sí | **S3** | `CREATED` / `PENDING`. `null` si no se pidió carpeta |
| `cloud_folder_id` | `VARCHAR(128)` → `cloud_folders` | Sí | **S3** | Carpeta de la causa en la nube. `null` mientras está pendiente |
| `prescription_date` | `DATE` | Sí | **S3** | Fecha de la prescripción declarada (HU33) |
| `prescription_resolution` | `VARCHAR(255)` | Sí | **S3** | Resolución que la declara |
| `prescription_grounds` | `VARCHAR(2000)` | Sí | **S3** | Fundamento, opcional |
| `prescription_registered_by_user_id` | `INT` → `users` | Sí | **S3** | Quién la marcó como prescripta |
| `prescription_registered_at` | `TIMESTAMPTZ` | Sí | **S3** | Cuándo se marcó |
| `active` | `BOOLEAN` | No | S2 | Baja lógica |
| `created_by_user_id` | `INT` → `users` | No | S2 | Quién la dio de alta |
| `created_at` | `TIMESTAMPTZ` | No | S2 | |
| `updated_at` | `TIMESTAMPTZ` | No | S2 | |

---

## 2. Prescripción

Hay que separar dos cosas:

**a) La declaración de prescripción (HU33) va en la causa.** Es 1 a 1, se carga
una sola vez y no se revierte, así que se ahorra una tabla y un join. Son los
cinco campos `prescription_*` de la tabla `cases`.

**b) El cómputo no se guarda.** Son `startsOn`, `expiresOn`, la calificación que
rige, el porcentaje transcurrido y la alerta:

- **Cambia aunque nadie toque la causa.** Si se modifican los meses de una
  calificación, hay que recalcular todas las causas que la registran (D-08).
- **Cambia con cada acto interruptivo** (y no cambia si se carga uno con fecha
  anterior al último).
- **`elapsedPercentage` y `alert` dependen del día de hoy**, así que se vuelven
  viejos cada día aunque no cambie nada.
- **Sale de varias filas.** Es el mínimo entre las calificaciones de la causa,
  cada una con su fecha del hecho. Guardarlo en la causa es una copia que hay
  que mantener sincronizada desde tres lugares: alta de causa, acto
  interruptivo y modificación de calificación.

Calcularlo al leer es barato: pocas calificaciones por causa y un
`MAX(act_date)` de actos interruptivos. Es lo que pide el contrato ("nada se
guarda calculado"). Si más adelante los tableros necesitan filtrar por fecha de
prescripción desde SQL, se puede agregar `prescription_expires_on` como caché.
Eso es una optimización, no parte del modelo.

---

## 3. Carpetas en la nube: tabla `cloud_folders`

Estructura de carpetas:

```text
VZ Causas                       MAIN
├── Modelos formales            TEMPLATES
│   └── Penal / Administrativo / Amparo        JURISDICTION (lawyer_id null)
└── Causas                      CASES
    └── Ríos, Malena            LAWYER
        └── Penal               JURISDICTION (lawyer_id con valor)
            └── GÓMEZ, Ariel…   CASE
```

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `cloud_folder_id` | `VARCHAR(128)` | No | **Clave primaria.** El id que le da el almacenamiento en la nube |
| `kind` | `cloud_folder_kind` | No | `MAIN`, `TEMPLATES`, `CASES`, `LAWYER`, `JURISDICTION`, `CASE` |
| `name` | `VARCHAR(255)` | No | Nombre de la carpeta |
| `url` | `VARCHAR(512)` | No | Enlace para abrirla |
| `parent_cloud_folder_id` | `VARCHAR(128)` → `cloud_folders` | Sí | Carpeta padre. `null` solo en `MAIN` |
| `lawyer_id` | `INT` → `lawyers` | Sí | En `LAWYER`, en `JURISDICTION` de causas y en `CASE` |
| `jurisdiction_id` | `INT` → `jurisdictions` | Sí | En `JURISDICTION` y en `CASE` |
| `created_at` | `TIMESTAMPTZ` | No | |

- **Las dos carpetas de fuero se distinguen por sus atributos:** la de modelos
  tiene `lawyer_id` en `null` y su padre es `TEMPLATES`; la de causas tiene
  `lawyer_id` con valor y su padre es un `LAWYER`.
- **`folder.path` de la API no se guarda:** se arma recorriendo los padres.
- **`MAIN`, `TEMPLATES` y `CASES` pasan a la tabla.** Reemplazan las variables
  de entorno `GOOGLE_DRIVE_ROOT_FOLDER_ID` y `GOOGLE_DRIVE_TEMPLATES_FOLDER_ID`
  del ADR-003, que hay que actualizar.
- **La causa apunta a su carpeta con `cases.cloud_folder_id`.** La carpeta no
  apunta a la causa, para que la relación no vaya en los dos sentidos.

### Pendiente de decisión: modelos con varios fueros

Un modelo para "Todos los fueros" es un solo registro con un solo archivo
(D-55), pero la carpeta de modelos se divide por fuero. Opciones:

- **(a)** guardarlo en `TEMPLATES`, sin subcarpeta;
- **(b)** guardarlo en la carpeta del primer fuero;
- **(c)** una copia por fuero, que contradice D-55.

Se recomienda **(a)**: los modelos de un solo fuero van en su `JURISDICTION` y
los de varios, en `TEMPLATES`. Por eso `document_templates.cloud_folder_id`
apunta a cualquiera de las dos.

---

## 4. Todos los cambios

### 4.1 Enums nuevos

| Enum | Valores |
|---|---|
| `cloud_folder_kind` | `MAIN`, `TEMPLATES`, `CASES`, `LAWYER`, `JURISDICTION`, `CASE` |
| `case_folder_status` | `CREATED`, `PENDING` |
| `template_copy_status` | `COPIED`, `PENDING` |
| `deadline_kind` | `PROCEDURAL_ACT`, `HARMFUL_ACT` |
| `notification_kind` | `DEADLINE_WARNING`, `DEADLINE_DUE_TODAY`, `PRESCRIPTION_ALERT`, `PRESCRIPTION_EXPIRED` |

### 4.2 Tablas modificadas

**`users`** (D-68)

- Se agregan `last_name VARCHAR(100)` y `first_name VARCHAR(100)`, no nulas.
- Se quita `full_name`.

**`lawyers`** (D-68, D-81)

- Igual que `users`: se agregan `last_name` y `first_name` (sin "Dr./Dra.") y
  se quita `full_name`.

**`procedural_states`** (D-53)

- Se agrega `is_prescribed BOOLEAN`, no nula, por defecto `false`. Marca el
  estado de sistema "Prescripta".

**`offenses`** (D-08, D-51)

- Se quita `prescription_date`: se calcula al leer.

**`cases`**

Se agregan las 16 columnas marcadas **S3** en la [sección 1](#1-tabla-cases-completa):

- datos por fuero (9, D-67): `client_detained`, `injunction_granted`, los cinco
  `harmful_act_*`, `administrative_remedy_exhausted_on` y `court_fee_paid`;
- carpeta (2, D-60): `folder_status` y `cloud_folder_id`;
- declaración de prescripción (5, D-52, D-54): los cinco campos `prescription_*`.

### 4.3 Tablas nuevas

**`interruptive_acts`** (HU31)

| Columna | Tipo | Nulo |
|---|---|:-:|
| `id` | `SERIAL` | No |
| `case_id` | `INT` → `cases` | No |
| `name` | `VARCHAR(255)` | No |
| `act_date` | `DATE` | No |
| `notes` | `VARCHAR(2000)` | Sí |
| `registered_by_user_id` | `INT` → `users` | No |
| `registered_by_lawyer_id` | `INT` → `lawyers` | No |
| `registered_at` | `TIMESTAMPTZ` | No |

**`cloud_folders`** (HU39, HU40): ver la [sección 3](#3-carpetas-en-la-nube-tabla-cloud_folders).

**`document_templates`** (HU34, HU35)

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | `SERIAL` | No | |
| `name` | `VARCHAR(150)` | No | |
| `file_name` | `VARCHAR(255)` | No | Nombre del `.docx` |
| `cloud_file_id` | `VARCHAR(128)` | No | Id del archivo en la nube |
| `cloud_folder_id` | `VARCHAR(128)` → `cloud_folders` | No | `TEMPLATES` o su `JURISDICTION` |
| `copy_to_new_cases` | `BOOLEAN` | No | |
| `last_version_at` | `TIMESTAMPTZ` | No | |
| `last_version_by_user_id` | `INT` → `users` | No | |
| `active` | `BOOLEAN` | No | |
| `created_at` | `TIMESTAMPTZ` | No | |
| `updated_at` | `TIMESTAMPTZ` | No | |

**`document_template_jurisdictions`** (D-55)

| Columna | Tipo | Nulo |
|---|---|:-:|
| `template_id` | `INT` → `document_templates` | No |
| `jurisdiction_id` | `INT` → `jurisdictions` | No |

**`document_template_copies`** (HU40)

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `case_id` | `INT` → `cases` | No | |
| `template_id` | `INT` → `document_templates` | No | |
| `status` | `template_copy_status` | No | Se crea en `PENDING` al pedir la copia |
| `cloud_file_id` | `VARCHAR(128)` | Sí | Id de la copia. `null` mientras está pendiente |
| `copied_at` | `TIMESTAMPTZ` | Sí | |

De esta tabla salen `templatesCopied`, `templatesPending` y `usageCount`. Como
las copias pendientes se registran al pedirlas, la causa no necesita una
columna `copy_templates`.

**`sent_notifications`** (proceso diario: HU30, HU32, HU51, HU52)

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | `SERIAL` | No | |
| `case_id` | `INT` → `cases` | No | |
| `kind` | `notification_kind` | No | |
| `deadline_kind` | `deadline_kind` | Sí | Solo en los avisos de vencimiento |
| `procedural_act_id` | `INT` → `procedural_acts` | Sí | Acto que abrió el plazo avisado |
| `reference_date` | `DATE` | No | Vencimiento o fecha de prescripción avisada |
| `sent_at` | `TIMESTAMPTZ` | No | |

### 4.4 Tablas opcionales

**`user_folder_access`** (D-83): sirve para reconciliar y quitar el acceso a la
carpeta `MAIN` sin consultar a la nube, y para el caso C-23 (correos que no son
de Google).

| Columna | Tipo | Nulo |
|---|---|:-:|
| `user_id` | `INT` → `users` | No |
| `email` | `VARCHAR(255)` | No |
| `cloud_permission_id` | `VARCHAR(128)` | Sí |
| `granted` | `BOOLEAN` | No |
| `synced_at` | `TIMESTAMPTZ` | Sí |

**`daily_job_runs`**: evita que el proceso diario corra dos veces el mismo día.

| Columna | Tipo | Nulo |
|---|---|:-:|
| `run_date` | `DATE` | No |
| `started_at` | `TIMESTAMPTZ` | No |
| `finished_at` | `TIMESTAMPTZ` | Sí |
| `error` | `TEXT` | Sí |

### 4.5 Datos de seed

- **Estado "Prescripta"** en `CRIMINAL`: `time_limit_days = 0`, `day_type =
  NONE`, `terminal = true`, `is_prescribed = true`.
- **Carpetas `MAIN`, `TEMPLATES` y `CASES`:** se cargan una vez, con el script
  de autorización (`drive:authorize` en el ADR-003).
- **Permisos nuevos** de actos interruptivos, prescripción, modelos formales y
  tableros.
