# API Contract — V3

Contrato de la API para el **Sprint 2** (28/09/2026 – 09/10/2026). Reemplaza a
`API_CONTRACT_V2.md`, que se conserva sin modificaciones como registro del
Sprint 1.

El documento es **autocontenido**: incluye los endpoints del Sprint 1 que
siguen vigentes y los que incorpora el Sprint 2. Las diferencias con V2 se
resumen en la [sección 7](#7-cambios-respecto-de-la-versión-anterior) y las
decisiones tomadas al redactarlo, junto con los puntos a verificar, en la
[sección 8](#8-observaciones).

**Fuente de verdad:** el prototipo `docs/prototypes/VZ Causas - Prototipo.dc.html`.
Cuando una historia de usuario y el prototipo no coinciden, este contrato sigue
al prototipo y lo deja asentado en la sección 8.

**Alcance del Sprint 2**, según el Story Map actualizado del Seguimiento de
Proyecto v1.1 (§4.1.2), más el ABMC de calificaciones legales incorporado al
sprint:

| HU  | Nombre                              | Endpoints                                                         |
| --- | ----------------------------------- | ----------------------------------------------------------------- |
| 8   | Registrar Cliente                   | `POST /clients`                                                   |
| 9   | Consultar Clientes                  | `GET /clients`, `GET /clients/{clientId}`, `GET /cases?clientId=` |
| 13  | Consultar Abogado                   | `GET /lawyers`, `GET /lawyers/{lawyerId}`                         |
| 17  | Modificar Estado Procesal           | `PATCH /procedural-states/{stateId}`                              |
| 18  | Registrar Causa                     | `POST /cases`                                                     |
| 20  | Consultar Causas                    | `GET /cases`, `GET /cases/custom-states`                          |
| 22  | Consultar detalle de Causa          | `GET /cases/{caseId}`                                             |
| 26  | Registrar Acto Procesal             | `POST /cases/{caseId}/procedural-acts`, `GET /cases/{caseId}/procedural-acts/deadline-preview` |
| 45  | Registrar Estado procesal           | `POST /procedural-states`                                         |
| 46  | Registrar baja de Estado procesal   | `DELETE /procedural-states/{stateId}`                             |
| —   | ABMC de Calificaciones legales      | `/legal-qualifications`                                           |

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
- [4. Información general](#4-información-general)
- [5. Convenciones de respuestas](#5-convenciones-de-respuestas)
- [6. Códigos HTTP](#6-códigos-http)
- [7. Cambios respecto de la versión anterior](#7-cambios-respecto-de-la-versión-anterior)
- [8. Observaciones](#8-observaciones)

---

## 1. Resumen de Endpoints

La columna **v3** indica si el endpoint es nuevo, si cambió respecto de V2 o si
se mantiene igual.

| Método   | Endpoint                                              | Autenticación | Rol                           | Descripción                              | v3         |
| -------- | ----------------------------------------------------- | :-----------: | ----------------------------- | ---------------------------------------- | ---------- |
| `POST`   | `/auth/login`                                         |      No       | -                             | Iniciar sesión                           | -          |
| `POST`   | `/auth/refresh`                                       |      No       | -                             | Renovar el token de acceso               | -          |
| `POST`   | `/auth/logout`                                        |      Sí       | Cualquier usuario autenticado | Cerrar sesión                            | -          |
| `PATCH`  | `/auth/password`                                      |      Sí       | Cualquier usuario autenticado | Cambiar contraseña                       | -          |
| `POST`   | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Registrar usuario                        | -          |
| `GET`    | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Consultar usuarios                       | -          |
| `GET`    | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Consultar usuario                        | -          |
| `PATCH`  | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Modificar usuario                        | -          |
| `DELETE` | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Dar de baja usuario                      | -          |
| `POST`   | `/lawyers`                                            |      Sí       | `ADMINISTRATOR`               | Registrar abogado                        | -          |
| `GET`    | `/lawyers`                                            |      Sí       | Cualquier usuario autenticado | Consultar abogados                       | Modificado |
| `GET`    | `/lawyers/{lawyerId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar abogado                        | Modificado |
| `PATCH`  | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Modificar abogado                        | -          |
| `DELETE` | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Dar de baja abogado                      | -          |
| `POST`   | `/procedural-states`                                  |      Sí       | `ADMINISTRATOR`               | Registrar estado procesal                | -          |
| `GET`    | `/procedural-states`                                  |      Sí       | Cualquier usuario autenticado | Consultar estados procesales             | Modificado |
| `GET`    | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Consultar estado procesal                | Modificado |
| `PATCH`  | `/procedural-states/{stateId}`                        |      Sí       | `ADMINISTRATOR`               | Modificar estado procesal                | Modificado |
| `DELETE` | `/procedural-states/{stateId}`                        |      Sí       | `ADMINISTRATOR`               | Dar de baja estado procesal              | Modificado |
| `POST`   | `/legal-qualifications`                               |      Sí       | `ADMINISTRATOR`               | Registrar calificación legal             | Nuevo      |
| `GET`    | `/legal-qualifications`                               |      Sí       | Cualquier usuario autenticado | Consultar calificaciones legales         | Nuevo      |
| `GET`    | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Consultar calificación legal             | Nuevo      |
| `PATCH`  | `/legal-qualifications/{qualificationId}`             |      Sí       | `ADMINISTRATOR`               | Modificar calificación legal             | Nuevo      |
| `DELETE` | `/legal-qualifications/{qualificationId}`             |      Sí       | `ADMINISTRATOR`               | Dar de baja calificación legal           | Nuevo      |
| `POST`   | `/clients`                                            |      Sí       | `ADMINISTRATOR`               | Registrar cliente                        | Nuevo      |
| `GET`    | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Consultar clientes                       | Nuevo      |
| `GET`    | `/clients/{clientId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar cliente                        | Nuevo      |
| `POST`   | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Registrar causa                          | Nuevo      |
| `GET`    | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Consultar causas                         | Nuevo      |
| `GET`    | `/cases/custom-states`                                |      Sí       | Cualquier usuario autenticado | Consultar estados escritos a mano        | Nuevo      |
| `GET`    | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Consultar detalle de causa               | Nuevo      |
| `POST`   | `/cases/{caseId}/procedural-acts`                     |      Sí       | Cualquier usuario autenticado | Registrar acto procesal                  | Nuevo      |
| `GET`    | `/cases/{caseId}/procedural-acts/deadline-preview`    |      Sí       | Cualquier usuario autenticado | Previsualizar el vencimiento de un acto  | Nuevo      |

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

### `ProceduralRole` (nuevo)

Posición que ocupa el cliente en la causa. Cada fuero admite un subconjunto de
valores; el backend rechaza con `400` un rol que no corresponda al fuero de la
causa.

| Código               | Rótulo                 | Fueros en que aplica           |
| -------------------- | ---------------------- | ------------------------------ |
| `DEFENSE`            | Defensa                | `CRIMINAL`, `ADMINISTRATIVE`   |
| `PRIVATE_PROSECUTOR` | Querellante particular | `CRIMINAL`                     |
| `APPELLANT`          | Recurrente             | `ADMINISTRATIVE`               |
| `PLAINTIFF`          | Actora                 | `AMPARO`                       |
| `DEFENDANT`          | Demandada              | `AMPARO`                       |

No confundir con `Role`, que es el perfil de seguridad del usuario.

### `ProceduralActStatus` (nuevo)

Estado de confirmación de un acto procesal respecto del cambio de estado de la
causa (RN13). Ver [`POST /cases/{caseId}/procedural-acts`](#post-casescaseidprocedural-acts).

| Código                 | Rótulo                     |
| ---------------------- | -------------------------- |
| `CONFIRMED`            | Confirmado                 |
| `PENDING_CONFIRMATION` | Pendiente de confirmación  |

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
			"fullName": "Fernando G. Vázquez",
			"email": "fvazquez@vazquezzarate.com",
			"roles": ["ADMINISTRATOR", "LAWYER"],
			"lawyer": {
				"id": 1,
				"fullName": "Dr. Fernando G. Vázquez",
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
		"message": "Las credenciales proporcionadas no son válidas.",
		"details": null
	}
}
```

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

La respuesta no contiene cuerpo. El token queda revocado.

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
| `newPassword`     | String |    Sí     | Mínimo 8 caracteres, con al menos un número    |

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo. La sesión permanece abierta.

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
Los datos estables (`fullName`, `email`, `active`, `lawyer`) el cliente
los conserva de `POST /auth/login`. `lastLoginAt` no se devuelve aquí
porque semánticamente pertenece al inicio de sesión, no a la
renovación.

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Session expired or invalid.",
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
inexistente en la base, token revocado (rotación previa o robo
detectado), token expirado, o usuario dado de baja luego del último
login. La reacción del cliente es la misma en todos los casos:
redirigir al login.

---

### 3.2 Gestión de usuarios: /users

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRATOR`.

El recurso usuario posee la siguiente estructura:

| Campo         | Tipo                  | Nulo | Descripción                                                              |
| ------------- | --------------------- | :--: | ------------------------------------------------------------------------ |
| `id`          | Integer               |  No  | Identificador único                                                      |
| `username`    | String                |  No  | Nombre de usuario. Único                                                 |
| `fullName`    | String                |  No  | Nombre y apellido en un único campo                                      |
| `email`       | String                |  No  | Correo electrónico. Único                                                |
| `roles`       | `Role[]`              |  No  | Al menos un rol                                                          |
| `lawyer`      | Object \| `null`      |  Sí  | Ficha profesional vinculada. `null` si el usuario no posee vínculo       |
| `lastLoginAt` | String (ISO 8601) \| `null` | Sí | Último ingreso registrado. `null` si el usuario nunca inició sesión |
| `active`      | Boolean               |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /users/{userId}`        |

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
	"fullName": "Ignacio Peralta",
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
	"fullName": "Ignacio Peralta",
	"email": "iperalta@vazquezzarate.com",
	"password": "password1",
	"roles": ["LAWYER"],
	"lawyer": {
		"fullName": "Dr. Ignacio Peralta",
		"registrationNumber": "1-35207"
	}
}
```

| Campo      | Tipo           | Requerido   | Restricciones                                                                 |
| ---------- | -------------- | :---------: | ----------------------------------------------------------------------------- |
| `username` | String         |     Sí      | Entre 3 y 30 caracteres: letras, números, punto, guión y guión bajo. Único    |
| `fullName` | String         |     Sí      | -                                                                             |
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
		"fullName": "Ignacio Peralta",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER"],
		"lawyer": {
			"id": 4,
			"fullName": "Dr. Ignacio Peralta",
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
| `search`  | String  |    No     | -                 | -                   | Filtra por `username` y por `fullName`         |
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
			"fullName": "Fernando G. Vázquez",
			"email": "fvazquez@vazquezzarate.com",
			"roles": ["ADMINISTRATOR", "LAWYER"],
			"lawyer": {
				"id": 1,
				"fullName": "Dr. Fernando G. Vázquez",
				"registrationNumber": "1-28114"
			},
			"lastLoginAt": "2026-09-19T08:12:00-03:00",
			"active": true
		},
		{
			"id": 8,
			"username": "gestion",
			"fullName": "Gestión Estudio",
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
		"fullName": "Ignacio Peralta",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER"],
		"lawyer": {
			"id": 4,
			"fullName": "Dr. Ignacio Peralta",
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
	"fullName": "Ignacio Peralta",
	"email": "iperalta@vazquezzarate.com",
	"roles": ["LAWYER", "ADMINISTRATOR"],
	"lawyerId": 4
}
```

| Campo      | Tipo               | Descripción                                                          |
| ---------- | ------------------ | -------------------------------------------------------------------- |
| `username` | String             | Mismas restricciones que en el alta                                  |
| `fullName` | String             | -                                                                    |
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
		"fullName": "Ignacio Peralta",
		"email": "iperalta@vazquezzarate.com",
		"roles": ["LAWYER", "ADMINISTRATOR"],
		"lawyer": {
			"id": 4,
			"fullName": "Dr. Ignacio Peralta",
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
existir. No puede iniciar sesión, sus sesiones abiertas se cierran, no aparece
en ningún listado y `GET /users/{userId}` responde `404`. No existe forma de
consultarlo ni de reactivarlo desde la API.

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

La lectura se abre en esta versión porque HU13 la asigna a la Secretaría, el
prototipo muestra la sección en modo consulta a todos los perfiles y el
formulario de alta de causa —que opera cualquier perfil— necesita el listado de
abogados para elegir al responsable.

El recurso abogado posee la siguiente estructura:

| Campo                | Tipo    | Nulo | Descripción                                                          |
| -------------------- | ------- | :--: | -------------------------------------------------------------------- |
| `id`                 | Integer |  No  | Identificador único                                                  |
| `fullName`           | String  |  No  | Nombre y apellido en un único campo, incluyendo el tratamiento       |
| `registrationNumber` | String  |  No  | Matrícula. Única                                                     |
| `activeCases`        | Integer |  No  | Causas activas en las que es responsable. Calculado, sólo lectura    |
| `active`             | Boolean |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /lawyers/{lawyerId}` |

**Formato de la matrícula:** el vigente en el Colegio de Abogados de Córdoba,
compuesto por circunscripción y número separados por guión: `1-28114`.

**Sobre `activeCases`:** a partir de esta versión el módulo de causas existe y
el campo deja de valer `0` fijo. Se calcula según la definición de
[causa activa](#causa-activa) de la sección 4.

---

#### `POST /lawyers`

Registra un nuevo abogado en el sistema.

**Rol requerido:** `ADMINISTRATOR`.

**Cuerpo de la petición**

```json
{
	"fullName": "Dr. Ignacio Peralta",
	"registrationNumber": "1-35207"
}
```

| Campo                | Tipo   | Requerido | Restricciones                 |
| -------------------- | ------ | :-------: | ----------------------------- |
| `fullName`           | String |    Sí     | -                             |
| `registrationNumber` | String |    Sí     | Formato `1-28114`. Única      |

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 4,
		"fullName": "Dr. Ignacio Peralta",
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
| `search`  | String  |    No     | -                 | -                   | Filtra por `fullName` y por `registrationNumber`   |

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
			"fullName": "Dr. Fernando G. Vázquez",
			"registrationNumber": "1-28114",
			"activeCases": 14,
			"active": true
		},
		{
			"id": 4,
			"fullName": "Dr. Ignacio Peralta",
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
		"fullName": "Dr. Ignacio Peralta",
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
> Sprint 3; se mantiene en el contrato porque ya figuraba en V2.

**Parámetros de ruta**

| Parámetro  | Tipo    | Descripción                     |
| ---------- | ------- | ------------------------------- |
| `lawyerId` | Integer | Identificador único del abogado |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"fullName": "Dr. Ignacio Peralta",
	"registrationNumber": "1-35207"
}
```

| Campo                | Tipo    | Descripción                                |
| -------------------- | ------- | ------------------------------------------ |
| `fullName`           | String  | -                                          |
| `registrationNumber` | String  | Formato `1-28114`. Única                   |

El campo `activeCases` no es modificable: lo calcula el backend.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 4,
		"fullName": "Dr. Ignacio Peralta",
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
> Sprint 4. Ver la observación [C-17](#82-puntos-a-verificar) sobre la
> reasignación de causas que muestra el prototipo.

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
**Rol requerido:** la lectura (`GET`) está habilitada para cualquier usuario
autenticado; la escritura (`POST`, `PATCH`, `DELETE`) requiere
`ADMINISTRATOR`.

La lectura se abre porque el registro de un acto procesal (HU26), que opera
cualquier perfil, necesita los estados del fuero y sus plazos. La escritura
queda en `ADMINISTRATOR` porque así la restringe el prototipo, aunque HU17,
HU45 y HU46 estén redactadas "como abogado" (ver [D-04](#81-decisiones-tomadas)).

El recurso estado procesal posee la siguiente estructura:

| Campo           | Tipo           | Nulo | Descripción                                                                  |
| --------------- | -------------- | :--: | ---------------------------------------------------------------------------- |
| `id`            | Integer        |  No  | Identificador único                                                          |
| `name`          | String         |  No  | Denominación del estado, en castellano. Texto libre. Única dentro del fuero  |
| `jurisdiction`  | `Jurisdiction` |  No  | Fuero al que pertenece                                                       |
| `position`      | Integer        |  No  | Posición dentro del ciclo de vida del fuero, desde `1`. Única dentro del fuero |
| `timeLimitDays` | Integer        |  No  | Días que abre el estado. `0` indica que no abre plazo                        |
| `dayType`       | `DayType`      |  No  | Forma de cómputo de los días                                                 |
| `terminal`      | Boolean        |  No  | Indica si el estado cierra el ciclo de vida de la causa                      |
| `activeCases`   | Integer        |  No  | Causas activas que se encuentran en este estado. Calculado, sólo lectura     |
| `active`        | Boolean        |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /procedural-states/{stateId}` |

**Sobre `name`:** RN4 establece que los estados procesales dependen del fuero y
son parametrizables, es decir que los da de alta el estudio. Por ese motivo la
denominación es texto libre en castellano —"Designación de abogado defensor",
"Oposición al requerimiento de elevación"— y no un valor de un conjunto
cerrado. La unicidad es **por fuero**: "Archivada" existe en los tres.

**Sobre `position`:** los estados de un fuero conforman una secuencia ordenada.
Al insertar, mover o eliminar un estado, el backend renumera las posiciones
afectadas; el cliente no envía esa renumeración. El estado en la posición `1`
es el **estado inicial** que recibe toda causa nueva del fuero
(ver [`POST /cases`](#post-cases)).

**Sobre `activeCases`:** a partir de esta versión se calcula según la
definición de [causa activa](#causa-activa). En la tabla del prototipo es la
columna "Causas".

**Sobre el efecto de los cambios en las causas:** renombrar un estado actualiza
la denominación en todas las causas que lo tienen, porque la causa referencia
al estado y no copia su nombre. En cambio, modificar `timeLimitDays` o
`dayType` **no recalcula los vencimientos ya registrados**: el plazo nuevo rige
para los actos procesales que se registren de ahí en adelante. Así lo indica el
prototipo al modificar un estado en uso.

---

#### `POST /procedural-states`

Registra un nuevo estado procesal (HU45).

**Rol requerido:** `ADMINISTRATOR`.

**Cuerpo de la petición**

```json
{
	"name": "Oposición al requerimiento de elevación",
	"jurisdiction": "CRIMINAL",
	"position": 4,
	"timeLimitDays": 5,
	"dayType": "BUSINESS",
	"terminal": false
}
```

| Campo           | Tipo           | Requerido | Valor por defecto | Restricciones                                                                     |
| --------------- | -------------- | :-------: | ----------------- | --------------------------------------------------------------------------------- |
| `name`          | String         |    Sí     | -                 | Única dentro del fuero                                                            |
| `jurisdiction`  | `Jurisdiction` |    Sí     | -                 | Fuero válido                                                                      |
| `position`      | Integer        |    No     | Última posición   | Entre `1` y la cantidad de estados del fuero más uno                              |
| `timeLimitDays` | Integer        |    No     | `0`               | Mayor o igual a `0`                                                               |
| `dayType`       | `DayType`      |    No     | `NONE`            | Debe ser `NONE` si `timeLimitDays` es `0`, y distinto de `NONE` si es mayor a `0` |
| `terminal`      | Boolean        |    No     | `false`           | -                                                                                 |

**Correspondencia con el formulario.** El selector "Ubicación en el ciclo" del
prototipo se traduce a `position` del lado del cliente: "Al inicio" es `1`,
"Después de *n*. …" es `n + 1` y "Al final" es omitir el campo. La opción
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
		"position": 4,
		"timeLimitDays": 5,
		"dayType": "BUSINESS",
		"terminal": false,
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
`position` ascendente.

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
registro de acto procesal piden el ciclo completo del fuero con `limit=100`.

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"name": "Notificación de imputación en sumario",
			"jurisdiction": "ADMINISTRATIVE",
			"position": 1,
			"timeLimitDays": 10,
			"dayType": "BUSINESS",
			"terminal": false,
			"activeCases": 7,
			"active": true
		},
		{
			"id": 7,
			"name": "Archivada",
			"jurisdiction": "ADMINISTRATIVE",
			"position": 7,
			"timeLimitDays": 0,
			"dayType": "NONE",
			"terminal": true,
			"activeCases": 0,
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

Un estado terminal devuelve siempre `activeCases` en `0`, porque una causa en
estado terminal no es una causa activa.

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
		"position": 4,
		"timeLimitDays": 5,
		"dayType": "BUSINESS",
		"terminal": false,
		"activeCases": 7,
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

**Rol requerido:** `ADMINISTRATOR`.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                             |
| --------- | ------- | --------------------------------------- |
| `stateId` | Integer | Identificador único del estado procesal |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno.

```json
{
	"name": "Oposición al requerimiento de elevación a juicio",
	"position": 5,
	"timeLimitDays": 6,
	"dayType": "BUSINESS",
	"terminal": false
}
```

| Campo           | Tipo           | Descripción                                                                |
| --------------- | -------------- | -------------------------------------------------------------------------- |
| `name`          | String         | Única dentro del fuero                                                     |
| `jurisdiction`  | `Jurisdiction` | Traslada el estado a otro fuero. Ver la restricción más abajo              |
| `position`      | Integer        | Modificarla reordena el ciclo de vida del fuero                            |
| `timeLimitDays` | Integer        | Mayor o igual a `0`                                                        |
| `dayType`       | `DayType`      | Debe ser coherente con `timeLimitDays`                                     |
| `terminal`      | Boolean        | -                                                                          |

**Cambio de fuero.** El formulario de modificación del prototipo ofrece el
selector "Fuero al que pertenece", por lo que V3 admite `jurisdiction` en el
`PATCH` (V2 no lo admitía). Para no dejar causas de un fuero apuntando a un
estado de otro, el traslado solo procede si **ninguna causa registra el
estado**, ni como estado actual ni en sus actos procesales; en caso contrario
se responde `422 PROCEDURAL_STATE_IN_USE`. Al trasladarse, el estado se ubica
al final del ciclo del fuero de destino, salvo que se envíe `position`, y el
fuero de origen renumera sus posiciones.

**Correspondencia con el formulario.** El selector "Ubicación en el ciclo"
("Posición *n* (actual)" o "Después de …") lo traduce el cliente a `position`;
si el usuario deja la posición actual, el campo se omite. La opción "—" del
selector de tipo de día corresponde a `dayType: "NONE"`.

El campo `activeCases` no es modificable: lo calcula el backend.

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 12,
		"name": "Oposición al requerimiento de elevación a juicio",
		"jurisdiction": "CRIMINAL",
		"position": 5,
		"timeLimitDays": 6,
		"dayType": "BUSINESS",
		"terminal": false,
		"activeCases": 7,
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
			"position": "Debe ser un número entero entre 1 y la cantidad de estados del fuero."
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

```json
{
	"error": {
		"code": "PROCEDURAL_STATE_IN_USE",
		"message": "El estado procesal está registrado en causas y no puede cambiar de fuero.",
		"details": null
	}
}
```

---

#### `DELETE /procedural-states/{stateId}`

Da de baja un estado procesal (HU46).

**Rol requerido:** `ADMINISTRATOR`.

**La baja es lógica, pero el cliente no la percibe.** El backend establece
`active` en `false` y conserva el registro; para el cliente el estado deja de
existir. No aparece en ningún listado, no puede elegirse como destino de un
acto procesal y `GET /procedural-states/{stateId}` responde `404`. Las
posiciones de los estados siguientes del fuero se renumeran. No existe forma de
consultarlo ni de reactivarlo desde la API.

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
		"code": "PROCEDURAL_STATE_NOT_FOUND",
		"message": "No se encontró el estado procesal solicitado.",
		"details": null
	}
}
```

---

### 3.5 Calificaciones legales: /legal-qualifications

**Autenticación requerida:** Sí.
**Rol requerido:** la lectura (`GET`) está habilitada para cualquier usuario
autenticado; la escritura (`POST`, `PATCH`, `DELETE`) requiere
`ADMINISTRATOR`.

La calificación legal es el encuadre jurídico del hecho imputado y **determina
el plazo de prescripción de la acción** (glosario del Plan de Proyecto). Forma
parte de la parametrización jurídica (EP-03), junto con los estados procesales.
Una causa penal registra al menos una; si concurren varios delitos, registra
una por cada uno, y cada una computa su propia prescripción.

La lectura se abre porque el alta de causa, que opera cualquier perfil, ofrece
el selector de calificaciones. La escritura queda en `ADMINISTRATOR`, tal como
la restringe el prototipo, tanto desde la pantalla de Administración como desde
el botón "Registrar calificación nueva" del alta de causa
(ver [C-01](#82-puntos-a-verificar)).

El recurso calificación legal posee la siguiente estructura:

| Campo                | Tipo    | Nulo | Descripción                                                                         |
| -------------------- | ------- | :--: | ----------------------------------------------------------------------------------- |
| `id`                 | Integer |  No  | Identificador único                                                                 |
| `name`               | String  |  No  | Denominación, incluida la norma: `Hurto simple — art. 162 CP`. Única entre las vigentes |
| `prescriptionMonths` | Integer |  No  | Plazo de prescripción de la acción, expresado en meses                              |
| `activeCases`        | Integer |  No  | Causas activas que la registran. Calculado, sólo lectura                            |
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

**Rol requerido:** `ADMINISTRATOR`.

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
		"message": "Invalid request data.",
		"details": {
			"prescriptionMonths": "Must be an integer greater than or equal to 1."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "The ADMINISTRATOR role is required to perform this operation.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_ALREADY_EXISTS",
		"message": "A legal qualification with that name already exists.",
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
		"message": "Invalid pagination parameters.",
		"details": {
			"page": "Must be an integer greater than or equal to 1.",
			"limit": "Must be an integer between 1 and 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
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
		"message": "Invalid legal qualification identifier.",
		"details": {
			"qualificationId": "Must be a valid integer."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "The requested legal qualification was not found.",
		"details": null
	}
}
```

---

#### `PATCH /legal-qualifications/{qualificationId}`

Modifica parcialmente una calificación legal.

**Rol requerido:** `ADMINISTRATOR`.

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

El campo `activeCases` no es modificable: lo calcula el backend.

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
		"code": "VALIDATION_ERROR",
		"message": "Invalid request data.",
		"details": {
			"name": "Must not be empty."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "The ADMINISTRATOR role is required to perform this operation.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "The requested legal qualification was not found.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_ALREADY_EXISTS",
		"message": "A legal qualification with that name already exists.",
		"details": null
	}
}
```

---

#### `DELETE /legal-qualifications/{qualificationId}`

Da de baja una calificación legal.

**Rol requerido:** `ADMINISTRATOR`.

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
		"message": "Invalid legal qualification identifier.",
		"details": {
			"qualificationId": "Must be a valid integer."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "The ADMINISTRATOR role is required to perform this operation.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "The requested legal qualification was not found.",
		"details": null
	}
}
```

---

### 3.6 Clientes: /clients

**Autenticación requerida:** Sí.
**Rol requerido:** la lectura (`GET`) está habilitada para cualquier usuario
autenticado; el alta (`POST`) requiere `ADMINISTRATOR`.

El rol del alta sigue al prototipo, que la restringe al Administrador tanto
desde la pantalla Clientes como desde el botón "Registrar cliente nuevo" del
alta de causa. HU8 la asigna en cambio a abogado y secretaría: es el primer
punto a verificar de este contrato ([C-01](#82-puntos-a-verificar)).

La modificación y la baja de clientes (HU10 y HU11) corresponden al Sprint 4 y
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

**Sobre `lastName` y `firstName`:** el cliente es la primera persona del
sistema con apellido y nombres en campos separados, conforme a la observación
de la Sprint Review del Sprint 1 y al formulario del prototipo. El backend los
guarda tal como llegan; la forma `GÓMEZ, Ariel Fernando` que se ve en el
listado y en la carátula sugerida la compone el cliente.

**Sobre `dni`:** viaja sin puntos (`34812905`). El formato `34.812.905` es de
presentación y lo aplica el cliente. Se conserva la sigla, como `SacNumber`,
por tratarse de un documento argentino sin equivalente directo
(ver [D-24](#81-decisiones-tomadas)).

**Sobre `clientSince`:** el prototipo lo asigna con la fecha del día al
registrar el cliente y no lo ofrece para editar.

---

#### `POST /clients`

Registra un nuevo cliente (HU8).

**Rol requerido:** `ADMINISTRATOR`.

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
		"message": "Invalid request data.",
		"details": {
			"dni": "Must contain 7 or 8 digits, without dots.",
			"email": "Invalid email format."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "The ADMINISTRATOR role is required to perform this operation.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "CLIENT_DNI_ALREADY_EXISTS",
		"message": "A client with that DNI is already registered.",
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
		"message": "Invalid pagination parameters.",
		"details": {
			"page": "Must be an integer greater than or equal to 1.",
			"limit": "Must be an integer between 1 and 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
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
		"message": "Invalid client identifier.",
		"details": {
			"clientId": "Must be a valid integer."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CLIENT_NOT_FOUND",
		"message": "The requested client was not found.",
		"details": null
	}
}
```

---

### 3.7 Causas: /cases

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado, tanto para la lectura como
para el alta.

RN11 establece que todo el estudio accede a todas las causas, y el prototipo
habilita "Nueva causa" a los tres perfiles. La modificación y la baja de causas
(HU19 y HU21) corresponden al Sprint 3 y no forman parte de esta versión.

El recurso causa posee la siguiente estructura:

| Campo                  | Tipo                          | Nulo | Descripción                                                                                   |
| ---------------------- | ----------------------------- | :--: | --------------------------------------------------------------------------------------------- |
| `id`                   | Integer                       |  No  | Identificador único interno                                                                   |
| `sacNumber`            | String                        |  No  | Número de SAC: 8 dígitos. Identifica la causa de forma unívoca (RN2). No modificable          |
| `caption`              | String                        |  No  | Carátula                                                                                      |
| `court`                | String \| `null`              |  Sí  | Tribunal o dependencia                                                                        |
| `jurisdiction`         | `Jurisdiction`                |  No  | Fuero. Define el ciclo de vida y la tabla de plazos aplicable                                 |
| `proceduralRole`       | `ProceduralRole`              |  No  | Rol procesal del cliente                                                                      |
| `instructorName`       | String \| `null`              |  Sí  | Instructor de la causa: quien lleva la instrucción en el tribunal o la dependencia            |
| `instructorPhone`      | String \| `null`              |  Sí  | Teléfono e interno del instructor. Texto libre: `0351 448-1200 int. 214`                      |
| `counterparty`         | String \| `null`              |  Sí  | Contraparte u organismo. Solo en `ADMINISTRATIVE` y `AMPARO`; en `CRIMINAL` vale `null`       |
| `client`               | Object                        |  No  | Cliente de la causa. Ver estructura más abajo                                                 |
| `responsibleLawyer`    | Object                        |  No  | Abogado responsable (RN3): `id`, `fullName`, `registrationNumber`                             |
| `legalQualifications`  | Object[]                      |  No  | Calificaciones legales con su prescripción. Al menos una en `CRIMINAL`; vacío en los demás    |
| `startDate`            | String (fecha ISO 8601)       |  No  | Fecha de inicio de la causa                                                                   |
| `prescriptionStartsOn` | String (fecha ISO 8601) \| `null` | Sí | Fecha desde la que se computa la prescripción. `null` fuera de `CRIMINAL`                  |
| `currentState`         | Object                        |  No  | Estado procesal actual. Ver estructura más abajo                                              |
| `nextDeadline`         | Object \| `null`              |  Sí  | Plazo abierto de la causa. `null` si no tiene ninguno. Ver estructura más abajo               |
| `active`               | Boolean                       |  No  | Estado de alta. Vale siempre `true` en esta versión                                           |

**`client`** reúne los datos que muestra la tarjeta "Cliente" del detalle:
`id`, `lastName`, `firstName`, `dni`, `phone`, `email` y `clientSince`, con el
mismo significado que en [`/clients`](#36-clientes-clients).

**`legalQualifications[]`**

| Campo                   | Tipo                    | Descripción                                                          |
| ----------------------- | ----------------------- | -------------------------------------------------------------------- |
| `id`                    | Integer                 | Identificador de la calificación legal                               |
| `name`                  | String                  | Denominación vigente de la calificación                              |
| `prescriptionMonths`    | Integer                 | Plazo de prescripción vigente, en meses                              |
| `prescriptionExpiresOn` | String (fecha ISO 8601) | `prescriptionStartsOn` más `prescriptionMonths`. Calculado           |

Una calificación dada de baja **sigue apareciendo** en las causas que la
registran (ver [`DELETE /legal-qualifications`](#delete-legal-qualificationsqualificationid)).

**`currentState`**

| Campo               | Tipo              | Descripción                                                                   |
| ------------------- | ----------------- | ----------------------------------------------------------------------------- |
| `proceduralStateId` | Integer \| `null` | Estado de la tabla del fuero. `null` si el estado fue escrito a mano          |
| `name`              | String            | Denominación a mostrar                                                        |
| `custom`            | Boolean           | `true` si es un estado escrito a mano para esta causa (ver §3.8)              |

**`nextDeadline`**

| Campo                    | Tipo                    | Descripción                                                                  |
| ------------------------ | ----------------------- | ---------------------------------------------------------------------------- |
| `proceduralActId`        | Integer                 | Acto procesal que abrió el plazo                                             |
| `dueDate`                | String (fecha ISO 8601) | Fecha de vencimiento                                                         |
| `businessDaysRemaining`  | Integer                 | Días hábiles desde hoy hasta `dueDate`. `0` vence hoy; negativo, ya vencido  |
| `manuallyAdjusted`       | Boolean                 | `true` si el vencimiento se ajustó a mano al registrar el acto               |

Con `businessDaysRemaining` el cliente arma los rótulos del prototipo: "Vencido
hace 2 días", "Vence hoy", "En 3 días hábiles". Se calcula en cada respuesta,
contra la fecha del día en Córdoba (ver [§4](#cómputo-de-días)).

Un plazo vencido **sigue abierto** —y la causa lo sigue mostrando— hasta que un
acto procesal posterior la lleve a otro estado. Una causa sin plazo abierto es
una de las "causas para impulsar" del prototipo.

**Sobre la prescripción:** solo se computa en el fuero `CRIMINAL`; en los demás
el prototipo informa "No aplica al fuero". En esta versión
`prescriptionStartsOn` es igual a `startDate`, como lo calcula el resumen del
alta del prototipo. Cuando el Sprint 3 incorpore los actos interruptivos
(HU31), pasará a ser la fecha del último acto interruptivo, sin cambiar la
estructura del recurso. El porcentaje transcurrido y el "Restan 5 años 9 meses"
del detalle los calcula el cliente con `prescriptionStartsOn` y
`prescriptionExpiresOn`.

---

#### `POST /cases`

Registra una nueva causa (HU18).

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
	"instructorPhone": "0351 448-1200 int. 214",
	"clientId": 1,
	"proceduralRole": "DEFENSE",
	"legalQualificationIds": [1],
	"responsibleLawyerId": 3,
	"startDate": "2021-03-12"
}
```

Amparo:

```json
{
	"sacNumber": "12774310",
	"jurisdiction": "AMPARO",
	"caption": "MOYANO, Daniela c/ APROSS — Amparo de salud",
	"court": "Juzgado Civil y Comercial 37ª Nom.",
	"instructorName": "Dra. Inés Ferrero",
	"instructorPhone": "0351 448-1600 int. 517",
	"clientId": 6,
	"proceduralRole": "PLAINTIFF",
	"counterparty": "APROSS",
	"responsibleLawyerId": 1,
	"startDate": "2026-09-08"
}
```

| Campo                   | Tipo             | Requerido   | Restricciones                                                                                     |
| ----------------------- | ---------------- | :---------: | ------------------------------------------------------------------------------------------------- |
| `sacNumber`             | String           |     Sí      | Exactamente 8 dígitos. Único en todo el sistema                                                   |
| `jurisdiction`          | `Jurisdiction`   |     Sí      | Fuero válido                                                                                      |
| `caption`               | String           |     Sí      | Hasta 255 caracteres                                                                              |
| `court`                 | String           |     No      | Hasta 255 caracteres                                                                              |
| `instructorName`        | String           |     No      | Hasta 150 caracteres                                                                              |
| `instructorPhone`       | String           |     No      | Hasta 50 caracteres                                                                               |
| `clientId`              | Integer          |     Sí      | Cliente vigente                                                                                   |
| `proceduralRole`        | `ProceduralRole` |     Sí      | Debe corresponder al fuero (ver [`ProceduralRole`](#proceduralrole-nuevo))                        |
| `legalQualificationIds` | Integer[]        | Condicional | Obligatorio en `CRIMINAL`, con al menos un elemento, sin repetidos y todos vigentes. No se envía en los demás fueros |
| `counterparty`          | String           |     No      | Hasta 255 caracteres. Solo en `ADMINISTRATIVE` y `AMPARO`; no se envía en `CRIMINAL`              |
| `responsibleLawyerId`   | Integer          |     Sí      | Abogado vigente (RN3)                                                                             |
| `startDate`             | String (fecha)   |     No      | Por defecto, la fecha del día. No puede ser posterior a hoy                                       |

Un identificador de cliente, abogado o calificación que no existe o está dado
de baja se informa como `400 VALIDATION_ERROR` sobre el campo correspondiente,
porque es un dato del formulario que el usuario tiene que corregir.

**Efectos del alta**

- **Estado inicial.** La causa nace en el estado procesal de posición `1` del
  fuero ("el sistema deriva el estado procesal inicial del fuero"). Si el fuero
  no tiene estados vigentes, el alta se rechaza con
  `422 JURISDICTION_WITHOUT_PROCEDURAL_STATES`.
- **Sin plazo abierto.** El alta no abre plazo: `nextDeadline` vale `null`
  hasta que se registre el primer acto procesal. El resumen del alta del
  prototipo muestra el estado inicial, pero no un vencimiento.
- **Ciclo de vida.** El alta queda asentada como primer movimiento del ciclo de
  vida de la causa, con el estado inicial y la fecha de inicio. No se expone en
  esta versión, pero la necesitarán HU23 y HU27.
- **Carátula sugerida.** El panel "Carátula sugerida" del prototipo lo arma el
  cliente con el cliente elegido, las calificaciones o la contraparte; el
  backend recibe la carátula final en `caption`.

Las opciones "Crear la carpeta de la causa en Drive" y "Copiar los modelos de
escritos del fuero" del formulario corresponden a HU39 y HU40 (Sprint 3) y no
tienen campo en esta versión.

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
		"proceduralRole": "DEFENSE",
		"instructorName": "Dra. Verónica Ledesma",
		"instructorPhone": "0351 448-1200 int. 214",
		"counterparty": null,
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
			"fullName": "Dra. Malena Ríos",
			"registrationNumber": "1-36842"
		},
		"legalQualifications": [
			{
				"id": 1,
				"name": "Robo calificado — art. 167 inc. 2 CP",
				"prescriptionMonths": 96,
				"prescriptionExpiresOn": "2029-03-12"
			}
		],
		"startDate": "2021-03-12",
		"prescriptionStartsOn": "2021-03-12",
		"currentState": {
			"proceduralStateId": 9,
			"name": "Designación de abogado defensor",
			"custom": false
		},
		"nextDeadline": null,
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid request data.",
		"details": {
			"sacNumber": "Must contain exactly 8 digits.",
			"legalQualificationIds": "At least one legal qualification is required for criminal cases.",
			"proceduralRole": "The procedural role does not apply to the jurisdiction."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid request data.",
		"details": {
			"responsibleLawyerId": "There is no active lawyer with that identifier."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`409 Conflict`**

```json
{
	"error": {
		"code": "CASE_SAC_ALREADY_EXISTS",
		"message": "A case with that SAC number is already registered.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "JURISDICTION_WITHOUT_PROCEDURAL_STATES",
		"message": "The jurisdiction has no active procedural states to start the case.",
		"details": null
	}
}
```

---

#### `GET /cases`

Obtiene una lista paginada de las causas (HU20).

**Rol requerido:** cualquier usuario autenticado.

Los resultados se ordenan por urgencia: primero las causas con plazo abierto,
por `nextDeadline.dueDate` ascendente (las vencidas quedan primeras), y luego
las que no tienen plazo abierto, por `sacNumber`.

**Parámetros de consulta**

| Parámetro             | Tipo    | Requerido | Valor por defecto | Restricciones                   | Descripción                                                                 |
| --------------------- | ------- | :-------: | ----------------- | ------------------------------- | --------------------------------------------------------------------------- |
| `page`                | Integer |    No     | `1`               | Mayor o igual a `1`             | Número de página                                                            |
| `limit`               | Integer |    No     | `20`              | Entre `1` y `100`               | Cantidad máxima de elementos por página                                     |
| `search`              | String  |    No     | -                 | -                               | Filtra por `sacNumber`, por `caption` y por apellido y nombres del cliente  |
| `jurisdiction`        | String  |    No     | -                 | Fuero válido                    | Filtro "Todos los fueros"                                                   |
| `responsibleLawyerId` | Integer |    No     | -                 | -                               | Filtro "Todos los responsables"                                             |
| `proceduralStateId`   | Integer |    No     | -                 | Excluyente con `customState`    | Filtro "Todos los estados procesales": estado de la tabla                   |
| `customState`         | String  |    No     | -                 | Excluyente con `proceduralStateId` | Mismo filtro, grupo "Escritos a mano en causas". Coincidencia exacta sin distinguir mayúsculas |
| `clientId`            | Integer |    No     | -                 | -                               | Causas de un cliente (HU9)                                                  |
| `openDeadline`        | Boolean |    No     | -                 | -                               | `true`: solo causas con plazo abierto, incluidas las vencidas. Botón "Solo con plazo por vencer" |

Ejemplo:

```http
GET /api/v1/cases?page=1&limit=20&jurisdiction=CRIMINAL&responsibleLawyerId=3&openDeadline=true
```

El buscador del encabezado de la aplicación ("Buscar por SAC, carátula o
cliente") usa el mismo endpoint con `search`.

Un filtro por un abogado o un estado inexistente no es un error: devuelve una
colección vacía.

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
			"proceduralRole": "DEFENSE",
			"instructorName": "Crio. Insp. Raúl Bazán",
			"instructorPhone": "0351 428-6000 int. 3120",
			"counterparty": null,
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
				"fullName": "Dr. Ignacio Peralta",
				"registrationNumber": "1-35207"
			},
			"legalQualifications": [],
			"startDate": "2026-05-18",
			"prescriptionStartsOn": null,
			"currentState": {
				"proceduralStateId": 4,
				"name": "Alegato",
				"custom": false
			},
			"nextDeadline": {
				"proceduralActId": 18,
				"dueDate": "2026-09-11",
				"businessDaysRemaining": -2,
				"manuallyAdjusted": false
			},
			"active": true
		},
		{
			"id": 1,
			"sacNumber": "13284571",
			"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
			"court": "Juzgado de Control N° 3 · Córdoba",
			"jurisdiction": "CRIMINAL",
			"proceduralRole": "DEFENSE",
			"instructorName": "Dra. Verónica Ledesma",
			"instructorPhone": "0351 448-1200 int. 214",
			"counterparty": null,
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
				"fullName": "Dra. Malena Ríos",
				"registrationNumber": "1-36842"
			},
			"legalQualifications": [
				{
					"id": 1,
					"name": "Robo calificado — art. 167 inc. 2 CP",
					"prescriptionMonths": 96,
					"prescriptionExpiresOn": "2029-03-12"
				}
			],
			"startDate": "2021-03-12",
			"prescriptionStartsOn": "2021-03-12",
			"currentState": {
				"proceduralStateId": 12,
				"name": "Oposición al requerimiento de elevación",
				"custom": false
			},
			"nextDeadline": {
				"proceduralActId": 31,
				"dueDate": "2026-09-16",
				"businessDaysRemaining": 1,
				"manuallyAdjusted": false
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

Los valores de `businessDaysRemaining` del ejemplo corresponden a una consulta
realizada el martes 15/09/2026, la fecha que usa el prototipo.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Invalid query parameters.",
		"details": {
			"customState": "Cannot be combined with proceduralStateId."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PAGINATION",
		"message": "Invalid pagination parameters.",
		"details": {
			"page": "Must be an integer greater than or equal to 1.",
			"limit": "Must be an integer between 1 and 100."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
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
		"message": "Invalid query parameters.",
		"details": {
			"jurisdiction": "There is no jurisdiction with that name."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}`

Obtiene el detalle de una causa (HU22).

**Rol requerido:** cualquier usuario autenticado.

Devuelve el mismo recurso que el listado. En esta versión el detalle cubre el
encabezado de la causa, la barra de prescripción y la tarjeta del cliente. El
ciclo de vida, la documentación y las acciones "Sobre la causa" que muestra el
prototipo pertenecen a historias de sprints posteriores (ver
[§8.3](#83-visto-en-el-prototipo-y-fuera-de-alcance)).

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
		"proceduralRole": "DEFENSE",
		"instructorName": "Dra. Verónica Ledesma",
		"instructorPhone": "0351 448-1200 int. 214",
		"counterparty": null,
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
			"fullName": "Dra. Malena Ríos",
			"registrationNumber": "1-36842"
		},
		"legalQualifications": [
			{
				"id": 1,
				"name": "Robo calificado — art. 167 inc. 2 CP",
				"prescriptionMonths": 96,
				"prescriptionExpiresOn": "2029-03-12"
			}
		],
		"startDate": "2021-03-12",
		"prescriptionStartsOn": "2021-03-12",
		"currentState": {
			"proceduralStateId": 12,
			"name": "Oposición al requerimiento de elevación",
			"custom": false
		},
		"nextDeadline": {
			"proceduralActId": 31,
			"dueDate": "2026-09-16",
			"businessDaysRemaining": 1,
			"manuallyAdjusted": false
		},
		"active": true
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "Invalid case identifier.",
		"details": {
			"caseId": "Must be a valid integer."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "The requested case was not found.",
		"details": null
	}
}
```

---

### 3.8 Actos procesales: /cases/{caseId}/procedural-acts

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado.

El acto procesal es lo que **mueve la causa**: al registrarlo se elige el
estado procesal al que pasa, y el plazo sale de la tabla del fuero (RN5). La
consulta, la modificación y la anulación de actos (HU27, HU28 y HU29)
corresponden a sprints posteriores; esta versión solo incorpora el registro
(HU26) y su previsualización.

El recurso acto procesal posee la siguiente estructura:

| Campo              | Tipo                          | Nulo | Descripción                                                                         |
| ------------------ | ----------------------------- | :--: | ----------------------------------------------------------------------------------- |
| `id`               | Integer                       |  No  | Identificador único                                                                 |
| `caseId`           | Integer                       |  No  | Causa a la que pertenece                                                            |
| `resultingState`   | Object                        |  No  | Estado al que pasa la causa. Misma estructura que `currentState` de la causa        |
| `actDate`          | String (fecha ISO 8601)       |  No  | Fecha del acto                                                                      |
| `notificationDate` | String (fecha ISO 8601) \| `null` | Sí | Fecha de notificación. Solo en el fuero `ADMINISTRATIVE` (RN6)                  |
| `notes`            | String \| `null`              |  Sí  | Observaciones: situaciones que el estado no alcanza a expresar                      |
| `deadline`         | Object \| `null`              |  Sí  | Plazo que abre el acto. `null` si no abre ninguno. Ver estructura más abajo         |
| `status`           | `ProceduralActStatus`         |  No  | Si el acto ya movió la causa o espera la confirmación del abogado (RN13)            |
| `registeredBy`     | Object                        |  No  | Usuario que registró el acto: `id` y `fullName`                                     |
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

**Rol requerido:** cualquier usuario autenticado. Ver más abajo el efecto
según quién lo registra (RN13).

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
| `proceduralStateId` | Integer        | Condicional | Estado vigente del fuero de la causa y **no terminal**. Excluyente con `customState`                    |
| `customState`       | String         | Condicional | Hasta 255 caracteres. No puede coincidir con el nombre de un estado vigente del fuero. Excluyente con `proceduralStateId` |
| `actDate`           | String (fecha) |     Sí      | No puede ser posterior a hoy                                                                            |
| `notificationDate`  | String (fecha) | Condicional | Solo en `ADMINISTRATIVE`. Obligatoria si el estado elegido abre plazo. Entre `actDate` y hoy            |
| `manualDueDate`     | String (fecha) |     No      | Ajuste manual del vencimiento. No anterior a la fecha desde la que corre el plazo                       |
| `notes`             | String         |     No      | Hasta 2000 caracteres                                                                                   |

Debe enviarse `proceduralStateId` o `customState`, nunca ambos. Si el texto de
`customState` coincide con un estado de la tabla, el cliente debe enviar el
`proceduralStateId` de ese estado: el combo del prototipo ya hace esa
resolución.

Los estados terminales ("Archivada", "Prescripta") no se ofrecen como destino
de un acto: el combo del prototipo los excluye.

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

- Si quien registra **tiene una ficha de abogado vinculada** (`user.lawyer`
  distinto de `null`), el acto se registra `CONFIRMED` y la causa pasa al
  estado del acto. El plazo que abre el acto reemplaza al plazo abierto
  anterior; si no abre ninguno, la causa queda sin plazo abierto.
- Si quien registra **no tiene ficha de abogado** —el caso de la Secretaría—,
  el acto se registra `PENDING_CONFIRMATION` y **la causa no cambia de estado
  ni de plazo**. Es lo que indica el prototipo: "RN13: el cambio de estado lo
  consigna el abogado responsable. Podés cargar el acto; el estado queda
  pendiente de confirmación". La confirmación no forma parte de esta versión
  (ver [C-03](#82-puntos-a-verificar)).
- La causa toma el estado del acto confirmado **con la fecha de acto más
  reciente**. Si se carga un acto con fecha anterior al último registrado —por
  ejemplo, al completar la historia de una causa vieja—, el acto queda
  asentado pero no retrocede el estado actual ni reemplaza el plazo abierto.

El adjunto de la cédula o comprobante ("Adjuntar cédula o comprobante") se
guarda en la carpeta de Drive de la causa, que llega con HU39 (Sprint 3); no
tiene campo en esta versión.

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
		"status": "CONFIRMED",
		"registeredBy": {
			"id": 3,
			"fullName": "Malena Ríos"
		},
		"registeredAt": "2026-09-09T11:42:00-03:00"
	}
}
```

Registrado por la Secretaría, con estado escrito a mano y vencimiento manual:

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
		"status": "PENDING_CONFIRMATION",
		"registeredBy": {
			"id": 8,
			"fullName": "Gestión Estudio"
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
		"message": "Invalid request data.",
		"details": {
			"notificationDate": "Required in the administrative jurisdiction when the state opens a time limit (RN6)."
		}
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid request data.",
		"details": {
			"proceduralStateId": "The procedural state does not belong to the jurisdiction of the case or is terminal."
		}
	}
}
```

```json
{
	"error": {
		"code": "INVALID_PATH_PARAMETER",
		"message": "Invalid case identifier.",
		"details": {
			"caseId": "Must be a valid integer."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "The requested case was not found.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "The case is in a terminal state and does not accept procedural acts.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/procedural-acts/deadline-preview`

Calcula el vencimiento que tendría un acto procesal, **sin registrarlo**.

**Rol requerido:** cualquier usuario autenticado.

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
		"message": "Invalid query parameters.",
		"details": {
			"notificationDate": "Required in the administrative jurisdiction when the state opens a time limit (RN6)."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"error": {
		"code": "UNAUTHENTICATED",
		"message": "Authentication is required.",
		"details": null
	}
}
```

**`404 Not Found`**

```json
{
	"error": {
		"code": "CASE_NOT_FOUND",
		"message": "The requested case was not found.",
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

### Autorización

Los endpoints indicados como `ADMINISTRATOR` requieren que el usuario
autenticado posea dicho rol. Un usuario con varios roles satisface el
requisito si `ADMINISTRATOR` se encuentra entre ellos.

Matriz por recurso:

| Recurso                            | Lectura (`GET`)               | Escritura                                                        |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `/auth`                            | -                             | Cualquier usuario autenticado (`logout`, `password`)             |
| `/users`                           | `ADMINISTRATOR`               | `ADMINISTRATOR`                                                  |
| `/lawyers`                         | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/procedural-states`               | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/legal-qualifications`            | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/clients`                         | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/cases`                           | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/cases/{caseId}/procedural-acts`  | Cualquier usuario autenticado | Cualquier usuario autenticado. Sin ficha de abogado, el acto queda pendiente de confirmación (RN13) |

RN11 establece que todo el estudio accede a todas las causas: la diferencia
entre perfiles está en lo que pueden **operar**, no en lo que pueden **ver**.
Por eso no hay filtrado de causas por usuario.

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

### Causa activa

Una causa es **activa** cuando no fue dada de baja y su estado procesal actual
no es terminal (ni "Archivada" ni "Prescripta"). Es la definición que usa el
prototipo ("causas activas, sin contar archivadas ni prescriptas") y la que
aplican todos los campos `activeCases` del contrato:

| Recurso                  | `activeCases` cuenta las causas activas…          |
| ------------------------ | ------------------------------------------------- |
| Abogado                  | de las que es responsable                         |
| Estado procesal          | que se encuentran en ese estado                   |
| Calificación legal       | que la registran                                  |
| Cliente                  | en las que es el cliente                          |

Un estado escrito a mano no es terminal: la causa que lo tiene es activa.

### Cómputo de días

- **Días hábiles (`BUSINESS`):** de lunes a viernes. El plazo se cuenta a
  partir del día siguiente a la fecha desde la que corre.
- **Días corridos (`CONSECUTIVE`):** todos los días del calendario.
- **`businessDaysRemaining`:** cantidad de días hábiles entre hoy (excluido) y
  el vencimiento (incluido). Vale `0` si vence hoy y es negativo si ya venció.

En esta versión **no se excluyen feriados ni la feria judicial**: el calendario
de días no hábiles sigue sin definir (P-02 de la arquitectura de backend, ver
[C-05](#82-puntos-a-verificar)). Cuando se incorpore, cambiarán los valores
calculados, no la estructura del contrato.

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

La única colección no paginada es `GET /cases/custom-states`, que devuelve una
lista corta de textos en `data`.

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
| `message` | Descripción legible del error, **en inglés**, destinada a desarrollo y registros. No se muestra al usuario final |
| `details` | Objeto `campo → mensaje` en los errores de validación; `null` en el resto                |

El cliente discrimina los errores por `code` y nunca por el texto de
`message`. Dos situaciones que la interfaz resuelve de manera distinta
requieren códigos distintos: por ese motivo `USERNAME_ALREADY_EXISTS` y
`EMAIL_ALREADY_EXISTS` son códigos separados, aunque ambos correspondan a un
`409`.

De ahí que `message` esté en inglés: **la copia que ve el usuario la resuelve
el cliente a partir del `code`**, no la envía el servidor. El `message` sirve
para depurar y para los registros del servidor, donde todo el código —
identificadores, mensajes y comentarios — está en inglés por convención del
proyecto.

Los ejemplos de las secciones 3.1 a 3.4 conservan la redacción en castellano
de V2 y se leen como ilustración del formato, no del idioma. Los de las
secciones 3.5 a 3.8, nuevas en esta versión, ya están en inglés, como los
devuelve el backend.

**Ejemplo — validación de campos**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Invalid request data.",
		"details": {
			"username": "Must be between 3 and 30 characters long.",
			"email": "Invalid email format."
		}
	}
}
```

**General — `500 Internal Server Error`**

```json
{
	"error": {
		"code": "INTERNAL_SERVER_ERROR",
		"message": "An unexpected internal error occurred.",
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
| `INVALID_CREDENTIALS`                    | 401  | Credenciales incorrectas. Exclusivo de `/auth/login`               |
| `UNAUTHENTICATED`                        | 401  | Token ausente, vencido o revocado                                  |
| `FORBIDDEN`                              | 403  | Usuario autenticado sin el rol requerido                           |
| `USER_NOT_FOUND`                         | 404  | Usuario inexistente                                                |
| `LAWYER_NOT_FOUND`                       | 404  | Abogado inexistente                                                |
| `PROCEDURAL_STATE_NOT_FOUND`             | 404  | Estado procesal inexistente                                        |
| `LEGAL_QUALIFICATION_NOT_FOUND`          | 404  | Calificación legal inexistente                                     |
| `CLIENT_NOT_FOUND`                       | 404  | Cliente inexistente                                                |
| `CASE_NOT_FOUND`                         | 404  | Causa inexistente                                                  |
| `RESOURCE_NOT_FOUND`                     | 404  | Ruta inexistente                                                   |
| `USERNAME_ALREADY_EXISTS`                | 409  | Nombre de usuario ya registrado                                    |
| `EMAIL_ALREADY_EXISTS`                   | 409  | Correo electrónico ya registrado                                   |
| `LAWYER_REGISTRATION_ALREADY_EXISTS`     | 409  | Matrícula ya registrada                                            |
| `PROCEDURAL_STATE_ALREADY_EXISTS`        | 409  | Denominación repetida dentro del mismo fuero                       |
| `LEGAL_QUALIFICATION_ALREADY_EXISTS`     | 409  | Denominación de calificación legal ya registrada                   |
| `CLIENT_DNI_ALREADY_EXISTS`              | 409  | DNI ya registrado en un cliente vigente                            |
| `CASE_SAC_ALREADY_EXISTS`                | 409  | Número de SAC ya registrado (RN2)                                  |
| `USER_HAS_DEPENDENCIES`                  | 409  | El usuario posee recursos asociados                                |
| `LAWYER_HAS_DEPENDENCIES`                | 409  | El abogado posee causas o un usuario vinculado                     |
| `INVALID_CURRENT_PASSWORD`               | 422  | La contraseña actual no coincide                                   |
| `PROCEDURAL_STATE_IN_USE`                | 422  | Traslado de fuero de un estado que registran causas                |
| `JURISDICTION_WITHOUT_PROCEDURAL_STATES` | 422  | Alta de causa en un fuero sin estados vigentes                     |
| `CASE_IN_TERMINAL_STATE`                 | 422  | Acto procesal sobre una causa en estado terminal                   |
| `BUSINESS_RULE_VIOLATION`                | 422  | Violación de una regla de negocio                                  |
| `INTERNAL_SERVER_ERROR`                  | 500  | Error interno inesperado                                           |

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
| `422`  | `Unprocessable Content` | Violación de una regla de negocio                       |
| `500`  | `Internal Server Error` | Error interno inesperado                                |

Los códigos `400` y `422` no son intercambiables: `400` indica que los datos
enviados son inválidos y corresponde señalarlos en el formulario; `422` indica
que los datos son válidos pero la operación no puede realizarse por una regla
de negocio, y corresponde informarlo como aviso.

---

## 7. Cambios respecto de la versión anterior

Resumen de las diferencias con `API_CONTRACT_V2.md`, para la revisión del
equipo.

### 7.1 Endpoints incorporados

| Endpoint | HU | Motivo |
| --- | --- | --- |
| `POST`, `GET`, `PATCH`, `DELETE /legal-qualifications` y `GET /legal-qualifications/{qualificationId}` | ABMC incorporado al sprint | La calificación legal determina la prescripción de la causa penal y el alta de causa la exige en el fuero penal |
| `POST /clients`, `GET /clients`, `GET /clients/{clientId}` | 8, 9 | Sin cliente no puede registrarse una causa |
| `POST /cases`, `GET /cases`, `GET /cases/{caseId}` | 18, 20, 22 | Núcleo del sistema |
| `GET /cases/custom-states` | 20 | Grupo "Escritos a mano en causas" del filtro de estado |
| `POST /cases/{caseId}/procedural-acts` | 26 | El acto procesal mueve la causa y abre el plazo (RN5) |
| `GET /cases/{caseId}/procedural-acts/deadline-preview` | 26 | Panel "Cómputo del plazo" sin duplicar el cálculo en el frontend |

### 7.2 Endpoints modificados

| Endpoint | V2 | V3 | Motivo |
| --- | --- | --- | --- |
| `GET /lawyers`, `GET /lawyers/{lawyerId}` | `ADMINISTRATOR` | Cualquier usuario autenticado | HU13 asigna la consulta a la Secretaría; el alta de causa necesita el listado de responsables |
| `GET /procedural-states`, `GET /procedural-states/{stateId}` | `ADMINISTRATOR` | Cualquier usuario autenticado | El registro de actos procesales, que opera cualquier perfil, necesita los estados del fuero |
| `PATCH /procedural-states/{stateId}` | `jurisdiction` no modificable | Modificable si ninguna causa registra el estado | El formulario del prototipo ofrece el selector de fuero |
| `DELETE /procedural-states/{stateId}` | `409` si el estado tenía causas | La baja procede; las causas conservan el estado | Nota del prototipo al eliminar un estado en uso |
| `POST /procedural-states` | `position` mayor o igual a `1` | Entre `1` y la cantidad de estados del fuero más uno | Evita huecos en la secuencia |
| `activeCases` en `/lawyers` y `/procedural-states` | Valía `0` fijo | Calculado | El módulo de causas existe desde esta versión |

### 7.3 Enumerados incorporados

| Enumerado | Motivo |
| --- | --- |
| `ProceduralRole` | Rol procesal del cliente, con los valores por fuero que ofrece el prototipo |
| `ProceduralActStatus` | Acto confirmado o pendiente de confirmación del abogado (RN13) |

### 7.4 Códigos de error

**Incorporados:** `LEGAL_QUALIFICATION_NOT_FOUND`, `CLIENT_NOT_FOUND`,
`CASE_NOT_FOUND`, `LEGAL_QUALIFICATION_ALREADY_EXISTS`,
`CLIENT_DNI_ALREADY_EXISTS`, `CASE_SAC_ALREADY_EXISTS`,
`PROCEDURAL_STATE_IN_USE`, `JURISDICTION_WITHOUT_PROCEDURAL_STATES` y
`CASE_IN_TERMINAL_STATE`.

**Retirado:** `PROCEDURAL_STATE_HAS_DEPENDENCIES`, porque la baja de un estado
procesal ya no se rechaza por tener causas.

### 7.5 Convenciones incorporadas

- **Fechas sin hora** en formato `YYYY-MM-DD`, interpretadas en la zona
  horaria de Córdoba.
- **Definición de causa activa**, común a todos los `activeCases`.
- **Cómputo de días** hábiles y corridos, y de `businessDaysRemaining`.
- **Matriz de autorización** por recurso.
- **Referencias desde una causa** a estados y calificaciones dados de baja.

### 7.6 Cuestiones de V2

| Cuestión (V2 §7.5) | Situación en V3 |
| --- | --- |
| Permiso de lectura para Abogado y Secretaría | **Resuelta** para todos los recursos del Sprint 2 y para `/lawyers`. **Abierta** para `/users` ([C-14](#82-puntos-a-verificar)) |
| Reasignación de causas en la baja de un abogado | **Abierta.** Corresponde a HU15 (Sprint 4); el prototipo ya muestra una propuesta ([C-17](#82-puntos-a-verificar)) |

---

## 8. Observaciones

Decisiones tomadas al redactar este contrato y puntos que conviene verificar
antes o durante la implementación.

### 8.1 Decisiones tomadas

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-01 | El alcance es HU 8, 9, 13, 17, 18, 20, 22, 26, 45 y 46, más el ABMC de calificaciones legales | Story Map actualizado del Seguimiento v1.1 (§4.1.2). La tabla del PDF es difícil de leer por la maquetación, así que la asignación se verificó sumando los puntos: esas diez historias suman exactamente los 112 SP declarados para el Sprint 2 |
| D-02 | V3 es autocontenido y V2 queda sin modificar | Mismo criterio que V2 respecto de V1. `/auth` y `/users` se copian de V2 sin cambios. `PATCH` y `DELETE /lawyers` (HU14 y HU15, sprints 3 y 4) se mantienen porque ya figuraban en V2: quitarlos sería un cambio que nadie pidió |
| D-03 | La lectura de `/lawyers`, `/procedural-states`, `/legal-qualifications`, `/clients` y `/cases` se abre a cualquier usuario autenticado | RN11; el banner del prototipo ("El perfil determina qué se puede operar, no qué se puede ver"); y los formularios de alta de causa y de acto, que opera cualquier perfil, necesitan esos listados. `/users` sigue en `ADMINISTRATOR` ([C-14](#82-puntos-a-verificar)) |
| D-04 | La escritura de estados procesales y calificaciones legales requiere `ADMINISTRATOR` | El prototipo deshabilita esas acciones para los demás perfiles, aunque HU17, HU45 y HU46 digan "Como abogado". Manda el prototipo |
| D-05 | El alta de cliente requiere `ADMINISTRATOR` | Así lo restringe el prototipo, en contra de HU8. Es el primer punto a verificar ([C-01](#82-puntos-a-verificar)) |
| D-06 | La baja de un estado procesal procede aunque haya causas en él, y se retira `PROCEDURAL_STATE_HAS_DEPENDENCIES` | Nota del prototipo: las causas "conservan el estado que ya tienen registrado". Lo mismo para la baja de calificaciones legales |
| D-07 | `PATCH /procedural-states` admite `jurisdiction`, solo si ninguna causa registra el estado | El prototipo muestra el selector de fuero al modificar. La restricción evita que causas de un fuero apunten a un estado de otro |
| D-08 | Cambiar el plazo de un estado **no** recalcula vencimientos; cambiar la prescripción de una calificación **sí** recalcula la de sus causas | Las dos notas del prototipo dicen exactamente eso. Por eso el acto copia los valores del plazo y la causa calcula la prescripción en cada lectura |
| D-09 | Toda causa nace en el estado de posición `1` del fuero y sin plazo abierto | "El sistema deriva el estado procesal inicial del fuero"; el resumen del alta no muestra vencimiento |
| D-10 | El acto procesal se registra como estado resultante, fechas y observaciones, sin un "nombre de acto" aparte | El formulario de HU26 solo pide el estado ("El acto procesal es el que mueve la causa: elegí el estado al que la lleva") ([C-10](#82-puntos-a-verificar)) |
| D-11 | El "estado escrito a mano" se modela como `customState`, sin plazo salvo ajuste manual, con su endpoint de valores distintos para el filtro | Es la descripción libre que pide HU22. El prototipo lo muestra en el combo del acto y en el filtro del listado |
| D-12 | En `ADMINISTRATIVE`, `notificationDate` es obligatoria si el estado abre plazo | RN6. El prototipo no habilita "Registrar acto" sin esa fecha, lo que resuelve el pendiente P-04 de la arquitectura: el acto no existe sin vencimiento calculable |
| D-13 | Un acto registrado por un usuario sin ficha de abogado queda `PENDING_CONFIRMATION` y no mueve la causa | RN13 y la nota del prototipo para el perfil Secretaría. Se usa la ficha de abogado y no el rol porque RN13 habla del abogado, y un `ADMINISTRATOR` que ejerce tiene ficha ([C-03](#82-puntos-a-verificar)) |
| D-14 | El estado actual de la causa es el del acto confirmado con la fecha de acto más reciente | Permite cargar actos viejos sin retroceder la causa |
| D-15 | Los estados terminales no pueden ser destino de un acto | El combo del prototipo los excluye ([C-04](#82-puntos-a-verificar)) |
| D-16 | El número de SAC tiene exactamente 8 dígitos y es único en todo el sistema | Validación del prototipo ("El SAC tiene 8 dígitos"). Resuelve provisoriamente el pendiente P-03 ([C-09](#82-puntos-a-verificar)) |
| D-17 | El DNI viaja sin puntos y es único entre los clientes vigentes | Separa el dato de su presentación. La unicidad entre vigentes permite volver a registrar a un cliente dado de baja cuando exista HU11 |
| D-18 | `ProceduralRole` es un enumerado cerrado, con valores válidos por fuero | El prototipo lo trata como lista fija por fuero (`ROLES_FUERO`), no como parametría |
| D-19 | La prescripción se expresa en meses enteros, vence en `inicio + meses`, solo aplica a `CRIMINAL`, y en este sprint corre desde `startDate` | Es como la guarda y la calcula el prototipo. Los actos interruptivos (HU31) cambian la fecha de inicio en el Sprint 3 sin cambiar la estructura ([C-06](#82-puntos-a-verificar)) |
| D-20 | Se incorpora `deadline-preview` | Con un único lugar de cálculo, lo que el usuario ve antes de guardar coincide siempre con lo que se guarda |
| D-21 | `activeCases` deja de valer `0` y se unifica la definición de causa activa | Ver §4 |
| D-22 | Un identificador inexistente en el cuerpo (`clientId`, `responsibleLawyerId`, `legalQualificationIds`, `proceduralStateId`) responde `400 VALIDATION_ERROR` sobre ese campo | Es un dato del formulario a corregir, no una regla de negocio. Evita agregar un código de error por cada referencia |
| D-23 | Los mensajes de los endpoints nuevos están en inglés; los de 3.1 a 3.4 conservan la redacción de V2 | Convención de §5.2 y lo que efectivamente devuelve hoy el backend (`domain-error.filter.ts`) |
| D-24 | Nombres nuevos: `LegalQualification`, `prescriptionMonths`, `lastName`, `firstName`, `dni`, `clientSince`, `caption`, `court`, `instructorName`, `instructorPhone`, `counterparty`, `customState`, `notificationDate`, `dueDate`, `ProceduralRole`, `ProceduralActStatus` | Hay que incorporarlos a `TRADUCCION_DOMINIO.md`. `caption` y no `CaseCover` porque el glosario ya reserva `CaseCover` para el documento imprimible de HU24; `dni` conserva la sigla como `SacNumber` |
| D-25 | El listado de causas se ordena por urgencia, y `openDeadline=true` incluye las vencidas | Es el orden que usan el tablero y la pantalla de vencimientos del prototipo, y una causa vencida es la que más atención requiere |
| D-26 | `GET /cases` acepta `clientId` | HU9 pide consultar los clientes "con sus causas asociadas"; el prototipo solo muestra la cantidad, pero el filtro evita un endpoint anidado |

### 8.2 Puntos a verificar

| ID | Punto | Con quién |
| --- | --- | --- |
| C-01 | **Alta de cliente y de calificación legal solo para `ADMINISTRATOR`.** El prototipo la restringe, pero HU8 la asigna a abogado y secretaría, y el alta de causa —que hacen abogados y secretaría— ofrece "Registrar cliente nuevo" y "Registrar calificación nueva", que para ellos quedarían deshabilitados. Parece un efecto del `soloAdmin` aplicado a todos los modales del prototipo. Si se confirma que debe abrirse, alcanza con cambiar el rol del `POST` | PO / cliente |
| C-02 | **Apellido y nombre separados** (observación de la Sprint Review del Sprint 1). El prototipo lo aplica en el listado y en la modificación de usuarios, pero no en el alta de usuario ni en abogados, que siguen con "Nombre y apellido". Este contrato solo lo aplica al cliente, que es nuevo; cambiar `/users` y `/lawyers` rompe el contrato del Sprint 1 y queda fuera del alcance. Conviene decidirlo antes de HU14 (Modificar Abogado, Sprint 3) | Equipo / PO |
| C-03 | **Confirmación de actos pendientes.** No hay pantalla ni endpoint para que el abogado confirme un acto `PENDING_CONFIRMATION`, así que ese acto no tiene salida en esta versión. Además, mientras está pendiente, **su plazo no se ve** en el listado ni en el detalle: un vencimiento cargado por la Secretaría podría pasar inadvertido, que es justamente el riesgo que el sistema viene a evitar. Por otro lado, la arquitectura (§7.6) exige que el cambio de estado lo haga el **responsable**, y el prototipo deja que lo haga cualquier abogado. Hay que definir el flujo, idealmente junto con HU27 (Sprint 3) | Equipo / cliente |
| C-04 | **¿Cómo llega una causa a "Archivada"?** Los estados terminales no pueden ser destino de un acto, y ninguna historia del Sprint 2 archiva una causa. "Prescripta" llega con HU33 (Sprint 3); para "Archivada" no hay historia | PO |
| C-05 | **Feriados y feria judicial** (P-02). El cómputo solo excluye sábados y domingos. El prototipo remite a "Administración → Estados y plazos" para cargarlos y trae datos de ejemplo (`FERIADOS`), pero no hay pantalla ni historia. También conviene confirmar qué pasa cuando un plazo en días corridos vence en un día inhábil | Cliente |
| C-06 | **Inicio del cómputo de la prescripción.** El prototipo la cuenta desde la fecha de inicio de la causa; en derecho penal suele correr desde la comisión del hecho. Si es así, falta un campo "fecha del hecho" en el alta. Confirmar también que no aplica a amparos, aunque el Plan de Proyecto hable de "prescripción de causa o amparo" | Cliente |
| C-07 | **Nota por estado procesal.** La tabla de "Estados y plazos" muestra notas como "El plazo no corre de oficio (RN6): arranca desde la notificación" o "Requiere agotada la vía administrativa", pero los formularios no permiten cargarlas. No se agregó el campo: definir si es texto editable (y va al recurso) o fijo del frontend | Equipo |
| C-08 | **Esquema de base de datos actual.** `ProceduralState.name` es `@unique` global en `schema.prisma`, pero el contrato (desde V2) y los datos del prototipo exigen unicidad **por fuero**: "Archivada" existe en los tres. Además `dayType` es anulable en el esquema y no en el contrato | Backend |
| C-09 | **Formato del SAC** (P-03). Se tomaron los 8 dígitos del prototipo; falta la confirmación del cliente | Cliente |
| C-10 | **Nombre del acto distinto del estado.** La línea de tiempo del prototipo muestra actos cuyo nombre no coincide con el estado al que llevan ("Cédula de notificación" → "Oposición al requerimiento de elevación"; "Clausura del sumario" → "Alegato"), pero el formulario de HU26 no pide ese nombre. Si HU23 o HU27 lo necesitan, conviene agregarlo ahora para no migrar actos ya cargados | Equipo / PO |
| C-11 | **`clientSince` automático.** Para los clientes que ya tiene el estudio, la fecha de alta en el sistema no es la fecha real en que empezaron a ser clientes. Evaluar si debe poder cargarse | PO |
| C-12 | **Validaciones de fechas** adoptadas sin fuente explícita: `startDate` y `actDate` no pueden ser futuras; `notificationDate` va entre la fecha del acto y hoy; el vencimiento manual no puede ser anterior a la fecha desde la que corre el plazo | Equipo |
| C-13 | **Otros datos del abogado.** La Sprint Review dejó pendiente consultar al cliente qué otros datos registrar. El recurso abogado no cambia en esta versión | Cliente |
| C-14 | **Lectura de `/users` para no administradores.** El prototipo muestra la sección en modo consulta a todos los perfiles, pero se mantuvo `ADMINISTRATOR` porque no es parte del sprint y expone correos y últimos accesos | PO |
| C-15 | **Datos de suscripción del cliente.** Los datos de ejemplo del prototipo traen "fuerza" (Policía de la Provincia, Servicio Penitenciario, FPA, ETAC) y "suscripción", coherentes con la línea de negocio del Estudio Inicial, pero no aparecen en el formulario ni en la tabla. No se incluyeron | PO / cliente |
| C-16 | **Pago de tasa.** El detalle de causa tiene "Registrar pago de tasa", RN10 lo exige y el Plan de Proyecto lo lista como requerimiento, pero no hay historia de usuario en el backlog | PO |
| C-17 | **Baja de abogado con reasignación.** El prototipo propone "Eliminar y reasignar", eligiendo a quién pasan las causas; V2 rechaza la baja con `409`. Revisar al planificar HU15 (Sprint 4), junto con el pendiente P-05 | Equipo |

### 8.3 Visto en el prototipo y fuera de alcance

Elementos que aparecen en las pantallas del Sprint 2 pero corresponden a otras
historias. No tienen endpoint ni campo en esta versión.

| Elemento del prototipo | Pantalla | HU | Sprint |
| --- | --- | --- | --- |
| "Crear la carpeta de la causa en Drive" y "Copiar los modelos de escritos del fuero" | Registrar causa | 39, 40 | 3 |
| "Adjuntar cédula o comprobante" | Registrar acto procesal | 39 | 3 |
| Ciclo de vida de la causa | Detalle de causa | 23, 27 | 4, 3 |
| "Modificar" y "Anular" un acto | Detalle de causa | 28, 29 | 4, 5 |
| Documentación de la causa | Detalle de causa | 38 | 4 |
| "Modificar causa" y "Dar de baja" | Detalle de causa | 19, 21 | 3 |
| "Registrar acto interruptivo" | Detalle de causa | 31 | 3 |
| "Marcar prescripta" | Detalle de causa | 33 | 3 |
| "Emitir carátula" y "Emitir expediente" | Detalle de causa | 24, 25 | 4 |
| "Registrar pago de tasa" | Detalle de causa | Sin HU ([C-16](#82-puntos-a-verificar)) | - |
| "Las causas dadas de baja se consultan con el filtro de estado" | Causas | 21 | 3 |
| Aviso "2 vencimientos hoy" y notificaciones | Encabezado | 30 | 3 |
| Tablero de inicio y pantalla Vencimientos | Inicio, Vencimientos | 30, 32, 41, 42 | 3 |
| "Modificar" y "Eliminar" cliente | Clientes | 10, 11 | 4 |
| Modelos formales | Modelos | 34 a 37 | 3, 5 |
| Reportes | Reportes | 43, 44 | 5 |
| Carga de días no hábiles | Estados y plazos | Sin HU ([C-05](#82-puntos-a-verificar)) | - |
| "Olvidé mi contraseña" | Login | Sin HU | - |

### 8.4 Impacto sobre lo ya implementado

- **Guards de lectura.** `GET /lawyers`, `GET /lawyers/{lawyerId}` y
  `GET /procedural-states` están implementados; hay que verificar que acepten
  cualquier usuario autenticado y no solo `ADMINISTRATOR`.
- **Estados procesales.** Hoy solo existe `GET /procedural-states`; faltan
  `GET` por identificador, `POST`, `PATCH` y `DELETE` (HU17, HU45, HU46), con
  la unicidad por fuero de C-08.
- **`activeCases`.** Los endpoints de abogados y estados procesales deben
  dejar de devolver `0` cuando exista el módulo de causas.
- **Esquema.** Nuevas tablas para clientes, calificaciones legales, causas, la
  relación causa–calificación y actos procesales.
- **Glosario.** Incorporar a `TRADUCCION_DOMINIO.md` los nombres de D-24.
