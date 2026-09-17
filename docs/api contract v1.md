# API Contract

## Tabla de contenidos

- [1. Resumen de Endpoints](#1-resumen-de-endpoints)
- [2. Endpoints](#2-endpoints)
    - [2.1 Sesión: /auth/login](#21-sesión-authlogin)
    - [2.2 Gestión de usuarios: /users](#22-gestión-de-usuarios-users)
    - [2.3 Gestión de abogados: /lawyers](#23-gestión-de-abogados-lawyers)
    - [2.4 Estados procesales: /procedural-states](#24-estados-procesales-procedural-states)
- [3. Información general](#3-información-general)
- [4. Convenciones de respuestas](#4-convenciones-de-respuestas)
- [5. Códigos HTTP](#5-códigos-http)

---

## 1. Resumen de Endpoints

| Método   | Endpoint             | Autenticación | Rol                           | Descripción               |
| -------- | -------------------- | :-----------: | ----------------------------- | ------------------------- |
| `POST`   | `/auth/login`        |      No       | -                             | Iniciar sesión            |
| `POST`   | `/auth/logout`       |      Sí       | Cualquier usuario autenticado | Cerrar sesión             |
| `PATCH`  | `/auth/password`     |      Sí       | Cualquier usuario autenticado | Cambiar contraseña        |
| `POST`   | `/users`             |      Sí       | `ADMINISTRADOR`               | Registrar usuario         |
| `GET`    | `/users`             |      Sí       | `ADMINISTRADOR`               | Consultar usuarios        |
| `GET`    | `/users/{userId}`    |      Sí       | `ADMINISTRADOR`               | Consultar usuario         |
| `PATCH`  | `/users/{userId}`    |      Sí       | `ADMINISTRADOR`               | Modificar usuario         |
| `DELETE` | `/users/{userId}`    |      Sí       | `ADMINISTRADOR`               | Eliminar usuario          |
| `POST`   | `/lawyers`           |      Sí       | `ADMINISTRADOR`               | Registrar abogado         |
| `GET`    | `/procedural-states` |      Sí       | `ADMINISTRADOR`               | Consultar estado procesal |

---

## 2. Endpoints

### 2.1 Sesión: /auth/login

#### `POST /auth/login`

Inicia una sesión utilizando las credenciales del usuario.

**Autenticación requerida:** No.

**Cuerpo de la petición**

```json
{
	"username": "admin",
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
		"expiresIn": 3600,
		"user": {
			"id": 1,
			"username": "admin",
			"role": "ADMINISTRADOR"
		}
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
			"username": "El nombre de usuario es obligatorio.",
			"password": "La contraseña es obligatoria."
		}
	}
}
```

**`401 Unauthorized`**

```json
{
	"statusCode": 401,
	"error": "Unauthorized",
	"message": "Credenciales inválidas"
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

La respuesta no contiene cuerpo.

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

Permite al usuario autenticado modificar su contraseña.

**Autenticación requerida:** Sí.

**Cuerpo de la petición**

```json
{
	"currentPassword": "passwordActual",
	"newPassword": "nuevaPassword"
}
```

**Parámetros de consulta**

No requiere parámetros de consulta.

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo.

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

### 2.2 Gestión de usuarios: /users

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRADOR`.

---

#### `POST /users`

Registra un nuevo usuario en el sistema.

**Cuerpo de la petición**

```json
{
	"username": "jperez",
	"password": "password",
	"role": ["LAWYER", "ADMINISTATOR"],
	"abogadoId": "1"
}
```

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 15,
		"username": "jperez",
		"role": ["LAWYER", "ADMINISTATOR"]
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
		"message": "El usuario no posee permisos suficientes para realizar esta operación.",
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

| Parámetro | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| --------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`    | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`   | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |
| `search`  | String  |    No     | -                 | -                   | Texto para filtrar usuarios             |
| `role`    | String  |    No     | -                 | Rol válido          | Filtra por rol                          |

Ejemplo:

```http
GET /api/v1/users?page=1&limit=20&search=juan&role=LAWYER
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"username": "admin",
			"role": ["LAWYER", "ADMINISTATOR"]
		},
		{
			"id": 15,
			"username": "jperez",
			"role": ["LAWYER"]
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 57,
		"totalPages": 3
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

**`403 Forbidden`**

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
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
		"username": "mdominguez",
		"role": ["SECRETARIAT"]
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
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
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
	"username": "juanperez",
	"role": "USUARIO"
}
```

**Respuestas**

**`200 OK`**

```json
{
	"data": {
		"id": 15,
		"username": "juanperez",
		"role": ["LAWYER"]
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
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
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

Elimina un usuario.

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
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
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
		"code": "USER_HAS_DEPENDENCIES",
		"message": "No se puede eliminar el usuario porque posee recursos asociados.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "BUSINESS_RULE_VIOLATION",
		"message": "No se puede eliminar el usuario debido a una regla de negocio.",
		"details": null
	}
}
```

---

### 2.3 Gestión de abogados: /lawyers

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRADOR`.

---

#### `POST /lawyers`

Registra un nuevo abogado en el sistema.

**Cuerpo de la petición**

```json
{
	"firstName": "Juan",
	"lastName": "Pérez",
	"registrationNumber": "MP-12345",
	"email": "juan.perez@example.com",
	"phone": "351249249"
}
```

**Respuestas**

**`201 Created`**

```json
{
	"data": {
		"id": 10,
		"firstName": "Juan",
		"lastName": "Pérez",
		"registrationNumber": "MP-12345",
		"email": "juan.perez@example.com",
		"phone": "351249249"
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
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
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

### 2.4 Estados procesales: /procedural-states

**Autenticación requerida:** Sí.
**Rol requerido:** `ADMINISTRADOR`.

---

#### `GET /procedural-states`

Obtiene una lista paginada de los estados procesales.

**Parámetros de consulta**

| Parámetro      | Tipo    | Requerido | Valor por defecto | Restricciones       | Descripción                             |
| -------------- | ------- | :-------: | ----------------- | ------------------- | --------------------------------------- |
| `page`         | Integer |    No     | `1`               | Mayor o igual a `1` | Número de página                        |
| `limit`        | Integer |    No     | `20`              | Entre `1` y `100`   | Cantidad máxima de elementos por página |
| `search`       | String  |    No     | -                 | -                   | Texto para filtrar por estados          |
| `jurisdiction` | String  |    No     | -                 | Fuero válido        | Filtra por fuero                        |

Ejemplo:

```http
GET /api/v1/procedural-states?page=1&limit=20&jurisdiction=ADMINISTRATIVE
```

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"id": 1,
			"name": "ALLEGATION",
			"jurisdiction": "ADMINISTRATIVE",
			"proceduralTimeLimit": "10",
			"dayType": "BUSINESS"
		},
		{
			"id": 15,
			"name": "INVESTIGATION",
			"jurisdiction": "CRIMINAL",
			"proceduralTimeLimit": "150",
			"dayType": "CONSECUTIVE"
		}
	],
	"pagination": {
		"page": 1,
		"limit": 20,
		"totalItems": 57,
		"totalPages": 3
	}
}
```

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parametros de query inválidos",
		"details": {
			"jurisdiction": "No existe un fuero procesal con ese nombre"
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
		"message": "Se requiere el rol ADMINISTRADOR para realizar esta operación.",
		"details": null
	}
}
```

---

## 3. Información general

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

Los endpoints indicados como `ADMINISTRADOR` requieren que el usuario autenticado posea dicho rol.

### Formato de intercambio

Todas las solicitudes y respuestas utilizan JSON.

```http
Content-Type: application/json
Accept: application/json
```

---

## 4. Convenciones de respuestas

### 4.1 Respuestas exitosas

**POST / PATCH — Recurso individual**

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

### 4.2 Respuesta de error

Todas las respuestas de error utilizan la siguiente estructura:

```json
{
	"error": {
		"code": "ERROR_CODE",
		"message": "Descripción legible del error.",
		"details": null
	}
}
```

Los mensajes deben ser breves y descriptivos; no se exigirá un formato determinado para estos.
Los códigos de error deben ser **generales**.

**Ejemplo — `404 Not Found`**

```json
{
	"error": {
		"code": "RESOURCE_NOT_FOUND",
		"message": "Abogado id:53 Not Found",
		"details": null
	}
}
```

**Ejemplo — validación de campos**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"fieldName": "Descripción del error."
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

---

## 5. Códigos HTTP

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
