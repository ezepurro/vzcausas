# 9. Diccionario de datos

Generado a partir de `backend/prisma/schema.prisma` y de las migraciones
`20260920230321_init_auth` y `20260927133033_setup_for_sprint_1`, que son
la única fuente de verdad del esquema. Los nombres de columna son los
físicos de PostgreSQL (`@map` del schema), no los del cliente de Prisma.

Las longitudes en bytes son las de PostgreSQL: `INTEGER` 4 B, `UUID`
16 B, `BOOLEAN` 1 B, `TIMESTAMPTZ` 8 B. En `VARCHAR(n)` se indica `n`.

## 9.1 Tablas

### 9.1.1 Tabla `users`

Cuentas de usuario del sistema, para autenticación y control de acceso.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador interno, autoincremental. |
| `username` | VARCHAR | 50 | UK | No | Identificador de inicio de sesión, distinto del correo. |
| `full_name` | VARCHAR | 255 | | No | Nombre y apellido en un solo campo. |
| `email` | VARCHAR | 255 | UK | No | Correo electrónico único. |
| `password_hash` | VARCHAR | 255 | | No | Hash bcrypt de la contraseña. Nunca se almacena en claro. |
| `lawyer_id` | INTEGER | 4 B | FK | Sí | Ficha profesional vinculada (→ `lawyers.id`), `ON DELETE RESTRICT`. Obligatorio para usuarios con rol `LAWYER`, nulo en el resto. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de creación. |
| `updated_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de la última actualización. |
| `last_login_at` | TIMESTAMPTZ | 8 B | | Sí | Inicio de sesión **anterior** al actual; se muestra al usuario para que detecte accesos ajenos. Nulo si nunca ingresó. |
| `active` | BOOLEAN | 1 B | | No | `true`: habilitado. `false`: baja lógica (RN12). Por defecto `true`. |
| `deleted_at` | TIMESTAMPTZ | 8 B | | Sí | Momento de la baja lógica. Nulo mientras la cuenta está vigente. |

Índices: `users_username_key` (UK), `users_email_key` (UK),
`users_lawyer_id_idx`.

### 9.1.2 Tabla `refresh_tokens`

Tokens de refresco emitidos para renovar sesiones, con rotación y
detección de reuso.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `id` | UUID | 16 B | PK | No | Identificador opaco del token (`gen_random_uuid()`). |
| `token_hash` | VARCHAR | 255 | UK | No | Hash del valor entregado al cliente. El token en claro no se guarda. |
| `user_id` | INTEGER | 4 B | FK | No | Usuario asociado (→ `users.id`), `ON DELETE CASCADE`. |
| `family_id` | UUID | 16 B | | No | Agrupa todos los tokens nacidos de un mismo inicio de sesión. Permite revocar la sesión entera al detectar reuso. |
| `replaced_by` | UUID | 16 B | FK | Sí | Token que lo sucedió en la rotación (→ `refresh_tokens.id`), `ON DELETE SET NULL`. Nulo si es el vigente. |
| `expires_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de expiración. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de emisión. |
| `revoked_at` | TIMESTAMPTZ | 8 B | | Sí | Momento de la revocación. **Nulo = vigente**; conserva el primer valor para que revocar sea idempotente. |

Índices: `(user_id, revoked_at)`, `family_id`, `expires_at`.

### 9.1.3 Tabla `roles`

Catálogo de roles del sistema.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador interno del rol. |
| `name` | VARCHAR | 50 | UK | No | `ADMINISTRATOR`, `LAWYER`, `SECRETARY`. |
| `description` | TEXT | — | | Sí | Descripción del rol. Sin límite declarado. |
| `is_system` | BOOLEAN | 1 B | | No | `true`: rol de sistema, no administrable por API. Por defecto `false`. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de creación. |

### 9.1.4 Tabla `permissions`

Permisos atómicos del sistema.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador del permiso. |
| `name` | VARCHAR | 100 | UK | No | Código del permiso: `user:create`, `user:read`, `user:update`, `user:delete`, `lawyer:create`, `lawyer:read`, `lawyer:update`, `lawyer:delete`. |
| `description` | TEXT | — | | Sí | Descripción del permiso. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de creación. |

### 9.1.5 Tabla `user_roles`

Relación muchos a muchos entre usuarios y roles. Un usuario puede tener
más de un perfil (CA-4.2).

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `user_id` | INTEGER | 4 B | PK, FK | No | → `users.id`, `ON DELETE CASCADE`. |
| `role_id` | INTEGER | 4 B | PK, FK | No | → `roles.id`, `ON DELETE CASCADE`. |

Índices: `user_roles_role_id_idx`.

### 9.1.6 Tabla `role_permissions`

Asignación de permisos a roles (muchos a muchos).

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `role_id` | INTEGER | 4 B | PK, FK | No | → `roles.id`, `ON DELETE CASCADE`. |
| `permission_id` | INTEGER | 4 B | PK, FK | No | → `permissions.id`, `ON DELETE CASCADE`. |

Índices: `role_permissions_permission_id_idx`.

### 9.1.7 Tabla `lawyers`

Datos profesionales de los abogados del estudio.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador interno del abogado. |
| `full_name` | VARCHAR | 255 | | No | Nombre completo, tal como se presenta en el escrito. |
| `registration_number` | VARCHAR | 50 | UK | No | Matrícula del Colegio de Abogados de Córdoba: circunscripción y número separados por guión (`1-28114`). |
| `active` | BOOLEAN | 1 B | | No | `true`: en ejercicio. `false`: baja lógica (RN12). Por defecto `true`. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de registro. |
| `updated_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de la última actualización. |

**El vínculo con la cuenta de usuario vive en `users.lawyer_id`, no
acá.** Un abogado existe como dato profesional sin necesidad de tener
acceso al sistema (D1, CA-12.3), y el acceso se otorga por separado en
HU-4.

### 9.1.8 Tabla `jurisdictions`

Fueros o jurisdicciones parametrizados.

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `jurisdiction_id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador interno del fuero. |
| `name` | TEXT | — | UK | No | Nombre del fuero: Penal, Administrativo, Amparo. |
| `day_type_default` | `day_type` | 4 B | | No | Cómputo de plazos por defecto del fuero: `NONE`, `BUSINESS`, `CONSECUTIVE`. |
| `is_active` | BOOLEAN | 1 B | | No | `false`: fuero deshabilitado. Por defecto `true`. |

### 9.1.9 Tabla `procedural_states`

Estados procesales de cada fuero y sus plazos (RN4, RN5).

| Atributo | Tipo | Long. | Clave | Nulo | Descripción / valores posibles |
| --- | --- | --- | :-: | :-: | --- |
| `state_id` | SERIAL (INTEGER) | 4 B | PK | No | Identificador interno del estado. |
| `name` | TEXT | — | UK | No | Nombre del estado (ej.: Citación a juicio). |
| `position` | INTEGER | 4 B | | No | Orden secuencial dentro del ciclo de vida del fuero. Por defecto `1`. |
| `time_limit_days` | INTEGER | 4 B | | No | Días de plazo que otorga el estado. |
| `day_type` | `day_type` | 4 B | | Sí | Cómputo de este estado. Nulo: se aplica el `day_type_default` del fuero. |
| `terminal` | BOOLEAN | 1 B | | No | `true`: estado final que cierra la causa. Por defecto `false`. |
| `is_active` | BOOLEAN | 1 B | | No | `false`: estado deshabilitado. Por defecto `true`. |
| `created_at` | TIMESTAMPTZ | 8 B | | No | Fecha y hora de creación. |
| `jurisdiction_id` | INTEGER | 4 B | FK | No | Fuero asociado (→ `jurisdictions.jurisdiction_id`), `ON DELETE RESTRICT`. |

Índices: `procedural_states_jurisdiction_id_idx`.

## 9.2 Tipos enumerados

Los dominios cerrados se implementan como tipos enumerados de
PostgreSQL, generados por Prisma a partir de las enumeraciones del
modelo. **Hoy existe uno solo:**

| Tipo | Valores posibles | Utilizado en |
| --- | --- | --- |
| `day_type` | `NONE`, `BUSINESS`, `CONSECUTIVE` | `jurisdictions.day_type_default`, `procedural_states.day_type` |

## 9.3 Tablas del alcance total todavía no implementadas

El esquema cubre `identity` (EP-01), `people` (EP-02) y la parametría
jurídica del Sprint 1. Las siguientes tablas del diseño completo **no
existen en la base**, y por eso no figuran arriba: `clientes`, `causa`,
`acto_procesal`, `plazo`, `notificacion`, `configuracion_aviso`,
`dia_inhabil`, `pago_tasa` y `modelo_formal`.

Sus enumerados asociados tampoco existen: `perfil_enum`, `vinculo_enum`,
`modalidad_enum`, `rol_procesal_enum`, `situacion_causa_enum`,
`tipo_dia_enum`, `estado_plazo_enum`, `tipo_notificacion_enum`,
`resultado_envio_enum`, `tipo_dia_inhabil_enum`, `concepto_pago_enum` y
`tipo_modelo_enum`.
