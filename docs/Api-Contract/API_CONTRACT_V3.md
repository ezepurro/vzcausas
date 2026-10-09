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

**Última revisión: 09/10/2026**: los códigos de `ProceduralRole` pasan a
castellano. El detalle está en la
[sección 7.9](#79-revisión-de-v3-del-09102026).

**Revisión anterior: 05/10/2026**, por decisiones del equipo: solo el abogado
responsable registra actos, los estados procesales dejan de tener posición, la
causa nace en el estado inicial "Iniciada", el vencimiento pasa a
`currentState` y varios datos de la causa pasan a ser opcionales. El detalle
está en la [sección 7.8](#78-revisión-de-v3-del-05102026).

**Revisión anterior: 01/10/2026**, por la actualización del prototipo. Cambia
cómo nace una causa (sin estado procesal), cómo se computa la prescripción
(desde la fecha del hecho de cada calificación) y el filtro de estado del
listado. El detalle está en la
[sección 7.7](#77-revisión-de-v3-del-01102026).

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
| `POST`   | `/clients`                                            |      Sí       | `SECRETARY`                   | Registrar cliente                        | Nuevo      |
| `GET`    | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Consultar clientes                       | Nuevo      |
| `GET`    | `/clients/{clientId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar cliente                        | Nuevo      |
| `POST`   | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Registrar causa                          | Nuevo      |
| `GET`    | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Consultar causas                         | Nuevo      |
| `GET`    | `/cases/custom-states`                                |      Sí       | Cualquier usuario autenticado | Consultar estados escritos a mano        | Nuevo      |
| `GET`    | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Consultar detalle de causa               | Nuevo      |
| `POST`   | `/cases/{caseId}/procedural-acts`                     |      Sí       | Abogado responsable de la causa | Registrar acto procesal                  | Nuevo      |
| `GET`    | `/cases/{caseId}/procedural-acts/deadline-preview`    |      Sí       | Abogado responsable de la causa | Previsualizar el vencimiento de un acto  | Nuevo      |

La columna **Rol** se deriva de la tabla de
[permisos por perfil](#permisos-por-perfil) de la sección 4.

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

Los códigos van en castellano, igual que el vocabulario del estudio (D-37).

| Código                   | Rótulo                 | Fueros en que aplica           |
| ------------------------ | ---------------------- | ------------------------------ |
| `DEFENSA`                | Defensa                | `CRIMINAL`, `ADMINISTRATIVE`   |
| `QUERELLANTE_PARTICULAR` | Querellante particular | `CRIMINAL`                     |
| `RECURRENTE`             | Recurrente             | `ADMINISTRATIVE`               |
| `ACTORA`                 | Actora                 | `AMPARO`                       |
| `DEMANDADA`              | Demandada              | `AMPARO`                       |

No confundir con `Role`, que es el perfil de seguridad del usuario.

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

La lectura se abre porque la consulta de estados y plazos (HU16) corresponde a
los tres perfiles, y el registro de un acto procesal (HU26) necesita los
estados del fuero y sus plazos. La escritura (HU17, HU45 y HU46) queda en
`ADMINISTRATOR`, según la tabla de [permisos por perfil](#permisos-por-perfil)
(ver [D-04](#81-decisiones-tomadas)).

El recurso estado procesal posee la siguiente estructura:

| Campo           | Tipo           | Nulo | Descripción                                                                  |
| --------------- | -------------- | :--: | ---------------------------------------------------------------------------- |
| `id`            | Integer        |  No  | Identificador único                                                          |
| `name`          | String         |  No  | Denominación del estado, en castellano. Texto libre. Única dentro del fuero  |
| `jurisdiction`  | `Jurisdiction` |  No  | Fuero al que pertenece                                                       |
| `timeLimitDays` | Integer        |  No  | Días que abre el estado. `0` indica que no abre plazo                        |
| `dayType`       | `DayType`      |  No  | Forma de cómputo de los días                                                 |
| `terminal`      | Boolean        |  No  | Indica si el estado cierra el ciclo de vida de la causa                      |
| `activeCases`   | Integer        |  No  | Causas activas que se encuentran en este estado. Calculado, sólo lectura. Solo en las respuestas de `GET` |
| `active`        | Boolean        |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /procedural-states/{stateId}` |

**Sobre `name`:** RN4 establece que los estados procesales dependen del fuero y
son parametrizables, es decir que los da de alta el estudio. Por ese motivo la
denominación es texto libre en castellano —"Designación de abogado defensor",
"Oposición al requerimiento de elevación"— y no un valor de un conjunto
cerrado. La unicidad es **por fuero**: "Archivada" existe en los tres.

**Sobre el orden:** los estados procesales no tienen posición ni orden dentro
del fuero: se listan en el orden en que se registraron. Una causa nueva no
entra a ningún estado de la tabla: nace en el estado inicial, y su primer acto
puede llevarla a cualquier estado no terminal del fuero (ver
[`POST /cases`](#post-cases)).

**Estado inicial.** Cada fuero tiene además un estado de sistema, **"Iniciada"**,
en el que nace toda causa. No forma parte de este recurso: no aparece en los
listados, `GET /procedural-states/{stateId}` responde `404` con su
identificador, no se modifica ni se da de baja y no puede elegirse como destino
de un acto. Su denominación está reservada: registrar en un fuero un estado
llamado "Iniciada" responde `409 PROCEDURAL_STATE_ALREADY_EXISTS`.

**Sobre `activeCases`:** a partir de esta versión se calcula según la
definición de [causa activa](#causa-activa). En la tabla del prototipo es la
columna "Causas". Es un dato de consulta: se devuelve **solo en las respuestas
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

**Rol requerido:** `ADMINISTRATOR`.

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
			"activeCases": 7,
			"active": true
		},
		{
			"id": 7,
			"name": "Archivada",
			"jurisdiction": "ADMINISTRATIVE",
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

El campo `activeCases` no es modificable y no se incluye en esta respuesta:
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

---

#### `DELETE /procedural-states/{stateId}`

Da de baja un estado procesal (HU46).

**Rol requerido:** `ADMINISTRATOR`.

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
Una causa penal puede registrar una o más, o ninguna (es opcional); si
concurren varios delitos, registra una por cada uno, y cada una computa su propia prescripción desde la fecha del
hecho que se carga junto con ella (ver [`/cases`](#37-causas-cases)).

La lectura se abre porque el alta de causa, que opera cualquier perfil, ofrece
el selector de calificaciones. La escritura queda en `ADMINISTRATOR`, tal como
la restringe el prototipo, tanto desde la pantalla de Administración como desde
el botón "Registrar calificación nueva" del alta de causa. La tabla de
[permisos por perfil](#permisos-por-perfil) no la menciona; se le aplica el
mismo criterio que a los estados procesales.

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
		"code": "LEGAL_QUALIFICATION_NOT_FOUND",
		"message": "No se encontró la calificación legal solicitada.",
		"details": null
	}
}
```

---

### 3.6 Clientes: /clients

**Autenticación requerida:** Sí.
**Rol requerido:** la lectura (`GET`) está habilitada para cualquier usuario
autenticado; el alta (`POST`) requiere `SECRETARY`.

Según la tabla de [permisos por perfil](#permisos-por-perfil), la
administración de clientes (HU8 a HU11) corresponde solo a la Secretaría; la
consulta (HU9), a los tres perfiles. El botón "Registrar cliente nuevo" del
alta de causa queda, por lo tanto, habilitado solo para la Secretaría.

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

**Rol requerido:** `SECRETARY`.

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

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol SECRETARY para realizar esta operación.",
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
**Rol requerido:** cualquier usuario autenticado, tanto para la lectura como
para el alta.

RN11 establece que todo el estudio accede a todas las causas, y el prototipo
habilita "Nueva causa" a los tres perfiles. La modificación y la baja de causas
(HU19 y HU21) corresponden al Sprint 3 y no forman parte de esta versión.

El recurso causa posee la siguiente estructura:

| Campo                  | Tipo                          | Nulo | Descripción                                                                                   |
| ---------------------- | ----------------------------- | :--: | --------------------------------------------------------------------------------------------- |
| `id`                   | Integer                       |  No  | Identificador único interno                                                                   |
| `sacNumber`            | String \| `null`              |  Sí  | Número de SAC: 8 dígitos. Opcional. Si se informa, es único en todo el sistema (RN2)          |
| `caption`              | String                        |  No  | Carátula                                                                                      |
| `court`                | String \| `null`              |  Sí  | Tribunal o dependencia                                                                        |
| `jurisdiction`         | `Jurisdiction`                |  No  | Fuero. Define el ciclo de vida y la tabla de plazos aplicable                                 |
| `proceduralRole`       | `ProceduralRole`              |  No  | Rol procesal del cliente                                                                      |
| `instructorName`       | String \| `null`              |  Sí  | Instructor de la causa: quien lleva la instrucción en el tribunal o la dependencia            |
| `tribunalPhone`      | String \| `null`              |  Sí  | Teléfono del instructor. Texto libre: `0351 448-1200`                                          |
| `instructorExtension`  | String \| `null`              |  Sí  | Número de interno del instructor. Texto libre: `214`                                           |
| `counterparty`         | String \| `null`              |  Sí  | Contraparte u organismo. Solo en `ADMINISTRATIVE` y `AMPARO`; en `CRIMINAL` vale `null`       |
| `subjectMatter`        | String \| `null`              |  Sí  | Objeto del reclamo (`ADMINISTRATIVE`) u objeto del amparo (`AMPARO`): el motivo por el que se inicia la causa, redactado por el abogado. En `CRIMINAL` vale `null` |
| `client`               | Object                        |  No  | Cliente de la causa. Ver estructura más abajo                                                 |
| `responsibleLawyer`    | Object                        |  No  | Abogado responsable (RN3): `id`, `fullName`, `registrationNumber`                             |
| `legalQualifications`  | Object[]                      |  No  | Calificaciones legales, cada una con su fecha del hecho y su prescripción. Opcional en `CRIMINAL`; vacío en los demás |
| `startDate`            | String (fecha ISO 8601)       |  No  | Fecha de inicio de la causa. No interviene en el cómputo de la prescripción                   |
| `currentState`         | Object                        |  No  | Estado procesal actual, con el vencimiento del acto que llevó la causa a él. Ver estructura más abajo |
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
| `offenseDate`           | String (fecha ISO 8601) | Fecha del hecho imputado bajo esta calificación. La carga el usuario |
| `prescriptionStartsOn`  | String (fecha ISO 8601) | Fecha desde la que se computa la prescripción de esta calificación. Calculado |
| `prescriptionExpiresOn` | String (fecha ISO 8601) | `prescriptionStartsOn` más `prescriptionMonths`. Calculado           |

Una calificación dada de baja **sigue apareciendo** en las causas que la
registran (ver [`DELETE /legal-qualifications`](#delete-legal-qualificationsqualificationid)).

Una causa penal puede registrarse sin calificaciones legales: en ese caso
`legalQualifications` llega vacío y la causa no computa prescripción hasta que
se le cargue una.

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
| `proceduralActId`       | Integer \| `null`               | Acto procesal que llevó la causa a este estado. `null` en el estado inicial   |
| `dueDate`               | String (fecha ISO 8601) \| `null` | Vencimiento vigente del plazo que abrió ese acto. `null` si no abrió plazo o si es el estado inicial |
| `businessDaysRemaining` | Integer \| `null`               | Días hábiles desde hoy hasta `dueDate`. `0` vence hoy; negativo, ya vencido. `null` si `dueDate` es `null` |
| `manuallyAdjusted`      | Boolean                         | `true` si el vencimiento se ajustó a mano al registrar el acto                |

Con `businessDaysRemaining` el cliente arma los rótulos del prototipo: "Vencido
hace 2 días", "Vence hoy", "En 3 días hábiles". Se calcula en cada respuesta,
contra la fecha del día en Córdoba (ver [§4](#cómputo-de-días)).

Un plazo vencido **sigue abierto** —y la causa lo sigue mostrando— hasta que un
acto procesal posterior la lleve a otro estado. Una causa sin vencimiento
(`currentState.dueDate` en `null`) es una de las "causas para impulsar" del
prototipo.

**Sobre la prescripción:** solo se computa en el fuero `CRIMINAL`; en los demás
el prototipo informa "No aplica al fuero". **Cada calificación computa la suya
desde la fecha del hecho** (`offenseDate`), que se carga al registrar la causa:
`prescriptionExpiresOn` es `prescriptionStartsOn` más `prescriptionMonths`. La
fecha de inicio de la causa (`startDate`) no interviene.

En esta versión `prescriptionStartsOn` es igual a `offenseDate`. Cuando el
Sprint 3 incorpore los actos interruptivos (HU31), pasará a ser la fecha del
último acto interruptivo, sin cambiar la estructura del recurso; `offenseDate`
seguirá siendo el dato cargado.

Si la causa registra varias calificaciones, la barra del detalle muestra **la
que prescribe primero** —la de menor `prescriptionExpiresOn`—, con la nota
"Calificación que prescribe primero: …". Esa elección, el porcentaje
transcurrido y el "Restan 5 años 9 meses" los calcula el cliente con
`prescriptionStartsOn` y `prescriptionExpiresOn` de cada calificación.

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
	"tribunalPhone": "0351 448-1200",
	"instructorExtension": "214",
	"clientId": 1,
	"proceduralRole": "DEFENSA",
	"legalQualifications": [
		{
			"legalQualificationId": 1,
			"offenseDate": "2021-02-27"
		}
	],
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
	"tribunalPhone": "0351 448-1600",
	"instructorExtension": "517",
	"clientId": 6,
	"proceduralRole": "ACTORA",
	"counterparty": "APROSS",
	"subjectMatter": "Que se ordene a APROSS la cobertura integral del tratamiento de rehabilitación prescripto a la actora.",
	"responsibleLawyerId": 1,
	"startDate": "2026-09-08"
}
```

| Campo                   | Tipo             | Requerido   | Restricciones                                                                                     |
| ----------------------- | ---------------- | :---------: | ------------------------------------------------------------------------------------------------- |
| `sacNumber`             | String           |     No      | Exactamente 8 dígitos. Si se envía, único en todo el sistema                                      |
| `jurisdiction`          | `Jurisdiction`   |     Sí      | Fuero válido                                                                                      |
| `caption`               | String           |     Sí      | Hasta 255 caracteres                                                                              |
| `court`                 | String           |     No      | Hasta 255 caracteres                                                                              |
| `instructorName`        | String           |     No      | Hasta 150 caracteres                                                                              |
| `tribunalPhone`       | String           |     No      | Hasta 50 caracteres                                                                               |
| `instructorExtension`   | String           |     No      | Número de interno. Hasta 20 caracteres                                                            |
| `clientId`              | Integer          |     Sí      | Cliente vigente                                                                                   |
| `proceduralRole`        | `ProceduralRole` |     Sí      | Debe corresponder al fuero (ver [`ProceduralRole`](#proceduralrole-nuevo))                        |
| `legalQualifications`   | Object[]         |     No      | Opcional en `CRIMINAL`; si se envía, sin calificaciones repetidas. No se envía en los demás fueros. Ver estructura más abajo |
| `counterparty`          | String           |     No      | Hasta 255 caracteres. Solo en `ADMINISTRATIVE` y `AMPARO`; no se envía en `CRIMINAL`              |
| `subjectMatter`         | String           | Condicional | Obligatorio en `ADMINISTRATIVE` y `AMPARO`, no vacío, hasta 800 caracteres. No se envía en `CRIMINAL` |
| `responsibleLawyerId`   | Integer          |     Sí      | Abogado vigente (RN3)                                                                             |
| `startDate`             | String (fecha)   |     No      | Por defecto, la fecha del día. No puede ser posterior a hoy                                       |

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
		"proceduralRole": "DEFENSA",
		"instructorName": "Dra. Verónica Ledesma",
		"tribunalPhone": "0351 448-1200",
		"instructorExtension": "214",
		"counterparty": null,
		"subjectMatter": null,
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
				"offenseDate": "2021-02-27",
				"prescriptionStartsOn": "2021-02-27",
				"prescriptionExpiresOn": "2029-02-27"
			}
		],
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
por `currentState.dueDate` ascendente (las vencidas quedan primeras), y luego
las que no tienen vencimiento, por `id`.

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
| `openDeadline`        | Boolean |    No     | -                 | -                               | `true`: solo causas con vencimiento (`currentState.dueDate` no nulo), incluidas las vencidas. Botón "Solo con plazo por vencer" |

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
					"offenseDate": "2021-02-27",
					"prescriptionStartsOn": "2021-02-27",
					"prescriptionExpiresOn": "2029-02-27"
				}
			],
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

Devuelve el mismo recurso que el listado. En esta versión el detalle cubre el
encabezado de la causa, la barra de prescripción y la tarjeta del cliente. El
ciclo de vida, la documentación y las acciones "Sobre la causa" que muestra el
prototipo pertenecen a historias de sprints posteriores (ver
[§8.3](#83-visto-en-el-prototipo-y-fuera-de-alcance)).

El prototipo lleva al detalle después de registrar una causa y después de
registrar un acto. En una causa recién registrada `currentState` es el estado
inicial ("Iniciada"): el encabezado lo muestra y ofrece registrar el primer
acto. Después de registrar un acto, el detalle refleja el estado y el
vencimiento nuevos en `currentState`; el listado de los actos (HU27) llega en
el Sprint 3.

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
				"offenseDate": "2021-02-27",
				"prescriptionStartsOn": "2021-02-27",
				"prescriptionExpiresOn": "2029-02-27"
			}
		],
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
		"active": true
	}
}
```

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

### 3.8 Actos procesales: /cases/{caseId}/procedural-acts

**Autenticación requerida:** Sí.
**Rol requerido:** abogado responsable de la causa, para el registro y su
previsualización. La consulta de actos (HU27, sprints posteriores) será para
los tres perfiles.

El acto procesal es lo que **mueve la causa**: al registrarlo se elige el
estado procesal al que pasa, y el plazo sale de la tabla del fuero (RN5). El
**primer acto** es además el que saca a la causa del estado inicial: hasta
entonces la causa está en "Iniciada". Solo el **abogado responsable de la
causa** registra sus actos —ningún otro usuario, ni siquiera un
`ADMINISTRATOR`— (ver [permisos por perfil](#permisos-por-perfil)), y el acto
se aplica a la causa en el momento: no hay confirmación posterior. La
consulta, la modificación y la anulación de actos (HU27, HU28 y HU29)
corresponden a sprints posteriores; esta versión solo incorpora el registro
(HU26) y su previsualización.

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
| `registeredBy`     | Object                        |  No  | Usuario (abogado) que registró el acto: `id` y `fullName`                           |
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

- El acto se aplica al registrarse: la causa pasa al estado del acto
  (`currentState`), y su vencimiento pasa a ser el que abre el acto
  (`currentState.dueDate`). Si el acto no abre plazo, la causa queda sin
  vencimiento (`dueDate` en `null`).
- **Primer acto.** En una causa en el estado inicial, el acto la hace entrar al
  ciclo de vida del fuero: `currentState.initial` pasa a `false`. El primer
  acto no tiene restricciones propias: puede llevar la causa a cualquier estado
  no terminal del fuero o a un estado escrito a mano.
- La causa toma el estado del acto **con la fecha de acto más reciente**. Si se carga un acto con fecha anterior al último registrado —por
  ejemplo, al completar la historia de una causa vieja—, el acto queda
  asentado pero no retrocede el estado actual ni reemplaza el vencimiento vigente.

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
		"registeredBy": {
			"id": 3,
			"fullName": "Malena Ríos"
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
			"fullName": "Fernando G. Vázquez"
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
			"proceduralStateId": "El estado procesal no pertenece al fuero de la causa o es terminal."
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

Un endpoint indicado con un rol (`ADMINISTRATOR`, `LAWYER` o `SECRETARY`)
requiere que el usuario autenticado lo posea. Un usuario con varios roles
satisface el requisito si el rol exigido se encuentra entre ellos: por ejemplo,
un usuario `ADMINISTRATOR` y `SECRETARY` puede administrar usuarios y registrar
clientes. Si no lo posee, la respuesta es `403 FORBIDDEN`.

Los **actos procesales** son la excepción: no alcanza con un rol. Solo los
registra el abogado responsable de la causa, comparando el `lawyerId` del
usuario con el responsable de la causa (ver [§3.8](#38-actos-procesales-casescaseidprocedural-acts)).

#### Permisos por perfil

Tabla de permisos acordada por el equipo. Es la fuente de los roles de cada
endpoint; cubre también funcionalidades de sprints posteriores, para que los
contratos siguientes la respeten.

| Funcionalidad                                                                     | HU       | Admin. | Abogado | Secret. |
| --------------------------------------------------------------------------------- | -------- | :----: | :-----: | :-----: |
| Iniciar y cerrar sesión, cambiar contraseña                                       | 1 – 3    |   ✓    |    ✓    |    ✓    |
| Administrar usuarios                                                              | 4 – 7    |   ✓    |    —    |    —    |
| Administrar clientes                                                              | 8 – 11   |   —    |    —    |    ✓    |
| Administrar abogados                                                              | 12 – 15  |   ✓    |    —    |    —    |
| Consultar estados procesales y plazos                                             | 16       |   ✓    |    ✓    |    ✓    |
| Modificar estados procesales                                                      | 17       |   ✓    |    —    |    —    |
| Consultar clientes                                                                | 9        |   ✓    |    ✓    |    ✓    |
| Consultar causas                                                                  | 20       |   ✓    |    ✓    |    ✓    |
| Gestionar causas (alta, consulta, detalle, línea de tiempo, carátula, expediente, baja) | 18 – 25 | ✓ |    ✓    |    ✓    |
| Consultar actos procesales                                                        | 27       |   ✓    |    ✓    |    ✓    |
| Registrar, modificar y dar de baja actos procesales                               | 26, 28, 29 |  —   |    ✓    |    —    |
| Registrar actos interruptivos                                                     | 31       |   —    |    ✓    |    —    |
| Recibir avisos de vencimiento y alertas de prescripción                           | 30 – 33  |   —    |    ✓    |    —    |
| Administrar modelos formales                                                      | 34 – 37  |   ✓    |    —    |    —    |
| Consultar documentos de causa                                                     | 38       |   ✓    |    ✓    |    ✓    |
| Crear carpeta y modelos en la nube                                                | 39 – 40  |   —    |    —    |    ✓    |
| Tablero del abogado                                                               | 41       |   —    |    ✓    |    —    |
| Tablero del administrador y reportes                                              | 42 – 44  |   ✓    |    —    |    —    |
| Registrar y dar de baja estados procesales                                        | 45, 46   |   ✓    |    —    |    —    |

La tabla no menciona las calificaciones legales, que no tienen HU: siguen el
mismo criterio que los estados procesales (lectura para todos, escritura para
`ADMINISTRATOR`). La **consulta** de abogados se mantiene abierta a los tres
perfiles porque el alta de causa, que opera cualquiera de ellos, necesita el
listado para elegir al responsable; la **administración** (alta, modificación
y baja) es solo del Administrador, como indica la tabla.

**Actos procesales.** La fila "Registrar, modificar y dar de baja actos
procesales" se restringe además a cada causa: solo el abogado responsable opera
sus actos. Ningún otro abogado ni el `ADMINISTRATOR` puede hacerlo.

#### Matriz por recurso

| Recurso                            | Lectura (`GET`)               | Escritura                                                        |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `/auth`                            | -                             | Cualquier usuario autenticado (`logout`, `password`)             |
| `/users`                           | `ADMINISTRATOR`               | `ADMINISTRATOR`                                                  |
| `/lawyers`                         | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/procedural-states`               | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/legal-qualifications`            | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/clients`                         | Cualquier usuario autenticado | `SECRETARY`                                                      |
| `/cases`                           | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/cases/{caseId}/procedural-acts`  | Abogado responsable de la causa (`deadline-preview`) | Abogado responsable de la causa             |

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
| `message` | Descripción legible del error, **en castellano** |
| `details` | Objeto `campo → mensaje` en los errores de validación; `null` en el resto                |

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
| `GET /procedural-states`, `GET /procedural-states/{stateId}` | `ADMINISTRATOR` | Cualquier usuario autenticado | HU16 (consultar estados y plazos) es de los tres perfiles, y el registro de actos necesita los estados del fuero |
| `POST /clients` | - | `SECRETARY` | Tabla de [permisos por perfil](#permisos-por-perfil): administrar clientes es solo de la Secretaría |
| `POST /cases/{caseId}/procedural-acts` y `deadline-preview` | - | Abogado responsable de la causa | Solo el abogado responsable registra actos procesales ([§7.8](#78-revisión-de-v3-del-05102026)) |
| `DELETE /procedural-states/{stateId}` | `409` si el estado tenía causas | La baja procede; las causas conservan el estado | Nota del prototipo al eliminar un estado en uso |
| `POST /procedural-states` | `position` mayor o igual a `1` | Sin `position`: retirado en la [revisión del 05/10/2026](#78-revisión-de-v3-del-05102026) | Los estados no tienen orden |
| `activeCases` en `/lawyers` y `/procedural-states` | Valía `0` fijo | Calculado | El módulo de causas existe desde esta versión |

### 7.3 Enumerados incorporados

| Enumerado | Motivo |
| --- | --- |
| `ProceduralRole` | Rol procesal del cliente, con los valores por fuero que ofrece el prototipo |

### 7.4 Códigos de error

**Incorporados:** `LEGAL_QUALIFICATION_NOT_FOUND`, `CLIENT_NOT_FOUND`,
`CASE_NOT_FOUND`, `LEGAL_QUALIFICATION_ALREADY_EXISTS`,
`CLIENT_DNI_ALREADY_EXISTS`, `CASE_SAC_ALREADY_EXISTS` y
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

### 7.7 Revisión de V3 del 01/10/2026

Cambios sobre el propio V3, por la actualización del prototipo. Afectan solo a
causas y actos procesales; el resto del documento no cambió.

| Qué | Antes | Ahora | Decisión |
| --- | --- | --- | --- |
| Estado de una causa nueva | Nacía en el estado de posición `1` del fuero | Nace sin estado: `currentState` es anulable y vale `null` hasta el primer acto ("Sin acto procesal") | D-09 |
| `422 JURISDICTION_WITHOUT_PROCEDURAL_STATES` | Rechazaba el alta en un fuero sin estados | **Retirado.** El alta ya no depende de la tabla de estados | D-09 |
| Filtro de estado de `GET /cases` | `proceduralStateId` o `customState` | Se suma `withoutProceduralActs`, excluyente con los otros dos | D-29 |
| Calificaciones en `POST /cases` | `legalQualificationIds: Integer[]` | `legalQualifications: [{ legalQualificationId, offenseDate }]`, con la fecha del hecho obligatoria | D-19, D-28 |
| `legalQualifications[]` de la causa | `id`, `name`, `prescriptionMonths`, `prescriptionExpiresOn` | Se suman `offenseDate` y `prescriptionStartsOn` | D-19 |
| `prescriptionStartsOn` de la causa | Campo de la causa, igual a `startDate` | **Eliminado** de la causa: pasa a cada calificación y es igual a su `offenseDate` | D-19 |
| `subjectMatter` | Hasta 2000 caracteres | Hasta 800 caracteres. Sigue obligatorio en `ADMINISTRATIVE` y `AMPARO` | D-27 |

### 7.8 Revisión de V3 del 05/10/2026

Cambios acordados por el equipo sobre el propio V3. Afectan a estados
procesales, calificaciones legales, causas y actos procesales.

| Qué | Antes | Ahora | Decisión |
| --- | --- | --- | --- |
| Quién registra actos procesales | Cualquier usuario con rol `LAWYER` | Solo el abogado responsable de la causa. Ningún otro usuario, ni siquiera `ADMINISTRATOR` | D-30 |
| `position` de los estados procesales | Posición única dentro del fuero, con renumeración | **Retirado.** Los estados no tienen orden; se listan en el orden en que se registraron | D-31 |
| `activeCases` de estados procesales y calificaciones legales | En todas las respuestas | Solo en las respuestas de `GET`; no aparece en `POST` ni en `PATCH` | D-32 |
| `sacNumber` | Obligatorio | Opcional; si se envía, único | D-33 |
| `legalQualifications` en causas penales | Obligatorio, al menos una | Opcional | D-33 |
| `tribunalPhone` | Teléfono e interno en un único texto | Solo el teléfono; el interno pasa a `instructorExtension`, opcional | D-33 |
| Estado de una causa nueva | `currentState` en `null` ("Sin acto procesal") | Estado inicial "Iniciada": un estado de sistema por fuero, que no aparece en la línea de tiempo. `currentState` deja de ser anulable y suma `initial` | D-34 |
| Filtro `withoutProceduralActs` | Causas con `currentState` en `null` | Causas en el estado inicial | D-34 |
| `nextDeadline` | Objeto aparte en la causa | **Retirado.** El vencimiento pasa a `currentState`: `proceduralActId`, `dueDate`, `businessDaysRemaining` y `manuallyAdjusted` | D-35 |
| Orden de `GET /cases` | Por `nextDeadline.dueDate`, luego `sacNumber` | Por `currentState.dueDate`, luego `id` | D-35 |
| `jurisdiction` en `PATCH /procedural-states/{stateId}` | Modificable si ninguna causa registra el estado (`422 PROCEDURAL_STATE_IN_USE`) | **No modificable**, como en V2: `400 VALIDATION_ERROR`. Se retira `PROCEDURAL_STATE_IN_USE` | D-36 |

### 7.9 Revisión de V3 del 09/10/2026

Cambio acordado por el equipo sobre el propio V3. Afecta a causas: al campo
`proceduralRole` del cuerpo de `POST /cases` y de toda respuesta que devuelve
una causa.

| Qué | Antes | Ahora | Decisión |
| --- | --- | --- | --- |
| Códigos de `ProceduralRole` | En inglés: `DEFENSE`, `PRIVATE_PROSECUTOR`, `APPELLANT`, `PLAINTIFF`, `DEFENDANT` | En castellano: `DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA`, `DEMANDADA`. Los rótulos y los fueros en que aplica cada uno no cambian | D-37 |

El teléfono del tribunal y el número de interno siguen como quedaron en la
revisión del 05/10/2026 (D-33): viajan en dos campos separados y opcionales,
`tribunalPhone` e `instructorExtension`.

---

## 8. Observaciones

Decisiones tomadas al redactar este contrato y puntos que conviene verificar
antes o durante la implementación.

### 8.1 Decisiones tomadas

| ID | Decisión | Fundamento |
| --- | --- | --- |
| D-01 | El alcance es HU 8, 9, 13, 17, 18, 20, 22, 26, 45 y 46, más el ABMC de calificaciones legales | Story Map actualizado del Seguimiento v1.1 (§4.1.2). La tabla del PDF es difícil de leer por la maquetación, así que la asignación se verificó sumando los puntos: esas diez historias suman exactamente los 112 SP declarados para el Sprint 2 |
| D-02 | V3 es autocontenido y V2 queda sin modificar | Mismo criterio que V2 respecto de V1. `/auth` y `/users` se copian de V2 sin cambios. `PATCH` y `DELETE /lawyers` (HU14 y HU15, sprints 3 y 4) se mantienen porque ya figuraban en V2: quitarlos sería un cambio que nadie pidió |
| D-03 | La lectura de `/lawyers`, `/procedural-states`, `/legal-qualifications`, `/clients` y `/cases` se abre a cualquier usuario autenticado | RN11; el banner del prototipo ("El perfil determina qué se puede operar, no qué se puede ver"); y los formularios de alta de causa y de acto necesitan esos listados. `/users` sigue en `ADMINISTRATOR` ([C-14](#82-puntos-a-verificar)) |
| D-04 | La escritura de estados procesales y calificaciones legales requiere `ADMINISTRATOR` | El prototipo deshabilita esas acciones para los demás perfiles, aunque HU17, HU45 y HU46 digan "Como abogado". Manda el prototipo |
| D-05 | El alta de cliente requiere `SECRETARY` | Tabla de [permisos por perfil](#permisos-por-perfil): administrar clientes (HU8 a HU11) es solo de la Secretaría. Reemplaza el criterio del prototipo, que lo restringía al Administrador |
| D-06 | La baja de un estado procesal procede aunque haya causas en él, y se retira `PROCEDURAL_STATE_HAS_DEPENDENCIES` | Nota del prototipo: las causas "conservan el estado que ya tienen registrado". Lo mismo para la baja de calificaciones legales |
| D-07 | ~~`PATCH /procedural-states` admite `jurisdiction`, solo si ninguna causa registra el estado~~. **Revertida por D-36** | El prototipo muestra el selector de fuero al modificar. La restricción evita que causas de un fuero apunten a un estado de otro |
| D-08 | Cambiar el plazo de un estado **no** recalcula vencimientos; cambiar la prescripción de una calificación **sí** recalcula la de sus causas | Las dos notas del prototipo dicen exactamente eso. Por eso el acto copia los valores del plazo y la causa calcula la prescripción en cada lectura |
| D-09 | **Reemplazada por D-34.** Toda causa nacía **sin estado procesal** (`currentState` en `null`, "Sin acto procesal") y sin plazo abierto; el estado lo fija el primer acto. El alta no es un movimiento del ciclo de vida, y se retira `JURISDICTION_WITHOUT_PROCEDURAL_STATES` | Prototipo actualizado: "El estado lo fija el primer acto procesal" en el resumen del alta, y "Todavía no hay actos procesales" en el detalle. El prototipo lo define como un estado de sistema que no pertenece al ciclo parametrizado de ningún fuero; por eso se modela como ausencia de estado y no como un registro de la tabla. Reemplaza al criterio anterior, que derivaba el estado de posición `1` |
| D-10 | El acto procesal se registra como estado resultante, fechas y observaciones, sin un "nombre de acto" aparte | El formulario de HU26 solo pide el estado ("El acto procesal es el que mueve la causa: elegí el estado al que la lleva") ([C-10](#82-puntos-a-verificar)) |
| D-11 | El "estado escrito a mano" se modela como `customState`, sin plazo salvo ajuste manual, con su endpoint de valores distintos para el filtro | Es la descripción libre que pide HU22. El prototipo lo muestra en el combo del acto y en el filtro del listado |
| D-12 | En `ADMINISTRATIVE`, `notificationDate` es obligatoria si el estado abre plazo | RN6. El prototipo no habilita "Registrar acto" sin esa fecha, lo que resuelve el pendiente P-04 de la arquitectura: el acto no existe sin vencimiento calculable |
| D-13 | **Reemplazada en parte por D-30.** Solo el rol `LAWYER` registra actos procesales, y el acto se aplica a la causa al registrarse, sin confirmación posterior. No existe un estado del acto | Tabla de [permisos por perfil](#permisos-por-perfil). Reemplaza el flujo de "pendiente de confirmación" del prototipo (RN13), que dejaba cargar actos a la Secretaría |
| D-14 | El estado actual de la causa es el del acto con la fecha de acto más reciente | Permite cargar actos viejos sin retroceder la causa |
| D-15 | Los estados terminales no pueden ser destino de un acto | El combo del prototipo los excluye ([C-04](#82-puntos-a-verificar)) |
| D-16 | El número de SAC tiene exactamente 8 dígitos y es único en todo el sistema. **Modificada por D-33:** es opcional | Validación del prototipo ("El SAC tiene 8 dígitos"). Resuelve provisoriamente el pendiente P-03 ([C-09](#82-puntos-a-verificar)) |
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
| D-33 | `sacNumber`, `legalQualifications` (en `CRIMINAL`), `instructorName` e `instructorExtension` son opcionales. El interno del instructor se separa del teléfono en `instructorExtension` | Decisión del equipo (05/10/2026). RN2 queda condicionada: el SAC identifica la causa cuando se conoce ([C-20](#82-puntos-a-verificar)) |
| D-34 | Toda causa nace en el **estado inicial "Iniciada"**, un estado de sistema por fuero: no forma parte de `/procedural-states`, no se modifica ni se da de baja, no es destino de un acto y no se muestra en la línea de tiempo. `currentState` deja de ser anulable y suma `initial` | Decisión del equipo (05/10/2026). Reemplaza a D-09. El nombre es neutral para los tres fueros y describe un estado, no una ausencia |
| D-35 | Se retira `nextDeadline`: el vencimiento es parte del estado actual y viaja en `currentState` | Decisión del equipo (05/10/2026): el vencimiento lo abre el acto que llevó la causa a su estado actual |
| D-36 | El fuero de un estado procesal no es modificable: `PATCH /procedural-states/{stateId}` rechaza `jurisdiction` con `400 VALIDATION_ERROR`, y se retira `PROCEDURAL_STATE_IN_USE`. Revierte D-07 | Decisión del equipo. Un estado figura en la historia de las causas aunque ninguna esté hoy en él, así que el traslado casi nunca procedía y la pantalla no podía anticiparlo. Para trasladarlo: baja y alta en el otro fuero, como en V2 |
| D-37 | Los códigos de `ProceduralRole` van en castellano: `DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA` y `DEMANDADA`. Reemplazan a `DEFENSE`, `PRIVATE_PROSECUTOR`, `APPELLANT`, `PLAINTIFF` y `DEFENDANT` | Decisión del equipo (09/10/2026): son los valores que ya usan el backend y la base de datos |

### 8.2 Puntos a verificar

| ID | Punto | Con quién |
| --- | --- | --- |
| C-01 | ~~Alta de cliente solo para `ADMINISTRATOR`~~. **Resuelto** con la tabla de [permisos por perfil](#permisos-por-perfil): el alta de cliente es de `SECRETARY` (D-05). La calificación legal sigue en `ADMINISTRATOR` | - |
| C-02 | **Apellido y nombre separados** (observación de la Sprint Review del Sprint 1). El prototipo lo aplica en el listado y en la modificación de usuarios, pero no en el alta de usuario ni en abogados, que siguen con "Nombre y apellido". Este contrato solo lo aplica al cliente, que es nuevo; cambiar `/users` y `/lawyers` rompe el contrato del Sprint 1 y queda fuera del alcance. Conviene decidirlo antes de HU14 (Modificar Abogado, Sprint 3) | Equipo / PO |
| C-03 | ~~Confirmación de actos pendientes~~. **Resuelto:** solo el abogado registra actos y el acto se aplica al registrarse; no hay actos pendientes ni flujo de confirmación (D-13) | - |
| C-04 | **¿Cómo llega una causa a "Archivada"?** Los estados terminales no pueden ser destino de un acto, y ninguna historia del Sprint 2 archiva una causa. "Prescripta" llega con HU33 (Sprint 3); para "Archivada" no hay historia | PO |
| C-05 | **Feriados y feria judicial** (P-02). El cómputo solo excluye sábados y domingos. El prototipo remite a "Administración → Estados y plazos" para cargarlos y trae datos de ejemplo (`FERIADOS`), pero no hay pantalla ni historia. También conviene confirmar qué pasa cuando un plazo en días corridos vence en un día inhábil | Cliente |
| C-06 | ~~Inicio del cómputo de la prescripción~~. **Resuelto** en lo principal: el prototipo incorporó la "fecha del hecho" por calificación y la prescripción corre desde ahí (D-19, D-28). **Sigue abierto** confirmar que no aplica a amparos, aunque el Plan de Proyecto hable de "prescripción de causa o amparo" | Cliente |
| C-07 | **Nota por estado procesal.** La tabla de "Estados y plazos" muestra notas como "El plazo no corre de oficio (RN6): arranca desde la notificación" o "Requiere agotada la vía administrativa", pero los formularios no permiten cargarlas. No se agregó el campo: definir si es texto editable (y va al recurso) o fijo del frontend | Equipo |
| C-08 | **Esquema de base de datos actual.** `ProceduralState.name` es `@unique` global en `schema.prisma`, pero el contrato (desde V2) y los datos del prototipo exigen unicidad **por fuero**: "Archivada" existe en los tres. Además `dayType` es anulable en el esquema y no en el contrato | Backend |
| C-09 | **Formato del SAC** (P-03). Se tomaron los 8 dígitos del prototipo; falta la confirmación del cliente | Cliente |
| C-10 | **Nombre del acto distinto del estado.** La línea de tiempo del prototipo muestra actos cuyo nombre no coincide con el estado al que llevan ("Cédula de notificación" → "Oposición al requerimiento de elevación"; "Clausura del sumario" → "Alegato"), pero el formulario de HU26 no pide ese nombre. Si HU23 o HU27 lo necesitan, conviene agregarlo ahora para no migrar actos ya cargados | Equipo / PO |
| C-11 | **`clientSince` automático.** Para los clientes que ya tiene el estudio, la fecha de alta en el sistema no es la fecha real en que empezaron a ser clientes. Evaluar si debe poder cargarse | PO |
| C-12 | **Validaciones de fechas** adoptadas sin fuente explícita: `startDate`, `offenseDate` y `actDate` no pueden ser futuras; no se exige que `offenseDate` sea anterior a `startDate`; `notificationDate` va entre la fecha del acto y hoy; el vencimiento manual no puede ser anterior a la fecha desde la que corre el plazo | Equipo |
| C-13 | **Otros datos del abogado.** La Sprint Review dejó pendiente consultar al cliente qué otros datos registrar. El recurso abogado no cambia en esta versión | Cliente |
| C-14 | **Lectura de `/users` para no administradores.** El prototipo muestra la sección en modo consulta a todos los perfiles, pero se mantuvo `ADMINISTRATOR` porque no es parte del sprint y expone correos y últimos accesos | PO |
| C-15 | **Datos de suscripción del cliente.** Los datos de ejemplo del prototipo traen "fuerza" (Policía de la Provincia, Servicio Penitenciario, FPA, ETAC) y "suscripción", coherentes con la línea de negocio del Estudio Inicial, pero no aparecen en el formulario ni en la tabla. No se incluyeron | PO / cliente |
| C-16 | **Pago de tasa.** El detalle de causa tiene "Registrar pago de tasa", RN10 lo exige y el Plan de Proyecto lo lista como requerimiento, pero no hay historia de usuario en el backlog | PO |
| C-17 | **Baja de abogado con reasignación.** El prototipo propone "Eliminar y reasignar", eligiendo a quién pasan las causas; V2 rechaza la baja con `409`. Revisar al planificar HU15 (Sprint 4), junto con el pendiente P-05 | Equipo |
| C-18 | **Textos del prototipo que quedaron de la versión anterior.** El subtítulo de "Registrar causa" todavía dice "el sistema deriva el estado procesal inicial del fuero", y el pie de "Registrar acto" todavía muestra a la Secretaría la nota de RN13 ("el estado queda pendiente de confirmación"). Contradicen al resumen del alta y a D-13; conviene corregirlos en el prototipo para que no se copien a la pantalla | Equipo |
| C-19 | **Primer estado de la causa.** El primer acto puede llevar la causa a cualquier estado no terminal del fuero, o a uno escrito a mano: el combo del prototipo no restringe. Confirmar que no debe limitarse a un estado en particular | PO |
| C-20 | **SAC opcional y RN2.** RN2 dice que el SAC identifica la causa. Con el SAC opcional, nada impide registrar dos veces la misma causa sin SAC. Reformular RN2 con el cliente y decidir si el SAC podrá cargarse después (HU19) | Cliente / PO |
| C-21 | **Abogado responsable dado de baja.** Con D-30, si el responsable se da de baja nadie puede registrar actos en sus causas, ni siquiera el `ADMINISTRATOR`, hasta que se reasignen (P-05, HU15) | Equipo / PO |
| C-22 | **Causa penal sin calificación legal.** No computa prescripción, así que las alertas de prescripción (HU32, Sprint 3) no la alcanzan. Evaluar si el tablero debe marcarla | PO |

### 8.3 Visto en el prototipo y fuera de alcance

Elementos que aparecen en las pantallas del Sprint 2 pero corresponden a otras
historias. No tienen endpoint ni campo en esta versión.

| Elemento del prototipo | Pantalla | HU | Sprint |
| --- | --- | --- | --- |
| "Crear la carpeta de la causa en Drive" y "Copiar los modelos de escritos del fuero" | Registrar causa | 39, 40 | 3 |
| "Adjuntar cédula o comprobante" | Registrar acto procesal | 39 | 3 |
| Ciclo de vida de la causa, incluido su aviso "Todavía no hay actos procesales" y el listado de los actos registrados | Detalle de causa | 23, 27 | 4, 3 |
| "Fecha del hecho" al modificar las calificaciones de una causa | Detalle de causa → Modificar causa | 19 | 3 |
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
- **Mensajes en castellano.** Los errores de dominio, los mensajes fijos de
  `domain-error.filter.ts` y los de validación de los DTO (`class-validator`)
  deben devolver `message` y `details` en castellano (D-23).
- **Guards de rol.** `POST /clients` pasa a `SECRETARY` y
  `POST /cases/{caseId}/procedural-acts` y su `deadline-preview` pasan al
  abogado responsable de la causa (D-30), que no es un guard de rol sino una
  comprobación sobre la causa (ver [Permisos por perfil](#permisos-por-perfil)).
- **Revisión del 01/10/2026 ([§7.7](#77-revisión-de-v3-del-01102026)).** El
  backend todavía no tiene módulo de causas, así que no hay nada que migrar:
  la tabla causa–calificación nace con la fecha del hecho, y el estado actual
  de la causa, anulable. En el frontend ya hay tipos, validaciones y
  componentes de `cases` y `proceedings` escritos con la forma anterior:
  `legalQualificationIds`, `prescriptionStartsOn` a nivel causa y
  `currentState` no anulable; les falta `subjectMatter`, `offenseDate` y el
  filtro `withoutProceduralActs`, y el tipo del acto conserva un `status`
  (`ProceduralActStatus`) que este contrato retiró con D-13.
- **Revisión del 05/10/2026 ([§7.8](#78-revisión-de-v3-del-05102026)).** El
  backend todavía no tiene causas ni actos, así que no hay datos que migrar. Sí
  cambia lo implementado de estados procesales: hay que quitar `position` del
  esquema y de los DTO, sembrar el estado inicial "Iniciada" de cada fuero,
  excluirlo de `GET /procedural-states` y quitar `activeCases` de las
  respuestas de `POST` y `PATCH`. El guard de los actos deja de ser por rol y
  pasa a comparar el abogado del usuario con el responsable de la causa.
