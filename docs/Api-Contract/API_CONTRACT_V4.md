# API Contract — V4

Contrato de la API para el **Sprint 3** (11/10/2026 – 23/10/2026). Reemplaza a
`API_CONTRACT_V3.md`, que se conserva sin modificaciones como registro del
Sprint 2.

| Campo            | Valor                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Versión          | 4                                                                     |
| Fecha            | 14/10/2026                                                            |
| Sprint           | 3 (11/10/2026 – 23/10/2026)                                           |
| Reemplaza a      | `API_CONTRACT_V3.md`                                                  |
| Fuente de verdad | `docs/prototypes/VZ Causas - Prototipo.dc.html` (versión del 13/10/2026) |
| Relacionado      | `docs/Backend-Architecture/ADR-003_GOOGLE_DRIVE.md`                   |

El documento es **autocontenido**: incluye los endpoints de los Sprints 1 y 2
que siguen vigentes y los que incorpora el Sprint 3. Las diferencias con V3
están en la [sección 7](#7-cambios-respecto-de-la-versión-anterior), las
decisiones de diseño y los puntos abiertos en la
[sección 8](#8-observaciones), y un resumen por historia en la
[sección 9](#9-resumen-por-historia).

Cuando una historia de usuario y el prototipo no coinciden, este contrato sigue
al prototipo, salvo decisión explícita del equipo, y lo deja asentado en la
sección 8.

**Alcance del Sprint 3:** trece historias.

| HU  | Nombre                                           | Endpoints                                                                                             |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 27  | Consultar Acto Procesal                          | `GET /cases/{caseId}/procedural-acts`, `GET /cases/{caseId}/procedural-acts/{actId}` (ya en V3)       |
| 30  | Notificar Vencimientos Plazos                    | Proceso automático diario, sin endpoints                                                              |
| 31  | Registrar Actos Interruptivos                    | `POST` y `GET /cases/{caseId}/interruptive-acts`                                                      |
| 32  | Notificar Alerta de Prescripción                 | Proceso automático diario; `prescription` en la causa; `prescriptionAlerts` en los tableros           |
| 33  | Registrar Causa/amparo como prescripta           | `POST /cases/{caseId}/prescription`                                                                   |
| 34  | Registrar Modelo Formal                          | `POST /document-templates`                                                                            |
| 35  | Consultar Modelo Formal                          | `GET /document-templates`, `GET /document-templates/{templateId}`, `GET /document-templates/{templateId}/file` |
| 39  | Crear Carpeta en la Nube                         | `POST /cases` (`createFolder`), `POST /cases/{caseId}/folder`; acceso de los usuarios a la carpeta del estudio |
| 40  | Crear Modelos en Carpeta de Causa                | `POST /cases` (`copyTemplates`), `POST /cases/{caseId}/folder`                                        |
| 41  | Crear Tablero de Abogado                         | `GET /dashboards/lawyer`                                                                              |
| 42  | Crear Tablero de administrador                   | `GET /dashboards/administrator`                                                                       |
| 51  | Verificar vencimiento de plazo de presentación   | Proceso automático diario, sin endpoints                                                              |
| 52  | Verificar plazo de prescripción                  | Proceso automático diario, sin endpoints; `prescription.alert` y `prescription.expired` en la causa   |

Además de las historias, esta versión incorpora cambios sobre lo ya
implementado: datos nuevos en la causa, nombre y apellido separados en usuarios
y abogados, estados terminales como destino de un acto procesal y el conteo de
causas por estado procesal (ver [§7.2](#72-endpoints-modificados)).

HU27 ya figuraba en V3 y está implementada. En esta versión se complementa con
el listado de actos interruptivos, que la línea de tiempo del prototipo muestra
junto a los actos procesales.

HU51 y HU52 **verifican** —cada día, los plazos de presentación y la
prescripción de las causas— y HU30 y HU32 **avisan** por correo lo que esa
verificación encuentra. Las cuatro son trabajo de un **proceso automático** que
no tiene endpoints: lo que este contrato fija de ellas es cómo trabaja ese
proceso y los datos que deja a la vista (ver
[Proceso automático diario](#proceso-automático-diario)).

## Tabla de contenidos

- [1. Resumen de Endpoints](#1-resumen-de-endpoints)
- [2. Enumerados](#2-enumerados)
- [3. Endpoints](#3-endpoints)
    - [3.1 Sesión: /auth](#31-sesión-auth)
    - [3.2 Gestión de usuarios: /users](#32-gestión-de-usuarios-users)
    - [3.3 Gestión de abogados: /lawyers](#33-gestión-de-abogados-lawyers)
    - [3.4 Estados procesales: /procedural-states](#34-estados-procesales-procedural-states)
    - [3.5 Calificaciones legales: /legal-qualifications](#35-calificaciones-legales-legal-qualifications)
    - [3.6 Clientes: /clients](#36-clientes-clients)
    - [3.7 Causas: /cases](#37-causas-cases)
    - [3.8 Actos procesales: /cases/{caseId}/procedural-acts](#38-actos-procesales-casescaseidprocedural-acts)
    - [3.9 Actos interruptivos: /cases/{caseId}/interruptive-acts](#39-actos-interruptivos-casescaseidinterruptive-acts)
    - [3.10 Modelos formales: /document-templates](#310-modelos-formales-document-templates)
    - [3.11 Tableros: /dashboards](#311-tableros-dashboards)
- [4. Información general](#4-información-general)
- [5. Convenciones de respuestas](#5-convenciones-de-respuestas)
- [6. Códigos HTTP](#6-códigos-http)
- [7. Cambios respecto de la versión anterior](#7-cambios-respecto-de-la-versión-anterior)
- [8. Observaciones](#8-observaciones)
- [9. Resumen por historia](#9-resumen-por-historia)

---

## 1. Resumen de Endpoints

La columna **v4** indica si el endpoint es nuevo, si cambió respecto de V3 o si
se mantiene igual.

| Método   | Endpoint                                              | Autenticación | Rol                           | Descripción                              | v4         |
| -------- | ----------------------------------------------------- | :-----------: | ----------------------------- | ---------------------------------------- | ---------- |
| `POST`   | `/auth/login`                                         |      No       | -                             | Iniciar sesión                           | Modificado |
| `POST`   | `/auth/refresh`                                       |      No       | -                             | Renovar el token de acceso               | -          |
| `POST`   | `/auth/logout`                                        |      Sí       | Cualquier usuario autenticado | Cerrar sesión                            | -          |
| `PATCH`  | `/auth/password`                                      |      Sí       | Cualquier usuario autenticado | Cambiar contraseña                       | -          |
| `POST`   | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Registrar usuario                        | Modificado |
| `GET`    | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Consultar usuarios                       | Modificado |
| `GET`    | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Consultar usuario                        | Modificado |
| `PATCH`  | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Modificar usuario                        | Modificado |
| `DELETE` | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Dar de baja usuario                      | -          |
| `POST`   | `/lawyers`                                            |      Sí       | `ADMINISTRATOR`               | Registrar abogado                        | Modificado |
| `GET`    | `/lawyers`                                            |      Sí       | Cualquier usuario autenticado | Consultar abogados                       | Modificado |
| `GET`    | `/lawyers/{lawyerId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar abogado                        | Modificado |
| `PATCH`  | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Modificar abogado                        | Modificado |
| `DELETE` | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Dar de baja abogado                      | -          |
| `POST`   | `/procedural-states`                                  |      Sí       | Cualquier usuario autenticado | Registrar estado procesal                | -          |
| `GET`    | `/procedural-states`                                  |      Sí       | Cualquier usuario autenticado | Consultar estados procesales             | Modificado |
| `GET`    | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Consultar estado procesal                | Modificado |
| `PATCH`  | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Modificar estado procesal                | Modificado |
| `DELETE` | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Dar de baja estado procesal              | Modificado |
| `POST`   | `/legal-qualifications`                               |      Sí       | Cualquier usuario autenticado | Registrar calificación legal             | -          |
| `GET`    | `/legal-qualifications`                               |      Sí       | Cualquier usuario autenticado | Consultar calificaciones legales         | -          |
| `GET`    | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Consultar calificación legal             | -          |
| `PATCH`  | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Modificar calificación legal             | -          |
| `DELETE` | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Dar de baja calificación legal           | -          |
| `POST`   | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Registrar cliente                        | -          |
| `GET`    | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Consultar clientes                       | -          |
| `GET`    | `/clients/{clientId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar cliente                        | -          |
| `POST`   | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Registrar causa                          | Modificado |
| `GET`    | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Consultar causas                         | Modificado |
| `GET`    | `/cases/custom-states`                                |      Sí       | Cualquier usuario autenticado | Consultar estados escritos a mano        | -          |
| `GET`    | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Consultar detalle de causa               | Modificado |
| `POST`   | `/cases/{caseId}/prescription`                        |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Marcar la causa como prescripta          | Nuevo      |
| `POST`   | `/cases/{caseId}/folder`                              |      Sí       | Cualquier usuario autenticado | Crear o reintentar la carpeta de la causa | Nuevo     |
| `POST`   | `/cases/{caseId}/procedural-acts`                     |      Sí       | Abogado responsable de la causa | Registrar acto procesal                | Modificado |
| `GET`    | `/cases/{caseId}/procedural-acts/deadline-preview`    |      Sí       | Abogado responsable de la causa | Previsualizar el vencimiento de un acto | -         |
| `GET`    | `/cases/{caseId}/procedural-acts`                     |      Sí       | Cualquier usuario autenticado | Consultar actos procesales               | Modificado |
| `GET`    | `/cases/{caseId}/procedural-acts/{actId}`             |      Sí       | Cualquier usuario autenticado | Consultar acto procesal                  | Modificado |
| `POST`   | `/cases/{caseId}/interruptive-acts`                   |      Sí       | Abogado responsable de la causa | Registrar acto interruptivo            | Nuevo      |
| `GET`    | `/cases/{caseId}/interruptive-acts`                   |      Sí       | Cualquier usuario autenticado | Consultar actos interruptivos            | Nuevo      |
| `POST`   | `/document-templates`                                 |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Registrar modelo formal                  | Nuevo      |
| `GET`    | `/document-templates`                                 |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Consultar modelos formales               | Nuevo      |
| `GET`    | `/document-templates/{templateId}`                    |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Consultar modelo formal                  | Nuevo      |
| `GET`    | `/document-templates/{templateId}/file`               |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Descargar el archivo del modelo          | Nuevo      |
| `GET`    | `/dashboards/lawyer`                                  |      Sí       | `LAWYER`                      | Tablero del abogado                      | Nuevo      |
| `GET`    | `/dashboards/administrator`                           |      Sí       | `ADMINISTRATOR`               | Tablero del administrador                | Nuevo      |

La columna **Rol** se deriva de la tabla de
[permisos por perfil](#permisos-por-perfil) de la sección 4. "`ADMINISTRATOR` o
`LAWYER`" significa que alcanza con poseer uno de los dos.

La mayoría de los endpoints marcados como **Modificado** no rompen a un cliente
de V3: suman campos a la respuesta, campos opcionales al cuerpo o un caso de
error nuevo. **Dos cambios sí rompen**: el nombre y el
apellido separados en `/auth/login`, `/users`, `/lawyers` y en toda referencia a
un usuario o un abogado (D-68), y `caseCount` en lugar de `activeCases` en
`/procedural-states` (D-70). El detalle está en la
[sección 7.2](#72-endpoints-modificados).

---

## 2. Enumerados

Valores cerrados del contrato. El backend envía y recibe el código; el rótulo
en castellano lo resuelve el cliente al mostrarlo.

### `Role`

| Código          | Rótulo        |
| --------------- | ------------- |
| `ADMINISTRATOR` | Administrador |
| `LAWYER`        | Abogado       |
| `SECRETARY`     | Secretaría    |

Un usuario puede poseer más de un rol.

### `Jurisdiction`

| Código           | Rótulo         |
| ---------------- | -------------- |
| `CRIMINAL`       | Penal          |
| `ADMINISTRATIVE` | Administrativo |
| `AMPARO`         | Amparo         |

`AMPARO` conserva su denominación en castellano por tratarse de una figura del
derecho argentino sin equivalente en inglés.

### `DayType`

| Código        | Rótulo     |
| ------------- | ---------- |
| `BUSINESS`    | Hábiles    |
| `CONSECUTIVE` | Corridos   |
| `NONE`        | Sin plazo  |

`NONE` corresponde a los estados procesales que no abren plazo
(`timeLimitDays` igual a `0`).

### `ProceduralRole`

Posición que ocupa el cliente en la causa. Cada fuero admite un subconjunto de
valores; el backend rechaza con `400` un rol que no corresponda al fuero de la
causa.

Los códigos van en castellano, igual que el vocabulario del estudio (D-37).

| Código                   | Rótulo                 | Fueros en que aplica           |
| ------------------------ | ---------------------- | ------------------------------ |
| `DEFENSA`                | Defensa                | `CRIMINAL`, `ADMINISTRATIVE`   |
| `QUERELLANTE_PARTICULAR` | Querellante particular | `CRIMINAL`                     |
| `RECURRENTE`             | Recurrente             | `ADMINISTRATIVE`               |
| `ACTORA`                 | Actora                 | `AMPARO`                       |
| `DEMANDADA`              | Demandada              | `AMPARO`                       |

No confundir con `Role`, que es el perfil de seguridad del usuario.

### `DeadlineKind` (nuevo)

Origen de un vencimiento en los tableros.

| Código           | Rótulo                    | Significado                                                       |
| ---------------- | ------------------------- | ----------------------------------------------------------------- |
| `PROCEDURAL_ACT` | Plazo de presentación     | El plazo que abrió el acto procesal del estado actual de la causa |
| `HARMFUL_ACT`    | Plazo para el amparo      | El plazo para presentar el amparo desde el acto lesivo            |

### `CaseFolderStatus` (nuevo)

Situación de la carpeta de una causa en la nube.

| Código     | Rótulo             | Significado                                                                                  |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `PENDING`  | Carpeta pendiente  | La carpeta no está creada por elección del usuario (se registró la causa sin pedirla). Se puede crear después |
| `CREATING` | Creando carpeta    | Se pidió crearla y se espera la respuesta del almacenamiento en la nube                      |
| `CREATED`  | Carpeta creada     | La carpeta existe y se puede abrir                                                           |
| `ERROR`    | Error en la carpeta | Se pidió crearla, pero el almacenamiento en la nube falló. Se reintenta solo y también se puede reintentar a mano |

Una causa registrada antes de esta versión no tiene estado: su `folder` vale
`null`.

---

## 3. Endpoints

### 3.1 Sesión: /auth

#### `POST /auth/login`

Inicia una sesión utilizando las credenciales del usuario.

**Autenticación requerida:** No.

**Cuerpo de la petición**

```json
{
	"username": "fvazquez",
	"password": "password"
}
```

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"accessToken": "eyJhbGciOi...",
		"tokenType": "Bearer",
		"expiresIn": 900,
		"user": {
			"id": 1,
			"username": "fvazquez",
			"lastName": "Vázquez",
			"firstName": "Fernando G.",
			"email": "fvazquez@vazquezzarate.com",
			"roles": ["ADMINISTRATOR", "LAWYER"],
			"lawyer": {
				"id": 1,
				"lastName": "Vázquez",
				"firstName": "Fernando G.",
				"registrationNumber": "1-28114"
			},
			"lastLoginAt": "2026-09-19T08:12:00-03:00",
			"active": true
		}
	}
}
```

Adicionalmente, la respuesta emite la cookie del refresh token:

```http
Set-Cookie: refresh_token=<valor opaco>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Expires=<7 días>
```

El refresh viaja **solo** en esta cookie, nunca en el cuerpo. El atributo
`Path` la restringe a los endpoints de `/auth`, de modo que no se envía en
las peticiones al resto de la API. En despliegues donde el frontend y la API
no comparten origen, `SameSite` pasa a `None` y exige `Secure`.

El objeto `user` posee la misma estructura que devuelve `/users`.

El campo `lastLoginAt` corresponde al acceso **anterior** al que se está
realizando, no al actual: permite que el usuario advierta un ingreso que no
efectuó.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"username": "El nombre de usuario es obligatorio.",
			"password": "La contraseña es obligatoria."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "INVALID_CREDENTIALS",
		"message": "Usuario o contraseña incorrectos.",
		"details": null
	}
}
```

El mensaje es el mismo exista o no exista el usuario: distinguir "no existe"
de "contraseña incorrecta" permitiría enumerar cuentas probando usuarios al
azar.

**`429 Too Many Requests`**

Dos motivos posibles, con el mismo código HTTP pero distinto `code` (ver
[Límite de frecuencia](#límite-de-frecuencia)). El bloqueo por cuenta:

```json
{
	"error": {
		"code": "TOO_MANY_LOGIN_ATTEMPTS",
		"message": "Demasiados intentos fallidos. Esperá antes de volver a intentar.",
		"details": { "retryAfterSeconds": 90 }
	}
}
```

O el límite de pedidos por IP:

```json
{
	"error": {
		"code": "TOO_MANY_REQUESTS",
		"message": "Demasiadas peticiones. Esperá un momento antes de reintentar.",
		"details": { "retryAfterSeconds": 42 }
	}
}
```

En ambos casos la respuesta trae el encabezado `Retry-After`.

---

#### `POST /auth/logout`

Finaliza la sesión del usuario autenticado.

**Autenticación requerida:** Sí.

**Cuerpo de la petición**

No requiere cuerpo.

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo. La sesión queda cerrada: tanto el refresh
como el `accessToken` dejan de aceptarse desde la próxima petición (ver
[Sesión y revocación](#sesión-y-revocación)). No afecta a otras sesiones
concurrentes del mismo usuario en otros dispositivos.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida o el token proporcionado no es válido.",
		"details": null
	}
}
```

---

#### `PATCH /auth/password`

Permite al usuario autenticado modificar su propia contraseña.

**Autenticación requerida:** Sí.

**Cuerpo de la petición**

```json
{
	"currentPassword": "passwordActual",
	"newPassword": "nuevaPassword"
}
```

| Campo             | Tipo   | Requerido | Restricciones                                  |
| ----------------- | ------ | :-------: | ---------------------------------------------- |
| `currentPassword` | String |    Sí     | -                                              |
| `newPassword`     | String |    Sí     | Mínimo 8 caracteres, con al menos un número, distinta de `currentPassword` |

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo. La sesión que hizo el cambio permanece
abierta; todas las demás sesiones del usuario, en cualquier otro dispositivo,
se cierran (ver [Sesión y revocación](#sesión-y-revocación)).

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"newPassword": "La contraseña no cumple con los requisitos establecidos."
		}
	}
}
```

O, si la contraseña nueva es igual a la actual:

```json
{
	"error": {
		"code": "SAME_PASSWORD",
		"message": "La contraseña nueva debe ser distinta de la actual.",
		"details": {
			"newPassword": "La contraseña nueva debe ser distinta de la actual."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida o el token proporcionado no es válido.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "INVALID_CURRENT_PASSWORD",
		"message": "La contraseña actual es incorrecta.",
		"details": null
	}
}
```

---

#### `POST /auth/refresh`

Renueva el token de acceso a partir del refresh token que el cliente
posee en la cookie `refresh_token` emitida durante `POST /auth/login`.
El endpoint no recibe cuerpo ni encabezado `Authorization`: el refresh
viaja únicamente en la cookie `HttpOnly`.

En cada uso el refresh se **rota**: se emite uno nuevo y se marca el
anterior como revocado. Si se recibe un refresh ya revocado, se
considera indicio de robo y se revoca la familia completa de tokens
del usuario.

**Autenticación requerida:** No (el access token puede estar vencido;
la autorización se resuelve con el refresh de la cookie).

**Cuerpo de la petición**

No requiere cuerpo.

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"accessToken": "eyJhbGciOi...",
		"tokenType": "Bearer",
		"expiresIn": 900,
		"user": {
			"id": 1,
			"username": "fvazquez",
			"roles": ["ADMINISTRATOR", "LAWYER"],
			"lawyerId": 10,
			"permissions": ["user:manage", "case:read", "case:change-status"]
		}
	}
}
```

Adicionalmente, la respuesta trae la cookie del refresh rotado:

```http
Set-Cookie: refresh_token=<nuevo valor opaco>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Expires=<7 días>
```

El objeto `user` en esta respuesta es una **proyección reducida**: solo
incluye los campos que pueden variar entre sesión y sesión y que
inciden en la autorización (`roles`, `lawyerId`, `permissions`).
Los datos estables (`lastName`, `firstName`, `email`, `active`, `lawyer`) el cliente
los conserva de `POST /auth/login`. `lastLoginAt` no se devuelve aquí
porque semánticamente pertenece al inicio de sesión, no a la
renovación.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La sesión expiró o no es válida.",
		"details": null
	}
}
```

Adicionalmente, la respuesta invalida la cookie del cliente:

```http
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=0
```

El mismo `401 UNAUTHENTICATED` cubre todos los caminos de falla, de
manera deliberadamente opaca al cliente: cookie ausente, token
inexistente en la base, token revocado (rotación previa, robo
detectado, cierre de sesión o cambio de contraseña en otro
dispositivo), token expirado, sesión inactiva por más de 30 minutos
(ver [Sesión y revocación](#sesión-y-revocación)), o usuario dado de
baja luego del último login. La reacción del cliente es la misma en
todos los casos: redirigir al login.

**`429 Too Many Requests`**

Comparte el límite estricto de `POST /auth/login` (ver [Límite de
frecuencia](#límite-de-frecuencia)); el bloqueo por cuenta no aplica
acá, porque no hay una cuenta que bloquear sin verificar primero la
contraseña.

```json
{
	"error": {
		"code": "TOO_MANY_REQUESTS",
		"message": "Demasiadas peticiones. Esperá un momento antes de reintentar.",
		"details": { "retryAfterSeconds": 42 }
	}
}
```

---

### 3.2 Gestión de usuarios: /users

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRATOR`.

El recurso usuario posee la siguiente estructura:

| Campo         | Tipo                  | Nulo | Descripción                                                              |
| ------------- | --------------------- | :--: | ------------------------------------------------------------------------ |
| `id`          | Integer               |  No  | Identificador único                                                      |
| `username`    | String                |  No  | Nombre de usuario. Único                                                 |
| `lastName`    | String                |  No  | Apellido. Nuevo en V4: reemplaza a `fullName`                            |
| `firstName`   | String                |  No  | Nombres. Nuevo en V4: reemplaza a `fullName`                             |
| `email`       | String                |  No  | Correo electrónico. Único                                                |
| `roles`       | `Role[]`              |  No  | Al menos un rol                                                          |
| `lawyer`      | Object \| `null`      |  Sí  | Ficha profesional vinculada. `null` si el usuario no posee vínculo       |
| `lastLoginAt` | String (ISO 8601) \| `null` | Sí | Último ingreso registrado. `null` si el usuario nunca inició sesión |
| `active`      | Boolean               |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /users/{userId}`        |

**Sobre `lastName` y `firstName`:** desde V4 el apellido y los nombres viajan
en campos separados, igual que en el cliente. Reemplazan a `fullName` en las
respuestas y en los cuerpos de `POST` y `PATCH`, y también en el objeto
`lawyer` que el usuario lleva vinculado (D-68). Es un cambio que rompe la
compatibilidad con V3.

**Acceso a la carpeta del estudio en Drive** (nuevo en V4). El alta, la
modificación y la baja de usuarios tienen un efecto fuera de la API: el sistema
comparte la carpeta raíz `VZ Causas` con el `email` de cada usuario vigente que
tenga el rol `LAWYER` o `SECRETARY`, y se la quita cuando deja de cumplirlo
(ver [Carpeta de la causa](#carpeta-de-la-causa)):

| Operación                   | Efecto sobre el acceso a Drive                                                 |
| --------------------------- | ------------------------------------------------------------------------------ |
| `POST /users`               | Si los roles incluyen `LAWYER` o `SECRETARY`, se comparte la carpeta con su correo |
| `PATCH /users/{userId}`     | Si cambia el correo, el acceso pasa del anterior al nuevo. Si cambian los roles, se da o se quita según corresponda |
| `DELETE /users/{userId}`    | Se quita el acceso                                                             |

Ninguna de las tres operaciones cambia su cuerpo ni su respuesta, y **ninguna
falla si Drive no responde**: el usuario se registra, se modifica o se da de
baja igual, y el proceso diario vuelve a ajustar los accesos (D-83). El correo
tiene que ser de una cuenta de Google para que el acceso funcione
([C-23](#82-puntos-abiertos)).

La contraseña no se devuelve en ninguna respuesta, ni en texto plano ni
cifrada.

---

#### `POST /users`

Registra un nuevo usuario en el sistema.

**Cuerpo de la petición**

Vinculando un abogado ya registrado:

```json
{
	"username": "iperalta",
	"lastName": "Peralta",
	"firstName": "Ignacio",
	"email": "iperalta@vazquezzarate.com",
	"password": "password1",
	"roles": ["LAWYER"],
	"lawyerId": 4
}
```

Registrando un abogado nuevo en la misma operación:

```json
{
	"username": "iperalta",
	"lastName": "Peralta",
	"firstName": "Ignacio",
	"email": "iperalta@vazquezzarate.com",
	"password": "password1",
	"roles": ["LAWYER"],
	"lawyer": {
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"registrationNumber": "1-35207"
	}
}
```

| Campo      | Tipo           | Requerido   | Restricciones                                                                 |
| ---------- | -------------- | :---------: | ----------------------------------------------------------------------------- |
| `username` | String         |     Sí      | Entre 3 y 30 caracteres: letras, números, punto, guión y guión bajo. Único    |
| `lastName` | String         |     Sí      | Hasta 100 caracteres                                                          |
| `firstName`| String         |     Sí      | Hasta 100 caracteres                                                          |
| `email`    | String         |     Sí      | Formato de correo electrónico válido. Único                                   |
| `password` | String         |     Sí      | Mínimo 8 caracteres, con al menos un número                                   |
| `roles`    | `Role[]`       |     Sí      | Al menos un rol                                                               |
| `lawyerId` | Integer        | Condicional | Identificador de un abogado ya registrado                                     |
| `lawyer`   | Object         | Condicional | Datos de un abogado a registrar. Mismos campos que el cuerpo de `POST /lawyers` |

**Vínculo con la ficha profesional**

Los campos `lawyerId` y `lawyer` son **mutuamente excluyentes**: se envía uno
de los dos, nunca ambos.

- Si los roles incluyen `LAWYER`, **debe enviarse uno de los dos**. La ficha
  profesional corresponde a quien ejerce.
- Si los roles no incluyen `LAWYER`, no debe enviarse ninguno de los dos. Un
  usuario con rol `ADMINISTRATOR` o `SECRETARY` que no ejerce no posee
  matrícula.

Cuando se envía `lawyer`, el registro del abogado y el del usuario se realizan
en **una única transacción**: si alguna de las dos operaciones falla, ninguna
se persiste. Esto evita que un fallo en el alta del usuario deje un abogado
registrado sin vínculo, situación que el cliente no puede revertir.

La contraseña se envía en esta petición y es asignada al usuario en el momento
del alta.

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 15,
		"username": "iperalta",
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER"],
		"lawyer": {
			"id": 4,
			"lastName": "Peralta",
			"firstName": "Ignacio",
			"registrationNumber": "1-35207"
		},
		"lastLoginAt": null,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"username": "El nombre de usuario no cumple con el formato requerido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "USERNAME_ALREADY_EXISTS",
		"message": "El nombre de usuario ya se encuentra registrado.",
		"details": null
	}
}
```

```json
{
	"error": {
		"code": "EMAIL_ALREADY_EXISTS",
		"message": "El correo electrónico ya se encuentra registrado.",
		"details": null
	}
}
```

```json
{
	"error": {
		"code": "LAWYER_REGISTRATION_ALREADY_EXISTS",
		"message": "La matrícula del abogado ya se encuentra registrada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede registrar el usuario debido a una regla de negocio.",
		"details": null
	}
}
```

---

#### `GET /users`

Obtiene una lista paginada de usuarios.

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                                    |
| --------- | ------- | :-------: | ----------------- | ------------------- | ---------------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                               |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página        |
| `search`  | String  |    No     | -                 | -                   | Filtra por `username`, `lastName` y `firstName` |
| `role`    | String  |    No     | -                 | Rol válido          | Filtra por los usuarios que poseen ese rol     |

Ejemplo:

```http
GET /api/v1/users?page=1&limit=20&search=peralta&role=LAWYER
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"username": "fvazquez",
			"lastName": "Vázquez",
			"firstName": "Fernando G.",
			"email": "fvazquez@vazquezzarate.com",
			"roles": ["ADMINISTRATOR", "LAWYER"],
			"lawyer": {
				"id": 1,
				"lastName": "Vázquez",
				"firstName": "Fernando G.",
				"registrationNumber": "1-28114"
			},
			"lastLoginAt": "2026-09-19T08:12:00-03:00",
			"active": true
		},
		{
			"id": 8,
			"username": "gestion",
			"lastName": "Estudio",
			"firstName": "Gestión",
			"email": "gestion@vazquezzarate.com",
			"roles": ["SECRETARY"],
			"lawyer": null,
			"lastLoginAt": "2026-09-19T07:58:00-03:00",
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 9,
		"totalPages": 1
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"role": "No existe un rol con ese nombre."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

---

#### `GET /users/{userId}`

Obtiene la información de un usuario específico.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                     |
| --------- | ------- | ------------------------------- |
| `userId`  | Integer | Identificador único del usuario |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 15,
		"username": "iperalta",
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER"],
		"lawyer": {
			"id": 4,
			"lastName": "Peralta",
			"firstName": "Ignacio",
			"registrationNumber": "1-35207"
		},
		"lastLoginAt": "2026-09-19T18:20:00-03:00",
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del usuario no es válido.",
		"details": {
			"userId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "USER_NOT_FOUND",
		"message": "No se encontró el usuario solicitado.",
		"details": null
	}
}
```

---

#### `PATCH /users/{userId}`

Modifica parcialmente la información de un usuario.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                     |
| --------- | ------- | ------------------------------- |
| `userId`  | Integer | Identificador único del usuario |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"username": "iperalta",
	"lastName": "Peralta",
	"firstName": "Ignacio",
	"email": "iperalta@vazquezzarate.com",
	"roles": ["LAWYER", "ADMINISTRATOR"],
	"lawyerId": 4
}
```

| Campo      | Tipo               | Descripción                                                          |
| ---------- | ------------------ | -------------------------------------------------------------------- |
| `username` | String             | Mismas restricciones que en el alta                                  |
| `lastName` | String             | Mismas restricciones que en el alta                                  |
| `firstName`| String             | Mismas restricciones que en el alta                                  |
| `email`    | String             | Mismas restricciones que en el alta                                  |
| `roles`    | `Role[]`           | Reemplaza el conjunto completo de roles                              |
| `lawyerId` | Integer \| `null`  | `null` desvincula la ficha profesional                               |

Este endpoint no modifica la contraseña. El cambio de contraseña se realiza
mediante `PATCH /auth/password`.

El campo `roles` reemplaza el conjunto completo: para conservar los roles
existentes debe omitirse el campo, no enviarse parcialmente.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 15,
		"username": "iperalta",
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER", "ADMINISTRATOR"],
		"lawyer": {
			"id": 4,
			"lastName": "Peralta",
			"firstName": "Ignacio",
			"registrationNumber": "1-35207"
		},
		"lastLoginAt": "2026-09-19T18:20:00-03:00",
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"username": "El nombre de usuario no cumple con el formato requerido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "USER_NOT_FOUND",
		"message": "No se encontró el usuario solicitado.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "USERNAME_ALREADY_EXISTS",
		"message": "El nombre de usuario ya se encuentra registrado.",
		"details": null
	}
}
```

```json
{
	"error": {
		"code": "EMAIL_ALREADY_EXISTS",
		"message": "El correo electrónico ya se encuentra registrado.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede modificar el usuario debido a una regla de negocio.",
		"details": null
	}
}
```

---

#### `DELETE /users/{userId}`

Da de baja un usuario.

**La baja es lógica, pero el cliente no la percibe.** El backend establece
`active` en `false` y conserva el registro; para el cliente el usuario deja de
existir. No puede iniciar sesión, sus sesiones abiertas se cierran desde la
próxima petición que haga (ver [Sesión y revocación](#sesión-y-revocación)),
no aparece en ningún listado y `GET /users/{userId}` responde `404`. No existe
forma de consultarlo ni de reactivarlo desde la API.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                     |
| --------- | ------- | ------------------------------- |
| `userId`  | Integer | Identificador único del usuario |

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del usuario no es válido.",
		"details": {
			"userId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "USER_NOT_FOUND",
		"message": "No se encontró el usuario solicitado.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede dar de baja el usuario debido a una regla de negocio.",
		"details": null
	}
}
```

---

### 3.3 Gestión de abogados: /lawyers

**Autenticación requerida:** Sí.
**Rol requerido:** la lectura (`GET`) está habilitada para cualquier usuario
autenticado; la escritura (`POST`, `PATCH`, `DELETE`) requiere
`ADMINISTRATOR`.

La lectura se abrió en V3 porque HU13 la asigna a la Secretaría, el
prototipo muestra la sección en modo consulta a todos los perfiles y el
formulario de alta de causa —que opera cualquier perfil— necesita el listado de
abogados para elegir al responsable.

El recurso abogado posee la siguiente estructura:

| Campo                | Tipo    | Nulo | Descripción                                                          |
| -------------------- | ------- | :--: | -------------------------------------------------------------------- |
| `id`                 | Integer |  No  | Identificador único                                                  |
| `lastName`           | String  |  No  | Apellido. Nuevo en V4: reemplaza a `fullName`                        |
| `firstName`          | String  |  No  | Nombres, sin el tratamiento ("Dr.", "Dra."). Nuevo en V4          |
| `registrationNumber` | String  |  No  | Matrícula. Única                                                     |
| `activeCases`        | Integer |  No  | Causas activas en las que es responsable. Calculado, sólo lectura    |
| `active`             | Boolean |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /lawyers/{lawyerId}` |

**Sobre `lastName` y `firstName`:** reemplazan a `fullName` desde V4 (D-68). El tratamiento ("Dr.", "Dra.") deja de formar parte del nombre: lo pone
el frontend (D-81).

**Formato de la matrícula:** el vigente en el Colegio de Abogados de Córdoba,
compuesto por circunscripción y número separados por guión: `1-28114`.

**Sobre `activeCases`:** desde V3 el módulo de causas existe y
el campo deja de valer `0` fijo. Se calcula según la definición de
[causa activa](#causa-activa) de la sección 4.

---

#### `POST /lawyers`

Registra un nuevo abogado en el sistema.

**Rol requerido:** `ADMINISTRATOR`.

**Cuerpo de la petición**

```json
{
	"lastName": "Peralta",
	"firstName": "Ignacio",
	"registrationNumber": "1-35207"
}
```

| Campo                | Tipo   | Requerido | Restricciones                 |
| -------------------- | ------ | :-------: | ----------------------------- |
| `lastName`           | String |    Sí     | Hasta 100 caracteres          |
| `firstName`          | String |    Sí     | Hasta 100 caracteres          |
| `registrationNumber` | String |    Sí     | Formato `1-28114`. Única      |

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 4,
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"registrationNumber": "1-35207",
		"activeCases": 0,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"registrationNumber": "El formato de la matrícula no es válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LAWYER_REGISTRATION_ALREADY_EXISTS",
		"message": "La matrícula del abogado ya se encuentra registrada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede registrar el abogado debido a una regla de negocio.",
		"details": null
	}
}
```

---

#### `GET /lawyers`

Obtiene una lista paginada de abogados.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                                        |
| --------- | ------- | :-------: | ----------------- | ------------------- | -------------------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                                   |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página            |
| `search`  | String  |    No     | -                 | -                   | Filtra por `lastName`, `firstName` y `registrationNumber` |

Ejemplo:

```http
GET /api/v1/lawyers?page=1&limit=20&search=peralta
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"lastName": "Vázquez",
			"firstName": "Fernando G.",
			"registrationNumber": "1-28114",
			"activeCases": 14,
			"active": true
		},
		{
			"id": 4,
			"lastName": "Peralta",
			"firstName": "Ignacio",
			"registrationNumber": "1-35207",
			"activeCases": 16,
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 7,
		"totalPages": 1
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /lawyers/{lawyerId}`

Obtiene la información de un abogado específico.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro  | Tipo    | Descripción                     |
| ---------- | ------- | ------------------------------- |
| `lawyerId` | Integer | Identificador único del abogado |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 4,
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"registrationNumber": "1-35207",
		"activeCases": 16,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del abogado no es válido.",
		"details": {
			"lawyerId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LAWYER_NOT_FOUND",
		"message": "No se encontró el abogado solicitado.",
		"details": null
	}
}
```

---

#### `PATCH /lawyers/{lawyerId}`

Modifica parcialmente la información de un abogado.

**Rol requerido:** `ADMINISTRATOR`.

> Sin cambios respecto de V2. Corresponde a HU14, planificada para el
> Sprint 4; se mantiene en el contrato porque ya figuraba en V2.

**Parámetros de ruta**

| Parámetro  | Tipo    | Descripción                     |
| ---------- | ------- | ------------------------------- |
| `lawyerId` | Integer | Identificador único del abogado |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"lastName": "Peralta",
	"firstName": "Ignacio",
	"registrationNumber": "1-35207"
}
```

| Campo                | Tipo    | Descripción                                |
| -------------------- | ------- | ------------------------------------------ |
| `lastName`           | String  | -                                          |
| `firstName`          | String  | -                                          |
| `registrationNumber` | String  | Formato `1-28114`. Única                   |

El campo `activeCases` no es modificable: lo calcula el backend.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 4,
		"lastName": "Peralta",
		"firstName": "Ignacio",
		"registrationNumber": "1-35207",
		"activeCases": 16,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"registrationNumber": "El formato de la matrícula no es válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LAWYER_NOT_FOUND",
		"message": "No se encontró el abogado solicitado.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LAWYER_REGISTRATION_ALREADY_EXISTS",
		"message": "La matrícula del abogado ya se encuentra registrada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede modificar el abogado debido a una regla de negocio.",
		"details": null
	}
}
```

---

#### `DELETE /lawyers/{lawyerId}`

Da de baja un abogado.

**Rol requerido:** `ADMINISTRATOR`.

> Sin cambios respecto de V2. Corresponde a HU15, planificada para el
> Sprint 5.

**La baja es lógica, pero el cliente no la percibe.** El backend establece
`active` en `false` y conserva el registro; para el cliente el abogado deja de
existir. No aparece en ningún listado, no puede vincularse a un usuario ni
asignarse como responsable de una causa, y `GET /lawyers/{lawyerId}` responde
`404`. No existe forma de consultarlo ni de reactivarlo desde la API.

**Parámetros de ruta**

| Parámetro  | Tipo    | Descripción                     |
| ---------- | ------- | ------------------------------- |
| `lawyerId` | Integer | Identificador único del abogado |

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del abogado no es válido.",
		"details": {
			"lawyerId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LAWYER_NOT_FOUND",
		"message": "No se encontró el abogado solicitado.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LAWYER_HAS_DEPENDENCIES",
		"message": "No se puede dar de baja el abogado porque posee recursos asociados.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede dar de baja el abogado debido a una regla de negocio.",
		"details": null
	}
}
```

---

### 3.4 Estados procesales: /procedural-states

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado, tanto para la lectura
(`GET`) como para la escritura (`POST`, `PATCH`, `DELETE`).

Según la tabla de [permisos por perfil](#permisos-por-perfil), la
administración de estados procesales (HU16, HU17, HU45 y HU46) corresponde a
los tres perfiles (ver [D-39](#81-decisiones-tomadas), que reemplaza a D-04).

El recurso estado procesal posee la siguiente estructura:

| Campo           | Tipo           | Nulo | Descripción                                                                  |
| --------------- | -------------- | :--: | ---------------------------------------------------------------------------- |
| `id`            | Integer        |  No  | Identificador único                                                          |
| `name`          | String         |  No  | Denominación del estado, en castellano. Texto libre. Única dentro del fuero  |
| `jurisdiction`  | `Jurisdiction` |  No  | Fuero al que pertenece                                                       |
| `timeLimitDays` | Integer        |  No  | Días que abre el estado. `0` indica que no abre plazo                        |
| `dayType`       | `DayType`      |  No  | Forma de cómputo de los días                                                 |
| `terminal`      | Boolean        |  No  | Indica si el estado cierra el ciclo de vida de la causa                      |
| `caseCount`     | Integer        |  No  | Causas que se encuentran en este estado, activas o no (las dadas de baja no cuentan). Calculado, sólo lectura. Solo en las respuestas de `GET`. Nuevo en V4: reemplaza a `activeCases` |
| `active`        | Boolean        |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /procedural-states/{stateId}` |

**Sobre `name`:** RN4 establece que los estados procesales dependen del fuero y
son parametrizables, es decir que los da de alta el estudio. Por ese motivo la
denominación es texto libre en castellano —"Designación de abogado defensor",
"Oposición al requerimiento de elevación"— y no un valor de un conjunto
cerrado. La unicidad es **por fuero**: "Archivada" existe en los tres.

**Sobre el orden:** los estados procesales no tienen posición ni orden dentro
del fuero: se listan en el orden en que se registraron. Una causa nueva no
entra a ningún estado de la tabla: nace en el estado inicial, y su primer acto
puede llevarla a cualquier estado del fuero salvo "Prescripta" (ver
[`POST /cases`](#post-cases) y D-69).

**Estado inicial.** Cada fuero tiene además un estado de sistema, **"Iniciada"**,
en el que nace toda causa. No forma parte de este recurso: no aparece en los
listados, `GET /procedural-states/{stateId}` responde `404` con su
identificador, no se modifica ni se da de baja y no puede elegirse como destino
de un acto. Su denominación está reservada: registrar en un fuero un estado
llamado "Iniciada" responde `409 PROCEDURAL_STATE_ALREADY_EXISTS`.

**Estado "Prescripta".** Desde esta versión el fuero `CRIMINAL` tiene un
segundo estado de sistema, **"Prescripta"**, terminal: es el estado al que pasa
una causa penal cuando se la marca como prescripta (HU33, ver
[`POST /cases/{caseId}/prescription`](#post-casescaseidprescription)). A
diferencia de "Iniciada", **sí forma parte de este recurso**: aparece en el
listado del fuero con `terminal` en `true`, como lo muestra la tabla "Estados y
plazos" del prototipo, y sirve de filtro en el listado de causas. Lo crea el
sistema, y está **protegido**: `PATCH` y `DELETE` sobre él responden
`422 PROCEDURAL_STATE_PROTECTED`, porque renombrarlo o darlo de baja dejaría a
HU33 sin estado de destino. A diferencia de los demás estados terminales,
**no puede elegirse como destino de un acto procesal**: a "Prescripta" se llega
solo con su propio botón y formulario (D-69). Su denominación está reservada en el fuero penal: registrar
otro estado llamado "Prescripta" responde `409 PROCEDURAL_STATE_ALREADY_EXISTS`
(ver [D-53](#81-decisiones-tomadas)).

**Sobre `caseCount`:** cuenta las causas que hoy están en el estado, **activas
o no**: también las que están en un estado terminal, como "Archivada" o
"Prescripta". No cuenta las dadas de baja ni las que están en "Iniciada". En la
tabla del prototipo es la columna "Causas". Reemplaza a `activeCases`, que solo
contaba causas activas y por eso valía siempre `0` en los estados terminales
(D-70). Es un dato de consulta: se devuelve **solo en las respuestas
de `GET`**; las respuestas de `POST` y `PATCH` no lo incluyen.

**Sobre el efecto de los cambios en las causas:** renombrar un estado actualiza
la denominación en todas las causas que lo tienen, porque la causa referencia
al estado y no copia su nombre. En cambio, modificar `timeLimitDays` o
`dayType` **no recalcula los vencimientos ya registrados**: el plazo nuevo rige
para los actos procesales que se registren de ahí en adelante. Así lo indica el
prototipo al modificar un estado en uso.

---

#### `POST /procedural-states`

Registra un nuevo estado procesal (HU45).

**Rol requerido:** cualquier usuario autenticado.

**Cuerpo de la petición**

```json
{
	"name": "Oposición al requerimiento de elevación",
	"jurisdiction": "CRIMINAL",
	"timeLimitDays": 5,
	"dayType": "BUSINESS",
	"terminal": false
}
```

| Campo           | Tipo           | Requerido | Valor por defecto | Restricciones                                                                     |
| --------------- | -------------- | :-------: | ----------------- | --------------------------------------------------------------------------------- |
| `name`          | String         |    Sí     | -                 | Única dentro del fuero                                                            |
| `jurisdiction`  | `Jurisdiction` |    Sí     | -                 | Fuero válido                                                                      |
| `timeLimitDays` | Integer        |    No     | `0`               | Mayor o igual a `0`                                                               |
| `dayType`       | `DayType`      |    No     | `NONE`            | Debe ser `NONE` si `timeLimitDays` es `0`, y distinto de `NONE` si es mayor a `0` |
| `terminal`      | Boolean        |    No     | `false`           | -                                                                                 |

**Correspondencia con el formulario.** La opción
"Sin plazo" del selector "Se cuentan en días" corresponde a `dayType: "NONE"`
con `timeLimitDays: 0`.

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 12,
		"name": "Oposición al requerimiento de elevación",
		"jurisdiction": "CRIMINAL",
		"timeLimitDays": 5,
		"dayType": "BUSINESS",
		"terminal": false,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"dayType": "Debe indicarse el tipo de día cuando el plazo es mayor a 0."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_ALREADY_EXISTS",
		"message": "Ya existe un estado procesal con esa denominación en el fuero.",
		"details": null
	}
}
```

---

#### `GET /procedural-states`

Obtiene una lista paginada de los estados procesales.

**Rol requerido:** cualquier usuario autenticado.

Los resultados se ordenan por `jurisdiction` y, dentro de cada fuero, por
orden de registro (`id` ascendente). El estado inicial "Iniciada" no forma
parte del listado.

**Parámetros de consulta**

| Parámetro      | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| -------------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`         | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`        | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |
| `search`       | String  |    No     | -                 | -                   | Filtra por `name`                       |
| `jurisdiction` | String  |    No     | -                 | Fuero válido        | Filtra por fuero                        |

Ejemplo:

```http
GET /api/v1/procedural-states?page=1&limit=100&jurisdiction=ADMINISTRATIVE
```

La pestaña de un fuero en "Estados y plazos" y el selector de estado del
registro de acto procesal piden todos los estados del fuero con `limit=100`.

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"name": "Notificación de imputación en sumario",
			"jurisdiction": "ADMINISTRATIVE",
			"timeLimitDays": 10,
			"dayType": "BUSINESS",
			"terminal": false,
			"caseCount": 7,
			"active": true
		},
		{
			"id": 7,
			"name": "Archivada",
			"jurisdiction": "ADMINISTRATIVE",
			"timeLimitDays": 0,
			"dayType": "NONE",
			"terminal": true,
			"caseCount": 17,
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 100,
		"totalItems": 7,
		"totalPages": 1
	}
}
```

`caseCount` cuenta también las causas en estados terminales: "Archivada" y
"Prescripta" muestran cuántas causas cerraron así (D-70).

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"jurisdiction": "No existe un fuero procesal con ese nombre."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /procedural-states/{stateId}`

Obtiene la información de un estado procesal específico.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                             |
| --------- | ------- | --------------------------------------- |
| `stateId` | Integer | Identificador único del estado procesal |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 12,
		"name": "Oposición al requerimiento de elevación",
		"jurisdiction": "CRIMINAL",
		"timeLimitDays": 5,
		"dayType": "BUSINESS",
		"terminal": false,
		"caseCount": 7,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del estado procesal no es válido.",
		"details": {
			"stateId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_NOT_FOUND",
		"message": "No se encontró el estado procesal solicitado.",
		"details": null
	}
}
```

---

#### `PATCH /procedural-states/{stateId}`

Modifica parcialmente un estado procesal (HU17).

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                             |
| --------- | ------- | --------------------------------------- |
| `stateId` | Integer | Identificador único del estado procesal |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"name": "Oposición al requerimiento de elevación a juicio",
	"timeLimitDays": 6,
	"dayType": "BUSINESS",
	"terminal": false
}
```

| Campo           | Tipo           | Descripción                                                                |
| --------------- | -------------- | -------------------------------------------------------------------------- |
| `name`          | String         | Única dentro del fuero                                                     |
| `timeLimitDays` | Integer        | Mayor o igual a `0`                                                        |
| `dayType`       | `DayType`      | Debe ser coherente con `timeLimitDays`                                     |
| `terminal`      | Boolean        | -                                                                          |

**El fuero no es modificable.** Un estado procesal no puede cambiar de fuero:
para trasladarlo debe darse de baja y registrarse en el fuero que corresponda.
Si el cuerpo incluye `jurisdiction`, aunque sea con el valor que ya tiene, se
responde `400 VALIDATION_ERROR` sobre ese campo (ver
[D-36](#81-decisiones-tomadas), que revierte a D-07).

**Correspondencia con el formulario.** La opción "—" del
selector de tipo de día corresponde a `dayType: "NONE"`.

El campo `caseCount` no es modificable y no se incluye en esta respuesta:
se consulta con `GET`.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 12,
		"name": "Oposición al requerimiento de elevación a juicio",
		"jurisdiction": "CRIMINAL",
		"timeLimitDays": 6,
		"dayType": "BUSINESS",
		"terminal": false,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"dayType": "Debe ser NONE cuando el plazo es 0."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"jurisdiction": "El fuero de un estado procesal no se puede modificar."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_NOT_FOUND",
		"message": "No se encontró el estado procesal solicitado.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_ALREADY_EXISTS",
		"message": "Ya existe un estado procesal con esa denominación en el fuero.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

El estado es "Prescripta", el estado de sistema del fuero penal (nuevo en V4):

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_PROTECTED",
		"message": "El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja.",
		"details": null
	}
}
```

---

#### `DELETE /procedural-states/{stateId}`

Da de baja un estado procesal (HU46).

**Rol requerido:** cualquier usuario autenticado.

**La baja es lógica, pero el cliente no la percibe.** El backend establece
`active` en `false` y conserva el registro; para el cliente el estado deja de
existir. No aparece en ningún listado, no puede elegirse como destino de un
acto procesal y `GET /procedural-states/{stateId}` responde `404`. No existe
forma de consultarlo ni de reactivarlo desde la API.

**La baja procede aunque haya causas en ese estado.** Es un cambio respecto de
V2, que la rechazaba con `409 PROCEDURAL_STATE_HAS_DEPENDENCIES`. El prototipo
indica que las causas que están en el estado **lo conservan**: siguen
mostrándolo como estado actual (con su denominación) hasta que un acto procesal
las lleve a otro, y los vencimientos ya calculados no se alteran. Lo único que
cambia es que ninguna causa puede volver a avanzar hacia él.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                             |
| --------- | ------- | --------------------------------------- |
| `stateId` | Integer | Identificador único del estado procesal |

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del estado procesal no es válido.",
		"details": {
			"stateId": "Debe ser un número entero válido."
		}
	}
}
```


**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_NOT_FOUND",
		"message": "No se encontró el estado procesal solicitado.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

El estado es "Prescripta", el estado de sistema del fuero penal (nuevo en V4):

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_PROTECTED",
		"message": "El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja.",
		"details": null
	}
}
```

---

### 3.5 Calificaciones legales: /legal-qualifications

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado, tanto para la lectura
(`GET`) como para la escritura (`POST`, `PATCH`, `DELETE`).

La calificación legal es el encuadre jurídico del hecho imputado y **determina
el plazo de prescripción de la acción** (glosario del Plan de Proyecto). Forma
parte de la parametrización jurídica (EP-03), junto con los estados procesales.
Una causa penal puede registrar una o más, o ninguna (es opcional); si
concurren varios delitos, registra una por cada uno, y cada una computa su propia prescripción desde la fecha del
hecho que se carga junto con ella (ver [`/cases`](#37-causas-cases)).

Según la tabla de [permisos por perfil](#permisos-por-perfil), la
administración de calificaciones legales (HU47 a HU50) corresponde a los tres
perfiles, tanto desde la pantalla de Administración como desde el botón
"Registrar calificación nueva" del alta de causa (ver
[D-39](#81-decisiones-tomadas), que reemplaza a D-04).

El recurso calificación legal posee la siguiente estructura:

| Campo                | Tipo    | Nulo | Descripción                                                                         |
| -------------------- | ------- | :--: | ----------------------------------------------------------------------------------- |
| `id`                 | Integer |  No  | Identificador único                                                                 |
| `name`               | String  |  No  | Denominación, incluida la norma: `Hurto simple — art. 162 CP`. Única entre las vigentes |
| `prescriptionMonths` | Integer |  No  | Plazo de prescripción de la acción, expresado en meses                              |
| `activeCases`        | Integer |  No  | Causas activas que la registran. Calculado, sólo lectura. Solo en las respuestas de `GET` |
| `active`             | Boolean |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /legal-qualifications/{qualificationId}` |

**Sobre `name`:** el prototipo carga en un único campo la denominación del
delito y el artículo, y el buscador de la pantalla filtra "por nombre o
artículo". Por eso no se separan en dos campos. La carátula sugerida del alta
de causa usa solo la parte anterior al guión largo (`Hurto simple`); ese corte
lo hace el cliente.

**Sobre `prescriptionMonths`:** el prototipo pide el plazo como años enteros
más un selector de meses (`0` a `11`), para admitir plazos como "6 años y
medio", y lo guarda como un entero de meses. El contrato recibe y devuelve
directamente los meses; la conversión a "6 años y 6 meses" la resuelve el
cliente.

**Sobre el efecto de los cambios en las causas:** la causa referencia a la
calificación, no copia sus datos. Modificar `prescriptionMonths` **recalcula la
prescripción** de las causas que la registran, tal como advierte el prototipo
("Cambiar el plazo recalcula su prescripción"). Esto es lo opuesto a lo que
ocurre con el plazo de un estado procesal, y es deliberado: la prescripción es
un cálculo vivo sobre la causa, el vencimiento de un acto es un hecho registrado.

---

#### `POST /legal-qualifications`

Registra una nueva calificación legal.

**Rol requerido:** cualquier usuario autenticado.

**Cuerpo de la petición**

```json
{
	"name": "Hurto simple — art. 162 CP",
	"prescriptionMonths": 24
}
```

| Campo                | Tipo    | Requerido | Restricciones                                    |
| -------------------- | ------- | :-------: | ------------------------------------------------ |
| `name`               | String  |    Sí     | Hasta 255 caracteres. Única entre las vigentes, sin distinguir mayúsculas |
| `prescriptionMonths` | Integer |    Sí     | Mayor o igual a `1`                              |

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 6,
		"name": "Hurto simple — art. 162 CP",
		"prescriptionMonths": 24,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"prescriptionMonths": "Debe ser un número entero mayor o igual a 1."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_ALREADY_EXISTS",
		"message": "Ya existe una calificación legal con esa denominación.",
		"details": null
	}
}
```

---

#### `GET /legal-qualifications`

Obtiene una lista paginada de las calificaciones legales vigentes, ordenadas
alfabéticamente por `name`.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| --------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |
| `search`  | String  |    No     | -                 | -                   | Filtra por `name`, lo que incluye el artículo |

Ejemplo:

```http
GET /api/v1/legal-qualifications?page=1&limit=20&search=art. 162
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 8,
			"name": "Abuso de armas — art. 104 CP",
			"prescriptionMonths": 78,
			"activeCases": 1,
			"active": true
		},
		{
			"id": 4,
			"name": "Amenazas coactivas — art. 149 bis CP",
			"prescriptionMonths": 24,
			"activeCases": 2,
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 8,
		"totalPages": 1
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /legal-qualifications/{qualificationId}`

Obtiene una calificación legal específica.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro         | Tipo    | Descripción                                 |
| ----------------- | ------- | ------------------------------------------- |
| `qualificationId` | Integer | Identificador único de la calificación legal |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 1,
		"name": "Robo calificado — art. 167 inc. 2 CP",
		"prescriptionMonths": 96,
		"activeCases": 3,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador de la calificación legal no es válido.",
		"details": {
			"qualificationId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "No se encontró la calificación legal solicitada.",
		"details": null
	}
}
```

---

#### `PATCH /legal-qualifications/{qualificationId}`

Modifica parcialmente una calificación legal.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro         | Tipo    | Descripción                                 |
| ----------------- | ------- | ------------------------------------------- |
| `qualificationId` | Integer | Identificador único de la calificación legal |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"name": "Robo calificado — art. 167 inc. 2 CP",
	"prescriptionMonths": 96
}
```

| Campo                | Tipo    | Descripción                                                    |
| -------------------- | ------- | -------------------------------------------------------------- |
| `name`               | String  | Mismas restricciones que en el alta                            |
| `prescriptionMonths` | Integer | Mayor o igual a `1`. Recalcula la prescripción de sus causas   |

El campo `activeCases` no es modificable y no se incluye en esta respuesta:
se consulta con `GET`.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 1,
		"name": "Robo calificado — art. 167 inc. 2 CP",
		"prescriptionMonths": 96,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"name": "No puede estar vacío."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "No se encontró la calificación legal solicitada.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_ALREADY_EXISTS",
		"message": "Ya existe una calificación legal con esa denominación.",
		"details": null
	}
}
```

---

#### `DELETE /legal-qualifications/{qualificationId}`

Da de baja una calificación legal.

**Rol requerido:** cualquier usuario autenticado.

**La baja es lógica, pero el cliente no la percibe.** El backend establece
`active` en `false` y conserva el registro; la calificación deja de aparecer en
el listado, deja de ofrecerse al registrar causas nuevas y
`GET /legal-qualifications/{qualificationId}` responde `404`. No existe forma
de reactivarla desde la API.

**La baja procede aunque haya causas que la registren.** Según el prototipo,
esas causas **la conservan**: siguen mostrándola en su detalle y siguen
computando su prescripción con ella. Por eso la baja no responde `409`.

**Parámetros de ruta**

| Parámetro         | Tipo    | Descripción                                 |
| ----------------- | ------- | ------------------------------------------- |
| `qualificationId` | Integer | Identificador único de la calificación legal |

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador de la calificación legal no es válido.",
		"details": {
			"qualificationId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "No se encontró la calificación legal solicitada.",
		"details": null
	}
}
```

---

### 3.6 Clientes: /clients

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado, tanto para la lectura
(`GET`) como para el alta (`POST`).

Según la tabla de [permisos por perfil](#permisos-por-perfil), la
administración de clientes (HU8 a HU11) corresponde a los tres perfiles. El
botón "Registrar cliente nuevo" del alta de causa queda, por lo tanto,
habilitado para cualquier usuario (ver [D-39](#81-decisiones-tomadas), que
reemplaza a D-05).

La modificación y la baja de clientes (HU10 y HU11) corresponden al Sprint 5 y
no forman parte de esta versión.

El recurso cliente posee la siguiente estructura:

| Campo         | Tipo                         | Nulo | Descripción                                                              |
| ------------- | ---------------------------- | :--: | ------------------------------------------------------------------------ |
| `id`          | Integer                      |  No  | Identificador único                                                      |
| `lastName`    | String                       |  No  | Apellido                                                                 |
| `firstName`   | String                       |  No  | Nombres                                                                  |
| `dni`         | String                       |  No  | Número de DNI, solo dígitos. Único entre los clientes vigentes           |
| `phone`       | String \| `null`             |  Sí  | Teléfono de contacto. Texto libre                                        |
| `email`       | String \| `null`             |  Sí  | Correo electrónico                                                       |
| `clientSince` | String (fecha ISO 8601)      |  No  | Fecha de alta del cliente en el estudio. La asigna el backend            |
| `activeCases` | Integer                      |  No  | Causas activas en las que es cliente. Calculado, sólo lectura            |
| `active`      | Boolean                      |  No  | Estado de alta. Vale siempre `true`                                      |

**Sobre `lastName` y `firstName`:** el cliente fue la primera persona del
sistema con apellido y nombres en campos separados, conforme a la observación
de la Sprint Review del Sprint 1 y al formulario del prototipo. El backend los
guarda tal como llegan; la forma `GÓMEZ, Ariel Fernando` que se ve en el
listado y en la carátula sugerida la compone el cliente. Desde V4, usuarios y
abogados siguen el mismo criterio (D-68).

**Sobre `dni`:** viaja sin puntos (`34812905`). El formato `34.812.905` es de
presentación y lo aplica el cliente. Se conserva la sigla, como `SacNumber`,
por tratarse de un documento argentino sin equivalente directo
(ver [D-24](#81-decisiones-tomadas)).

**Sobre `clientSince`:** el prototipo lo asigna con la fecha del día al
registrar el cliente y no lo ofrece para editar.

---

#### `POST /clients`

Registra un nuevo cliente (HU8).

**Rol requerido:** cualquier usuario autenticado.

**Cuerpo de la petición**

```json
{
	"lastName": "BENÍTEZ",
	"firstName": "Rodrigo E.",
	"dni": "31556208",
	"phone": "351 401-5573",
	"email": "rbenitez@gmail.com"
}
```

| Campo       | Tipo   | Requerido | Restricciones                                           |
| ----------- | ------ | :-------: | ------------------------------------------------------- |
| `lastName`  | String |    Sí     | Hasta 100 caracteres                                    |
| `firstName` | String |    Sí     | Hasta 100 caracteres                                    |
| `dni`       | String |    Sí     | Entre 7 y 8 dígitos, sin puntos. Único entre los vigentes |
| `phone`     | String |    No     | Hasta 50 caracteres                                     |
| `email`     | String |    No     | Formato de correo electrónico válido                    |

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 7,
		"lastName": "BENÍTEZ",
		"firstName": "Rodrigo E.",
		"dni": "31556208",
		"phone": "351 401-5573",
		"email": "rbenitez@gmail.com",
		"clientSince": "2026-09-29",
		"activeCases": 0,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"dni": "Debe contener 7 u 8 dígitos, sin puntos.",
			"email": "El formato del correo electrónico no es válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "CLIENT_DNI_ALREADY_EXISTS",
		"message": "Ya existe un cliente registrado con ese DNI.",
		"details": null
	}
}
```

---

#### `GET /clients`

Obtiene una lista paginada de los clientes vigentes (HU9), ordenada por
`lastName` y luego por `firstName`.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                                          |
| --------- | ------- | :-------: | ----------------- | ------------------- | ---------------------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                                     |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página              |
| `search`  | String  |    No     | -                 | -                   | Filtra por `lastName`, por `firstName` y por `dni`   |

Ejemplo:

```http
GET /api/v1/clients?page=1&limit=20&search=gomez
```

Las causas asociadas a un cliente, que HU9 pide consultar, se obtienen con
[`GET /cases?clientId={clientId}`](#get-cases).

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 4,
			"lastName": "ACOSTA",
			"firstName": "Jonathan E.",
			"dni": "38907221",
			"phone": "351 744-1160",
			"email": null,
			"clientSince": "2022-01-19",
			"activeCases": 1,
			"active": true
		},
		{
			"id": 1,
			"lastName": "GÓMEZ",
			"firstName": "Ariel Fernando",
			"dni": "34812905",
			"phone": "351 415-2288",
			"email": "afgomez@gmail.com",
			"clientSince": "2021-03-12",
			"activeCases": 1,
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 7,
		"totalPages": 1
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /clients/{clientId}`

Obtiene la información de un cliente específico.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro  | Tipo    | Descripción                     |
| ---------- | ------- | ------------------------------- |
| `clientId` | Integer | Identificador único del cliente |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 1,
		"lastName": "GÓMEZ",
		"firstName": "Ariel Fernando",
		"dni": "34812905",
		"phone": "351 415-2288",
		"email": "afgomez@gmail.com",
		"clientSince": "2021-03-12",
		"activeCases": 1,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del cliente no es válido.",
		"details": {
			"clientId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CLIENT_NOT_FOUND",
		"message": "No se encontró el cliente solicitado.",
		"details": null
	}
}
```

---

### 3.7 Causas: /cases

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado para la lectura, el alta y la
carpeta de la causa. Marcar una causa como prescripta requiere `ADMINISTRATOR`
o `LAWYER`.

RN11 establece que todo el estudio accede a todas las causas, y el prototipo
habilita "Nueva causa" a los tres perfiles. La modificación y la baja de causas
(HU19 y HU21) corresponden al Sprint 4 y no forman parte de esta versión.

Esta versión suma a la causa tres cosas: la **prescripción que la rige**,
calculada por el backend y reiniciada por los actos interruptivos (HU31, HU32);
la posibilidad de **marcarla como prescripta** (HU33); y su **carpeta en la
nube**, con los modelos del fuero (HU39, HU40).

El recurso causa posee la siguiente estructura:

| Campo                     | Tipo                          | Nulo | Descripción                                                                                   |
| ------------------------- | ----------------------------- | :--: | --------------------------------------------------------------------------------------------- |
| `id`                      | Integer                       |  No  | Identificador único interno                                                                   |
| `sacNumber`               | String \| `null`              |  Sí  | Número de SAC: 8 dígitos. Opcional. Si se informa, es único en todo el sistema (RN2)          |
| `caption`                 | String                        |  No  | Carátula                                                                                      |
| `court`                   | String \| `null`              |  Sí  | Tribunal o dependencia                                                                        |
| `jurisdiction`            | `Jurisdiction`                |  No  | Fuero. Define el ciclo de vida y la tabla de plazos aplicable                                 |
| `proceduralRole`          | `ProceduralRole`              |  No  | Rol procesal del cliente                                                                      |
| `instructorName`          | String \| `null`              |  Sí  | Instructor de la causa: quien lleva la instrucción en el tribunal o la dependencia            |
| `tribunalPhone`           | String \| `null`              |  Sí  | Teléfono del instructor. Texto libre: `0351 448-1200`                                         |
| `instructorExtension`     | String \| `null`              |  Sí  | Número de interno del instructor. Texto libre: `214`                                          |
| `counterparty`            | String \| `null`              |  Sí  | Contraparte u organismo. Solo en `ADMINISTRATIVE` y `AMPARO`; en `CRIMINAL` vale `null`       |
| `subjectMatter`           | String \| `null`              |  Sí  | Objeto del reclamo (`ADMINISTRATIVE`) u objeto del amparo (`AMPARO`): el motivo por el que se inicia la causa, redactado por el abogado. En `CRIMINAL` vale `null` |
| `clientDetained`          | Boolean \| `null`             |  Sí  | **Nuevo.** Si el cliente está preso. Solo en `CRIMINAL`; en los demás fueros vale `null` |
| `injunctionGranted`       | Boolean \| `null`             |  Sí  | **Nuevo.** Si el juez hizo lugar a la medida cautelar. Solo en `AMPARO`; en los demás fueros vale `null` |
| `harmfulActDate`          | String (fecha ISO 8601) \| `null` |  Sí  | **Nuevo.** Fecha del acto lesivo: el objeto del amparo (`subjectMatter`). Solo en `AMPARO`; `null` si no se informó o en los demás fueros |
| `harmfulActRenews`        | Boolean \| `null`             |  Sí  | **Nuevo.** Si el acto lesivo se renueva. Solo en `AMPARO`; en los demás fueros vale `null` |
| `harmfulActRenewalDays`   | Integer \| `null`             |  Sí  | **Nuevo.** Cada cuántos días corridos se renueva el acto lesivo. Solo si `harmfulActRenews` es `true`; si no, `null` |
| `harmfulActTermDays`      | Integer \| `null`             |  Sí  | **Nuevo.** Plazo para presentar el amparo desde el acto lesivo, en días. Solo en `AMPARO` con `harmfulActDate` |
| `harmfulActTermDayType`   | `DayType` \| `null`           |  Sí  | **Nuevo.** Cómo se cuentan esos días: `BUSINESS` o `CONSECUTIVE`. Solo en `AMPARO` con `harmfulActDate` |
| `harmfulActDeadline`      | Object \| `null`              |  Sí  | **Nuevo.** Vencimiento para presentar el amparo, calculado. Ver estructura más abajo |
| `administrativeRemedyExhaustedOn` | String (fecha ISO 8601) \| `null` | Sí | **Nuevo.** Fecha de agotamiento de la vía administrativa. Solo en `ADMINISTRATIVE`; `null` mientras no se agotó o en los demás fueros |
| `courtFeePaid`            | Boolean                       |  No  | **Nuevo.** Si se pagó la tasa de justicia. En los tres fueros |
| `client`                  | Object                        |  No  | Cliente de la causa. Ver estructura más abajo                                                 |
| `responsibleLawyer`       | Object                        |  No  | Abogado responsable (RN3): `id`, `lastName`, `firstName`, `registrationNumber`                             |
| `legalQualifications`     | Object[]                      |  No  | Calificaciones legales, cada una con su fecha del hecho y su prescripción. Opcional en `CRIMINAL`; vacío en los demás |
| `prescription`            | Object \| `null`              |  Sí  | **Nuevo.** Prescripción que rige la causa: la de la calificación que prescribe primero. `null` si la causa no computa prescripción. Calculado |
| `prescriptionDeclaration` | Object \| `null`              |  Sí  | **Nuevo.** Constancia de que la causa fue marcada como prescripta (HU33). `null` mientras no lo fue |
| `startDate`               | String (fecha ISO 8601) \| `null` |  Sí  | Fecha de inicio de la causa en sede judicial. `null` mientras no tiene SAC (D-38). No interviene en el cómputo de la prescripción |
| `currentState`            | Object                        |  No  | Estado procesal actual, con el vencimiento del acto que llevó la causa a él. Ver estructura más abajo |
| `folder`                  | Object \| `null`              |  Sí  | **Nuevo.** Carpeta de la causa en la nube (HU39, HU40). `null` si no se pidió crearla         |
| `active`                  | Boolean                       |  No  | Estado de alta. Vale siempre `true` en esta versión                                           |

**Datos propios de cada fuero** (nuevos)

| Fuero            | Datos                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `CRIMINAL`       | `clientDetained`: si el cliente está preso                                                |
| `AMPARO`         | `injunctionGranted`: si el juez hizo lugar a la medida cautelar. `harmfulActDate`, `harmfulActRenews`, `harmfulActRenewalDays`, `harmfulActTermDays` y `harmfulActTermDayType`: fecha del acto lesivo, si se renueva y cada cuántos días, y el plazo para presentar el amparo. Con ellos el backend calcula `harmfulActDeadline` |
| `ADMINISTRATIVE` | `administrativeRemedyExhaustedOn`: fecha de agotamiento de la vía administrativa           |
| Los tres         | `courtFeePaid`: si se pagó la tasa de justicia                                            |

Un dato que no corresponde al fuero de la causa vale `null` en la respuesta y no
se envía en el alta. `courtFeePaid` es el dato que RN10 pedía y que el detalle
del prototipo insinuaba con "Registrar pago de tasa" (D-67).

Estos datos **no figuran en el prototipo**: el formulario de alta y el detalle
de la causa tienen que sumarlos. En esta versión **se cargan solo al registrar
la causa**; modificarlos llega con la modificación de causa (HU19). El único
cálculo que el contrato hace con ellos es el vencimiento del acto lesivo
(D-67, D-78).

**`harmfulActDeadline`** (nuevo)

En el amparo, la fecha del acto lesivo cumple una función parecida a la de la
prescripción: desde ella corre el plazo para presentar el amparo, y vencido ese
plazo ya no se puede presentar (D-78). `harmfulActDeadline` es ese vencimiento,
calculado por el backend.

| Campo                   | Tipo                    | Descripción                                                                                  |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `actDate`               | String (fecha ISO 8601) | Fecha vigente del acto lesivo: `harmfulActDate` o, si el acto se renueva, la última renovación que no supera hoy |
| `renewed`               | Boolean                 | `true` si `actDate` es una renovación y no la fecha cargada                                  |
| `dueDate`               | String (fecha ISO 8601) | Vencimiento para presentar el amparo: `actDate` más `harmfulActTermDays`, contados según `harmfulActTermDayType` |
| `businessDaysRemaining` | Integer                 | Días hábiles desde hoy hasta `dueDate`. `0`, vence hoy; negativo, vencido                     |

- **Renovaciones.** Si `harmfulActRenews` es `true`, el acto se renueva cada
  `harmfulActRenewalDays` días corridos contados desde `harmfulActDate`. El
  backend toma la renovación más reciente que no supera hoy y calcula el
  vencimiento desde ella. No se guarda historial de renovaciones ni hay que
  registrar cada una: la fecha cargada no cambia.
- **Cómputo del plazo.** En días `BUSINESS`, desde el día siguiente a `actDate`
  y sin sábados ni domingos; en días `CONSECUTIVE`, días corridos. Las mismas
  reglas que el vencimiento de un acto procesal (ver [Cómputo de días](#cómputo-de-días)).
- **Cuándo vale `null`.** Fuera del fuero `AMPARO`; cuando no se cargó
  `harmfulActDate`; y **en cuanto la causa sale del estado inicial**: el primer
  acto procesal indica que el amparo ya se presentó, y el plazo deja de importar.
  También en una causa que no está activa.
- **Dónde se ve.** En el detalle de la causa, en los vencimientos de los
  tableros (con `kind` en `HARMFUL_ACT`) y en los avisos por correo del proceso
  diario (D-78).

Ejemplo: un amparo todavía en "Iniciada", con un acto lesivo del 03/08/2026 que
se renueva cada 30 días y un plazo de 15 días hábiles. Al 15/09/2026, la
renovación vigente es la del 02/09/2026:

```json
{
	"harmfulActDate": "2026-08-03",
	"harmfulActRenews": true,
	"harmfulActRenewalDays": 30,
	"harmfulActTermDays": 15,
	"harmfulActTermDayType": "BUSINESS",
	"harmfulActDeadline": {
		"actDate": "2026-09-02",
		"renewed": true,
		"dueDate": "2026-09-23",
		"businessDaysRemaining": 6
	}
}
```

**`client`** reúne los datos que muestra la tarjeta "Cliente" del detalle:
`id`, `lastName`, `firstName`, `dni`, `phone`, `email` y `clientSince`, con el
mismo significado que en [`/clients`](#36-clientes-clients).

**`legalQualifications[]`**

| Campo                   | Tipo                    | Descripción                                                          |
| ----------------------- | ----------------------- | -------------------------------------------------------------------- |
| `id`                    | Integer                 | Identificador de la calificación legal                               |
| `name`                  | String                  | Denominación vigente de la calificación                              |
| `prescriptionMonths`    | Integer                 | Plazo de prescripción vigente, en meses                              |
| `offenseDate`           | String (fecha ISO 8601) | Fecha del hecho imputado bajo esta calificación. La carga el usuario |
| `prescriptionStartsOn`  | String (fecha ISO 8601) | Fecha desde la que se computa la prescripción de esta calificación: la del último acto interruptivo o, si no hay ninguno, `offenseDate`. Calculado |
| `prescriptionExpiresOn` | String (fecha ISO 8601) | `prescriptionStartsOn` más `prescriptionMonths`. Calculado           |

Una calificación dada de baja **sigue apareciendo** en las causas que la
registran (ver [`DELETE /legal-qualifications`](#delete-legal-qualificationsqualificationid)).

Una causa penal puede registrarse sin calificaciones legales: en ese caso
`legalQualifications` llega vacío, `prescription` vale `null` y la causa no
computa prescripción hasta que se le cargue una.

**`prescription`** (nuevo)

Resume la prescripción de la causa en un solo objeto: la de la calificación
**que prescribe primero**, que es la que el prototipo muestra en la barra del
detalle y en las "Alertas de prescripción" de los tableros. Vale `null` en los
fueros `ADMINISTRATIVE` y `AMPARO` y en una causa penal sin calificaciones.

| Campo                     | Tipo                            | Descripción                                                                                 |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `legalQualificationId`    | Integer                         | Calificación que prescribe primero: la de menor `prescriptionExpiresOn`                     |
| `legalQualificationName`  | String                          | Su denominación                                                                             |
| `startsOn`                | String (fecha ISO 8601)         | Su `prescriptionStartsOn`                                                                   |
| `expiresOn`               | String (fecha ISO 8601)         | Su `prescriptionExpiresOn`                                                                  |
| `elapsedPercentage`       | Integer                         | Porcentaje del plazo ya transcurrido entre `startsOn` y `expiresOn`, de `0` a `100`, redondeado al entero más cercano |
| `alert`                   | Boolean                         | `true` si transcurrió el **70 %** o más del plazo: la causa está "próxima a prescribir" (HU32) |
| `expired`                 | Boolean                         | `true` si hoy es igual o posterior a `expiresOn`: el plazo de prescripción se cumplió       |
| `lastInterruptiveActDate` | String (fecha ISO 8601) \| `null` | Fecha del acto interruptivo que reinició este cómputo. `null` si corre desde la fecha del hecho |

Con `expiresOn` el cliente arma el rótulo "Restan 5 años 9 meses", y con
`lastInterruptiveActDate` la nota "Cómputo reiniciado por el acto interruptivo
registrado el 04/07/2024" o "Sin actos interruptivos registrados". El umbral del
70 % es fijo y lo evalúa el backend sobre el valor exacto, no sobre el
redondeado (ver [Prescripción](#prescripción) en la sección 4).

Que el plazo esté cumplido (`expired` en `true`) **no cambia por sí solo el
estado de la causa**: sigue activa y sigue apareciendo en las alertas hasta que
alguien la marque como prescripta
(ver [`POST /cases/{caseId}/prescription`](#post-casescaseidprescription)). El
proceso diario detecta el plazo cumplido y avisa (HU52, HU32).

**`prescriptionDeclaration`** (nuevo)

Queda cargado cuando la causa se marca como prescripta; antes vale `null`.

| Campo              | Tipo                    | Descripción                                                  |
| ------------------ | ----------------------- | ------------------------------------------------------------ |
| `prescriptionDate` | String (fecha ISO 8601) | Fecha de la prescripción                                     |
| `resolution`       | String                  | Resolución que la declara                                    |
| `grounds`          | String \| `null`        | Fundamento. Opcional                                         |
| `registeredBy`     | Object                  | Usuario que marcó la causa como prescripta: `id`, `lastName` y `firstName` |
| `registeredAt`     | String (ISO 8601)       | Fecha y hora del registro                                    |

**`currentState`**

Nunca es `null`. Toda causa nace en el **estado inicial** de su fuero,
**"Iniciada"**, y permanece en él hasta que se registra el primer acto procesal.
El estado inicial es un estado de sistema: existe uno por fuero, no forma parte
del listado de [`/procedural-states`](#34-estados-procesales-procedural-states),
no se modifica ni se da de baja, no puede ser destino de un acto y **no se
muestra en la línea de tiempo de la causa**, porque no lo originó ningún acto.

El vencimiento de la causa forma parte de su estado actual: es el que abrió el
acto procesal que la llevó a ese estado.

| Campo                   | Tipo                            | Descripción                                                                   |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `proceduralStateId`     | Integer \| `null`               | Estado de la tabla del fuero. `null` si es el estado inicial o un estado escrito a mano |
| `name`                  | String                          | Denominación a mostrar. "Iniciada" en el estado inicial                       |
| `custom`                | Boolean                         | `true` si es un estado escrito a mano para esta causa (ver §3.8)              |
| `initial`               | Boolean                         | `true` si es el estado inicial                                                |
| `proceduralActId`       | Integer \| `null`               | Acto procesal que llevó la causa a este estado. `null` en el estado inicial y en "Prescripta", al que no se llega por un acto |
| `dueDate`               | String (fecha ISO 8601) \| `null` | Vencimiento vigente del plazo que abrió ese acto. `null` si no abrió plazo, si es el estado inicial o si la causa está prescripta |
| `businessDaysRemaining` | Integer \| `null`               | Días hábiles desde hoy hasta `dueDate`. `0` vence hoy; negativo, ya vencido. `null` si `dueDate` es `null` |
| `manuallyAdjusted`      | Boolean                         | `true` si el vencimiento se ajustó a mano al registrar el acto                |

Con `businessDaysRemaining` el cliente arma los rótulos del prototipo: "Vencido
hace 2 días", "Vence hoy", "En 3 días hábiles". Se calcula en cada respuesta,
contra la fecha del día en Córdoba (ver [§4](#cómputo-de-días)).

Un plazo vencido **sigue abierto** —y la causa lo sigue mostrando— hasta que un
acto procesal posterior la lleve a otro estado. Una causa sin vencimiento
(`currentState.dueDate` en `null`) es una de las "causas para impulsar" del
prototipo.

**`folder`** (nuevo)

Carpeta de la causa en el almacenamiento en la nube del estudio (Google Drive).
Vale `null` en las causas registradas antes de esta versión. Si al registrar la
causa se pidió no crearla, `status` es `PENDING`.

| Campo              | Tipo               | Descripción                                                                                          |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `status`           | `CaseFolderStatus` | `CREATED` si la carpeta existe; `CREATING` si se está creando; `ERROR` si se pidió y no pudo crearse; `PENDING` si no se pidió |
| `url`              | String \| `null`   | Enlace para abrir la carpeta ("Abrir carpeta en Drive"). `null` mientras `status` no es `CREATED`    |
| `path`             | String             | Ubicación de la carpeta, por ejemplo `/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado` |
| `templatesCopied`  | Integer            | Modelos formales copiados a la carpeta (HU40). `0` si no se pidió copiarlos                          |
| `templatesPending` | Integer            | Modelos que se pidió copiar y todavía no se copiaron, porque falló la carpeta o alguna copia. `0` si no hay nada pendiente |

Cómo se nombra la carpeta, qué modelos se copian y qué pasa si el
almacenamiento falla está en [Carpeta de la causa](#carpeta-de-la-causa), en la
sección 4.

**Sobre la prescripción:** solo se computa en el fuero `CRIMINAL`; en los demás
el prototipo informa "No aplica al fuero". **Cada calificación computa la suya**:
`prescriptionExpiresOn` es `prescriptionStartsOn` más `prescriptionMonths`. La
fecha de inicio de la causa (`startDate`) no interviene.

`prescriptionStartsOn` arranca en la fecha del hecho (`offenseDate`), que se
carga al registrar la causa. Desde esta versión, **un acto interruptivo lo
mueve**: pasa a ser la fecha del acto interruptivo más reciente de la causa
(HU31, RN8, ver [§3.9](#39-actos-interruptivos-casescaseidinterruptive-acts)).
`offenseDate` sigue siendo el dato cargado y no cambia. Es el cambio que V3
había anticipado, y por eso no modifica la estructura de la calificación.

Si la causa registra varias calificaciones, la barra del detalle muestra **la
que prescribe primero** —la de menor `prescriptionExpiresOn`—, con la nota
"Calificación que prescribe primero: …". Desde esta versión esa elección y el
porcentaje transcurrido llegan resueltos en `prescription`; el cliente ya no
tiene que calcularlos.

---

#### `POST /cases`

Registra una nueva causa (HU18) y, si se pide, crea su carpeta en la nube
(HU39) y copia en ella los modelos del fuero (HU40).

**Rol requerido:** cualquier usuario autenticado.

**Cuerpo de la petición**

Causa penal:

```json
{
	"sacNumber": "13284571",
	"jurisdiction": "CRIMINAL",
	"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
	"court": "Juzgado de Control N° 3 · Córdoba",
	"instructorName": "Dra. Verónica Ledesma",
	"tribunalPhone": "0351 448-1200",
	"instructorExtension": "214",
	"clientId": 1,
	"proceduralRole": "DEFENSA",
	"clientDetained": false,
	"legalQualifications": [
		{
			"legalQualificationId": 1,
			"offenseDate": "2021-02-27"
		}
	],
	"responsibleLawyerId": 3,
	"startDate": "2021-03-12",
	"courtFeePaid": false,
	"createFolder": true,
	"copyTemplates": true
}
```

Amparo, sin carpeta:

```json
{
	"sacNumber": "12774310",
	"jurisdiction": "AMPARO",
	"caption": "MOYANO, Daniela c/ APROSS — Amparo de salud",
	"court": "Juzgado Civil y Comercial 37ª Nom.",
	"instructorName": "Dra. Inés Ferrero",
	"tribunalPhone": "0351 448-1600",
	"instructorExtension": "517",
	"clientId": 6,
	"proceduralRole": "ACTORA",
	"counterparty": "APROSS",
	"subjectMatter": "Que se ordene a APROSS la cobertura integral del tratamiento de rehabilitación prescripto a la actora.",
	"injunctionGranted": true,
	"harmfulActDate": "2026-08-28",
	"harmfulActRenews": true,
	"harmfulActRenewalDays": 30,
	"harmfulActTermDays": 15,
	"harmfulActTermDayType": "BUSINESS",
	"responsibleLawyerId": 1,
	"startDate": "2026-09-08",
	"courtFeePaid": true,
	"createFolder": false
}
```

| Campo                   | Tipo             | Requerido   | Restricciones                                                                                     |
| ----------------------- | ---------------- | :---------: | ------------------------------------------------------------------------------------------------- |
| `sacNumber`             | String           |     No      | Exactamente 8 dígitos. Si se envía, único en todo el sistema                                      |
| `jurisdiction`          | `Jurisdiction`   |     Sí      | Fuero válido                                                                                      |
| `caption`               | String           |     Sí      | Hasta 255 caracteres                                                                              |
| `court`                 | String           |     No      | Hasta 255 caracteres                                                                              |
| `instructorName`        | String           |     No      | Hasta 150 caracteres                                                                              |
| `tribunalPhone`         | String           |     No      | Hasta 50 caracteres                                                                               |
| `instructorExtension`   | String           |     No      | Número de interno. Hasta 20 caracteres                                                            |
| `clientId`              | Integer          |     Sí      | Cliente vigente                                                                                   |
| `proceduralRole`        | `ProceduralRole` |     Sí      | Debe corresponder al fuero (ver [`ProceduralRole`](#proceduralrole))                              |
| `legalQualifications`   | Object[]         |     No      | Opcional en `CRIMINAL`; si se envía, sin calificaciones repetidas. No se envía en los demás fueros. Ver estructura más abajo |
| `counterparty`          | String           |     No      | Hasta 255 caracteres. Solo en `ADMINISTRATIVE` y `AMPARO`; no se envía en `CRIMINAL`              |
| `subjectMatter`         | String           | Condicional | Obligatorio en `ADMINISTRATIVE` y `AMPARO`, no vacío, hasta 800 caracteres. No se envía en `CRIMINAL` |
| `clientDetained`        | Boolean          |     No      | **Nuevo.** "Preso". Solo en `CRIMINAL`. Por defecto, `false`                                     |
| `injunctionGranted`     | Boolean          |     No      | **Nuevo.** "El juez hizo lugar a la medida cautelar". Solo en `AMPARO`. Por defecto, `false`      |
| `harmfulActDate`        | String (fecha)   |     No      | **Nuevo.** Fecha del acto lesivo. Solo en `AMPARO`. No puede ser posterior a hoy                  |
| `harmfulActRenews`      | Boolean          |     No      | **Nuevo.** Si el acto lesivo se renueva. Solo en `AMPARO`. Por defecto, `false`                   |
| `harmfulActRenewalDays` | Integer          | Condicional | **Nuevo.** Obligatorio si `harmfulActRenews` es `true`: días corridos, entero mayor o igual a `1`. No se envía en otro caso |
| `harmfulActTermDays`    | Integer          | Condicional | **Nuevo.** Plazo para presentar el amparo. Obligatorio si se envía `harmfulActDate`: entero mayor o igual a `1`. Solo en `AMPARO` |
| `harmfulActTermDayType` | `DayType`        | Condicional | **Nuevo.** Obligatorio si se envía `harmfulActDate`: `BUSINESS` o `CONSECUTIVE`. Solo en `AMPARO` |
| `administrativeRemedyExhaustedOn` | String (fecha) | No    | **Nuevo.** Fecha de agotamiento de la vía administrativa. Solo en `ADMINISTRATIVE`. No puede ser posterior a hoy |
| `responsibleLawyerId`   | Integer          |     Sí      | Abogado vigente (RN3)                                                                             |
| `startDate`             | String (fecha)   | Condicional | Obligatoria si se informa `sacNumber`; sin SAC no se informa y la causa queda con `startDate` en `null` (D-38). No puede ser posterior a hoy |
| `courtFeePaid`          | Boolean          |     No      | **Nuevo.** Si se pagó la tasa de justicia. En los tres fueros. Por defecto, `false`               |
| `createFolder`          | Boolean          |     No      | **Nuevo.** Crear la carpeta de la causa en la nube (HU39). Por defecto, `true`                    |
| `copyTemplates`         | Boolean          |     No      | **Nuevo.** Copiar a esa carpeta los modelos formales del fuero (HU40). Por defecto, igual a `createFolder`. No puede ser `true` si `createFolder` es `false` |

**`legalQualifications[]`** (cuerpo de la petición)

| Campo                  | Tipo           | Requerido | Restricciones                                         |
| ---------------------- | -------------- | :-------: | ----------------------------------------------------- |
| `legalQualificationId` | Integer        |    Sí     | Calificación legal vigente. Sin repetir dentro de la causa |
| `offenseDate`          | String (fecha) |    Sí     | Fecha del hecho. No puede ser posterior a hoy         |

La fecha del hecho es **obligatoria en cada calificación**: sin ella no hay
desde cuándo computar la prescripción. Cada calificación lleva la suya porque
los delitos que concurren en una causa pueden haberse cometido en fechas
distintas.

Un identificador de cliente, abogado o calificación que no existe o está dado
de baja se informa como `400 VALIDATION_ERROR` sobre el campo correspondiente,
porque es un dato del formulario que el usuario tiene que corregir. Los errores
de una calificación se informan sobre `legalQualifications`.

**`createFolder` y `copyTemplates`** son las dos casillas de "Asignación y
documentación" del formulario: "Crear la carpeta de la causa en Drive" y
"Copiar los modelos de escritos del fuero a esa carpeta". El prototipo las
muestra tildadas y no deja tildar la segunda sin la primera ("Primero hay que
crear la carpeta en Drive para poder copiar los modelos"); el contrato repite
esa regla con un `400` sobre `copyTemplates`. Un cliente de V3, que no envía
ninguno de los dos campos, obtiene la carpeta con los modelos, que es lo que
piden HU39 y HU40 ("que se cree automáticamente").

**Efectos del alta**

- **Estado inicial.** La causa nace en el estado inicial de su fuero,
  "Iniciada" (`currentState.initial` en `true`). El estado de la tabla lo fija
  el primer acto procesal que se registre. Por eso el alta no depende de que el
  fuero tenga estados cargados.
- **Sin vencimiento.** El estado inicial no abre plazo: `currentState.dueDate`
  vale `null` hasta que un acto procesal abra uno.
- **Ciclo de vida vacío.** El alta no es un movimiento del ciclo de vida: el
  estado inicial no aparece en la línea de tiempo, que empieza con el primer
  acto procesal.
- **Carátula sugerida.** El panel "Carátula sugerida" del prototipo lo arma el
  cliente con el cliente elegido, las calificaciones o la contraparte; el
  backend recibe la carátula final en `caption`.
- **Prescripción.** En una causa penal con calificaciones, `prescription` llega
  calculada desde el alta, con `lastInterruptiveActDate` en `null`.
- **Carpeta en la nube.** Con `createFolder` en `true`, el backend crea la
  carpeta y devuelve su situación en `folder`. Con `copyTemplates` en `true`,
  copia en ella los modelos formales vigentes del fuero que tienen
  `copyToNewCases` en `true` (ver
  [§3.10](#310-modelos-formales-document-templates)) e informa cuántos en
  `folder.templatesCopied`. Con ese número el cliente arma el aviso del
  prototipo: "carpeta creada en Drive con 6 modelos".
- **La carpeta no condiciona el alta.** Si el almacenamiento en la nube falla,
  **la causa se registra igual**: la respuesta es `201`, con `folder.status` en
  `ERROR`, y la carpeta se reintenta con
  [`POST /cases/{caseId}/folder`](#post-casescaseidfolder). La causa es el dato
  que el estudio no puede perder; la carpeta es un complemento
  (ver [D-60](#81-decisiones-tomadas)).

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 1,
		"sacNumber": "13284571",
		"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
		"court": "Juzgado de Control N° 3 · Córdoba",
		"jurisdiction": "CRIMINAL",
		"proceduralRole": "DEFENSA",
		"instructorName": "Dra. Verónica Ledesma",
		"tribunalPhone": "0351 448-1200",
		"instructorExtension": "214",
		"counterparty": null,
		"subjectMatter": null,
		"clientDetained": false,
		"injunctionGranted": null,
		"harmfulActDate": null,
		"harmfulActRenews": null,
		"harmfulActRenewalDays": null,
		"harmfulActTermDays": null,
		"harmfulActTermDayType": null,
		"harmfulActDeadline": null,
		"administrativeRemedyExhaustedOn": null,
		"courtFeePaid": false,
		"client": {
			"id": 1,
			"lastName": "GÓMEZ",
			"firstName": "Ariel Fernando",
			"dni": "34812905",
			"phone": "351 415-2288",
			"email": "afgomez@gmail.com",
			"clientSince": "2021-03-12"
		},
		"responsibleLawyer": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena",
			"registrationNumber": "1-36842"
		},
		"legalQualifications": [
			{
				"id": 1,
				"name": "Robo calificado — art. 167 inc. 2 CP",
				"prescriptionMonths": 96,
				"offenseDate": "2021-02-27",
				"prescriptionStartsOn": "2021-02-27",
				"prescriptionExpiresOn": "2029-02-27"
			}
		],
		"prescription": {
			"legalQualificationId": 1,
			"legalQualificationName": "Robo calificado — art. 167 inc. 2 CP",
			"startsOn": "2021-02-27",
			"expiresOn": "2029-02-27",
			"elapsedPercentage": 69,
			"alert": false,
			"expired": false,
			"lastInterruptiveActDate": null
		},
		"prescriptionDeclaration": null,
		"startDate": "2021-03-12",
		"currentState": {
			"proceduralStateId": null,
			"name": "Iniciada",
			"custom": false,
			"initial": true,
			"proceduralActId": null,
			"dueDate": null,
			"businessDaysRemaining": null,
			"manuallyAdjusted": false
		},
		"folder": {
			"status": "CREATED",
			"url": "https://drive.google.com/drive/folders/1Qw8zT3nKcVb5LhXy2RmPd7sUeJ4oAfG9",
			"path": "/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
			"templatesCopied": 6,
			"templatesPending": 0
		},
		"active": true
	}
}
```

El valor de `elapsedPercentage` corresponde a una consulta realizada el martes
15/09/2026, la fecha que usa el prototipo.

Si el almacenamiento en la nube no respondió, la causa se registra igual y
`folder` llega con error:

```json
{
	"status": "ERROR",
	"url": null,
	"path": "/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
	"templatesCopied": 0,
	"templatesPending": 6
}
```

Con `createFolder` en `false`, `folder.status` es `PENDING`, con `url` en
`null` y `templatesCopied` y `templatesPending` en `0`.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"sacNumber": "Debe contener exactamente 8 dígitos.",
			"proceduralRole": "El rol procesal no corresponde al fuero."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"legalQualifications": "Cada calificación legal requiere la fecha del hecho."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"subjectMatter": "Es obligatorio en los fueros administrativo y de amparo."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"responsibleLawyerId": "No existe un abogado vigente con ese identificador."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"copyTemplates": "Para copiar los modelos primero hay que crear la carpeta de la causa."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"harmfulActRenewalDays": "Indicá cada cuántos días se renueva el acto lesivo.",
			"harmfulActTermDays": "Indicá el plazo para presentar el amparo.",
			"clientDetained": "Solo corresponde al fuero penal."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "CASE_SAC_ALREADY_EXISTS",
		"message": "Ya existe una causa registrada con ese número de SAC.",
		"details": null
	}
}
```

---

#### `GET /cases`

Obtiene una lista paginada de las causas (HU20).

**Rol requerido:** cualquier usuario autenticado.

Los resultados se ordenan por urgencia: primero las causas con vencimiento,
por la fecha de ese vencimiento ascendente (las vencidas quedan primeras), y
luego las que no tienen vencimiento, por `id`.

**Vencimiento de la causa.** Desde esta versión es el que tenga abierto, de
cualquiera de los dos orígenes: el plazo del acto procesal del estado actual
(`currentState.dueDate`) o, en un amparo todavía en "Iniciada", el del acto
lesivo (`harmfulActDeadline.dueDate`). Nunca hay dos a la vez, porque el del
acto lesivo solo existe en el estado inicial, que no abre plazo. Así un amparo
cuyo plazo para presentarse está por vencer sube en el listado como cualquier
otra causa urgente, y aparece con "Solo con plazo por vencer" (D-82).

**Parámetros de consulta**

| Parámetro             | Tipo    | Requerido | Valor por defecto | Restricciones                   | Descripción                                                                 |
| --------------------- | ------- | :-------: | ----------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `page`                | Integer |    No     | `1`               | Mayor o igual a `1`             | Número de página                                                            |
| `limit`               | Integer |    No     | `20`              | Entre `1` y `100`               | Cantidad máxima de elementos por página                                     |
| `search`              | String  |    No     | -                 | -                               | Filtra por `sacNumber`, por `caption` y por apellido y nombres del cliente  |
| `jurisdiction`        | String  |    No     | -                 | Fuero válido                    | Filtro "Todos los fueros"                                                   |
| `responsibleLawyerId` | Integer |    No     | -                 | -                               | Filtro "Todos los responsables"                                             |
| `proceduralStateId`   | Integer |    No     | -                 | Excluyente con `customState` y `withoutProceduralActs` | Filtro "Todos los estados procesales": estado de la tabla |
| `customState`         | String  |    No     | -                 | Excluyente con `proceduralStateId` y `withoutProceduralActs` | Mismo filtro, grupo "Escritos a mano en causas". Coincidencia exacta sin distinguir mayúsculas |
| `withoutProceduralActs` | Boolean |  No     | -                 | Excluyente con `proceduralStateId` y `customState` | Mismo filtro, grupo "Causas nuevas", opción "Iniciada". `true`: solo causas en el estado inicial (`currentState.initial` en `true`) |
| `clientId`            | Integer |    No     | -                 | -                               | Causas de un cliente (HU9)                                                  |
| `openDeadline`        | Boolean |    No     | -                 | -                               | `true`: solo causas con vencimiento abierto —del acto procesal o del acto lesivo—, incluidas las vencidas. Botón "Solo con plazo por vencer" |

Ejemplo:

```http
GET /api/v1/cases?page=1&limit=20&jurisdiction=CRIMINAL&responsibleLawyerId=3&openDeadline=true
```

El buscador del encabezado de la aplicación ("Buscar por SAC, carátula o
cliente") usa el mismo endpoint con `search`.

Un filtro por un abogado o un estado inexistente no es un error: devuelve una
colección vacía.

**Filtro de estado procesal.** El desplegable del prototipo tiene tres clases
de opciones, y cada una viaja en un parámetro distinto; como el usuario elige
una sola, los tres son excluyentes entre sí:

| Grupo del desplegable            | Parámetro                       |
| -------------------------------- | ------------------------------- |
| "Fuero Penal", "Fuero Administrativo", "Fuero Amparo" | `proceduralStateId` |
| "Causas nuevas" → "Iniciada"     | `withoutProceduralActs=true` |
| "Escritos a mano en causas"      | `customState`                   |

"Iniciada" no depende del fuero: combinado con `jurisdiction` devuelve las
causas de ese fuero que todavía están en el estado inicial.

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 2,
			"sacNumber": "12907344",
			"caption": "PEREYRA, Marcos D. — Sumario administrativo",
			"court": "Tribunal de Conducta Policial y Penitenciario",
			"jurisdiction": "ADMINISTRATIVE",
			"proceduralRole": "DEFENSA",
			"instructorName": "Crio. Insp. Raúl Bazán",
			"tribunalPhone": "0351 428-6000",
			"instructorExtension": "3120",
			"counterparty": null,
			"subjectMatter": "Descargo frente a la imputación de falta grave por abandono de servicio y pedido de sobreseimiento.",
			"clientDetained": null,
			"injunctionGranted": null,
			"harmfulActDate": null,
			"harmfulActRenews": null,
			"harmfulActRenewalDays": null,
			"harmfulActTermDays": null,
			"harmfulActTermDayType": null,
			"harmfulActDeadline": null,
			"administrativeRemedyExhaustedOn": null,
			"courtFeePaid": true,
			"client": {
				"id": 2,
				"lastName": "PEREYRA",
				"firstName": "Marcos D.",
				"dni": "29440117",
				"phone": "351 622-9014",
				"email": "mdpereyra@hotmail.com",
				"clientSince": "2026-05-18"
			},
			"responsibleLawyer": {
				"id": 4,
				"lastName": "Peralta",
				"firstName": "Ignacio",
				"registrationNumber": "1-35207"
			},
			"legalQualifications": [],
			"prescription": null,
			"prescriptionDeclaration": null,
			"startDate": "2026-05-18",
			"currentState": {
				"proceduralStateId": 4,
				"name": "Alegato",
				"custom": false,
				"initial": false,
				"proceduralActId": 18,
				"dueDate": "2026-09-11",
				"businessDaysRemaining": -2,
				"manuallyAdjusted": false
			},
			"folder": {
				"status": "CREATED",
				"url": "https://drive.google.com/drive/folders/1Hn4bYc9WtEz6MqLs3XoKp2VrDu8JgFa5",
				"path": "/VZ Causas/Peralta, Ignacio/Administrativo/PEREYRA, Marcos D. — Sumario administrativo",
				"templatesCopied": 4,
				"templatesPending": 0
			},
			"active": true
		},
		{
			"id": 1,
			"sacNumber": "13284571",
			"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
			"court": "Juzgado de Control N° 3 · Córdoba",
			"jurisdiction": "CRIMINAL",
			"proceduralRole": "DEFENSA",
			"instructorName": "Dra. Verónica Ledesma",
			"tribunalPhone": "0351 448-1200",
			"instructorExtension": "214",
			"counterparty": null,
			"subjectMatter": null,
			"clientDetained": false,
			"injunctionGranted": null,
			"harmfulActDate": null,
			"harmfulActRenews": null,
			"harmfulActRenewalDays": null,
			"harmfulActTermDays": null,
			"harmfulActTermDayType": null,
			"harmfulActDeadline": null,
			"administrativeRemedyExhaustedOn": null,
			"courtFeePaid": false,
			"client": {
				"id": 1,
				"lastName": "GÓMEZ",
				"firstName": "Ariel Fernando",
				"dni": "34812905",
				"phone": "351 415-2288",
				"email": "afgomez@gmail.com",
				"clientSince": "2021-03-12"
			},
			"responsibleLawyer": {
				"id": 3,
				"lastName": "Ríos",
				"firstName": "Malena",
				"registrationNumber": "1-36842"
			},
			"legalQualifications": [
				{
					"id": 1,
					"name": "Robo calificado — art. 167 inc. 2 CP",
					"prescriptionMonths": 96,
					"offenseDate": "2021-02-27",
					"prescriptionStartsOn": "2024-07-04",
					"prescriptionExpiresOn": "2032-07-04"
				}
			],
			"prescription": {
				"legalQualificationId": 1,
				"legalQualificationName": "Robo calificado — art. 167 inc. 2 CP",
				"startsOn": "2024-07-04",
				"expiresOn": "2032-07-04",
				"elapsedPercentage": 27,
				"alert": false,
				"expired": false,
				"lastInterruptiveActDate": "2024-07-04"
			},
			"prescriptionDeclaration": null,
			"startDate": "2021-03-12",
			"currentState": {
				"proceduralStateId": 12,
				"name": "Oposición al requerimiento de elevación",
				"custom": false,
				"initial": false,
				"proceduralActId": 31,
				"dueDate": "2026-09-16",
				"businessDaysRemaining": 1,
				"manuallyAdjusted": false
			},
			"folder": {
				"status": "CREATED",
				"url": "https://drive.google.com/drive/folders/1Qw8zT3nKcVb5LhXy2RmPd7sUeJ4oAfG9",
				"path": "/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
				"templatesCopied": 6,
				"templatesPending": 0
			},
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 6,
		"totalPages": 1
	}
}
```

Desde esta versión cada causa llega además con `prescription`,
`prescriptionDeclaration` y `folder`. El listado no suma parámetros de
consulta: las vistas de vencimientos y de alertas de prescripción del
prototipo se sirven desde [`/dashboards`](#311-tableros-dashboards).

Una causa marcada como prescripta se encuentra con el filtro de estado
(`proceduralStateId` del estado "Prescripta").

Los valores de `businessDaysRemaining` del ejemplo corresponden a una consulta
realizada el martes 15/09/2026, la fecha que usa el prototipo.

Una causa que todavía no tiene actos procesales llega con `currentState` en el
estado inicial ("Iniciada", `initial` en `true`) y sin vencimiento (ver el
ejemplo de [`POST /cases`](#post-cases)).

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"customState": "No puede combinarse con proceduralStateId."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"withoutProceduralActs": "No puede combinarse con proceduralStateId ni con customState."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /cases/custom-states`

Obtiene los estados escritos a mano que tienen actualmente las causas activas,
sin repetir y en orden alfabético.

**Rol requerido:** cualquier usuario autenticado.

Alimenta el grupo "Escritos a mano en causas" del filtro de estado procesal del
listado. Esos valores no están en la tabla de estados del fuero y no pueden
deducirse de una página del listado, por eso tienen su propio endpoint.

"Iniciada" **no** forma parte de esta lista: no es un estado escrito a mano,
sino el estado inicial de la causa, y el filtro lo ofrece como opción fija del
grupo "Causas nuevas".

**Parámetros de consulta**

| Parámetro      | Tipo   | Requerido | Restricciones | Descripción                                   |
| -------------- | ------ | :-------: | ------------- | --------------------------------------------- |
| `jurisdiction` | String |    No     | Fuero válido  | Limita a los estados de causas de ese fuero   |

Ejemplo:

```http
GET /api/v1/cases/custom-states?jurisdiction=CRIMINAL
```

**Respuestas**

**`200 OK`**

La respuesta no está paginada: es una lista corta de textos.

```json
{
	"data": [
		"Con acusación, pero con oposición"
	]
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"jurisdiction": "No existe un fuero procesal con ese nombre."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}`

Obtiene el detalle de una causa (HU22).

**Rol requerido:** cualquier usuario autenticado.

Devuelve el mismo recurso que el listado. Con esta versión el detalle cubre el
encabezado de la causa, la barra de prescripción (`prescription`), la tarjeta
del cliente, el acceso a la carpeta (`folder.url`, botón "Abrir carpeta en
Drive") y el **ciclo de vida**.

**Ciclo de vida.** La línea de tiempo del prototipo ("Ciclo de vida de la
causa") no tiene un endpoint propio. El cliente la arma intercalando por fecha
tres fuentes:

| Qué muestra                                             | De dónde sale                                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Cada estado por el que pasó la causa, con su plazo      | [`GET /cases/{caseId}/procedural-acts`](#get-casescaseidprocedural-acts) (HU27)                |
| Los actos interruptivos, con la marca "Acto interruptivo" | [`GET /cases/{caseId}/interruptive-acts`](#get-casescaseidinterruptive-acts) (HU31)          |
| El pase a "Prescripta", si lo hubo                      | `prescriptionDeclaration` de la causa                                                          |

El plazo que la línea de tiempo marca como **abierto** ("Plazo abierto · vence",
"Vence hoy", "Plazo vencido el") es el del acto cuyo `id` coincide con
`currentState.proceduralActId`; los plazos de los actos anteriores están
cerrados.

La lista de documentos de la tarjeta "Documentación" (HU38) y las acciones
"Modificar causa", "Dar de baja", "Emitir carátula", "Emitir expediente" y
"Registrar pago de tasa" pertenecen a historias de sprints posteriores (ver
[§8.3](#83-visto-en-el-prototipo-y-fuera-de-este-contrato)).

El prototipo lleva al detalle después de registrar una causa y después de
registrar un acto. En una causa recién registrada `currentState` es el estado
inicial ("Iniciada"): el encabezado lo muestra y ofrece registrar el primer
acto. Después de registrar un acto, el detalle refleja el estado y el
vencimiento nuevos en `currentState`.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 1,
		"sacNumber": "13284571",
		"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
		"court": "Juzgado de Control N° 3 · Córdoba",
		"jurisdiction": "CRIMINAL",
		"proceduralRole": "DEFENSA",
		"instructorName": "Dra. Verónica Ledesma",
		"tribunalPhone": "0351 448-1200",
		"instructorExtension": "214",
		"counterparty": null,
		"subjectMatter": null,
		"clientDetained": false,
		"injunctionGranted": null,
		"harmfulActDate": null,
		"harmfulActRenews": null,
		"harmfulActRenewalDays": null,
		"harmfulActTermDays": null,
		"harmfulActTermDayType": null,
		"harmfulActDeadline": null,
		"administrativeRemedyExhaustedOn": null,
		"courtFeePaid": false,
		"client": {
			"id": 1,
			"lastName": "GÓMEZ",
			"firstName": "Ariel Fernando",
			"dni": "34812905",
			"phone": "351 415-2288",
			"email": "afgomez@gmail.com",
			"clientSince": "2021-03-12"
		},
		"responsibleLawyer": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena",
			"registrationNumber": "1-36842"
		},
		"legalQualifications": [
			{
				"id": 1,
				"name": "Robo calificado — art. 167 inc. 2 CP",
				"prescriptionMonths": 96,
				"offenseDate": "2021-02-27",
				"prescriptionStartsOn": "2024-07-04",
				"prescriptionExpiresOn": "2032-07-04"
			}
		],
		"prescription": {
			"legalQualificationId": 1,
			"legalQualificationName": "Robo calificado — art. 167 inc. 2 CP",
			"startsOn": "2024-07-04",
			"expiresOn": "2032-07-04",
			"elapsedPercentage": 27,
			"alert": false,
			"expired": false,
			"lastInterruptiveActDate": "2024-07-04"
		},
		"prescriptionDeclaration": null,
		"startDate": "2021-03-12",
		"currentState": {
			"proceduralStateId": 12,
			"name": "Oposición al requerimiento de elevación",
			"custom": false,
			"initial": false,
			"proceduralActId": 31,
			"dueDate": "2026-09-16",
			"businessDaysRemaining": 1,
			"manuallyAdjusted": false
		},
		"folder": {
			"status": "CREATED",
			"url": "https://drive.google.com/drive/folders/1Qw8zT3nKcVb5LhXy2RmPd7sUeJ4oAfG9",
			"path": "/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
			"templatesCopied": 6,
			"templatesPending": 0
		},
		"active": true
	}
}
```

Es la causa del prototipo: el hecho es del 27/02/2021, pero el acto
interruptivo del 04/07/2024 reinició el cómputo, y por eso la prescripción corre
desde esa fecha y vence el 04/07/2032 ("Cómputo reiniciado por el acto
interruptivo registrado el 04/07/2024").

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador de la causa no es válido.",
		"details": {
			"caseId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

---

#### `POST /cases/{caseId}/prescription`

Marca una causa penal como prescripta (HU33). Nuevo en V4.

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`. No hace falta ser el abogado
responsable de la causa: el prototipo habilita "Marcar prescripta" a los dos
perfiles sobre cualquier causa penal, y no a la Secretaría.

Es la acción "Marcar prescripta" del detalle, que el prototipo ofrece solo en
el fuero penal. Su nota dice qué hace: *"La causa pasa al estado Prescripta,
deja de figurar en los tableros y se cierran los plazos abiertos. Queda
accesible en el historial."*

HU33 pide que la causa se registre como prescripta **automáticamente** cuando
vence el plazo. El prototipo resuelve otra cosa: una acción manual que exige la
resolución que declara la prescripción. Este contrato sigue al prototipo
(D-52): el proceso diario detecta el plazo cumplido (HU52), deja
`prescription.expired` en `true` y avisa (HU32), pero **no cambia el estado de
la causa**. La pasa a "Prescripta" una persona, con la resolución.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

```json
{
	"prescriptionDate": "2026-09-15",
	"resolution": "Sentencia N° 214 del Juzgado de Control N° 3",
	"grounds": "Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos."
}
```

| Campo              | Tipo           | Requerido | Restricciones                                      |
| ------------------ | -------------- | :-------: | -------------------------------------------------- |
| `prescriptionDate` | String (fecha) |    Sí     | "Fecha de la prescripción". No puede ser posterior a hoy |
| `resolution`       | String         |    Sí     | "Resolución que la declara". No vacía, hasta 255 caracteres |
| `grounds`          | String         |    No     | "Fundamento (opcional)". Hasta 2000 caracteres     |

La causa tiene que tener **al menos una calificación legal**: una causa penal
sin calificación no puede prescribir (D-74). No se exige, en cambio, que el plazo
calculado esté cumplido (`prescription.expired`): la prescripción la declara el
tribunal.

**Efecto sobre la causa**

- La causa pasa al estado **"Prescripta"** del fuero penal (ver
  [§3.4](#34-estados-procesales-procedural-states)): `currentState.name` vale
  "Prescripta", con `proceduralActId` en `null`, porque a ese estado no la lleva
  un acto procesal.
- **Se cierran los plazos abiertos**: `currentState.dueDate` y
  `businessDaysRemaining` pasan a `null`.
- "Prescripta" es terminal, así que la causa **deja de ser activa** (ver
  [Causa activa](#causa-activa)): sale de los tableros y de las alertas, deja de
  contar en los `activeCases` de su abogado, su cliente y sus calificaciones, y
  no admite actos procesales ni interruptivos nuevos.
- La causa **no se da de baja**: `active` sigue en `true`, `GET /cases/{caseId}`
  la sigue devolviendo con todos sus actos, y se la encuentra en el listado con
  el filtro de estado.
- Los datos del formulario quedan en `prescriptionDeclaration`, con quién la
  marcó y cuándo.

No existe una operación para revertirlo desde la API.

**Respuestas**

**`200 OK`**

Devuelve la causa actualizada, con la misma estructura que
`GET /cases/{caseId}`. En el ejemplo, la causa del prototipo que tiene la alerta
de prescripción activa:

```json
{
	"data": {
		"id": 4,
		"sacNumber": "11845620",
		"caption": "ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737",
		"court": "Fiscalía de Instrucción Distrito 2 Turno 4",
		"jurisdiction": "CRIMINAL",
		"proceduralRole": "DEFENSA",
		"instructorName": "Fisc. Adj. Paula Rinaldi",
		"tribunalPhone": "0351 448-1150",
		"instructorExtension": "118",
		"counterparty": null,
		"subjectMatter": null,
		"clientDetained": false,
		"injunctionGranted": null,
		"harmfulActDate": null,
		"harmfulActRenews": null,
		"harmfulActRenewalDays": null,
		"harmfulActTermDays": null,
		"harmfulActTermDayType": null,
		"harmfulActDeadline": null,
		"administrativeRemedyExhaustedOn": null,
		"courtFeePaid": false,
		"client": {
			"id": 4,
			"lastName": "ACOSTA",
			"firstName": "Jonathan E.",
			"dni": "38907221",
			"phone": "351 744-1160",
			"email": null,
			"clientSince": "2022-01-19"
		},
		"responsibleLawyer": {
			"id": 1,
			"lastName": "Vázquez",
			"firstName": "Fernando G.",
			"registrationNumber": "1-28114"
		},
		"legalQualifications": [
			{
				"id": 2,
				"name": "Infracción Ley 23.737 — art. 5 inc. c",
				"prescriptionMonths": 72,
				"offenseDate": "2022-01-19",
				"prescriptionStartsOn": "2022-01-19",
				"prescriptionExpiresOn": "2028-01-19"
			}
		],
		"prescription": {
			"legalQualificationId": 2,
			"legalQualificationName": "Infracción Ley 23.737 — art. 5 inc. c",
			"startsOn": "2022-01-19",
			"expiresOn": "2028-01-19",
			"elapsedPercentage": 78,
			"alert": true,
			"expired": false,
			"lastInterruptiveActDate": null
		},
		"prescriptionDeclaration": {
			"prescriptionDate": "2026-09-15",
			"resolution": "Sentencia N° 214 del Juzgado de Control N° 3",
			"grounds": "Transcurrió el plazo del art. 62 inc. 2 CP sin actos interruptivos.",
			"registeredBy": {
				"id": 1,
				"lastName": "Vázquez",
				"firstName": "Fernando G."
			},
			"registeredAt": "2026-09-15T12:20:00-03:00"
		},
		"startDate": "2022-01-19",
		"currentState": {
			"proceduralStateId": 10,
			"name": "Prescripta",
			"custom": false,
			"initial": false,
			"proceduralActId": null,
			"dueDate": null,
			"businessDaysRemaining": null,
			"manuallyAdjusted": false
		},
		"folder": null,
		"active": true
	}
}
```

`prescription` se sigue devolviendo en una causa prescripta, como dato
histórico; lo que indica que la causa está cerrada es su estado y
`prescriptionDeclaration`.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"prescriptionDate": "No puede ser posterior a hoy.",
			"resolution": "La resolución que declara la prescripción es obligatoria."
		}
	}
}
```

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`, igual que en
`GET /cases/{caseId}`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

La causa no es del fuero penal:

```json
{
	"error": {
		"code": "PRESCRIPTION_NOT_APPLICABLE",
		"message": "La prescripción solo aplica a las causas del fuero penal.",
		"details": null
	}
}
```

La causa penal no tiene calificaciones legales:

```json
{
	"error": {
		"code": "PRESCRIPTION_NOT_APPLICABLE",
		"message": "La causa no tiene calificaciones legales: no puede prescribir.",
		"details": null
	}
}
```

La causa ya está en un estado terminal, incluido "Prescripta":

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "La causa se encuentra en un estado terminal y no admite esta operación.",
		"details": null
	}
}
```

---

#### `POST /cases/{caseId}/folder`

Crea la carpeta de una causa que no la tiene, o reintenta una que falló
(HU39, HU40). Nuevo en V4.

**Rol requerido:** cualquier usuario autenticado, igual que el alta de la
causa.

El prototipo no tiene un botón para esto: existe porque el alta de causa **no
falla** cuando el almacenamiento en la nube no responde, y hace falta una forma
de completar lo que quedó pendiente (ver
[Carpeta de la causa](#carpeta-de-la-causa) y [D-60](#81-decisiones-tomadas)).
Cubre cinco situaciones:

| Situación de la causa                                         | Qué hace                                             |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `folder` en `null`: se registró antes de V4                   | Crea la carpeta                                      |
| `folder.status` en `PENDING`: se registró sin carpeta         | Crea la carpeta                                      |
| `folder.status` en `ERROR`                                    | Reintenta la creación                                |
| `folder.status` en `CREATING`                                 | No hace nada: ya hay una creación en curso. Responde `200` con la carpeta tal como está |
| `folder.status` en `CREATED` con `templatesPending` mayor a `0` | Copia los modelos que faltan, si `copyTemplates` es `true` |

Es **idempotente**: sobre una causa que ya tiene su carpeta completa no hace
nada y responde `200` con la carpeta tal como está. No duplica la carpeta ni
vuelve a copiar un modelo que ya se copió.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

```json
{
	"copyTemplates": true
}
```

| Campo           | Tipo    | Requerido | Restricciones                                                              |
| --------------- | ------- | :-------: | -------------------------------------------------------------------------- |
| `copyTemplates` | Boolean |    No     | Copiar a la carpeta los modelos formales del fuero. Por defecto, `true`    |

El cuerpo puede omitirse.

**Respuestas**

**`200 OK`**

Devuelve el objeto `folder` de la causa.

```json
{
	"data": {
		"status": "CREATED",
		"url": "https://drive.google.com/drive/folders/1Qw8zT3nKcVb5LhXy2RmPd7sUeJ4oAfG9",
		"path": "/VZ Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
		"templatesCopied": 6,
		"templatesPending": 0
	}
}
```

**`400 Bad Request`**

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`, igual que en
`GET /cases/{caseId}`; un `copyTemplates` que no es booleano, `VALIDATION_ERROR`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

**`502 Bad Gateway`**

El almacenamiento en la nube volvió a fallar. La carpeta queda en `ERROR` y la
operación puede repetirse.

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

### 3.8 Actos procesales: /cases/{caseId}/procedural-acts

**Autenticación requerida:** Sí.
**Rol requerido:** abogado responsable de la causa, para el registro y su
previsualización. La consulta de actos (HU27) es de cualquier
usuario autenticado, sobre cualquier causa (RN11).

El acto procesal es lo que **mueve la causa**: al registrarlo se elige el
estado procesal al que pasa, y el plazo sale de la tabla del fuero (RN5). El
**primer acto** es además el que saca a la causa del estado inicial: hasta
entonces la causa está en "Iniciada". Solo el **abogado responsable de la
causa** registra sus actos —ningún otro usuario, ni siquiera un
`ADMINISTRATOR`— (ver [permisos por perfil](#permisos-por-perfil)), y el acto
se aplica a la causa en el momento: no hay confirmación posterior.

El registro (HU26), su previsualización y la consulta (HU27) vienen de V3. Esta
versión suma que un acto pueda llevar la causa a un estado terminal.

Los **actos interruptivos** (HU31) no son actos procesales: no mueven el estado
de la causa ni abren plazos, y tienen su propio recurso
(ver [§3.9](#39-actos-interruptivos-casescaseidinterruptive-acts)).

El recurso acto procesal posee la siguiente estructura:

| Campo              | Tipo                          | Nulo | Descripción                                                                         |
| ------------------ | ----------------------------- | :--: | ----------------------------------------------------------------------------------- |
| `id`               | Integer                       |  No  | Identificador único                                                                 |
| `caseId`           | Integer                       |  No  | Causa a la que pertenece                                                            |
| `resultingState`   | Object                        |  No  | Estado al que pasa la causa: `proceduralStateId`, `name` y `custom`, con el mismo significado que en `currentState`. Nunca es el estado inicial |
| `actDate`          | String (fecha ISO 8601)       |  No  | Fecha del acto                                                                      |
| `notificationDate` | String (fecha ISO 8601) \| `null` | Sí | Fecha de notificación. Solo en el fuero `ADMINISTRATIVE` (RN6)                  |
| `notes`            | String \| `null`              |  Sí  | Observaciones: situaciones que el estado no alcanza a expresar                      |
| `deadline`         | Object \| `null`              |  Sí  | Plazo que abre el acto. `null` si no abre ninguno. Ver estructura más abajo         |
| `registeredBy`     | Object                        |  No  | Usuario (abogado) que registró el acto: `id`, `lastName` y `firstName`                           |
| `registeredAt`     | String (ISO 8601)             |  No  | Fecha y hora del registro                                                           |

**`deadline`**

| Campo              | Tipo                          | Descripción                                                                           |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| `timeLimitDays`    | Integer                       | Días del plazo según la tabla del fuero al momento del registro. `0` si no abre plazo |
| `dayType`          | `DayType`                     | Forma de cómputo según la tabla, al momento del registro                              |
| `countsFrom`       | String (fecha ISO 8601)       | Fecha desde la que corre el plazo: `notificationDate` en `ADMINISTRATIVE`, `actDate` en los demás |
| `computedDueDate`  | String (fecha ISO 8601) \| `null` | Vencimiento que resulta de la tabla. `null` si el estado no abre plazo            |
| `dueDate`          | String (fecha ISO 8601)       | Vencimiento vigente: el calculado o, si se ajustó, el manual                          |
| `manuallyAdjusted` | Boolean                       | `true` si `dueDate` se cargó a mano                                                   |

Los valores de la tabla se **copian** al acto: si luego se modifica el plazo
del estado procesal, este vencimiento no cambia (ver §3.4). Quién ajustó a mano
el vencimiento queda registrado en `registeredBy`, como pide la nota del
prototipo.

**Estado escrito a mano.** Además de elegir un estado de la tabla, el
formulario permite escribir un estado libre ("Estado escrito a mano: queda
guardado solo en esta causa"). Es la descripción libre que pide HU22 para
reflejar "situaciones que el estado no alcanza a expresar". Ese estado:

- no se agrega a la tabla de estados del fuero;
- no tiene plazo asociado: solo puede tener vencimiento si se carga a mano;
- se devuelve con `proceduralStateId` en `null` y `custom` en `true`.

---

#### `POST /cases/{caseId}/procedural-acts`

Registra un acto procesal sobre la causa (HU26).

**Rol requerido:** abogado responsable de la causa. El usuario autenticado
debe tener una ficha de abogado (`lawyerId`) igual a `responsibleLawyer.id` de
la causa. Ningún otro usuario puede registrar actos sobre ella, aunque tenga el
rol `LAWYER` o `ADMINISTRATOR`: la respuesta es `403 FORBIDDEN`. Si la causa no
existe, la respuesta es `404 CASE_NOT_FOUND`.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

Pasando a un estado de la tabla del fuero:

```json
{
	"proceduralStateId": 12,
	"actDate": "2026-09-09",
	"notes": "Con acusación, pero con oposición."
}
```

Fuero administrativo, donde el plazo corre desde la notificación (RN6):

```json
{
	"proceduralStateId": 5,
	"actDate": "2026-09-12",
	"notificationDate": "2026-09-15"
}
```

Estado escrito a mano, con vencimiento ajustado manualmente:

```json
{
	"customState": "Pedido de informes al Registro Nacional de Reincidencia",
	"actDate": "2026-09-15",
	"manualDueDate": "2026-09-25"
}
```

| Campo               | Tipo           | Requerido   | Restricciones                                                                                           |
| ------------------- | -------------- | :---------: | ------------------------------------------------------------------------------------------------------- |
| `proceduralStateId` | Integer        | Condicional | Estado vigente del fuero de la causa. Puede ser terminal, **salvo "Prescripta"**. Excluyente con `customState` |
| `customState`       | String         | Condicional | Hasta 255 caracteres. No puede coincidir con el nombre de un estado vigente del fuero. Excluyente con `proceduralStateId` |
| `actDate`           | String (fecha) |     Sí      | No puede ser posterior a hoy                                                                            |
| `notificationDate`  | String (fecha) | Condicional | Solo en `ADMINISTRATIVE`. Obligatoria si el estado elegido abre plazo. Entre `actDate` y hoy            |
| `manualDueDate`     | String (fecha) |     No      | Ajuste manual del vencimiento. No anterior a la fecha desde la que corre el plazo                       |
| `notes`             | String         |     No      | Hasta 2000 caracteres                                                                                   |

Debe enviarse `proceduralStateId` o `customState`, nunca ambos. Si el texto de
`customState` coincide con un estado de la tabla, el cliente debe enviar el
`proceduralStateId` de ese estado: el combo del prototipo ya hace esa
resolución.

**Estados terminales.** Desde esta versión un acto procesal **puede llevar la
causa a un estado terminal**, como "Archivada": es la forma de cerrarla (D-69). La excepción es "Prescripta", que tiene su propio botón y su propio
formulario ([`POST /cases/{caseId}/prescription`](#post-casescaseidprescription)).
Un estado terminal no abre plazo, así que el acto no admite `manualDueDate`. La
causa deja de ser activa y ya no admite actos nuevos
(`422 CASE_IN_TERMINAL_STATE`). El combo del prototipo hoy excluye los estados
terminales: tiene que ofrecerlos, salvo "Prescripta".

**Cómputo del vencimiento**

1. Se toma el plazo de la tabla (`timeLimitDays` y `dayType`) del estado
   elegido. Un estado escrito a mano no tiene plazo.
2. El plazo corre desde `notificationDate` en el fuero `ADMINISTRATIVE` y
   desde `actDate` en los demás.
3. En días `BUSINESS` se suman `timeLimitDays` días hábiles a partir del día
   siguiente; en días `CONSECUTIVE`, `timeLimitDays` días corridos. Ver
   [§4](#cómputo-de-días).
4. Si se envía `manualDueDate`, ese es el vencimiento vigente y
   `manuallyAdjusted` vale `true`; el calculado se conserva en
   `computedDueDate`.
5. Si el estado no abre plazo y no se envía `manualDueDate`, `deadline` vale
   `null`.

**Efecto sobre la causa**

- El acto se aplica al registrarse: la causa pasa al estado del acto
  (`currentState`), y su vencimiento pasa a ser el que abre el acto
  (`currentState.dueDate`). Si el acto no abre plazo, la causa queda sin
  vencimiento (`dueDate` en `null`).
- **Primer acto.** En una causa en el estado inicial, el acto la hace entrar al
  ciclo de vida del fuero: `currentState.initial` pasa a `false`. El primer
  acto no tiene restricciones propias: puede llevar la causa a cualquier estado
  del fuero salvo "Prescripta", terminal o no, o a un estado escrito a mano.
- La causa toma el estado del acto **con la fecha de acto más reciente**. Si se carga un acto con fecha anterior al último registrado —por
  ejemplo, al completar la historia de una causa vieja—, el acto queda
  asentado pero no retrocede el estado actual ni reemplaza el vencimiento vigente.

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 31,
		"caseId": 1,
		"resultingState": {
			"proceduralStateId": 12,
			"name": "Oposición al requerimiento de elevación",
			"custom": false
		},
		"actDate": "2026-09-09",
		"notificationDate": null,
		"notes": "Con acusación, pero con oposición.",
		"deadline": {
			"timeLimitDays": 5,
			"dayType": "BUSINESS",
			"countsFrom": "2026-09-09",
			"computedDueDate": "2026-09-16",
			"dueDate": "2026-09-16",
			"manuallyAdjusted": false
		},
		"registeredBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"registeredAt": "2026-09-09T11:42:00-03:00"
	}
}
```

Con estado escrito a mano y vencimiento manual:

```json
{
	"data": {
		"id": 32,
		"caseId": 4,
		"resultingState": {
			"proceduralStateId": null,
			"name": "Pedido de informes al Registro Nacional de Reincidencia",
			"custom": true
		},
		"actDate": "2026-09-15",
		"notificationDate": null,
		"notes": null,
		"deadline": {
			"timeLimitDays": 0,
			"dayType": "NONE",
			"countsFrom": "2026-09-15",
			"computedDueDate": null,
			"dueDate": "2026-09-25",
			"manuallyAdjusted": true
		},
		"registeredBy": {
			"id": 1,
			"lastName": "Vázquez",
			"firstName": "Fernando G."
		},
		"registeredAt": "2026-09-15T10:05:00-03:00"
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"notificationDate": "Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6)."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"proceduralStateId": "El estado procesal no pertenece al fuero de la causa o es el estado Prescripta."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador de la causa no es válido.",
		"details": {
			"caseId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Solo el abogado responsable de la causa puede registrar actos procesales.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "La causa se encuentra en un estado terminal y no admite actos procesales.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/procedural-acts/deadline-preview`

Calcula el vencimiento que tendría un acto procesal, **sin registrarlo**.

**Rol requerido:** abogado responsable de la causa, igual que el registro del
acto al que sirve.

Alimenta el panel "Cómputo del plazo" del formulario de HU26, que muestra el
vencimiento mientras el usuario completa los datos. Existe para que el cálculo
viva solo en el backend: si el frontend lo replicara, ambos lados podrían
mostrar fechas distintas, en especial cuando se incorpore el calendario de
feriados (P-02).

No aplica a estados escritos a mano, que no tienen plazo de tabla. El ajuste
manual tampoco pasa por este endpoint: es una fecha que el usuario elige.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Parámetros de consulta**

| Parámetro           | Tipo           | Requerido   | Restricciones                                                    |
| ------------------- | -------------- | :---------: | ---------------------------------------------------------------- |
| `proceduralStateId` | Integer        |     Sí      | Mismas restricciones que en el registro del acto                 |
| `actDate`           | String (fecha) |     Sí      | Mismas restricciones que en el registro del acto                 |
| `notificationDate`  | String (fecha) | Condicional | Mismas restricciones que en el registro del acto                 |

Ejemplo:

```http
GET /api/v1/cases/1/procedural-acts/deadline-preview?proceduralStateId=12&actDate=2026-09-15
```

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"proceduralStateId": 12,
		"timeLimitDays": 5,
		"dayType": "BUSINESS",
		"countsFrom": "2026-09-15",
		"dueDate": "2026-09-22",
		"businessDaysRemaining": 5
	}
}
```

Si el estado no abre plazo, `dueDate` y `businessDaysRemaining` valen `null` y
el cliente muestra "Este acto no dispara un plazo de presentación".

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"notificationDate": "Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6)."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Solo el abogado responsable de la causa puede registrar actos procesales.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/procedural-acts`

Obtiene una lista paginada de los actos procesales de una causa: su línea de
tiempo (HU27).

**Rol requerido:** cualquier usuario autenticado. No hace falta ser el abogado
responsable: todo el estudio accede a todas las causas (RN11). Registrar,
modificar y anular actos sigue siendo solo del abogado responsable.

Cada elemento es **el mismo recurso acto procesal** que devuelve el `POST`
(ver la estructura al comienzo de esta sección). Los actos se ordenan del más
reciente al más antiguo por `actDate`; si dos actos tienen la misma fecha,
primero el último registrado.

El acto conserva el plazo con que se registró: si después se modifica el plazo
de su estado procesal, `deadline` no cambia (ver §3.4). Un estado procesal dado
de baja después del acto sigue apareciendo con su nombre en `resultingState`,
porque forma parte de la historia de la causa (§4, Bajas).

**Para armar la línea de tiempo** (ver el ciclo de vida en
[`GET /cases/{caseId}`](#get-casescaseid)), el cliente necesita **todos** los
actos de la causa: pedir `limit=100`, igual que en
`GET /cases/{caseId}/interruptive-acts`. Con la página por defecto (20), los
actos más antiguos quedan afuera y el intercalado por fecha con los actos
interruptivos sale incompleto, sin ningún error que lo delate.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| --------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |

Ejemplo:

```http
GET /api/v1/cases/1/procedural-acts?page=1&limit=20
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 42,
			"caseId": 1,
			"resultingState": {
				"proceduralStateId": 12,
				"name": "Oposición al requerimiento de elevación",
				"custom": false
			},
			"actDate": "2026-09-15",
			"notificationDate": null,
			"notes": "Con acusación, pero con oposición.",
			"deadline": {
				"timeLimitDays": 5,
				"dayType": "BUSINESS",
				"countsFrom": "2026-09-15",
				"computedDueDate": "2026-09-22",
				"dueDate": "2026-09-22",
				"manuallyAdjusted": false
			},
			"registeredBy": {
				"id": 3,
				"lastName": "Ríos",
				"firstName": "Malena"
			},
			"registeredAt": "2026-09-15T11:42:00-03:00"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 1,
		"totalPages": 1
	}
}
```

Una causa sin actos devuelve `data` vacío: no es un error. La causa está en su
estado inicial ("Iniciada").

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`, igual que en
`GET /cases/{caseId}`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

Causa inexistente o dada de baja.

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/procedural-acts/{actId}`

Obtiene un acto procesal de una causa (HU27). Devuelve el mismo recurso que el
`POST` y que el listado.

**Rol requerido:** cualquier usuario autenticado.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                          |
| --------- | ------- | ------------------------------------ |
| `caseId`  | Integer | Identificador único de la causa      |
| `actId`   | Integer | Identificador único del acto procesal |

La causa se verifica antes que el acto. Un acto que existe pero **pertenece a
otra causa** responde `404 PROCEDURAL_ACT_NOT_FOUND`: la ruta pide un acto de
esta causa.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 42,
		"caseId": 1,
		"resultingState": {
			"proceduralStateId": 12,
			"name": "Oposición al requerimiento de elevación",
			"custom": false
		},
		"actDate": "2026-09-15",
		"notificationDate": null,
		"notes": "Con acusación, pero con oposición.",
		"deadline": {
			"timeLimitDays": 5,
			"dayType": "BUSINESS",
			"countsFrom": "2026-09-15",
			"computedDueDate": "2026-09-22",
			"dueDate": "2026-09-22",
			"manuallyAdjusted": false
		},
		"registeredBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"registeredAt": "2026-09-15T11:42:00-03:00"
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del acto procesal no es válido.",
		"details": {
			"actId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

Causa inexistente o dada de baja:

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

Acto inexistente o de otra causa:

```json
{
	"error": {
		"code": "PROCEDURAL_ACT_NOT_FOUND",
		"message": "No se encontró el acto procesal solicitado.",
		"details": null
	}
}
```

---

### 3.9 Actos interruptivos: /cases/{caseId}/interruptive-acts

Nuevo en V4.

**Autenticación requerida:** Sí.
**Rol requerido:** abogado responsable de la causa, para el registro. La
consulta es de cualquier usuario autenticado (RN11).

Un acto interruptivo **reinicia el cómputo de la prescripción** de la causa
desde su fecha (RN8, HU31). No mueve el estado procesal ni abre un plazo: en la
línea de tiempo el prototipo lo muestra como "No modifica el estado procesal",
con la marca "Acto interruptivo". Por eso es un recurso distinto del acto
procesal y no un acto procesal con una marca
(ver [D-48](#81-decisiones-tomadas)).

Solo existe en el fuero `CRIMINAL`, que es el único que computa prescripción:
el prototipo ofrece "Registrar acto interruptivo" únicamente en las causas
penales.

Lo registra solo el **abogado responsable de la causa**, con la misma regla que
los actos procesales: se compara el `lawyerId` del usuario con
`responsibleLawyer.id`, y ningún otro abogado ni el `ADMINISTRATOR` puede
hacerlo ("Solo el abogado responsable de la causa registra actos
interruptivos").

El recurso acto interruptivo posee la siguiente estructura:

| Campo          | Tipo                    | Nulo | Descripción                                                             |
| -------------- | ----------------------- | :--: | ----------------------------------------------------------------------- |
| `id`           | Integer                 |  No  | Identificador único                                                     |
| `caseId`       | Integer                 |  No  | Causa a la que pertenece                                                |
| `name`         | String                  |  No  | Denominación del acto: "Citación a juicio", "Indagatoria". Texto libre  |
| `actDate`      | String (fecha ISO 8601) |  No  | Fecha del acto. Desde ella se reinicia la prescripción                  |
| `notes`        | String \| `null`        |  Sí  | Observaciones: "Constancia, foja o referencia del expediente"           |
| `registeredBy` | Object                  |  No  | Usuario (abogado) que lo registró: `id`, `lastName` y `firstName`                    |
| `registeredAt` | String (ISO 8601)       |  No  | Fecha y hora del registro                                               |

**Sobre `name`:** el formulario del prototipo lo pide como texto libre, con el
ejemplo "Citación a juicio, indagatoria, sentencia no firme". No hay un
catálogo de actos interruptivos
(ver [D-49](#81-decisiones-tomadas)).

**Efecto sobre la prescripción**

- El acto interruptivo alcanza a **todas las calificaciones legales de la
  causa**: el formulario no pide elegir una.
- El `prescriptionStartsOn` de cada calificación pasa a ser la `actDate` del
  **acto interruptivo más reciente** de la causa, siempre que no sea anterior a
  su `offenseDate`. Su `prescriptionExpiresOn` se recalcula como
  `prescriptionStartsOn` más `prescriptionMonths`.
- `prescription` de la causa se recalcula en consecuencia: cambian `startsOn`,
  `expiresOn`, `elapsedPercentage` y `alert`, y `lastInterruptiveActDate` toma
  la fecha del acto. Una causa que estaba en alerta puede dejar de estarlo.
- Un acto interruptivo cargado con una fecha **anterior** a la de otro ya
  registrado queda asentado en la historia de la causa, pero no cambia el
  cómputo: rige siempre el más reciente.
- `offenseDate` no cambia nunca: es el dato que se cargó.
- El estado procesal y el vencimiento de la causa (`currentState`) no cambian.

Nada de esto se guarda como un valor fijo: la prescripción se calcula en cada
lectura, igual que en V3 (D-08).

---

#### `POST /cases/{caseId}/interruptive-acts`

Registra un acto interruptivo sobre una causa penal (HU31).

**Rol requerido:** abogado responsable de la causa. Cualquier otro usuario
recibe `403 FORBIDDEN`, aunque tenga el rol `LAWYER` o `ADMINISTRATOR`.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

```json
{
	"name": "Citación a juicio",
	"actDate": "2026-09-15",
	"notes": "Decreto de fs. 212."
}
```

| Campo     | Tipo           | Requerido | Restricciones                                |
| --------- | -------------- | :-------: | -------------------------------------------- |
| `name`    | String         |    Sí     | "Acto interruptivo". No vacío, hasta 255 caracteres |
| `actDate` | String (fecha) |    Sí     | "Fecha del acto". No puede ser posterior a hoy |
| `notes`   | String         |    No     | "Observaciones". Hasta 2000 caracteres       |

La causa puede no tener calificaciones legales cargadas: el acto se registra
igual y va a regir para las que se le carguen después.

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 7,
		"caseId": 1,
		"name": "Citación a juicio",
		"actDate": "2026-09-15",
		"notes": "Decreto de fs. 212.",
		"registeredBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"registeredAt": "2026-09-15T10:30:00-03:00"
	}
}
```

Después de registrarlo, el cliente vuelve a pedir la causa
(`GET /cases/{caseId}`) para mostrar la prescripción recalculada y el aviso del
prototipo: "Acto interruptivo registrado. La prescripción se reinició desde el
15/09/2026".

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"name": "El acto interruptivo es obligatorio.",
			"actDate": "No puede ser posterior a hoy."
		}
	}
}
```

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`, igual que en
`GET /cases/{caseId}`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Solo el abogado responsable de la causa puede registrar actos interruptivos.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

La causa no es del fuero penal:

```json
{
	"error": {
		"code": "PRESCRIPTION_NOT_APPLICABLE",
		"message": "La prescripción solo aplica a las causas del fuero penal.",
		"details": null
	}
}
```

La causa está en un estado terminal ("Prescripta" u otro):

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "La causa se encuentra en un estado terminal y no admite esta operación.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/interruptive-acts`

Obtiene una lista paginada de los actos interruptivos de una causa.

**Rol requerido:** cualquier usuario autenticado. No hace falta ser el abogado
responsable (RN11).

Los actos se ordenan del más reciente al más antiguo por `actDate`; si dos
tienen la misma fecha, primero el último registrado. El primero de la lista es
el que rige el cómputo de la prescripción.

El cliente los intercala con los actos procesales para armar el ciclo de vida
de la causa (ver [`GET /cases/{caseId}`](#get-casescaseid)).

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Parámetros de consulta**

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| --------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |

Ejemplo:

```http
GET /api/v1/cases/1/interruptive-acts?page=1&limit=20
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 3,
			"caseId": 1,
			"name": "Indagatoria",
			"actDate": "2024-07-04",
			"notes": null,
			"registeredBy": {
				"id": 3,
				"lastName": "Ríos",
				"firstName": "Malena"
			},
			"registeredAt": "2026-09-10T09:15:00-03:00"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 1,
		"totalPages": 1
	}
}
```

Una causa sin actos interruptivos —y toda causa que no es penal— devuelve
`data` vacío: no es un error.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`, igual que en
`GET /cases/{caseId}`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`404 Not Found`**

Causa inexistente o dada de baja.

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "No se encontró la causa solicitada.",
		"details": null
	}
}
```

---

### 3.10 Modelos formales: /document-templates

Nuevo en V4.

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRATOR` o `LAWYER`, tanto para la lectura como para
el alta. Un usuario que solo es `SECRETARY` recibe `403 FORBIDDEN` en todos los
endpoints de esta sección.

Según la tabla de [permisos por perfil](#permisos-por-perfil), administrar
modelos formales corresponde al Administrador y al Abogado. El
prototipo lo confirma: la sección "Modelos" no aparece en el menú de la
Secretaría. Es el primer recurso cuya **lectura** no está abierta a los tres
perfiles (CA-35.8).

Los modelos formales son los escritos tipo del estudio: plantillas `.docx` que
"al registrar una causa … se copian a su carpeta en Drive" (HU40). Esta versión
incorpora el alta (HU34) y la consulta con descarga (HU35).

El recurso modelo formal posee la siguiente estructura:

| Campo             | Tipo                   | Nulo | Descripción                                                                          |
| ----------------- | ---------------------- | :--: | ------------------------------------------------------------------------------------ |
| `id`              | Integer                |  No  | Identificador único                                                                  |
| `name`            | String                 |  No  | Nombre del modelo: "Oposición al requerimiento de elevación a juicio". Único         |
| `jurisdictions`   | `Jurisdiction[]`       |  No  | Fueros a los que aplica. Al menos uno, sin repetir                                   |
| `fileName`        | String                 |  No  | Nombre del archivo: `oposicion-elevacion.docx`                                       |
| `copyToNewCases`  | Boolean                |  No  | Si se copia a la carpeta de las causas nuevas de sus fueros (HU40)                   |
| `lastVersionAt`   | String (ISO 8601)      |  No  | Fecha y hora de la última versión del archivo ("Última versión")                     |
| `lastVersionBy`   | Object                 |  No  | Usuario que cargó esa versión: `id`, `lastName` y `firstName`                                     |
| `usageCount`      | Integer                |  No  | Causas a cuya carpeta se copió el modelo ("31 usos"). Calculado, sólo lectura        |
| `active`          | Boolean                |  No  | Estado de alta. Vale siempre `true` en esta versión                                  |

**Sobre `jurisdictions`:** el formulario de alta del prototipo permite elegir
varios fueros, con la opción "Todos los fueros". Un modelo cargado para más de
un fuero es **un solo modelo**, que aparece en la vista de cada uno de sus
fueros y se copia a las causas nuevas de todos ellos
(ver [D-55](#81-decisiones-tomadas)).

**Sobre `name`:** no puede haber dos modelos con el mismo nombre, sin distinguir
mayúsculas de minúsculas (D-71). El alta de un nombre repetido responde
`409 DOCUMENT_TEMPLATE_ALREADY_EXISTS`.

**Sobre `lastVersionAt` y `lastVersionBy`:** en esta versión coinciden con el
alta del modelo.

**Sobre el tipo:** el prototipo muestra un tipo de escrito ("Escrito de fondo",
"Recurso"…), pero el modelo formal no tiene tipo (D-56).

**Sobre el archivo:** no viaja dentro del recurso. Se sube con el alta y se
descarga con
[`GET /document-templates/{templateId}/file`](#get-document-templatestemplateidfile).
El backend lo guarda en `/VZ Causas/Modelos formales`, en el mismo
almacenamiento en la nube que las carpetas de las causas.

**Sobre las copias:** el modelo y sus copias son independientes. Lo que se copia
a la carpeta de una causa es el archivo tal como estaba ese día: "cada causa
conserva la versión con la que se abrió".

---

#### `POST /document-templates`

Registra un modelo formal con su archivo (HU34).

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`.

**Cuerpo de la petición**

`multipart/form-data`, porque lleva el archivo (ver
[Formato de intercambio](#formato-de-intercambio)).

```http
POST /api/v1/document-templates
Content-Type: multipart/form-data; boundary=----vz

------vz
Content-Disposition: form-data; name="name"

Recurso de casación
------vz
Content-Disposition: form-data; name="jurisdictions"

CRIMINAL
------vz
Content-Disposition: form-data; name="copyToNewCases"

true
------vz
Content-Disposition: form-data; name="file"; filename="casacion.docx"
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document

<contenido del archivo>
------vz--
```

| Campo            | Tipo                   | Requerido | Restricciones                                                                    |
| ---------------- | ---------------------- | :-------: | -------------------------------------------------------------------------------- |
| `name`           | String                 |    Sí     | "Nombre del modelo". No vacío, hasta 150 caracteres. Único entre los modelos     |
| `jurisdictions`  | `Jurisdiction[]`       |    Sí     | "Fuero". Al menos uno, sin repetir. El campo se repite una vez por fuero         |
| `copyToNewCases` | Boolean                |    No     | "Copiar en las causas nuevas de los fueros elegidos". Por defecto, `true`        |
| `file`           | Archivo                |    Sí     | "Archivo del modelo". Documento Word (`.docx`). Hasta 10 MB                      |

Para registrar un modelo para "Todos los fueros", el cliente envía los tres
valores de `jurisdictions`.

**Efectos del alta**

- El modelo queda vigente y disponible en el listado (CA-34.1).
- `lastVersionBy` es el usuario autenticado y `lastVersionAt`, el momento del
  alta (CA-34.6).
- Con `copyToNewCases` en `true`, el modelo se copia a la carpeta de **cada
  causa que se registre después** en alguno de sus fueros. Las causas ya
  existentes no lo reciben (CA-34.5).
- **El alta es atómica** (CA-34.7): si el archivo no puede guardarse en el
  almacenamiento en la nube, el modelo no se registra y la respuesta es
  `502 DOCUMENT_STORAGE_UNAVAILABLE`. No puede quedar un modelo sin su archivo.

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 4,
		"name": "Recurso de casación",
		"jurisdictions": ["CRIMINAL"],
		"fileName": "casacion.docx",
		"copyToNewCases": true,
		"lastVersionAt": "2026-09-15T16:05:00-03:00",
		"lastVersionBy": {
			"id": 6,
			"lastName": "Ferreyra",
			"firstName": "Matías"
		},
		"usageCount": 0,
		"active": true
	}
}
```

**`400 Bad Request`**

Falta un campo obligatorio (CA-34.4):

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"name": "El nombre del modelo es obligatorio.",
			"jurisdictions": "Elegí al menos un fuero.",
			"file": "El archivo del modelo es obligatorio."
		}
	}
}
```

El archivo no es un `.docx` (CA-34.3):

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"file": "El archivo tiene que ser .docx."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "DOCUMENT_TEMPLATE_ALREADY_EXISTS",
		"message": "Ya existe un modelo formal con ese nombre.",
		"details": null
	}
}
```

**`413 Content Too Large`**

```json
{
	"error": {
		"code": "FILE_TOO_LARGE",
		"message": "El archivo supera el tamaño máximo de 10 MB.",
		"details": null
	}
}
```

**`502 Bad Gateway`**

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

#### `GET /document-templates`

Obtiene una lista paginada de los modelos formales vigentes (HU35), ordenada
alfabéticamente por `name` (CA-35.3).

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`.

**Parámetros de consulta**

| Parámetro        | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                                                              |
| ---------------- | ------- | :-------: | ----------------- | ------------------- | ------------------------------------------------------------------------ |
| `page`           | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                                                         |
| `limit`          | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página                                  |
| `jurisdiction`   | String  |    No     | -                 | Fuero válido        | Solo los modelos que aplican a ese fuero. Sin el parámetro, los de todos |
| `copyToNewCases` | Boolean |    No     | -                 | -                   | `true`: solo los que se copian a las causas nuevas                       |

Ejemplo:

```http
GET /api/v1/document-templates?page=1&limit=20&jurisdiction=CRIMINAL
```

**Cómo lo usa el prototipo**

| Pantalla                                                            | Petición                                                    |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Modelos → tarjetas por fuero ("6 modelos vigentes · Actualizado …") | Sin `jurisdiction`, con `limit=100`; el cliente agrupa por fuero y toma el `lastVersionAt` más reciente de cada uno |
| Modelos → "Fuero Penal" (lista y "6 modelos")                       | `jurisdiction=CRIMINAL`; el total es `pagination.totalItems` (CA-35.4) |
| Registrar causa → "6 modelos parametrizados para el fuero Penal"    | `jurisdiction=CRIMINAL&copyToNewCases=true&limit=1`; el número es `pagination.totalItems`. Solo para Administrador y Abogado: a la Secretaría el formulario le muestra la casilla sin el número (D-56) |

Un modelo que aplica a varios fueros aparece en el resultado de cada uno de
ellos, y una sola vez cuando no se filtra.

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"name": "Designación de abogado defensor",
			"jurisdictions": ["CRIMINAL"],
			"fileName": "designacion-defensor.docx",
			"copyToNewCases": true,
			"lastVersionAt": "2026-08-04T09:20:00-03:00",
			"lastVersionBy": {
				"id": 1,
				"lastName": "Vázquez",
				"firstName": "Fernando G."
			},
			"usageCount": 31,
			"active": true
		},
		{
			"id": 2,
			"name": "Oposición al requerimiento de elevación a juicio",
			"jurisdictions": ["CRIMINAL"],
			"fileName": "oposicion-elevacion.docx",
			"copyToNewCases": true,
			"lastVersionAt": "2026-08-21T17:40:00-03:00",
			"lastVersionBy": {
				"id": 3,
				"lastName": "Ríos",
				"firstName": "Malena"
			},
			"usageCount": 12,
			"active": true
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 6,
		"totalPages": 1
	}
}
```

Un fuero sin modelos devuelve `data` vacío y `totalItems` en `0`: no es un
error (CA-35.5). El prototipo muestra "Todavía no hay modelos en este fuero".

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"jurisdiction": "No existe un fuero procesal con ese nombre."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Los parámetros de paginación no son válidos.",
		"details": {
			"page": "Debe ser un número entero mayor o igual a 1.",
			"limit": "Debe ser un número entero entre 1 y 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.",
		"details": null
	}
}
```

---

#### `GET /document-templates/{templateId}`

Obtiene la información de un modelo formal.

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`.

**Parámetros de ruta**

| Parámetro    | Tipo    | Descripción                           |
| ------------ | ------- | ------------------------------------- |
| `templateId` | Integer | Identificador único del modelo formal |

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 2,
		"name": "Oposición al requerimiento de elevación a juicio",
		"jurisdictions": ["CRIMINAL"],
		"fileName": "oposicion-elevacion.docx",
		"copyToNewCases": true,
		"lastVersionAt": "2026-08-21T17:40:00-03:00",
		"lastVersionBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"usageCount": 12,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "El identificador del modelo formal no es válido.",
		"details": {
			"templateId": "Debe ser un número entero válido."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "DOCUMENT_TEMPLATE_NOT_FOUND",
		"message": "No se encontró el modelo formal solicitado.",
		"details": null
	}
}
```

---

#### `GET /document-templates/{templateId}/file`

Descarga el archivo `.docx` de un modelo formal, en su última versión
(CA-35.6). Es el botón "Descargar" de la lista.

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`.

**Parámetros de ruta**

| Parámetro    | Tipo    | Descripción                           |
| ------------ | ------- | ------------------------------------- |
| `templateId` | Integer | Identificador único del modelo formal |

**Respuestas**

**`200 OK`**

Es la única respuesta exitosa del contrato que **no es JSON**: el cuerpo es el
archivo.

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="oposicion-elevacion.docx"
Content-Length: 48211

<contenido del archivo>
```

El endpoint exige el encabezado `Authorization`, igual que el resto: el cliente
lo pide como cualquier otra petición y entrega el archivo al usuario; no sirve
como destino directo de un enlace.

Las respuestas de error sí son JSON, con la estructura de siempre.

**`400 Bad Request`**

`INVALID_PATH_PARAMETER`, igual que en `GET /document-templates/{templateId}`.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR o LAWYER para realizar esta operación.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "DOCUMENT_TEMPLATE_NOT_FOUND",
		"message": "No se encontró el modelo formal solicitado.",
		"details": null
	}
}
```

**`502 Bad Gateway`**

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

### 3.11 Tableros: /dashboards

Nuevo en V4.

**Autenticación requerida:** Sí.
**Rol requerido:** `LAWYER` para el tablero del abogado; `ADMINISTRATOR` para
el del administrador. La Secretaría no tiene tablero.

Son la pantalla "Inicio" del prototipo. Hay **un tablero por rol**:

| Tablero del prototipo | HU  | Endpoint                        | Qué muestra                                    |
| --------------------- | --- | ------------------------------- | ---------------------------------------------- |
| "Mi día"              | 41  | `GET /dashboards/lawyer`        | Las causas de las que el usuario es responsable |
| "Estudio"             | 42  | `GET /dashboards/administrator` | Toda la cartera del estudio                    |

Un usuario que es `ADMINISTRATOR` y `LAWYER` a la vez ve las dos pestañas y
pide los dos endpoints. Un usuario que solo es `SECRETARY` no tiene "Inicio":
el prototipo lo lleva directo a "Causas".

Los dos son **modelos de lectura**: no hay un recurso "tablero" que se cree o
se modifique. Cada endpoint devuelve, en una sola petición, todo lo que su
pantalla necesita, ya calculado. Por eso sus listas **no están paginadas**: su
tamaño está acotado por la cantidad de causas activas del estudio
(ver [D-62](#81-decisiones-tomadas)). Se calculan en cada petición, así que
reflejan un acto procesal apenas se registra (CA-41.9).

Solo cuentan las **causas activas** (ver [Causa activa](#causa-activa)): ni las
dadas de baja ni las que están en un estado terminal, como "Prescripta"
(CA-41.6).

**Estructuras comunes a los dos tableros**

**`summary`** — los cuatro indicadores de la franja superior.

| Campo         | Tipo    | Rótulo del prototipo                       | Qué cuenta                                                                 |
| ------------- | ------- | ------------------------------------------ | -------------------------------------------------------------------------- |
| `dueToday`    | Integer | "Vencen hoy"                               | Causas cuyo plazo vence hoy (`businessDaysRemaining` igual a `0`)          |
| `overdue`     | Integer | "Vencidos"                                 | Causas con el plazo vencido y todavía abierto (`businessDaysRemaining` negativo) |
| `dueSoon`     | Integer | "Próx. 5 días hábiles"                     | Causas cuyo plazo vence en los próximos 5 días hábiles (`businessDaysRemaining` entre `1` y `5`) |
| `activeCases` | Integer | "Mis causas activas" / "Causas activas"    | Causas activas del alcance del tablero                                     |

**`deadlines[]`** — un elemento por cada vencimiento abierto: el plazo de un
acto procesal (`currentState.dueDate` no nulo) o el del acto lesivo de un
amparo (`harmfulActDeadline` no nulo). Una causa aparece una sola vez, porque el
vencimiento del acto lesivo solo existe mientras la causa está en "Iniciada",
que no abre plazo. **Ordenados por urgencia**: por `dueDate`
ascendente, de modo que los vencidos quedan primeros.

| Campo                   | Tipo                    | Descripción                                             |
| ----------------------- | ----------------------- | ------------------------------------------------------- |
| `caseId`                | Integer                 | Causa. Con él se abre su detalle                        |
| `kind`                  | `DeadlineKind`          | **Nuevo.** `PROCEDURAL_ACT` o `HARMFUL_ACT`             |
| `sacNumber`             | String \| `null`        | Número de SAC                                           |
| `caption`               | String                  | Carátula                                                |
| `jurisdiction`          | `Jurisdiction`          | Fuero                                                   |
| `currentStateName`      | String                  | Estado procesal actual                                  |
| `responsibleLawyer`     | Object                  | Abogado responsable: `id`, `lastName` y `firstName`                  |
| `dueDate`               | String (fecha ISO 8601) | Vencimiento                                             |
| `businessDaysRemaining` | Integer                 | Días hábiles hasta el vencimiento. `0`, hoy; negativo, vencido |

El primer elemento es "Lo primero de hoy". Con `dueDate` el cliente ubica cada
plazo en el calendario mensual ("Agenda de plazos"), y con
`businessDaysRemaining` arma los grupos "Vencidos", "Hoy", "Esta semana" (de `1`
a `5`) y "Después" (más de `5`) y sus contadores.

**`prescriptionAlerts[]`** — las causas penales con `prescription.alert` en
`true`, es decir, con el **70 %** o más de su plazo de prescripción transcurrido
(HU32). Ordenadas por `expiresOn` ascendente: primero la que prescribe antes.

| Campo                    | Tipo                    | Descripción                                    |
| ------------------------ | ----------------------- | ---------------------------------------------- |
| `caseId`                 | Integer                 | Causa                                          |
| `sacNumber`              | String \| `null`        | Número de SAC                                  |
| `caption`                | String                  | Carátula                                       |
| `responsibleLawyer`      | Object                  | Abogado responsable: `id`, `lastName` y `firstName`         |
| `legalQualificationName` | String                  | Calificación que prescribe primero             |
| `startsOn`               | String (fecha ISO 8601) | Desde cuándo corre la prescripción             |
| `expiresOn`              | String (fecha ISO 8601) | Cuándo prescribe                               |
| `elapsedPercentage`      | Integer                 | Porcentaje transcurrido ("78 % transcurrido")  |
| `expired`                | Boolean                 | `true` si el plazo de prescripción ya se cumplió |

Los cuatro últimos campos tienen el mismo significado que en `prescription` de
la causa (§3.7). Si ninguna causa llegó al umbral, la lista viene vacía y el
prototipo muestra "Ninguna causa superó el 70 % de su plazo de prescripción".

**Sobre los días hábiles:** los indicadores y `businessDaysRemaining` usan el
cómputo de la [sección 4](#cómputo-de-días): solo sábados y domingos son días
no hábiles (D-73). El calendario del tablero sombrea
los fines de semana.

---

#### `GET /dashboards/lawyer`

Obtiene el tablero del abogado: "Mi día" (HU41).

**Rol requerido:** `LAWYER`. El tablero es el del abogado vinculado al usuario
autenticado (su `lawyerId`); no recibe parámetros y no permite ver el de otro
abogado.

El alcance son **las causas de las que ese abogado es responsable**. El abogado
ve solo su tablero; si además es `ADMINISTRATOR`, también ve la pestaña
"Estudio" (D-63).

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`200 OK`**

| Campo                | Tipo                    | Descripción                                                                       |
| -------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `date`               | String (fecha ISO 8601) | Fecha del día en Córdoba, contra la que se calculó todo ("Martes 15 de septiembre de 2026") |
| `lawyer`             | Object                  | Abogado dueño del tablero: `id`, `lastName` y `firstName`                                      |
| `summary`            | Object                  | Indicadores sobre sus causas                                                      |
| `deadlines`          | Object[]                | Sus plazos abiertos, por urgencia                                                 |
| `prescriptionAlerts` | Object[]                | Sus causas con alerta de prescripción                                             |
| `casesToAdvance`     | Object[]                | "Causas para impulsar": sus causas activas **sin vencimiento abierto**            |

**`casesToAdvance[]`** — "Sin plazo abierto: el impulso procesal depende del
estudio, no del tribunal" (CA-41.4). Ordenadas por `daysSinceLastAct`
descendente: primero la que lleva más tiempo sin movimiento, y al principio las
que todavía no tienen ninguno.

| Campo              | Tipo                              | Descripción                                                             |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| `caseId`           | Integer                           | Causa                                                                   |
| `sacNumber`        | String \| `null`                  | Número de SAC                                                           |
| `caption`          | String                            | Carátula                                                                |
| `jurisdiction`     | `Jurisdiction`                    | Fuero                                                                   |
| `currentStateName` | String                            | Estado procesal actual. "Iniciada" si la causa no tiene actos           |
| `lastActDate`      | String (fecha ISO 8601) \| `null` | "Última actuación": fecha del acto procesal o interruptivo más reciente. `null` si la causa no tiene ninguno |
| `daysSinceLastAct` | Integer \| `null`                 | Días corridos desde `lastActDate` hasta hoy ("71 días"). `null` si `lastActDate` es `null` |

```json
{
	"data": {
		"date": "2026-09-15",
		"lawyer": {
			"id": 1,
			"lastName": "Vázquez",
			"firstName": "Fernando G."
		},
		"summary": {
			"dueToday": 1,
			"overdue": 0,
			"dueSoon": 0,
			"activeCases": 14
		},
		"deadlines": [
			{
				"caseId": 6,
				"kind": "PROCEDURAL_ACT",
				"sacNumber": "12774310",
				"caption": "MOYANO, Daniela c/ APROSS — Amparo de salud",
				"jurisdiction": "AMPARO",
				"currentStateName": "Traslado a la demandada",
				"responsibleLawyer": {
					"id": 1,
					"lastName": "Vázquez",
					"firstName": "Fernando G."
				},
				"dueDate": "2026-09-15",
				"businessDaysRemaining": 0
			}
		],
		"prescriptionAlerts": [
			{
				"caseId": 4,
				"sacNumber": "11845620",
				"caption": "ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737",
				"responsibleLawyer": {
					"id": 1,
					"lastName": "Vázquez",
					"firstName": "Fernando G."
				},
				"legalQualificationName": "Infracción Ley 23.737 — art. 5 inc. c",
				"startsOn": "2022-01-19",
				"expiresOn": "2028-01-19",
				"elapsedPercentage": 78,
				"expired": false
			}
		],
		"casesToAdvance": [
			{
				"caseId": 4,
				"sacNumber": "11845620",
				"caption": "ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737",
				"jurisdiction": "CRIMINAL",
				"currentStateName": "Cédula de notificación",
				"lastActDate": "2026-07-06",
				"daysSinceLastAct": 71
			}
		]
	}
}
```

Un abogado sin plazos abiertos, sin alertas o sin causas para impulsar recibe
la lista correspondiente vacía: no es un error (CA-41.8). El prototipo muestra
"Sin plazos abiertos" o "Todas tus causas tienen un plazo en curso".

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol LAWYER para realizar esta operación.",
		"details": null
	}
}
```

---

#### `GET /dashboards/administrator`

Obtiene el tablero del administrador: "Estudio" (HU42).

**Rol requerido:** `ADMINISTRATOR`.

El alcance son **todas las causas activas del estudio**, con el responsable de
cada una: "el panorama global del estudio, con los vencimientos próximos y el
responsable asignado".

**Parámetros de consulta**

No requiere parámetros de consulta. El filtro por abogado ("Tocá un abogado
para ver solo sus vencimientos") y el filtro por urgencia los aplica el cliente
sobre `deadlines`, que trae el responsable de cada plazo.

**Respuestas**

**`200 OK`**

| Campo                 | Tipo                    | Descripción                                                                   |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `date`                | String (fecha ISO 8601) | Fecha del día en Córdoba, contra la que se calculó todo                       |
| `summary`             | Object                  | Indicadores sobre toda la cartera                                             |
| `casesByJurisdiction` | Object[]                | "Cartera por fuero": un elemento por fuero, con `jurisdiction` y `activeCases` |
| `deadlines`           | Object[]                | "Vencimientos del estudio": todos los plazos abiertos, por urgencia           |
| `prescriptionAlerts`  | Object[]                | Causas con alerta de prescripción, de todo el estudio                         |
| `team`                | Object[]                | "Carga del equipo": un elemento por abogado vigente                           |

`casesByJurisdiction` trae siempre los tres fueros, aunque alguno no tenga
causas, y la suma de sus `activeCases` es igual a `summary.activeCases`.

**`team[]`** — un elemento por cada abogado vigente, tenga o no causas.

| Campo           | Tipo    | Descripción                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------- |
| `lawyer`        | Object  | Abogado: `id`, `lastName` y `firstName`                                                              |
| `activeCases`   | Integer | Causas activas de las que es responsable ("17 causas"). El mismo valor que en `/lawyers` |
| `openDeadlines` | Object  | Sus plazos abiertos, por urgencia: `overdue`, `dueToday`, `dueSoon` y `later`            |

`overdue`, `dueToday` y `dueSoon` se definen igual que en `summary`; `later`
cuenta los plazos que vencen en más de 5 días hábiles. Con ellos el cliente
arma el rótulo de cada abogado —"Con vencidos", "Vence hoy", "Atención esta
semana" o "Al día"— y los contadores de los grupos cuando se elige un abogado.

Los elementos se ordenan por urgencia: primero los abogados con más plazos
vencidos, luego con más que vencen hoy, luego con más en los próximos 5 días
hábiles; a igualdad, por `lastName` y `firstName`.

```json
{
	"data": {
		"date": "2026-09-15",
		"summary": {
			"dueToday": 1,
			"overdue": 1,
			"dueSoon": 2,
			"activeCases": 105
		},
		"casesByJurisdiction": [
			{ "jurisdiction": "CRIMINAL", "activeCases": 63 },
			{ "jurisdiction": "ADMINISTRATIVE", "activeCases": 31 },
			{ "jurisdiction": "AMPARO", "activeCases": 11 }
		],
		"deadlines": [
			{
				"caseId": 2,
				"kind": "PROCEDURAL_ACT",
				"sacNumber": "12907344",
				"caption": "PEREYRA, Marcos D. — Sumario administrativo",
				"jurisdiction": "ADMINISTRATIVE",
				"currentStateName": "Alegato",
				"responsibleLawyer": {
					"id": 4,
					"lastName": "Peralta",
					"firstName": "Ignacio"
				},
				"dueDate": "2026-09-11",
				"businessDaysRemaining": -2
			},
			{
				"caseId": 6,
				"kind": "PROCEDURAL_ACT",
				"sacNumber": "12774310",
				"caption": "MOYANO, Daniela c/ APROSS — Amparo de salud",
				"jurisdiction": "AMPARO",
				"currentStateName": "Traslado a la demandada",
				"responsibleLawyer": {
					"id": 1,
					"lastName": "Vázquez",
					"firstName": "Fernando G."
				},
				"dueDate": "2026-09-15",
				"businessDaysRemaining": 0
			},
			{
				"caseId": 1,
				"kind": "PROCEDURAL_ACT",
				"sacNumber": "13284571",
				"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
				"jurisdiction": "CRIMINAL",
				"currentStateName": "Oposición al requerimiento de elevación",
				"responsibleLawyer": {
					"id": 3,
					"lastName": "Ríos",
					"firstName": "Malena"
				},
				"dueDate": "2026-09-16",
				"businessDaysRemaining": 1
			}
		],
		"prescriptionAlerts": [
			{
				"caseId": 4,
				"sacNumber": "11845620",
				"caption": "ACOSTA, Jonathan E. p.s.a. Infracción Ley 23.737",
				"responsibleLawyer": {
					"id": 1,
					"lastName": "Vázquez",
					"firstName": "Fernando G."
				},
				"legalQualificationName": "Infracción Ley 23.737 — art. 5 inc. c",
				"startsOn": "2022-01-19",
				"expiresOn": "2028-01-19",
				"elapsedPercentage": 78,
				"expired": false
			}
		],
		"team": [
			{
				"lawyer": {
					"id": 4,
					"lastName": "Peralta",
					"firstName": "Ignacio"
				},
				"activeCases": 16,
				"openDeadlines": {
					"overdue": 1,
					"dueToday": 0,
					"dueSoon": 0,
					"later": 0
				}
			},
			{
				"lawyer": {
					"id": 1,
					"lastName": "Vázquez",
					"firstName": "Fernando G."
				},
				"activeCases": 14,
				"openDeadlines": {
					"overdue": 0,
					"dueToday": 1,
					"dueSoon": 0,
					"later": 0
				}
			},
			{
				"lawyer": {
					"id": 3,
					"lastName": "Ríos",
					"firstName": "Malena"
				},
				"activeCases": 17,
				"openDeadlines": {
					"overdue": 0,
					"dueToday": 0,
					"dueSoon": 1,
					"later": 0
				}
			}
		]
	}
}
```

El ejemplo está recortado: `deadlines` muestra tres de los cinco plazos abiertos
de los datos del prototipo, y `team`, tres de los siete abogados.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "La autenticación es requerida.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRATOR para realizar esta operación.",
		"details": null
	}
}
```

---

## 4. Información general

### Base URL

```text
/api/v1
```

### Autenticación

Los endpoints protegidos requieren autenticación mediante un token Bearer:

```http
Authorization: Bearer <accessToken>
```

### Sesión y revocación

El `accessToken` vence a los 15 minutos; el cliente lo renueva con
`POST /auth/refresh` usando la cookie de refresh (§3.1). Más allá de ese
vencimiento natural, cuatro situaciones cortan una sesión **antes** de que el
`accessToken` expire por sí solo, y lo hacen desde la **próxima petición**:

- **Cierre de sesión** (`POST /auth/logout`).
- **Baja del usuario** (`DELETE /users/{userId}`).
- **Cambio de contraseña**, para toda sesión que no sea la que lo hizo. La
  sesión que cambió la contraseña permanece abierta (§3.1).
- **Inactividad prolongada**: una sesión sin renovarse por **30 minutos**
  queda cerrada. El cómputo es aproximado, no al segundo — el cliente solo
  sabe que se cortó cuando el siguiente `POST /auth/refresh` responde `401
  UNAUTHENTICATED` en lugar de renovar.

En los cuatro casos la reacción del cliente es la misma: el próximo pedido
responde `401 UNAUTHENTICATED` (en un endpoint protegido) o
`POST /auth/refresh` también responde `401 UNAUTHENTICATED` en lugar de
renovar. El servidor no distingue el motivo en la respuesta — es la misma
opacidad deliberada que ya rige en `POST /auth/login` (§3.1): el cliente no
puede inferir si la sesión se cerró por inactividad, por una baja o porque se
cerró sesión desde otro dispositivo. La reacción esperada del cliente es
siempre la misma: redirigir al login.

### Límite de frecuencia

Dos mecanismos independientes, que cubren ataques distintos:

- **Por dirección IP, en toda la API.** Un volumen alto de pedidos desde una
  misma dirección responde `429 Too Many Requests`, código
  `TOO_MANY_REQUESTS` (§5.3), sin importar el endpoint ni la cuenta a la que
  apunten. `POST /auth/login` y `POST /auth/refresh` tienen, además, un
  límite propio más estricto que el resto de la API.
- **Por cuenta, solo en `POST /auth/login`.** Cinco intentos fallidos
  consecutivos contra el mismo usuario bloquean esa cuenta con una espera
  creciente (90 segundos, 5, 15, 30 y 60 minutos). Responde `429 Too Many
  Requests`, código `TOO_MANY_LOGIN_ATTEMPTS`. El bloqueo no distingue un
  usuario inexistente de uno real, por el mismo motivo que `INVALID_CREDENTIALS`
  no lo hace (§3.1): de lo contrario, que una cuenta se bloquee o no revelaría
  si existe.

En ambos casos la respuesta trae el encabezado `Retry-After` (segundos a
esperar) y el mismo valor en `details.retryAfterSeconds` — la única
excepción a que `details` sea `null` fuera de un error de validación (§5.2).

### Autorización

Un endpoint indicado con un rol (`ADMINISTRATOR`, `LAWYER` o `SECRETARY`)
requiere que el usuario autenticado lo posea. Un usuario con varios roles
satisface el requisito si el rol exigido se encuentra entre ellos: por ejemplo,
un usuario `ADMINISTRATOR` y `SECRETARY` puede administrar usuarios y
abogados. Si no lo posee, la respuesta es `403 FORBIDDEN`.

Cuando un endpoint indica dos roles —"`ADMINISTRATOR` o `LAWYER`"— alcanza con
poseer **uno** de los dos.

Los **actos procesales** y los **actos interruptivos** son la excepción: no
alcanza con un rol. Solo los registra el abogado responsable de la causa,
comparando el `lawyerId` del usuario con el responsable de la causa (ver
[§3.8](#38-actos-procesales-casescaseidprocedural-acts) y
[§3.9](#39-actos-interruptivos-casescaseidinterruptive-acts)).

#### Permisos por perfil

Tabla de permisos acordada por el equipo. Es la fuente de los roles de cada
endpoint; cubre también funcionalidades de sprints posteriores, para que los
contratos siguientes la respeten.

| Funcionalidad                                                                           | HU             | Admin. | Abogado | Secret. |
| --------------------------------------------------------------------------------------- | -------------- | :----: | :-----: | :-----: |
| Iniciar y cerrar sesión, cambiar contraseña                                             | 1 – 3          |   ✓    |    ✓    |    ✓    |
| Administrar usuarios                                                                    | 4 – 7          |   ✓    |    —    |    —    |
| Administrar clientes                                                                    | 8 – 11         |   ✓    |    ✓    |    ✓    |
| Consultar abogados                                                                      | 13             |   ✓    |    ✓    |    ✓    |
| Registrar, modificar y dar de baja abogados                                             | 12, 14, 15     |   ✓    |    —    |    —    |
| Administrar estados procesales                                                          | 16, 17, 45, 46 |   ✓    |    ✓    |    ✓    |
| Gestionar causas (alta, consulta, detalle, línea de tiempo, carátula, expediente, baja) | 18 – 25        |   ✓    |    ✓    |    ✓    |
| Consultar actos procesales                                                              | 27             |   ✓    |    ✓    |    ✓    |
| Registrar, modificar y dar de baja actos procesales ¹                                   | 26, 28, 29     |   —    |    ✓    |    —    |
| Registrar actos interruptivos ¹                                                         | 31             |   —    |    ✓    |    —    |
| Recibir avisos de vencimiento y alertas de prescripción                                 | 30, 32, 33     |   ✓    |    ✓    |    —    |
| Administrar modelos formales                                                            | 34 – 37        |   ✓    |    ✓    |    —    |
| Consultar documentos de causa                                                           | 38             |   —    |    ✓    |    ✓    |
| Crear carpeta y modelos en la nube                                                      | 39 – 40        |   ✓    |    ✓    |    ✓    |
| Tablero del abogado                                                                     | 41             |   —    |    ✓    |    —    |
| Tablero del administrador y reportes                                                    | 42 – 44        |   ✓    |    —    |    —    |
| Administrar calificaciones legales                                                      | 47 – 50        |   ✓    |    ✓    |    ✓    |

¹ Lo realiza el abogado asignado a su propia causa: solo el propietario de la
causa puede realizar estas acciones.

La tabla es la matriz de permisos del 11/10/2026 (V3, §7.11), la misma que
figura en la Definición del Producto V2, §5.1. La **consulta** de abogados está
abierta a los tres perfiles; su **administración** (alta, modificación y baja)
es solo del Administrador.

Esta versión es la primera en la que la matriz **restringe la lectura** de algo:
los modelos formales y los tableros no están abiertos a los tres perfiles.

**Actos procesales.** Las filas marcadas con ¹ se restringen además a cada
causa: solo el abogado responsable opera sus actos. Ningún otro abogado ni el
`ADMINISTRATOR` puede hacerlo sobre una causa ajena (D-30).

#### Matriz por recurso

| Recurso                            | Lectura (`GET`)               | Escritura                                                        |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `/auth`                            | -                             | Cualquier usuario autenticado (`logout`, `password`)             |
| `/users`                           | `ADMINISTRATOR`               | `ADMINISTRATOR`                                                  |
| `/lawyers`                         | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/procedural-states`               | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/legal-qualifications`            | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/clients`                         | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/cases`                           | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/cases/{caseId}/prescription`     | -                             | `ADMINISTRATOR` o `LAWYER`                                       |
| `/cases/{caseId}/folder`           | -                             | Cualquier usuario autenticado                                    |
| `/cases/{caseId}/procedural-acts`  | Cualquier usuario autenticado; `deadline-preview`, solo el abogado responsable | Abogado responsable de la causa |
| `/cases/{caseId}/interruptive-acts` | Cualquier usuario autenticado | Abogado responsable de la causa                                 |
| `/document-templates`              | `ADMINISTRATOR` o `LAWYER`    | `ADMINISTRATOR` o `LAWYER`                                       |
| `/dashboards/lawyer`               | `LAWYER`                      | -                                                                |
| `/dashboards/administrator`        | `ADMINISTRATOR`               | -                                                                |

RN11 establece que todo el estudio accede a todas las causas: la diferencia
entre perfiles está en lo que pueden **operar**, no en lo que pueden **ver**.
Por eso no hay filtrado de causas por usuario. El tablero del abogado no es una
excepción a RN11: muestra sus causas porque esa es su función, y esas mismas
causas las puede consultar cualquier usuario en `/cases`.

### Formato de intercambio

Todas las solicitudes y respuestas utilizan JSON.

```http
Content-Type: application/json
Accept: application/json
```

Las fechas y horas se expresan en formato ISO 8601 con desplazamiento horario:
`2026-09-19T08:12:00-03:00`.

Las **fechas sin hora** —fecha de inicio de una causa, fecha de un acto,
vencimientos, prescripción— se expresan como `YYYY-MM-DD` (`2026-09-16`). Son
fechas civiles del calendario judicial de Córdoba: no llevan hora ni
desplazamiento, y "hoy" se interpreta en la zona horaria
`America/Argentina/Cordoba`.

**Excepciones al JSON.** Dos endpoints manejan archivos y no usan JSON en uno
de sus sentidos:

| Operación                                                                                    | Qué cambia                                                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /document-templates`                                                                   | El **cuerpo** es `multipart/form-data`, con el archivo en el campo `file`. La respuesta es JSON |
| `GET /document-templates/{templateId}/file`                                                  | La **respuesta** exitosa es el archivo, con su `Content-Type` y `Content-Disposition: attachment`. Los errores son JSON |

En `multipart/form-data` cada campo viaja como texto: los booleanos, como `true`
o `false`; un campo de varios valores, como `jurisdictions`, se repite una vez
por valor. El tamaño máximo de un archivo es **10 MB**; por encima, la respuesta
es `413 FILE_TOO_LARGE`.

### Causa activa

Una causa es **activa** cuando no fue dada de baja y su estado procesal actual
no es terminal (ni "Archivada" ni "Prescripta"). Es la definición que usa el
prototipo ("causas activas, sin contar archivadas ni prescriptas") y la que
aplican todos los campos `activeCases` del contrato. El estado procesal no usa
esta definición: su `caseCount` cuenta todas las causas que están en él,
activas o no.

| Recurso                  | `activeCases` cuenta las causas activas…          |
| ------------------------ | ------------------------------------------------- |
| Abogado                  | de las que es responsable                         |
| Calificación legal       | que la registran                                  |
| Cliente                  | en las que es el cliente                          |

Un estado escrito a mano no es terminal: la causa que lo tiene es activa.

Una causa en el estado inicial ("Iniciada") también es activa: cuenta para su
abogado, su cliente y sus calificaciones legales. No cuenta para el
`activeCases` de ningún estado procesal, porque el estado inicial no forma
parte del listado de estados.

### Cómputo de días

- **Días hábiles (`BUSINESS`):** de lunes a viernes. El plazo se cuenta a
  partir del día siguiente a la fecha desde la que corre.
- **Días corridos (`CONSECUTIVE`):** todos los días del calendario.
- **`businessDaysRemaining`:** cantidad de días hábiles entre hoy (excluido) y
  el vencimiento (incluido). Vale `0` si vence hoy y es negativo si ya venció.

**Solo sábados y domingos son días no hábiles.** Feriados y feria judicial no se
excluyen (D-73), lo que deja
resuelto por ahora el pendiente P-02 de la arquitectura de backend. Si más
adelante se incorporan, cambiarán los valores calculados, no la estructura del
contrato.

### Prescripción

Reúne las reglas que V3 tenía repartidas y las que suma esta versión.

- **Solo el fuero `CRIMINAL`** computa prescripción: los amparos no prescriben,
  y una causa penal sin calificación legal tampoco (D-74). En los demás fueros,
  `legalQualifications` llega vacío y `prescription` vale `null`.
- **Cada calificación legal computa la suya.** Su plazo es
  `prescriptionMonths`, y vence en `prescriptionStartsOn` más esos meses.
- **Desde cuándo corre** (`prescriptionStartsOn`): desde la fecha del hecho
  (`offenseDate`) o, si la causa tiene actos interruptivos, desde la fecha del
  más reciente (RN8).
- **La que rige la causa** es la calificación que prescribe primero: la de
  menor `prescriptionExpiresOn`. Es la que resume `prescription`.
- **Porcentaje transcurrido** (`elapsedPercentage`): días corridos desde
  `startsOn` hasta hoy, sobre los días corridos entre `startsOn` y `expiresOn`.
  Entre `0` y `100`.
- **Alerta** (`alert`): cuando transcurrió el **70 %** o más. El umbral es fijo:
  es el "aviso al 70 %" del prototipo, y no forma parte de la configuración de
  avisos.
- **Plazo cumplido** (`expired`): cuando hoy es igual o posterior a
  `expiresOn`. No cambia el estado de la causa.
- **Nada se guarda calculado.** Todo se computa en cada lectura, así que
  cambiar el plazo de una calificación legal o registrar un acto interruptivo
  se refleja de inmediato (D-08).

### Carpeta de la causa

HU39 y HU40. El almacenamiento en la nube es Google Drive (RNF 6), en la
**cuenta de Gmail de gestión del estudio**, que es la dueña de todas las
carpetas que crea el sistema.

- **Cómo actúa el backend.** Con una autorización que alguien del estudio
  otorga **una sola vez**, iniciando sesión con la cuenta de gestión y aceptando
  los permisos. El backend la guarda en su configuración y opera en nombre de
  esa cuenta; nadie del equipo necesita su contraseña (D-84).
- **Estructura.** `/VZ Causas/{abogado}/{fuero}/{carátula}` (D-61):

  | Nivel      | Qué es                                                                                   | Ejemplo                                        |
  | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
  | `abogado`  | El abogado responsable de la causa al crearse la carpeta, como `Apellido, Nombres`       | `Ríos, Malena`                                 |
  | `fuero`    | El rótulo en castellano del fuero                                                        | `Penal`, `Administrativo`, `Amparo`            |
  | `carátula` | La carátula de la causa (`caption`), tal como está registrada                            | `GÓMEZ, Ariel Fernando p.s.a. Robo calificado` |

  Las carpetas del abogado y del fuero las crea el sistema la primera vez que
  hacen falta. La carátula puede tener una barra ("c/ APROSS"): Drive lo
  admite, y por eso `folder.path` es un dato para mostrar, no para separar en
  partes.
- **Modelos formales.** Viven en `/VZ Causas/Modelos formales`, fuera de las
  carpetas de los abogados.
- **Quién accede.** El sistema **comparte la carpeta raíz `VZ Causas`** con el
  correo de cada usuario vigente que tenga el rol `LAWYER` o `SECRETARY`, como
  editor; todo lo que hay adentro hereda ese acceso. Son los perfiles que
  consultan documentos de causa según la matriz de permisos; un usuario que solo
  es `ADMINISTRATOR` no recibe acceso. El acceso se da y se quita solo, con el
  alta, la modificación y la baja de usuarios (ver
  [§3.2](#32-gestión-de-usuarios-users)), y el proceso diario lo revisa (D-83).
- **Cuándo se crea la carpeta.** Al registrar la causa, si `createFolder` es
  `true` (`POST /cases`), o después, con `POST /cases/{caseId}/folder`.
- **Qué modelos se copian.** Con `copyTemplates` en `true`, los modelos formales
  vigentes que incluyen el fuero de la causa en `jurisdictions` y tienen
  `copyToNewCases` en `true`. Se copia el archivo tal como está en ese momento;
  cambios posteriores del modelo no tocan la copia.
- **Si el almacenamiento falla.** La operación que pidió la carpeta **no
  falla**: la causa se registra igual, con `folder.status` en `ERROR`, y la
  carpeta se reintenta con `POST /cases/{caseId}/folder`. Si la carpeta se creó
  pero falló la copia de algún modelo, queda `CREATED` con `templatesPending`
  mayor a `0`. Es la mitigación que la arquitectura de backend ya había
  adoptado para este riesgo (R-03).
- **La carpeta no se renombra ni se mueve** en esta versión.
- **Qué hay adentro.** Los modelos copiados. El resto de la documentación la
  suben los abogados y la secretaría directamente a Drive.

### Proceso automático diario

HU51, HU52, HU30 y HU32 se resuelven con un proceso que corre **una vez por
día**, en la hora de Córdoba. Es el "Proceso Automático" que la Definición del
Producto lista como actor no humano. No tiene endpoints ni pantalla: nadie lo
dispara ni lo configura desde la aplicación.

Cada corrida tiene dos pasos:

| Paso        | HU  | Qué hace                                                                                                 |
| ----------- | --- | -------------------------------------------------------------------------------------------------------- |
| Verificar   | 51  | Recorre los vencimientos abiertos de las causas activas —los plazos de los actos procesales y los del acto lesivo de los amparos— y detecta los que entran en preaviso, los que vencen hoy y los vencidos |
| Verificar   | 52  | Recorre la prescripción de las causas penales activas con calificación legal y detecta las que llegaron al 70 % y las que tienen el plazo cumplido |
| Avisar      | 30  | Envía por correo lo que encontró HU51                                                                    |
| Avisar      | 32  | Envía por correo lo que encontró HU52                                                                    |
| Ajustar     | 39  | Revisa que la carpeta raíz de Drive esté compartida exactamente con los usuarios que corresponde, y corrige lo que haya quedado pendiente |

La verificación **no guarda un estado calculado** en la causa: aplica las mismas
reglas que la API usa en cada lectura (`currentState.businessDaysRemaining`,
`harmfulActDeadline` y `prescription`), así que los tableros, el detalle y el
correo siempre dicen lo mismo. Lo que el proceso sí registra es **qué avisó y
cuándo**, para no repetir un aviso.

| Aviso                        | HU      | Cuándo se envía                                                                                 |
| ---------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| Preaviso de vencimiento      | 51 → 30 | El día en que a un vencimiento abierto —de un acto procesal o del acto lesivo— le falta el preaviso configurado, en días hábiles |
| Vencimiento del día          | 51 → 30 | El día en que ese vencimiento llega (`businessDaysRemaining` igual a `0`)                       |
| Alerta de prescripción       | 52 → 32 | El día en que una causa penal alcanza el 70 % de su plazo de prescripción (`prescription.alert` pasa a `true`) |
| Prescripción cumplida        | 52 → 32 | El día en que se cumple el plazo de prescripción (`prescription.expired` pasa a `true`), para que alguien la marque como prescripta |

- **Configuración.** La casilla de gestión del estudio, los días de preaviso,
  la hora de la corrida y si se copia al abogado responsable son
  **configuración del servidor**, no datos de la API. Valores iniciales: preaviso
  de 3 días hábiles, corrida a las 08:00 y copia al responsable (D-79).
- **A quién.** A la casilla de gestión del estudio y, si está configurada la
  copia, al abogado responsable de cada causa, solo con las suyas. La ficha del
  abogado no tiene correo: la copia va al `email` del **usuario vinculado** a ese
  abogado, y no se envía si no tiene uno.
- **Un correo por día, no uno por causa.** Los avisos del día viajan juntos, en
  un único correo a la casilla, y en uno por abogado si corresponde la copia.
  Si no hay nada que avisar, no se envía correo.
- **Una sola vez.** Cada aviso se envía una vez por vencimiento y por tipo. Una
  renovación del acto lesivo abre un vencimiento nuevo, que se avisa de nuevo.
  Los avisos de prescripción vuelven a enviarse si un acto interruptivo reinició
  el cómputo y la causa llega otra vez al umbral.
- **Solo causas activas.** Una causa dada de baja o en un estado terminal no
  genera avisos.
- **El proceso no cambia el estado de ninguna causa.** En particular, no marca
  causas como prescriptas: eso lo hace una persona (HU33, D-52).

El aviso "no reemplaza el control del abogado responsable": los tableros
muestran lo mismo sin depender del correo.

El proceso tiene que correr todos los días; cómo se garantiza depende del
mecanismo de ejecución programada del despliegue (R-01 de la arquitectura de
backend).

### Bajas

Las bajas de usuarios, abogados, estados procesales y calificaciones legales
son **lógicas**: el backend establece el campo `active` en `false` y conserva
el registro por trazabilidad (RN12).

Esa conservación es interna del servidor. **Para el cliente, un registro dado
de baja no existe**: no aparece en ningún listado, el `GET` por identificador
responde `404` y no hay parámetro de consulta ni campo de modificación que
permita alcanzarlo o reactivarlo. Revertir una baja es una operación
administrativa de la base de datos, no una operación de la API.

La excepción son las **referencias desde una causa**. Una causa que está en un
estado procesal dado de baja, o que registra una calificación legal dada de
baja, las sigue mostrando en su detalle, porque forman parte de su historia.
Lo que el cliente no puede hacer es elegirlas para una causa o un acto nuevos.

El campo `active` se devuelve igual dentro de cada recurso, donde vale
siempre `true`, porque forma parte del modelo que el backend expone.

---

## 5. Convenciones de respuestas

### 5.1 Respuestas exitosas

**POST / PATCH / GET — Recurso individual**

```json
{
	"data": {}
}
```

**GET — Colección paginada**

```json
{
	"data": [],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 57,
		"totalPages": 3
	}
}
```

Una colección sin resultados devuelve `data` vacío, `totalItems` en `0` y
`totalPages` en `0`.

Las colecciones no paginadas son dos casos acotados: `GET /cases/custom-states`,
que devuelve una lista corta de textos en `data`, y las listas que vienen
**dentro** de un tablero (`GET /dashboards/lawyer` y
`GET /dashboards/administrator`), cuyo tamaño está limitado por la cantidad de
causas activas del estudio.

**GET — Archivo**

`GET /document-templates/{templateId}/file` no devuelve un sobre `data`: su
cuerpo es el archivo (ver [Formato de intercambio](#formato-de-intercambio)).

### 5.2 Respuesta de error

Todas las respuestas de error, sin excepción, utilizan la siguiente
estructura:

```json
{
	"error": {
		"code": "ERROR_CODE",
		"message": "Descripción legible del error.",
		"details": null
	}
}
```

| Campo     | Descripción                                                                              |
| --------- | ---------------------------------------------------------------------------------------- |
| `code`    | Código del catálogo. Es el valor que el cliente utiliza para discriminar el tipo de error |
| `message` | Descripción legible del error, **en castellano** |
| `details` | Objeto `campo → mensaje` en los errores de validación; `{ "retryAfterSeconds": N }` en `TOO_MANY_LOGIN_ATTEMPTS` y `TOO_MANY_REQUESTS` (§4, [Límite de frecuencia](#límite-de-frecuencia)); `null` en el resto |

El cliente discrimina los errores por `code` y nunca por el texto de
`message`. Dos situaciones que la interfaz resuelve de manera distinta
requieren códigos distintos: por ese motivo `USERNAME_ALREADY_EXISTS` y
`EMAIL_ALREADY_EXISTS` son códigos separados, aunque ambos correspondan a un
`409`.

Los textos de `message` y de `details` están **en castellano** en todos los
endpoints, tal como figuran en los ejemplos. Aun así, el cliente no debe
depender de su redacción exacta para decidir qué hacer: para eso está `code`.
Los identificadores y los comentarios del código del backend siguen en inglés
por convención del proyecto; lo que se traduce son los textos que viajan en la
respuesta.

**Ejemplo — validación de campos**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"username": "Debe tener entre 3 y 30 caracteres.",
			"email": "El formato del correo electrónico no es válido."
		}
	}
}
```

**General — `500 Internal Server Error`**

```json
{
	"error": {
		"code": "INTERNAL_SERVER_ERROR",
		"message": "Ocurrió un error interno inesperado.",
		"details": null
	}
}
```

### 5.3 Catálogo de códigos de error

| Código                                   | HTTP | Situación                                                          |
| ---------------------------------------- | :--: | ------------------------------------------------------------------ |
| `VALIDATION_ERROR`                       | 400  | Datos inválidos. Incluye `details` campo por campo                 |
| `INVALID_PAGINATION`                     | 400  | Parámetros de paginación fuera de rango                            |
| `INVALID_PATH_PARAMETER`                 | 400  | Identificador de la ruta inválido                                  |
| `INVALID_REQUEST`                        | 400  | Parámetro de consulta con un valor inexistente o una combinación inválida |
| `SAME_PASSWORD`                          | 400  | La contraseña nueva es igual a la actual. Exclusivo de `PATCH /auth/password` |
| `INVALID_CREDENTIALS`                    | 401  | Credenciales incorrectas. Exclusivo de `/auth/login`               |
| `UNAUTHENTICATED`                        | 401  | Token ausente, vencido, revocado o la sesión cerrada por inactividad |
| `FORBIDDEN`                              | 403  | Usuario autenticado sin el rol requerido, o que no es el abogado responsable de la causa |
| `USER_NOT_FOUND`                         | 404  | Usuario inexistente                                                |
| `LAWYER_NOT_FOUND`                       | 404  | Abogado inexistente                                                |
| `PROCEDURAL_STATE_NOT_FOUND`             | 404  | Estado procesal inexistente                                        |
| `LEGAL_QUALIFICATION_NOT_FOUND`          | 404  | Calificación legal inexistente                                     |
| `CLIENT_NOT_FOUND`                       | 404  | Cliente inexistente                                                |
| `CASE_NOT_FOUND`                         | 404  | Causa inexistente                                                  |
| `PROCEDURAL_ACT_NOT_FOUND`               | 404  | Acto procesal inexistente o de otra causa                          |
| `DOCUMENT_TEMPLATE_NOT_FOUND`            | 404  | **Nuevo.** Modelo formal inexistente                               |
| `RESOURCE_NOT_FOUND`                     | 404  | Ruta inexistente                                                   |
| `USERNAME_ALREADY_EXISTS`                | 409  | Nombre de usuario ya registrado                                    |
| `EMAIL_ALREADY_EXISTS`                   | 409  | Correo electrónico ya registrado                                   |
| `LAWYER_REGISTRATION_ALREADY_EXISTS`     | 409  | Matrícula ya registrada                                            |
| `PROCEDURAL_STATE_ALREADY_EXISTS`        | 409  | Denominación repetida dentro del mismo fuero                       |
| `LEGAL_QUALIFICATION_ALREADY_EXISTS`     | 409  | Denominación de calificación legal ya registrada                   |
| `CLIENT_DNI_ALREADY_EXISTS`              | 409  | DNI ya registrado en un cliente vigente                            |
| `CASE_SAC_ALREADY_EXISTS`                | 409  | Número de SAC ya registrado (RN2)                                  |
| `DOCUMENT_TEMPLATE_ALREADY_EXISTS`       | 409  | **Nuevo.** Nombre de modelo formal ya registrado                   |
| `USER_HAS_DEPENDENCIES`                  | 409  | El usuario posee recursos asociados                                |
| `LAWYER_HAS_DEPENDENCIES`                | 409  | El abogado posee causas o un usuario vinculado                     |
| `FILE_TOO_LARGE`                         | 413  | **Nuevo.** El archivo enviado supera los 10 MB                     |
| `INVALID_CURRENT_PASSWORD`               | 422  | La contraseña actual no coincide                                   |
| `CASE_IN_TERMINAL_STATE`                 | 422  | Acto procesal, acto interruptivo o marca de prescripción sobre una causa en estado terminal |
| `PRESCRIPTION_NOT_APPLICABLE`            | 422  | **Nuevo.** Acto interruptivo o marca de prescripción sobre una causa que no es del fuero penal, o marca de prescripción sobre una causa sin calificaciones legales |
| `PROCEDURAL_STATE_PROTECTED`             | 422  | **Nuevo.** Modificación o baja del estado de sistema "Prescripta"  |
| `BUSINESS_RULE_VIOLATION`                | 422  | Violación de una regla de negocio                                  |
| `TOO_MANY_LOGIN_ATTEMPTS`                | 429  | Bloqueo progresivo por intentos fallidos. Exclusivo de `POST /auth/login` |
| `TOO_MANY_REQUESTS`                      | 429  | Límite de pedidos por dirección IP superado                        |
| `INTERNAL_SERVER_ERROR`                  | 500  | Error interno inesperado                                           |
| `DOCUMENT_STORAGE_UNAVAILABLE`           | 502  | **Nuevo.** El almacenamiento en la nube (Google Drive) no respondió |

---

## 6. Códigos HTTP

| Código | Nombre                  | Uso                                                     |
| ------ | ----------------------- | ------------------------------------------------------- |
| `200`  | `OK`                    | Solicitud procesada exitosamente                        |
| `201`  | `Created`               | Recurso creado exitosamente                             |
| `204`  | `No Content`            | Operación exitosa sin cuerpo de respuesta               |
| `400`  | `Bad Request`           | Solicitud o parámetros inválidos                        |
| `401`  | `Unauthorized`          | Usuario no autenticado o credenciales inválidas         |
| `403`  | `Forbidden`             | Usuario autenticado sin permisos suficientes            |
| `404`  | `Not Found`             | Recurso solicitado inexistente                          |
| `409`  | `Conflict`              | Conflicto con el estado actual o unicidad de un recurso |
| `413`  | `Content Too Large`     | Archivo más grande que el máximo admitido (nuevo)       |
| `422`  | `Unprocessable Content` | Violación de una regla de negocio                       |
| `429`  | `Too Many Requests`     | Límite de frecuencia superado (ver §4)                  |
| `500`  | `Internal Server Error` | Error interno inesperado                                |
| `502`  | `Bad Gateway`           | Un servicio externo del que depende la operación no respondió (nuevo) |

Los códigos `400` y `422` no son intercambiables: `400` indica que los datos
enviados son inválidos y corresponde señalarlos en el formulario; `422` indica
que los datos son válidos pero la operación no puede realizarse por una regla
de negocio, y corresponde informarlo como aviso.

El `429` trae siempre el encabezado `Retry-After` (segundos) y el mismo valor
en `details.retryAfterSeconds`. Puede aparecer en cualquier endpoint, no solo
en `/auth` — ver [Límite de frecuencia](#límite-de-frecuencia).

El `502` es nuevo en esta versión y distingue una falla **ajena al sistema** —el
almacenamiento en la nube— de un error propio (`500`).
Para el cliente significa "no es un problema de los datos ni del sistema:
reintentar más tarde". No todas las operaciones que usan esos servicios
responden `502`: el alta de causa nunca lo hace, porque registra la causa y
deja la carpeta pendiente (ver [Carpeta de la causa](#carpeta-de-la-causa)).

---

## 7. Cambios respecto de la versión anterior

Resumen de las diferencias con `API_CONTRACT_V3.md`. Todo lo que no figura acá
se copió de V3 sin cambios. Las revisiones que tuvo V3 (§7.7 a §7.12 de ese
documento) ya están incorporadas.

**Dos cambios rompen la compatibilidad con un cliente de V3:** el nombre y el
apellido separados en usuarios, abogados y toda referencia a ellos (D-68), y
`caseCount` en lugar de `activeCases` en los estados procesales (D-70). El resto
suma campos a las respuestas, campos opcionales a los cuerpos o casos de error
nuevos.

### 7.1 Endpoints incorporados

| Endpoint | HU | Motivo |
| --- | --- | --- |
| `POST /cases/{caseId}/interruptive-acts` | 31 | El acto interruptivo reinicia la prescripción (RN8) |
| `GET /cases/{caseId}/interruptive-acts` | 31, 27 | La línea de tiempo del prototipo los muestra junto a los actos procesales |
| `POST /cases/{caseId}/prescription` | 33 | Acción "Marcar prescripta" del detalle de causa |
| `POST /cases/{caseId}/folder` | 39, 40 | Crear la carpeta de una causa que no la tiene o reintentar una pendiente |
| `POST /document-templates` | 34 | Alta de modelo formal, con su archivo |
| `GET /document-templates`, `GET /document-templates/{templateId}` | 35 | Consulta de modelos formales |
| `GET /document-templates/{templateId}/file` | 35 | Descarga del `.docx` |
| `GET /dashboards/lawyer` | 41 | Tablero "Mi día" |
| `GET /dashboards/administrator` | 42 | Tablero "Estudio" |

HU30, HU32, HU51 y HU52 no agregan endpoints: son el
[proceso automático diario](#proceso-automático-diario).

### 7.2 Endpoints modificados

| Endpoint | V3 | V4 | ¿Rompe? | Decisión |
| --- | --- | --- | :---: | --- |
| `POST /auth/login`, `/users`, `/lawyers` (todos menos `DELETE`) | `fullName` | `lastName` y `firstName`, en las respuestas, en los cuerpos de `POST` y `PATCH` y en los filtros de búsqueda | **Sí** | D-68 |
| Referencias a usuarios y abogados dentro de otros recursos (`lawyer` del usuario, `responsibleLawyer` y `registeredBy` de causas y actos, y los recursos nuevos) | `id` y `fullName` | `id`, `lastName` y `firstName` | **Sí** | D-68 |
| `GET /procedural-states`, `GET /procedural-states/{stateId}` | `activeCases`: causas activas en el estado, `0` en los terminales | `caseCount`: todas las causas en el estado, activas o no | **Sí** | D-70 |
| `POST`, `PATCH` y `DELETE /users` | Sin efectos fuera de la API | Dan y quitan el acceso a la carpeta del estudio en Drive; no cambian cuerpo ni respuesta | No | D-83 |
| `PATCH` y `DELETE /procedural-states/{stateId}` | Cualquier estado del listado | Sobre "Prescripta" responden `422 PROCEDURAL_STATE_PROTECTED` | No | D-53 |
| `POST /cases/{caseId}/procedural-acts` y `deadline-preview` | El estado de destino no puede ser terminal | Puede ser terminal, salvo "Prescripta" | No | D-69 |
| `POST /cases` | Sin carpeta ni datos por fuero | Acepta `createFolder`, `copyTemplates`, los datos propios de cada fuero y `courtFeePaid`, todos opcionales | No | D-59, D-67 |
| `POST /cases`, `GET /cases`, `GET /cases/{caseId}` | Recurso causa de V3 | Suma `prescription`, `prescriptionDeclaration`, `folder`, los datos por fuero, `harmfulActDeadline` y `courtFeePaid` | No | D-51, D-54, D-60, D-67, D-78 |
| `GET /cases` | El orden por urgencia y `openDeadline` miran `currentState.dueDate` | Miran también `harmfulActDeadline.dueDate` | No | D-82 |
| `legalQualifications[].prescriptionStartsOn` de la causa | Igual a `offenseDate` | Fecha del acto interruptivo más reciente o, si no hay, `offenseDate` | No | D-49 |
| `currentState` de la causa | `proceduralActId` es `null` solo en el estado inicial | También es `null` en "Prescripta", al que no se llega por un acto | No | D-54 |

### 7.3 Enumerados incorporados

| Enumerado | Motivo |
| --- | --- |
| `DeadlineKind` | Origen de un vencimiento en los tableros: acto procesal o acto lesivo |
| `CaseFolderStatus` | Situación de la carpeta de la causa: pendiente (no pedida), creándose, creada o con error |

### 7.4 Códigos de error y códigos HTTP

**Códigos de error incorporados:** `DOCUMENT_TEMPLATE_NOT_FOUND`,
`DOCUMENT_TEMPLATE_ALREADY_EXISTS`, `FILE_TOO_LARGE`,
`PRESCRIPTION_NOT_APPLICABLE`, `PROCEDURAL_STATE_PROTECTED` y
`DOCUMENT_STORAGE_UNAVAILABLE`.

**Códigos de error ampliados:** `CASE_IN_TERMINAL_STATE` también lo responden
el acto interruptivo y la marca de prescripción; `FORBIDDEN` cubre además al
usuario que no es el abogado responsable al registrar un acto interruptivo.

**Ningún código de error se retira.**

**Códigos HTTP incorporados:** `413 Content Too Large` y `502 Bad Gateway`.

### 7.5 Convenciones incorporadas

- **Roles alternativos:** "`ADMINISTRATOR` o `LAWYER`" en un endpoint.
- **Lectura restringida por perfil:** modelos formales y tableros son los
  primeros recursos que la Secretaría no puede leer.
- **Archivos:** cuerpo `multipart/form-data` para subir un modelo y respuesta
  binaria para descargarlo, con un máximo de 10 MB.
- **Nombre y apellido separados** en toda persona del sistema.
- **Datos propios de cada fuero** en la causa, `null` en los demás fueros.
- **Vencimiento del acto lesivo** del amparo, calculado mientras la causa está
  en "Iniciada".
- **Reglas de la prescripción** reunidas en la sección 4, con el umbral de
  alerta del 70 %.
- **Días no hábiles:** solo sábados y domingos.
- **Carpeta de la causa:** estructura, acceso de los usuarios y comportamiento
  ante fallas del almacenamiento en la nube.
- **Proceso automático diario:** qué verifica, qué avisa, cuándo y a quién.
- **Modelos de lectura no paginados** para los tableros.

### 7.6 Lo que V3 dejaba para el Sprint 3

| Cuestión de V3 | Situación en V4 |
| --- | --- |
| `prescriptionStartsOn` pasaría a ser la fecha del último acto interruptivo (§3.7) | Hecho, sin cambios de estructura |
| Carpeta de Drive y copia de modelos en el alta de causa (§8.3) | Hecho: `createFolder`, `copyTemplates` y `folder` |
| Ciclo de vida de la causa y listado de actos en el detalle (§8.3) | Hecho en lo que toca a HU27 y HU31 |
| "Registrar acto interruptivo" y "Marcar prescripta" (§8.3) | Hecho |
| Tablero de inicio (§8.3) | Hecho, como dos tableros |
| Modelos formales (§8.3) | Hecho el alta y la consulta |
| Sprints de HU10, HU11, HU19 y HU21 (§3.6, §3.7) | Corregidos según la planificación vigente |

---

## 8. Observaciones

Decisiones de diseño de este contrato y puntos que quedan abiertos. Las
decisiones de V3 conservan su identificador (D-01 a D-44), porque el texto
heredado las cita; las de esta versión continúan desde D-45.

### 8.1 Decisiones tomadas

#### Decisiones de V4

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-45 | El alcance es HU 27, 30, 31, 32, 33, 34, 35, 39, 40, 41, 42, 51 y 52 | Sprint "VZ Sprint 3" de Jira y Story Map del Seguimiento v1.2 (§4.1.2), más HU51 y HU52, incorporadas al sprint por el equipo |
| D-46 | V4 es autocontenido y V3 queda sin modificar | Mismo criterio que V3 respecto de V2 |
| D-47 | HU27 no agrega endpoints | Sus dos endpoints ya estaban en V3 y están implementados. La línea de tiempo del prototipo se completa con los actos interruptivos y el pase a "Prescripta", que tienen su propia fuente; el cliente intercala las tres |
| D-48 | El acto interruptivo es un recurso propio, anidado en la causa, y no un acto procesal con una marca | No mueve el estado ni abre un plazo, y su formulario pide otros datos. La arquitectura ya lo preveía como `InterruptiveAct` dentro del agregado `Case` |
| D-49 | Un acto interruptivo alcanza a todas las calificaciones de la causa, rige el más reciente y su nombre es texto libre | El formulario no pide elegir una calificación y habla de "la prescripción de la acción". Tomar el más reciente permite cargar actos viejos sin retroceder el cómputo, igual que D-14 |
| D-50 | Los actos interruptivos existen solo en `CRIMINAL` y los registra solo el abogado responsable. Fuera del fuero penal responden `422 PRESCRIPTION_NOT_APPLICABLE` | El prototipo ofrece el botón solo en causas penales y solo al responsable; la matriz de permisos dice lo mismo (HU31). Se usa el mismo código que la marca de prescripción porque el motivo del rechazo es el mismo |
| D-51 | La causa incluye `prescription`, calculada por el backend, con la alerta en un 70 % fijo | El backend necesita ese cálculo para el correo y los tableros; devolverlo deja un único lugar de cálculo, como D-20. Reemplaza la parte de D-19 que dejaba al cliente elegir la calificación y calcular el porcentaje. El 70 % es el "aviso al 70 %" del prototipo |
| D-52 | Marcar una causa como prescripta (HU33) es una acción manual, con fecha y resolución, para `ADMINISTRATOR` o `LAWYER`. El proceso automático detecta el plazo cumplido y avisa, pero no cambia el estado de ninguna causa | Es lo que define el prototipo. Evita que el sistema cierre una causa porque faltó cargar un acto interruptivo |
| D-53 | "Prescripta" es un estado de sistema del fuero `CRIMINAL`: visible en `/procedural-states`, terminal y protegido contra modificación y baja | HU33 necesita un estado de destino que exista siempre. Queda visible, a diferencia de "Iniciada", porque el prototipo lo lista y el filtro de causas lo usa |
| D-54 | Marcar una causa como prescripta no crea un acto procesal, responde `200` con la causa y no tiene reversión | "Prescripta" no es destino de un acto (D-69). Cambian varias partes de la causa a la vez, así que devolverla entera le ahorra al cliente una segunda petición |
| D-55 | Un modelo formal tiene `jurisdictions`, una lista de fueros | El alta del prototipo es de selección múltiple, con "Todos los fueros". Un modelo con varios fueros es un solo registro con un solo archivo |
| D-56 | Los modelos formales los leen y los registran `ADMINISTRATOR` o `LAWYER`. El alta es `multipart/form-data`, solo `.docx`, hasta 10 MB, y atómica. El modelo no tiene tipo | Matriz de permisos y CA-34.8 y CA-35.8; la sección no está en el menú de la Secretaría. Formato y atomicidad: CA-34.3 y CA-34.7. Los 10 MB son el máximo que el prototipo usa para adjuntos |
| D-57 | El listado de modelos está paginado y ordenado por nombre, con filtros `jurisdiction` y `copyToNewCases`. Las tarjetas por fuero las arma el cliente | CA-35.2 a CA-35.5. Evita un endpoint de resumen para un catálogo chico |
| D-58 | El archivo de un modelo se descarga a través de la API, no con un enlace directo a Drive | La Secretaría no puede consultar modelos; un enlace de Drive no respeta los perfiles del sistema |
| D-59 | `createFolder` y `copyTemplates` son opcionales y valen `true` por defecto. Los nombres no mencionan a Drive | Las casillas del prototipo vienen tildadas, y las historias piden que la carpeta se cree "automáticamente". La arquitectura nombra por necesidad y no por tecnología |
| D-60 | Una falla del almacenamiento en la nube no aborta el alta de la causa: queda `folder.status` en `ERROR` y se reintenta con `POST /cases/{caseId}/folder` | La causa es el dato que el estudio no puede perder. Es la mitigación de R-03 de la arquitectura de backend. El mismo endpoint les da carpeta a las causas registradas antes de esta versión |
| D-61 | La carpeta se ubica en `/VZ Causas/{abogado}/{fuero}/` y se llama como la carátula de la causa. No se renombra ni se mueve | Definido por el equipo. La carátula ya reúne al cliente y la calificación o el objeto. Detalle en ADR-003 |
| D-62 | Hay un endpoint por tablero, que devuelve todo en una petición y sin paginar | Son modelos de lectura, lo que la arquitectura asigna a `reporting`. Los indicadores, la cartera por fuero y la carga del equipo son agregados. Las listas están acotadas por las causas activas |
| D-63 | El abogado ve solo el tablero de sus causas; si además es `ADMINISTRATOR`, ve también "Estudio". "Próximos" son 5 días hábiles | Definido por el equipo; CA-41.7 no aplica. Los 5 días hábiles salen de CA-41.2 y del prototipo |
| D-64 | El proceso diario no tiene endpoints. Envía un correo por día con todos los avisos: preaviso y día del vencimiento, alerta de prescripción al 70 % y prescripción cumplida. No avisa los plazos ya vencidos | Nadie lo dispara desde la aplicación. Un resumen diario evita un correo por causa |
| D-65 | Se incorporan `413` y `502` | `502` separa la falla de un servicio externo de un error propio: para el cliente es "reintentar", no "corregir los datos". `413`, porque el límite de tamaño lo aplica el servidor antes de validar el formulario |
| D-66 | No se contrata la lista de documentos de la causa | El prototipo la muestra, pero no es una historia de este sprint. Esta versión entrega el enlace a la carpeta (`folder.url`) |
| D-67 | La causa incluye `clientDetained` (penal), `injunctionGranted`, `harmfulActDate`, `harmfulActRenews`, `harmfulActRenewalDays`, `harmfulActTermDays` y `harmfulActTermDayType` (amparo), `administrativeRemedyExhaustedOn` (administrativo) y `courtFeePaid` (todos). Fuera de su fuero valen `null`; se cargan solo en el alta | Definidos por el equipo. `courtFeePaid` cubre RN10. Modificarlos llega con HU19 |
| D-68 | Usuarios y abogados tienen `lastName` y `firstName` en lugar de `fullName`, también en toda referencia a ellos dentro de otros recursos | Definido por el equipo: toda persona del sistema tiene nombre y apellido separados, como el cliente desde V3 |
| D-69 | Un acto procesal puede llevar la causa a cualquier estado del fuero, terminal o no, salvo "Prescripta". Una causa en estado terminal no admite actos nuevos. Reemplaza a D-15 | A "Archivada" se llega con un acto procesal; "Prescripta" tiene su propio botón (D-52) |
| D-70 | El estado procesal informa `caseCount`, las causas que están en él, activas o no, en lugar de `activeCases` | La columna "Causas" tiene que mostrar también las archivadas y las prescriptas. Se cambió el nombre porque `activeCases` con otro significado confundiría; los demás recursos conservan su `activeCases` |
| D-71 | El nombre de un modelo formal es único, sin distinguir mayúsculas | Definido por el equipo |
| D-72 | HU51 y HU52 son la verificación diaria del proceso automático: detectan los vencimientos en preaviso, del día y vencidos (HU51) y las prescripciones al 70 % y cumplidas (HU52). No tienen endpoints ni pantalla | HU30 y HU32 envían por correo lo que esa verificación encuentra |
| D-73 | Solo sábados y domingos son días no hábiles | Definido por el equipo. Resuelve por ahora P-02 de la arquitectura |
| D-74 | Una causa penal sin calificación legal no prescribe: `prescription` vale `null` y `POST /cases/{caseId}/prescription` responde `422 PRESCRIPTION_NOT_APPLICABLE`. Los amparos no prescriben | Definido por el equipo |
| D-75 | `GET /cases` incluye, sin filtro de estado, también las causas en estados terminales; excluye solo las dadas de baja | Es como está implementado |
| D-76 | El nombre del acto procesal es el del estado que registra; no hay un campo aparte | Confirma D-10 |
| D-77 | La nota de cada estado procesal ("El plazo no corre de oficio…") es un texto fijo del frontend, no un campo del recurso | Definido por el equipo |
| D-78 | En el amparo se calcula `harmfulActDeadline`: la fecha vigente del acto lesivo —la cargada o, si se renueva, la última renovación que no supera hoy— más el plazo que carga el usuario. Se muestra en el detalle, en los tableros y en los avisos, solo mientras la causa está en "Iniciada" | Vencido ese plazo ya no se puede presentar el amparo. La renovación la calcula el sistema, sin historial. El primer acto procesal indica que el amparo ya se presentó |
| D-79 | La casilla de gestión, los días de preaviso, la hora de la corrida y la copia al responsable son configuración del servidor, no de la API | La pantalla para configurarlos no es de este sprint. Valores iniciales: 3 días hábiles, 08:00, con copia |
| D-80 | `clientDetained` aplica en toda causa penal, sea el cliente defensa o querellante | Definido por el equipo |
| D-81 | El tratamiento de los abogados ("Dr.", "Dra.") lo pone el frontend | Definido por el equipo |
| D-82 | En `GET /cases`, el orden por urgencia y el filtro `openDeadline` consideran el vencimiento abierto de la causa, sea del acto procesal o del acto lesivo. Modifica a D-25 | Un amparo con el plazo para presentarse por vencer tiene que verse como urgente en el listado, no solo en los tableros |
| D-83 | El sistema comparte la carpeta raíz `VZ Causas` con los usuarios vigentes con rol `LAWYER` o `SECRETARY`, como editores, y les quita el acceso al dejar de serlo. Las operaciones de usuarios no fallan si Drive no responde; el proceso diario reconcilia | Compartir la raíz respeta RN11 (todos ven todas las causas). Los perfiles salen de la matriz (HU38). Detalle en ADR-003 |
| D-84 | El backend opera con una autorización OAuth de la cuenta de Gmail de gestión del estudio, otorgada una vez, con el permiso `drive.file` | Con una cuenta de Gmail común no hay unidades compartidas y una cuenta de servicio no tiene espacio en Drive. Detalle en ADR-003 |

#### Decisiones heredadas de V3

Sin cambios de redacción. Las que esta versión modifica: D-10 (confirmada por
D-76), D-15 (reemplazada por D-69), D-19 (en parte, por D-51), D-21 (por D-70,
para los estados procesales) y D-25 (por D-82).

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-01 | El alcance es HU 8, 9, 13, 17, 18, 20, 22, 26, 45 y 46, más el ABMC de calificaciones legales | Story Map actualizado del Seguimiento v1.1 (§4.1.2). La tabla del PDF es difícil de leer por la maquetación, así que la asignación se verificó sumando los puntos: esas diez historias suman exactamente los 112 SP declarados para el Sprint 2 |
| D-02 | V3 es autocontenido y V2 queda sin modificar | Mismo criterio que V2 respecto de V1. `/auth` y `/users` se copian de V2 sin cambios. `PATCH` y `DELETE /lawyers` (HU14 y HU15, sprints 3 y 4) se mantienen porque ya figuraban en V2: quitarlos sería un cambio que nadie pidió |
| D-03 | La lectura de `/lawyers`, `/procedural-states`, `/legal-qualifications`, `/clients` y `/cases` se abre a cualquier usuario autenticado | RN11; el banner del prototipo ("El perfil determina qué se puede operar, no qué se puede ver"); y los formularios de alta de causa y de acto necesitan esos listados. `/users` sigue en `ADMINISTRATOR` ([C-14](#82-puntos-abiertos)) |
| D-04 | **Reemplazada por D-39.** La escritura de estados procesales y calificaciones legales requiere `ADMINISTRATOR` | El prototipo deshabilita esas acciones para los demás perfiles, aunque HU17, HU45 y HU46 digan "Como abogado". Manda el prototipo |
| D-05 | **Reemplazada por D-39.** El alta de cliente requiere `SECRETARY` | Tabla de [permisos por perfil](#permisos-por-perfil): administrar clientes (HU8 a HU11) es solo de la Secretaría. Reemplaza el criterio del prototipo, que lo restringía al Administrador |
| D-06 | La baja de un estado procesal procede aunque haya causas en él, y se retira `PROCEDURAL_STATE_HAS_DEPENDENCIES` | Nota del prototipo: las causas "conservan el estado que ya tienen registrado". Lo mismo para la baja de calificaciones legales |
| D-07 | ~~`PATCH /procedural-states` admite `jurisdiction`, solo si ninguna causa registra el estado~~. **Revertida por D-36** | El prototipo muestra el selector de fuero al modificar. La restricción evita que causas de un fuero apunten a un estado de otro |
| D-08 | Cambiar el plazo de un estado **no** recalcula vencimientos; cambiar la prescripción de una calificación **sí** recalcula la de sus causas | Las dos notas del prototipo dicen exactamente eso. Por eso el acto copia los valores del plazo y la causa calcula la prescripción en cada lectura |
| D-09 | **Reemplazada por D-34.** Toda causa nacía **sin estado procesal** (`currentState` en `null`, "Sin acto procesal") y sin plazo abierto; el estado lo fija el primer acto. El alta no es un movimiento del ciclo de vida, y se retira `JURISDICTION_WITHOUT_PROCEDURAL_STATES` | Prototipo actualizado: "El estado lo fija el primer acto procesal" en el resumen del alta, y "Todavía no hay actos procesales" en el detalle. El prototipo lo define como un estado de sistema que no pertenece al ciclo parametrizado de ningún fuero; por eso se modela como ausencia de estado y no como un registro de la tabla. Reemplaza al criterio anterior, que derivaba el estado de posición `1` |
| D-10 | El acto procesal se registra como estado resultante, fechas y observaciones, sin un "nombre de acto" aparte | El formulario de HU26 solo pide el estado ("El acto procesal es el que mueve la causa: elegí el estado al que la lleva") ([C-10](#82-puntos-abiertos)) |
| D-11 | El "estado escrito a mano" se modela como `customState`, sin plazo salvo ajuste manual, con su endpoint de valores distintos para el filtro | Es la descripción libre que pide HU22. El prototipo lo muestra en el combo del acto y en el filtro del listado |
| D-12 | En `ADMINISTRATIVE`, `notificationDate` es obligatoria si el estado abre plazo | RN6. El prototipo no habilita "Registrar acto" sin esa fecha, lo que resuelve el pendiente P-04 de la arquitectura: el acto no existe sin vencimiento calculable |
| D-13 | **Reemplazada en parte por D-30.** Solo el rol `LAWYER` registra actos procesales, y el acto se aplica a la causa al registrarse, sin confirmación posterior. No existe un estado del acto | Tabla de [permisos por perfil](#permisos-por-perfil). Reemplaza el flujo de "pendiente de confirmación" del prototipo (RN13), que dejaba cargar actos a la Secretaría |
| D-14 | El estado actual de la causa es el del acto con la fecha de acto más reciente | Permite cargar actos viejos sin retroceder la causa |
| D-15 | **Reemplazada por D-69.** Los estados terminales no pueden ser destino de un acto | El combo del prototipo los excluye ([C-04](#82-puntos-abiertos)) |
| D-16 | El número de SAC tiene exactamente 8 dígitos y es único en todo el sistema. **Modificada por D-33:** es opcional | Validación del prototipo ("El SAC tiene 8 dígitos"). Resuelve provisoriamente el pendiente P-03 ([C-09](#82-puntos-abiertos)) |
| D-17 | El DNI viaja sin puntos y es único entre los clientes vigentes | Separa el dato de su presentación. La unicidad entre vigentes permite volver a registrar a un cliente dado de baja cuando exista HU11 |
| D-18 | `ProceduralRole` es un enumerado cerrado, con valores válidos por fuero | El prototipo lo trata como lista fija por fuero (`ROLES_FUERO`), no como parametría |
| D-19 | La prescripción se expresa en meses enteros, solo aplica a `CRIMINAL` y se computa **por calificación, desde la fecha del hecho** (`offenseDate`): vence en `prescriptionStartsOn + meses`. `prescriptionStartsOn` vive en cada calificación y en este sprint es igual a `offenseDate` | Prototipo actualizado: cada calificación elegida pide su "Fecha del hecho" y el resumen calcula "8 años desde el …". Se devuelven los dos campos para que los actos interruptivos (HU31, Sprint 3) muevan `prescriptionStartsOn` sin cambiar la estructura. Reemplaza al criterio anterior, que computaba desde `startDate` |
| D-20 | Se incorpora `deadline-preview` | Con un único lugar de cálculo, lo que el usuario ve antes de guardar coincide siempre con lo que se guarda |
| D-21 | `activeCases` deja de valer `0` y se unifica la definición de causa activa | Ver §4 |
| D-22 | Un identificador inexistente en el cuerpo (`clientId`, `responsibleLawyerId`, `legalQualifications[].legalQualificationId`, `proceduralStateId`) responde `400 VALIDATION_ERROR` sobre ese campo | Es un dato del formulario a corregir, no una regla de negocio. Evita agregar un código de error por cada referencia |
| D-23 | Todos los mensajes de error (`message` y `details`) están en castellano, en todos los endpoints | Pedido del equipo. Unifica la redacción de V2 con la de los endpoints nuevos. Ver §5.2 y el impacto en [§8.4](#84-impacto-sobre-lo-ya-implementado) |
| D-24 | Nombres nuevos: `LegalQualification`, `prescriptionMonths`, `lastName`, `firstName`, `dni`, `clientSince`, `caption`, `court`, `instructorName`, `tribunalPhone`, `counterparty`, `subjectMatter`, `offenseDate`, `customState`, `notificationDate`, `dueDate`, `ProceduralRole` | Hay que incorporarlos a `TRADUCCION_DOMINIO.md`. `offenseDate` es la "fecha del hecho": el hecho imputado bajo esa calificación. `caption` y no `CaseCover` porque el glosario ya reserva `CaseCover` para el documento imprimible de HU24; `dni` conserva la sigla como `SacNumber` |
| D-25 | El listado de causas se ordena por urgencia, y `openDeadline=true` incluye las vencidas | Es el orden que usan el tablero y la pantalla de vencimientos del prototipo, y una causa vencida es la que más atención requiere |
| D-26 | `GET /cases` acepta `clientId` | HU9 pide consultar los clientes "con sus causas asociadas"; el prototipo solo muestra la cantidad, pero el filtro evita un endpoint anidado |
| D-27 | Las causas `ADMINISTRATIVE` y `AMPARO` registran `subjectMatter` (objeto del reclamo u objeto del amparo), obligatorio en esos fueros, de hasta 800 caracteres, y `null` en `CRIMINAL` | Pedido del equipo, ya incorporado al prototipo: es donde el abogado escribe qué se reclama y por qué. Un único campo para ambos fueros; el rótulo ("Objeto del reclamo" u "Objeto del amparo") lo pone el cliente según el fuero. El largo es el del prototipo (800). La obligatoriedad es decisión del equipo: el prototipo no lo exige para habilitar "Registrar causa" |
| D-28 | La fecha del hecho (`offenseDate`) es obligatoria en cada calificación legal de una causa penal | Decisión del equipo. El prototipo deja registrar sin ella y muestra "falta la fecha del hecho", pero sin esa fecha la prescripción no se puede computar, que es para lo que se carga la calificación. El formulario debe exigirla |
| D-29 | El filtro "Sin acto procesal" de `GET /cases` es un parámetro propio, `withoutProceduralActs`, excluyente con `proceduralStateId` y `customState` | No es un estado de la tabla ni un estado escrito a mano, sino la ausencia de estado. El prototipo lo ofrece en un grupo aparte, "Causas nuevas", y lo excluye del grupo "Escritos a mano en causas" |
| D-30 | Solo el **abogado responsable de la causa** registra actos procesales y usa `deadline-preview`. Se compara el `lawyerId` del usuario con `responsibleLawyer.id`; un usuario sin ficha de abogado no registra actos. El acto se sigue aplicando sin confirmación | Decisión del equipo (05/10/2026). Ningún otro abogado ni el `ADMINISTRATOR` opera los actos de una causa ajena |
| D-31 | Los estados procesales no tienen posición ni orden: se registran y se listan en el orden en que llegan | Decisión del equipo (05/10/2026) |
| D-32 | `activeCases` de estados procesales y calificaciones legales se devuelve solo en las respuestas de `GET` | Decisión del equipo (05/10/2026): es un dato calculado de consulta, no parte de lo que se registra. Se aplicó también a `PATCH`, que tampoco es una consulta |
| D-33 | `sacNumber`, `legalQualifications` (en `CRIMINAL`), `instructorName` e `instructorExtension` son opcionales. El interno del instructor se separa del teléfono en `instructorExtension` | Decisión del equipo (05/10/2026). RN2 queda condicionada: el SAC identifica la causa cuando se conoce ([C-20](#82-puntos-abiertos)) |
| D-34 | Toda causa nace en el **estado inicial "Iniciada"**, un estado de sistema por fuero: no forma parte de `/procedural-states`, no se modifica ni se da de baja, no es destino de un acto y no se muestra en la línea de tiempo. `currentState` deja de ser anulable y suma `initial` | Decisión del equipo (05/10/2026). Reemplaza a D-09. El nombre es neutral para los tres fueros y describe un estado, no una ausencia |
| D-35 | Se retira `nextDeadline`: el vencimiento es parte del estado actual y viaja en `currentState` | Decisión del equipo (05/10/2026): el vencimiento lo abre el acto que llevó la causa a su estado actual |
| D-36 | El fuero de un estado procesal no es modificable: `PATCH /procedural-states/{stateId}` rechaza `jurisdiction` con `400 VALIDATION_ERROR`, y se retira `PROCEDURAL_STATE_IN_USE`. Revierte D-07 | Decisión del equipo. Un estado figura en la historia de las causas aunque ninguna esté hoy en él, así que el traslado casi nunca procedía y la pantalla no podía anticiparlo. Para trasladarlo: baja y alta en el otro fuero, como en V2 |
| D-37 | Los códigos de `ProceduralRole` van en castellano: `DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA` y `DEMANDADA`. Reemplazan a `DEFENSE`, `PRIVATE_PROSECUTOR`, `APPELLANT`, `PLAINTIFF` y `DEFENDANT` | Decisión del equipo (09/10/2026): son los valores que ya usan el backend y la base de datos |
| D-38 | `startDate` de la causa es anulable: vale `null` mientras la causa no tiene SAC. La regla de entrada no cambia (con SAC es obligatoria, sin SAC no se informa); cambia lo que se guarda | Decisión del equipo (10/10/2026). La fecha de inicio es la de la causa en sede judicial y sin SAC no existe; como la columna era `NOT NULL`, se guardaba la fecha del día, un dato inventado que el detalle de la causa mostraba como real. Ver [C-20](#82-puntos-abiertos) |
| D-39 | El alta de cliente y la escritura de estados procesales y de calificaciones legales se abren a cualquier usuario autenticado. Reemplaza a D-04 y D-05 | Matriz de [permisos por perfil](#permisos-por-perfil) del 11/10/2026, acordada por el equipo: administrar clientes, estados procesales y calificaciones legales corresponde a los tres perfiles |
| D-40 | `POST /auth/login` bloquea una cuenta al quinto fallo consecutivo contra el mismo usuario, con espera creciente (90 s, 5, 15, 30 y 60 min). Cuenta igual contra un usuario que no existe, para no revelar qué cuentas son reales | Cierra Q-03 de `IMPLEMENTACION_AUTH.md`. El umbral y la escalera son configuración del servidor, no parte del contrato: lo único contractual es el código `TOO_MANY_LOGIN_ATTEMPTS` y que la respuesta trae `Retry-After` |
| D-41 | Toda la API acepta un límite de pedidos por dirección IP (`429 TOO_MANY_REQUESTS`); `/auth/login` y `/auth/refresh` tienen además un límite propio, más estricto | Cierra Q-03. Es independiente del bloqueo de D-40: ese cuenta fallos contra una cuenta, este cuenta volumen desde una dirección, sin mirar a qué apunta |
| D-42 | El mensaje de `INVALID_CREDENTIALS` pasa a "Usuario o contraseña incorrectos." | Pedido del equipo. Sigue siendo el mismo mensaje exista o no exista la cuenta: D-18 de `IMPLEMENTACION_AUTH.md` no cambia, solo el texto |
| D-43 | El `accessToken` deja de aceptarse desde la próxima petición cuando el usuario cierra sesión, es dado de baja, cambia su contraseña (en las demás sesiones) o pasa 30 minutos sin renovar la suya. Antes, en los cuatro casos, seguía válido hasta vencer (máx. 15 min) | El servidor pasó a verificar la sesión contra la base en cada pedido en lugar de confiar solo en la firma del token. Ningún endpoint cambia de forma; cambia cuándo un `401 UNAUTHENTICATED` deja de ser "hay que renovar" para ser "hay que iniciar sesión de nuevo" |
| D-44 | `PATCH /auth/password` rechaza una `newPassword` igual a `currentPassword` con `400 SAME_PASSWORD` | Pedido del equipo (CA-3.5 del seguimiento de HU1-3). Antes solo lo validaba el frontend; un cliente que hablara directo con la API podía dejar la contraseña sin cambios |

### 8.2 Puntos abiertos

| ID | Punto | Qué asume hoy el contrato | Con quién |
| --- | --- | --- | --- |
| C-23 | **Correos que no son de Google.** Si el correo de un abogado o de la secretaría no corresponde a una cuenta de Google, Drive no le puede dar acceso a la carpeta del estudio. ¿Se exige una cuenta de Google al registrar el usuario, o alcanza con avisarlo? | El acceso queda pendiente y el proceso diario lo reintenta; la API no lo muestra | Equipo |
| C-13 | **Otros datos del abogado.** Viene de V3 | El recurso abogado solo cambia en el nombre (D-68) | Cliente |
| C-20 | **SAC opcional y RN2.** Con el SAC opcional, nada impide registrar dos veces la misma causa sin SAC. Viene de V3 | Sin cambios | Cliente / PO |

Los demás puntos de V3 (C-01 a C-22) están resueltos, ya sea por las decisiones
de esta versión o porque no corresponden a este sprint.

### 8.3 Visto en el prototipo y fuera de este contrato

Estos elementos del prototipo **no tienen endpoint ni campo** en esta versión:

- En el detalle de causa: la lista de documentos de la carpeta, "Modificar
  causa", "Dar de baja", "Emitir carátula", "Emitir expediente", "Registrar pago
  de tasa" y "Modificar" o "Anular" un acto.
- En "Registrar acto procesal": "Adjuntar cédula o comprobante".
- En modelos: "Modificar", "Dar de baja" y "Reactivar".
- En clientes: "Modificar" y "Eliminar". Los reportes.
- En el encabezado: la campana de notificaciones, el panel de avisos y el aviso
  "2 vencimientos hoy".
- La pantalla "Vencimientos", que no tiene entrada en el menú: sus datos están
  en los tableros.
- "Olvidé mi contraseña".

Siguen en el contrato, porque ya figuraban en V3, `PATCH` y
`DELETE /lawyers/{lawyerId}` y `PATCH` y
`DELETE /legal-qualifications/{qualificationId}` (D-02).

### 8.4 Impacto sobre lo ya implementado

**Lo que rompe.** Dos cambios obligan a tocar lo que ya funciona, en backend y
frontend a la vez:

- **Nombre y apellido separados** (D-68). `/auth/login`, `/users` y `/lawyers`
  pasan de `fullName` a `lastName` y `firstName`, en las respuestas, en los
  cuerpos y en los filtros de búsqueda; también el `lawyer` del usuario y todo
  `responsibleLawyer` y `registeredBy`. En la base hay que migrar los nombres
  existentes, que hoy están en un solo campo y, en los abogados, con el
  tratamiento adelante.
- **`caseCount` en los estados procesales** (D-70). Cambia el nombre del campo y
  el conteo: deja de filtrar por causa activa.

**Backend**

- **Subsistemas nuevos.** Los que la arquitectura ya tenía previstos:
  `deadlines` (verificación diaria y envío de correo), `documents` (modelos
  formales, carpeta de la causa y acceso a Drive, según ADR-003) y `reporting`
  (tableros). Los actos interruptivos y la marca de prescripción van en `cases`.
- **Esquema.** Tablas nuevas para actos interruptivos, modelos formales con sus
  fueros, carpetas de Drive, carpeta de la causa, copias de modelos y registro de
  avisos enviados. Columnas nuevas en la causa para los datos de D-67 y la
  constancia de prescripción.
- **Estado "Prescripta".** Crearlo como estado de sistema del fuero `CRIMINAL`
  y protegerlo en `PATCH` y `DELETE /procedural-states` (D-53).
- **Actos procesales.** Aceptar estados terminales como destino, salvo
  "Prescripta" (D-69).
- **Cálculos en un solo lugar.** La prescripción (con el acto interruptivo más
  reciente), el vencimiento del acto lesivo y los días hábiles los usan la
  causa, los tableros, el proceso diario y el orden y el filtro de `GET /cases`
  (D-51, D-78, D-82).
- **`POST /cases`.** Valida los datos por fuero. Con `createFolder` en `true` por
  defecto, las pruebas de integración existentes pasan a pedir la carpeta:
  necesitan un adaptador falso de almacenamiento. El caso de uso no debe fallar
  si el adaptador falla (D-60).
- **Usuarios.** El alta, la modificación y la baja de usuarios llaman a
  `documents` para dar o quitar el acceso a Drive, sin fallar si no responde
  (D-83).
- **Integraciones y configuración.** La autorización OAuth de la cuenta de
  gestión y los identificadores de Drive (ADR-003), el servicio de correo, la
  configuración de los avisos (D-79) y el mecanismo que dispara el proceso
  diario.
- **Autorización.** Guards nuevos de "uno de dos roles" y de lectura
  restringida. Los actos interruptivos reutilizan la comprobación de abogado
  responsable de los actos procesales.

**Frontend**

- **Tipos y *mocks*.** `frontend/src/shared/api/contract.ts` y los *mocks* de
  `shared/mocks` suman los campos y recursos nuevos, y cambian `fullName` y el
  `activeCases` de los estados.
- **Formularios.** El alta de causa suma los datos por fuero y la tasa, que no
  están en el prototipo. El alta y la modificación de usuarios y abogados
  separan nombre y apellido. El combo de "Registrar acto procesal" ofrece los
  estados terminales, salvo "Prescripta". El alta de modelo no pide tipo.
- **Barra de prescripción.** Lee `prescription`; deja de elegir la calificación
  y de calcular el porcentaje.
- **Archivos.** Son la primera subida `multipart/form-data` y la primera
  descarga binaria del proyecto: hay que revisar el cliente HTTP compartido,
  pensado hasta ahora para JSON.
- **Menú por perfil.** "Inicio" y "Modelos" no se muestran a la Secretaría; el
  backend responde `403` si igual los pide.

**Documentación**

- **Glosario.** `TRADUCCION_DOMINIO.md` ya tiene `InterruptiveAct`,
  `DocumentTemplate` y `Prescription`. Faltan `CaseFolder`, `CaseFolderStatus`,
  `DeadlineKind`, `Dashboard` y los campos nuevos: `clientDetained`,
  `injunctionGranted`, `harmfulActDate`, `harmfulActRenews`,
  `harmfulActRenewalDays`, `harmfulActTermDays`, `harmfulActTermDayType`,
  `harmfulActDeadline`, `administrativeRemedyExhaustedOn`, `courtFeePaid`,
  `caseCount`, `prescriptionDeclaration`, `elapsedPercentage`,
  `copyToNewCases`, `casesToAdvance` y `usageCount`.
- **Referencias a V3.** El glosario, el `README`, la documentación de frontend
  y el código citan `API_CONTRACT_V3.md` como contrato vigente: hay que
  apuntarlos a este documento.
- **OpenAPI.** `docs/openapi` describe V3 y tiene que actualizarse.
- **Arquitectura de backend.** §6.3 suma el puerto `StudioFolderAccessPort`
  (`identity` → `documents`) y §7.6 reemplaza `GOOGLE_DRIVE_CREDENTIALS` por las
  variables de ADR-003.

---

## 9. Resumen por historia

| HU | Qué entra al contrato |
| --- | --- |
| 27 | Sin endpoints nuevos: los de V3. La línea de tiempo se completa con los actos interruptivos |
| 30 | Avisos de vencimiento por correo, del proceso diario |
| 31 | Alta y consulta de actos interruptivos, y su efecto sobre la prescripción |
| 32 | Avisos de prescripción por correo, y las alertas en los tableros |
| 33 | `POST /cases/{caseId}/prescription` y "Prescripta" como estado de sistema |
| 34 | `POST /document-templates`, con archivo y nombre único |
| 35 | Listado, consulta y descarga de modelos formales |
| 39 | Carpeta de la causa en el alta, `POST /cases/{caseId}/folder` y acceso de los usuarios a la carpeta del estudio |
| 40 | Copia de los modelos del fuero a la carpeta de la causa |
| 41 | `GET /dashboards/lawyer` |
| 42 | `GET /dashboards/administrator` |
| 51 | Verificación diaria de los plazos de presentación y del acto lesivo |
| 52 | Verificación diaria de la prescripción, y `prescription` en la causa |

Además: datos nuevos en la causa (D-67, D-78), nombre y apellido separados
(D-68), estados terminales como destino de un acto (D-69) y `caseCount` (D-70).

En números: **10 endpoints nuevos** y **19 modificados**, de los cuales 11 cambian
de forma incompatible con V3; 2 enumerados, 6 códigos de error y 2 códigos HTTP
nuevos; 40 decisiones (D-45 a D-84) y 3 puntos abiertos.
