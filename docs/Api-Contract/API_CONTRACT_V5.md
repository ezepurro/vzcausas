# API Contract

Contrato de la API de VZ Causas.

| Campo            | Valor                                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Fuente de verdad | `docs/prototypes/VZ Causas - Prototipo.dc.html` (versión del 27/10/2026, commit `17c0e84`) |
| Relacionado      | `docs/Backend-Architecture/ADR-003_GOOGLE_DRIVE.md`; plantillas de carátula de cada fuero (`Caratula penal.docx`, `Caratula penal QUERELLANTE.docx`, `Caratula administrativo.docx`) y `docs/prototypes/assets/caratula-plantilla.png` |

El proceso automático diario (HU30, HU32, HU51 y HU52) no tiene endpoints: lo
que el contrato fija de él está en
[Proceso automático diario](#proceso-automático-diario).

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
    - [3.12 Documentación de la causa: /cases/{caseId}/documents y /cases/{caseId}/case-files](#312-documentación-de-la-causa-casescaseiddocuments-y-casescaseidcase-files)
- [4. Información general](#4-información-general)
- [5. Convenciones de respuestas](#5-convenciones-de-respuestas)
- [6. Códigos HTTP](#6-códigos-http)

---

## 1. Resumen de Endpoints

| Método   | Endpoint                                              | Autenticación | Rol                           | Descripción |
| -------- | ----------------------------------------------------- | :-----------: | ----------------------------- | ---------------------------------------- |
| `POST`   | `/auth/login`                                         |      No       | -                             | Iniciar sesión |
| `POST`   | `/auth/refresh`                                       |      No       | -                             | Renovar el token de acceso |
| `POST`   | `/auth/logout`                                        |      Sí       | Cualquier usuario autenticado | Cerrar sesión |
| `PATCH`  | `/auth/password`                                      |      Sí       | Cualquier usuario autenticado | Cambiar contraseña |
| `POST`   | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Registrar usuario |
| `GET`    | `/users`                                              |      Sí       | `ADMINISTRATOR`               | Consultar usuarios |
| `GET`    | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Consultar usuario |
| `PATCH`  | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Modificar usuario |
| `DELETE` | `/users/{userId}`                                     |      Sí       | `ADMINISTRATOR`               | Dar de baja usuario |
| `POST`   | `/lawyers`                                            |      Sí       | `ADMINISTRATOR`               | Registrar abogado |
| `GET`    | `/lawyers`                                            |      Sí       | Cualquier usuario autenticado | Consultar abogados |
| `GET`    | `/lawyers/{lawyerId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar abogado |
| `PATCH`  | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Modificar abogado (HU14) |
| `DELETE` | `/lawyers/{lawyerId}`                                 |      Sí       | `ADMINISTRATOR`               | Dar de baja abogado |
| `POST`   | `/procedural-states`                                  |      Sí       | Cualquier usuario autenticado | Registrar estado procesal |
| `GET`    | `/procedural-states`                                  |      Sí       | Cualquier usuario autenticado | Consultar estados procesales |
| `GET`    | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Consultar estado procesal |
| `PATCH`  | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Modificar estado procesal |
| `DELETE` | `/procedural-states/{stateId}`                        |      Sí       | Cualquier usuario autenticado | Dar de baja estado procesal |
| `POST`   | `/legal-qualifications`                               |      Sí       | Cualquier usuario autenticado | Registrar calificación legal |
| `GET`    | `/legal-qualifications`                               |      Sí       | Cualquier usuario autenticado | Consultar calificaciones legales |
| `GET`    | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Consultar calificación legal |
| `PATCH`  | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Modificar calificación legal |
| `DELETE` | `/legal-qualifications/{qualificationId}`             |      Sí       | Cualquier usuario autenticado | Dar de baja calificación legal |
| `POST`   | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Registrar cliente |
| `GET`    | `/clients`                                            |      Sí       | Cualquier usuario autenticado | Consultar clientes |
| `GET`    | `/clients/{clientId}`                                 |      Sí       | Cualquier usuario autenticado | Consultar cliente |
| `POST`   | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Registrar causa |
| `GET`    | `/cases`                                              |      Sí       | Cualquier usuario autenticado | Consultar causas |
| `GET`    | `/cases/custom-states`                                |      Sí       | Cualquier usuario autenticado | Consultar estados escritos a mano |
| `GET`    | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Consultar detalle de causa |
| `PATCH`  | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Modificar causa (HU19) |
| `DELETE` | `/cases/{caseId}`                                     |      Sí       | Cualquier usuario autenticado | Dar de baja causa (HU21) |
| `GET`    | `/cases/{caseId}/cover`                               |      Sí       | Cualquier usuario autenticado | Emitir la carátula en PDF (HU24) |
| `POST`   | `/cases/{caseId}/prescription`                        |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Marcar la causa como prescripta |
| `POST`   | `/cases/{caseId}/folder`                              |      Sí       | Cualquier usuario autenticado | Crear o reintentar la carpeta de la causa |
| `POST`   | `/cases/{caseId}/procedural-acts`                     |      Sí       | Abogado responsable de la causa | Registrar acto procesal |
| `GET`    | `/cases/{caseId}/procedural-acts/deadline-preview`    |      Sí       | Abogado responsable de la causa | Previsualizar el vencimiento de un acto |
| `GET`    | `/cases/{caseId}/procedural-acts`                     |      Sí       | Cualquier usuario autenticado | Consultar actos procesales |
| `GET`    | `/cases/{caseId}/procedural-acts/{actId}`             |      Sí       | Cualquier usuario autenticado | Consultar acto procesal |
| `PATCH`  | `/cases/{caseId}/procedural-acts/{actId}`             |      Sí       | Abogado responsable de la causa | Modificar acto procesal (HU28) |
| `POST`   | `/cases/{caseId}/interruptive-acts`                   |      Sí       | Abogado responsable de la causa | Registrar acto interruptivo |
| `GET`    | `/cases/{caseId}/interruptive-acts`                   |      Sí       | Cualquier usuario autenticado | Consultar actos interruptivos |
| `GET`    | `/cases/{caseId}/timeline`                            |      Sí       | Cualquier usuario autenticado | Consultar línea de vida de la causa |
| `GET`    | `/cases/{caseId}/documents`                           |      Sí       | Cualquier usuario autenticado | Consultar documentos de la causa (HU38) |
| `GET`    | `/cases/{caseId}/documents/{documentId}/file`         |      Sí       | Cualquier usuario autenticado ² | Descargar un documento o un expediente |
| `POST`   | `/cases/{caseId}/case-files`                          |      Sí       | Cualquier usuario autenticado | Generar el expediente (HU25) |
| `POST`   | `/document-templates`                                 |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Registrar modelo formal |
| `GET`    | `/document-templates`                                 |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Consultar modelos formales |
| `GET`    | `/document-templates/{templateId}`                    |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Consultar modelo formal |
| `GET`    | `/document-templates/{templateId}/file`               |      Sí       | `ADMINISTRATOR` o `LAWYER`    | Descargar el archivo del modelo (HU23) |
| `GET`    | `/dashboards/lawyer`                                  |      Sí       | `LAWYER`                      | Tablero del abogado |
| `GET`    | `/dashboards/administrator`                           |      Sí       | `ADMINISTRATOR`               | Tablero del administrador |

La columna **Rol** se deriva de la tabla de
[permisos por perfil](#permisos-por-perfil) de la sección 4. "`ADMINISTRATOR` o
`LAWYER`" significa que alcanza con poseer uno de los dos.

² Un documento cualquiera de la carpeta, solo `LAWYER` o `SECRETARY` (HU38); un
expediente generado por el sistema, cualquier usuario autenticado (HU25). Ver
[§3.12](#get-casescaseiddocumentsdocumentidfile).

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

Los códigos van en castellano, igual que el vocabulario del estudio.

| Código                   | Rótulo                 | Fueros en que aplica           |
| ------------------------ | ---------------------- | ------------------------------ |
| `DEFENSA`                | Defensa                | `CRIMINAL`, `ADMINISTRATIVE`   |
| `QUERELLANTE_PARTICULAR` | Querellante particular | `CRIMINAL`                     |
| `RECURRENTE`             | Recurrente             | `ADMINISTRATIVE`               |
| `ACTORA`                 | Actora                 | `AMPARO`                       |
| `DEMANDADA`              | Demandada              | `AMPARO`                       |

No confundir con `Role`, que es el perfil de seguridad del usuario.

### `DeadlineKind`

Origen de un vencimiento en los tableros.

| Código           | Rótulo                    | Significado                                                       |
| ---------------- | ------------------------- | ----------------------------------------------------------------- |
| `PROCEDURAL_ACT` | Plazo de presentación     | El plazo que abrió el acto procesal del estado actual de la causa |
| `HARMFUL_ACT`    | Plazo para el amparo      | El plazo para presentar el amparo desde el acto lesivo            |

### `CaseFolderStatus`

Situación de la carpeta de una causa en la nube.

| Código     | Rótulo             | Significado                                                                                  |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `PENDING`  | Carpeta pendiente  | La carpeta no está creada por elección del usuario (se registró la causa sin pedirla). Se puede crear después |
| `CREATING` | Creando carpeta    | Se pidió crearla y se espera la respuesta del almacenamiento en la nube                      |
| `CREATED`  | Carpeta creada     | La carpeta existe y se puede abrir                                                           |
| `ERROR`    | Error en la carpeta | Se pidió crearla, pero el almacenamiento en la nube falló. Se reintenta solo y también se puede reintentar a mano |

Una causa registrada antes de que existiera la carpeta en la nube no tiene
estado: su `folder` vale `null`.

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
| `lastName`    | String                |  No  | Apellido                                                                 |
| `firstName`   | String                |  No  | Nombres                                                                  |
| `email`       | String                |  No  | Correo electrónico. Único                                                |
| `roles`       | `Role[]`              |  No  | Al menos un rol                                                          |
| `lawyer`      | Object \| `null`      |  Sí  | Ficha profesional vinculada. `null` si el usuario no posee vínculo       |
| `lastLoginAt` | String (ISO 8601) \| `null` | Sí | Último ingreso registrado. `null` si el usuario nunca inició sesión |
| `active`      | Boolean               |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /users/{userId}`        |

**Sobre `lastName` y `firstName`:** el apellido y los nombres viajan en campos
separados, igual que en el cliente: en las respuestas, en los cuerpos de
`POST` y `PATCH` y en el objeto `lawyer` que el usuario lleva vinculado.

**Acceso a la carpeta del estudio en Drive.** El alta, la
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
baja igual, y el proceso diario vuelve a ajustar los accesos.
El correo que se exige al registrar el usuario **es el que recibe el acceso a
Drive**, así que tiene que ser de una cuenta de Google. La API
no puede comprobarlo de antemano: si no lo es, Drive rechaza el acceso, el
usuario se registra igual y el acceso queda pendiente, como cualquier otra
falla de Drive.

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
| `email`    | String         |     Sí      | Formato de correo electrónico válido. Único. De una cuenta de Google si el usuario es `LAWYER` o `SECRETARY`: es el que recibe el acceso a Drive |
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

La lectura está abierta a todos porque HU13 la asigna a la Secretaría, el
prototipo muestra la sección en modo consulta a todos los perfiles y el
formulario de alta de causa —que opera cualquier perfil— necesita el listado de
abogados para elegir al responsable.

El recurso abogado posee la siguiente estructura:

| Campo                | Tipo    | Nulo | Descripción                                                          |
| -------------------- | ------- | :--: | -------------------------------------------------------------------- |
| `id`                 | Integer |  No  | Identificador único                                                  |
| `lastName`           | String  |  No  | Apellido                                                             |
| `firstName`          | String  |  No  | Nombres, sin el tratamiento ("Dr.", "Dra.")                        |
| `registrationNumber` | String  |  No  | Matrícula. Única                                                     |
| `activeCases`        | Integer |  No  | Causas activas en las que es responsable. Calculado, sólo lectura    |
| `active`             | Boolean |  No  | Estado de alta. Vale siempre `true`: ver `DELETE /lawyers/{lawyerId}` |

**Sobre `lastName` y `firstName`:** el tratamiento ("Dr.", "Dra.") no forma
parte del nombre: lo pone el frontend.

**Formato de la matrícula:** el vigente en el Colegio de Abogados de Córdoba,
compuesto por circunscripción y número separados por guión: `1-28114`.

**Sobre `activeCases`:** se calcula según la definición de
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

> Corresponde a HU14. Las validaciones siguen los criterios de aceptación
> (CA-14.1 a CA-14.6) y el formulario "Modificar abogado" del prototipo.

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
| `lastName`           | String  | Si se envía, no vacío ni solo espacios |
| `firstName`          | String  | Si se envía, no vacío ni solo espacios. Sin "Dr." ni "Dra." |
| `registrationNumber` | String  | Formato `1-28114`. Única                   |

El campo `activeCases` no es modificable: lo calcula el backend.

**Reglas**

- **Campos obligatorios (CA-14.4).** Los tres campos son obligatorios en la
  ficha: se pueden omitir en el `PATCH`, pero no vaciar. Un valor vacío, solo
  de espacios o `null` responde `400 VALIDATION_ERROR` sobre ese campo.
- **Matrícula única (CA-14.3).** Una matrícula que ya tiene otro abogado
  responde `409 LAWYER_REGISTRATION_ALREADY_EXISTS`. Enviar la misma matrícula
  que ya tiene el abogado no es un conflicto.
- **Dato único (CA-14.2).** Las causas no copian los datos del abogado: los
  referencian. El cambio se ve en todas sus causas, en `responsibleLawyer`, en
  la siguiente lectura.
- **Carpeta en Drive.** Si cambia el apellido o el nombre, se **renombra** la
  carpeta del abogado (`/VZ Causas/Causas/{abogado}`); las carpetas de sus
  causas quedan adentro y su `folder.path` cambia con ella. Si Drive no
  responde, la modificación no falla: la carpeta conserva el nombre anterior y
  la corrige el proceso diario (§4, Carpeta de la causa).
- **Carátula.** La hoja de carátula de sus causas toma el nombre nuevo en la
  próxima emisión, porque no se guarda.
- **Auditoría (CA-14.5).** El backend registra quién modificó, cuándo y qué
  cambió, según `AUDITORIA_Y_TRAZABILIDAD.md`. No hay endpoint para
  consultarlo: no está en el prototipo.
- **Perfil no habilitado (CA-14.6).** Un usuario sin rol `ADMINISTRATOR`
  recibe `403 FORBIDDEN`.
- **Abogado dado de baja.** Para el cliente no existe: `404 LAWYER_NOT_FOUND`.

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

> Corresponde a HU15.

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
los tres perfiles.

El recurso estado procesal posee la siguiente estructura:

| Campo           | Tipo           | Nulo | Descripción                                                                  |
| --------------- | -------------- | :--: | ---------------------------------------------------------------------------- |
| `id`            | Integer        |  No  | Identificador único                                                          |
| `name`          | String         |  No  | Denominación del estado, en castellano. Texto libre. Única dentro del fuero  |
| `jurisdiction`  | `Jurisdiction` |  No  | Fuero al que pertenece                                                       |
| `timeLimitDays` | Integer        |  No  | Días que abre el estado. `0` indica que no abre plazo                        |
| `dayType`       | `DayType`      |  No  | Forma de cómputo de los días                                                 |
| `terminal`      | Boolean        |  No  | Indica si el estado cierra el ciclo de vida de la causa                      |
| `caseCount`     | Integer        |  No  | Causas que se encuentran en este estado, activas o no (las dadas de baja no cuentan). Calculado, sólo lectura. Solo en las respuestas de `GET` |
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
[`POST /cases`](#post-cases)).

**Estado inicial.** Cada fuero tiene además un estado de sistema, **"Iniciada"**,
en el que nace toda causa. No forma parte de este recurso: no aparece en los
listados, `GET /procedural-states/{stateId}` responde `404` con su
identificador, no se modifica ni se da de baja y no puede elegirse como destino
de un acto. Su denominación está reservada: registrar en un fuero un estado
llamado "Iniciada" responde `409 PROCEDURAL_STATE_ALREADY_EXISTS`.

**Estado "Prescripta".** El fuero `CRIMINAL` tiene un
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
solo con su propio botón y formulario. Su denominación está reservada en el fuero penal: registrar
otro estado llamado "Prescripta" responde `409 PROCEDURAL_STATE_ALREADY_EXISTS`.

**Sobre `caseCount`:** cuenta las causas que hoy están en el estado, **activas
o no**: también las que están en un estado terminal, como "Archivada" o
"Prescripta". No cuenta las dadas de baja ni las que están en "Iniciada". En la
tabla del prototipo es la columna "Causas". Reemplaza a `activeCases`, que solo
contaba causas activas y por eso valía siempre `0` en los estados terminales. Es un dato de consulta: se devuelve **solo en las respuestas
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
"Prescripta" muestran cuántas causas cerraron así.

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
responde `400 VALIDATION_ERROR` sobre ese campo.

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

El estado es "Prescripta", el estado de sistema del fuero penal:

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

**La baja procede aunque haya causas en ese estado.** El prototipo
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

El estado es "Prescripta", el estado de sistema del fuero penal:

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
"Registrar calificación nueva" del alta de causa.

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
habilitado para cualquier usuario.

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

**Sobre `lastName` y `firstName`:** apellido y nombres viajan en campos
separados, conforme al formulario del prototipo. El backend los guarda tal
como llegan; la forma `GÓMEZ, Ariel Fernando` que se ve en el
listado y en la carátula sugerida la compone el cliente. Usuarios y abogados
siguen el mismo criterio.

**Sobre `dni`:** viaja sin puntos (`34812905`). El formato `34.812.905` es de
presentación y lo aplica el cliente. Se conserva la sigla, como `SacNumber`,
por tratarse de un documento argentino sin equivalente directo.

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
habilita "Nueva causa" a los tres perfiles.

La causa admite **modificación**
([`PATCH /cases/{caseId}`](#patch-casescaseid), HU19), su **baja**
([`DELETE /cases/{caseId}`](#delete-casescaseid), HU21) y la **carátula**
(HU24), una hoja en PDF que se arma con los datos de la causa, sin datos
nuevos en el recurso:
[`GET /cases/{caseId}/cover`](#get-casescaseidcover). Los tres son de
cualquier usuario autenticado, según la matriz de permisos (HU18 a HU25). La
documentación de la causa y el expediente (HU38 y HU25) tienen su propia
sección, [§3.12](#312-documentación-de-la-causa-casescaseiddocuments-y-casescaseidcase-files).

La causa tiene además la **prescripción que la rige**, calculada por el
backend y reiniciada por los actos interruptivos (HU31, HU32); la posibilidad
de **marcarla como prescripta** (HU33); y su **carpeta en la nube**, con los
modelos del fuero (HU39, HU40).

El recurso causa posee la siguiente estructura:

| Campo                     | Tipo                          | Nulo | Descripción                                                                                   |
| ------------------------- | ----------------------------- | :--: | --------------------------------------------------------------------------------------------- |
| `id`                      | Integer                       |  No  | Identificador único interno                                                                   |
| `sacNumber`               | String \| `null`              |  Sí  | Número de SAC: 8 dígitos. Opcional. Si se informa, es único entre las causas vigentes (RN2). El de una causa dada de baja se puede volver a usar |
| `caption`                 | String                        |  No  | Carátula: el texto de los autos. Es el recuadro "Autos" de la hoja de carátula               |
| `court`                   | String \| `null`              |  Sí  | Órgano interviniente (antes "Tribunal o dependencia"). Solo cambia el rótulo: el campo es el mismo |
| `jurisdiction`            | `Jurisdiction`                |  No  | Fuero. Define el ciclo de vida y la tabla de plazos aplicable. No se modifica |
| `proceduralRole`          | `ProceduralRole`              |  No  | Rol procesal del cliente                                                                      |
| `instructorName`          | String \| `null`              |  Sí  | Instructor de la causa: quien lleva la instrucción en el tribunal o la dependencia. Es también el secretario/a del órgano que imprime la hoja de carátula |
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
| `startDate`               | String (fecha ISO 8601) \| `null` |  Sí  | Fecha de inicio de la causa en sede judicial. `null` mientras no tiene SAC. No interviene en el cómputo de la prescripción |
| `currentState`            | Object                        |  No  | Estado procesal actual, con el vencimiento del acto que llevó la causa a él. Ver estructura más abajo |
| `folder`                  | Object \| `null`              |  Sí  | **Nuevo.** Carpeta de la causa en la nube (HU39, HU40). `null` si no se pidió crearla         |
| `active`                  | Boolean                       |  No  | Estado de alta. Vale siempre `true`: una causa dada de baja no se devuelve (HU21, ver §4, Bajas) |

**Datos propios de cada fuero**

| Fuero            | Datos                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `CRIMINAL`       | `clientDetained`: si el cliente está preso                                                |
| `AMPARO`         | `injunctionGranted`: si el juez hizo lugar a la medida cautelar. `harmfulActDate`, `harmfulActRenews`, `harmfulActRenewalDays`, `harmfulActTermDays` y `harmfulActTermDayType`: fecha del acto lesivo, si se renueva y cada cuántos días, y el plazo para presentar el amparo. Con ellos el backend calcula `harmfulActDeadline` |
| `ADMINISTRATIVE` | `administrativeRemedyExhaustedOn`: fecha de agotamiento de la vía administrativa           |
| Los tres         | `courtFeePaid`: si se pagó la tasa de justicia                                            |

Un dato que no corresponde al fuero de la causa vale `null` en la respuesta y no
se envía en el alta. `courtFeePaid` es el dato que pide RN10.

Estos datos **no figuran en el prototipo**: el formulario de alta y el detalle
de la causa tienen que sumarlos. Se cargan al registrar la causa y se
modifican con [`PATCH /cases/{caseId}`](#patch-casescaseid). El único
cálculo que el contrato hace con ellos es el vencimiento del acto lesivo.

**`harmfulActDeadline`**

En el amparo, la fecha del acto lesivo cumple una función parecida a la de la
prescripción: desde ella corre el plazo para presentar el amparo, y vencido ese
plazo ya no se puede presentar. `harmfulActDeadline` es ese vencimiento,
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
  diario.

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

**`prescription`**

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

**`prescriptionDeclaration`**

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

**`folder`**

Carpeta de la causa en el almacenamiento en la nube del estudio (Google Drive).
Vale `null` en las causas registradas antes de que existiera la carpeta. Si al registrar la
causa se pidió no crearla, `status` es `PENDING`.

| Campo              | Tipo               | Descripción                                                                                          |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `status`           | `CaseFolderStatus` | `CREATED` si la carpeta existe; `CREATING` si se está creando; `ERROR` si se pidió y no pudo crearse; `PENDING` si no se pidió |
| `url`              | String \| `null`   | Enlace para abrir la carpeta ("Abrir carpeta en Drive"). `null` mientras `status` no es `CREATED`    |
| `path`             | String \| `null`   | Ubicación de la carpeta, por ejemplo `/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado`. `null` mientras `status` no es `CREATED` |
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
carga al registrar la causa. **Un acto interruptivo lo mueve**: pasa a ser la fecha del acto interruptivo más reciente de la causa
(HU31, RN8, ver [§3.9](#39-actos-interruptivos-casescaseidinterruptive-acts)).
`offenseDate` sigue siendo el dato cargado y no cambia.

Si la causa registra varias calificaciones, la barra del detalle muestra **la
que prescribe primero** —la de menor `prescriptionExpiresOn`—, con la nota
"Calificación que prescribe primero: …". Esa elección y el porcentaje
transcurrido llegan resueltos en `prescription`: el cliente no los calcula.

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
| `sacNumber`             | String           |     No      | Exactamente 8 dígitos. Si se envía, único entre las causas vigentes. Puede ser el de una causa dada de baja |
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
| `startDate`             | String (fecha)   | Condicional | Obligatoria si se informa `sacNumber`; sin SAC no se informa y la causa queda con `startDate` en `null`. No puede ser posterior a hoy |
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

La carátula del expediente no se carga al registrar la causa. Lo que la hoja de carátula necesita y la causa no
tiene (las observaciones y, en el fuero penal, la parte que no es el cliente)
se envía al generar el expediente.

Un identificador de cliente, abogado o calificación que no existe o está dado
de baja se informa como `400 VALIDATION_ERROR` sobre el campo correspondiente,
porque es un dato del formulario que el usuario tiene que corregir. Los errores
de una calificación se informan sobre `legalQualifications`.

**`createFolder` y `copyTemplates`** son las dos casillas de "Asignación y
documentación" del formulario: "Crear la carpeta de la causa en Drive" y
"Copiar los modelos de escritos del fuero a esa carpeta". El prototipo las
muestra tildadas y no deja tildar la segunda sin la primera ("Primero hay que
crear la carpeta en Drive para poder copiar los modelos"); el contrato repite
esa regla con un `400` sobre `copyTemplates`. Un cliente que no envía
ninguno de los dos campos obtiene la carpeta con los modelos, que es lo que
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
- **La respuesta espera a la carpeta, pero no para siempre.** La carpeta se crea
  de forma asíncrona (ver `ADR-005_EVENTOS_DE_INTEGRACION.md` del backend). El alta
  espera su resultado hasta un límite del servidor (por defecto 10 segundos): si
  llega a tiempo, `folder` sale `CREATED` o `ERROR`, como en los ejemplos de
  abajo; si no, sale `CREATING` con `url` y `path` en `null`, y la creación sigue
  en segundo plano. El cliente ve el final con `GET /cases/{caseId}`. Una
  respuesta `201` con `folder.status` en `CREATING` es válida y no es un error.
- **La carpeta no condiciona el alta.** Si el almacenamiento en la nube falla,
  **la causa se registra igual**: la respuesta es `201`, con `folder.status` en
  `ERROR`, y la carpeta se reintenta con
  [`POST /cases/{caseId}/folder`](#post-casescaseidfolder). La causa es el dato
  que el estudio no puede perder; la carpeta es un complemento
 .

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
			"path": "/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
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
	"path": null,
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

Las causas dadas de baja (HU21) no aparecen con ningún filtro.

Los resultados se ordenan por urgencia: primero las causas con vencimiento,
por la fecha de ese vencimiento ascendente (las vencidas quedan primeras), y
luego las que no tienen vencimiento, por `id`.

**Vencimiento de la causa.** Es el que tenga abierto, de
cualquiera de los dos orígenes: el plazo del acto procesal del estado actual
(`currentState.dueDate`) o, en un amparo todavía en "Iniciada", el del acto
lesivo (`harmfulActDeadline.dueDate`). Nunca hay dos a la vez, porque el del
acto lesivo solo existe en el estado inicial, que no abre plazo. Así un amparo
cuyo plazo para presentarse está por vencer sube en el listado como cualquier
otra causa urgente, y aparece con "Solo con plazo por vencer".

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
				"path": "/VZ Causas/Causas/Peralta, Ignacio/Administrativo/PEREYRA, Marcos D. — Sumario administrativo",
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
				"path": "/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
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

Cada causa llega además con `prescription`,
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

Devuelve el mismo recurso que el listado. El detalle cubre el
encabezado de la causa, la barra de prescripción (`prescription`), la tarjeta
del cliente, el acceso a la carpeta (`folder.url`, botón "Abrir carpeta en
Drive") y el **ciclo de vida**.

**Ciclo de vida.** La línea de tiempo del prototipo ("Ciclo de vida de la
causa") sale de [`GET /cases/{caseId}/timeline`](#get-casescaseidtimeline)
(HU27), que devuelve ya intercaladas y completas sus tres fuentes: los actos
procesales, los actos interruptivos y el pase a "Prescripta". El cliente no
intercala ni pagina.

El resto del detalle:

| Elemento del detalle                          | Endpoint                                                        | HU |
| --------------------------------------------- | --------------------------------------------------------------- | -- |
| Línea "Secretario/a" del encabezado           | `instructorName` en este recurso: el secretario/a es el instructor | 24 |
| "Modificar causa"                             | [`PATCH /cases/{caseId}`](#patch-casescaseid)                   | 19 |
| "Dar de baja"                                 | [`DELETE /cases/{caseId}`](#delete-casescaseid)                 | 21 |
| Tarjeta "Documentación"                       | [`GET /cases/{caseId}/documents`](#get-casescaseiddocuments)    | 38 |
| "Generar expediente"                          | [`POST /cases/{caseId}/case-files`](#post-casescaseidcase-files), con la vista previa de la carátula de [`GET /cases/{caseId}/cover`](#get-casescaseidcover) | 25, 24 |
| "Modificar" en un acto del ciclo de vida      | [`PATCH /cases/{caseId}/procedural-acts/{actId}`](#patch-casescaseidprocedural-actsactid) | 28 |

"Registrar pago de tasa" y "Anular" un acto están fuera del contrato. El
prototipo no tiene "Emitir carátula" como botón aparte: la carátula se emite como primera
hoja del expediente, y también suelta con `GET /cases/{caseId}/cover`.

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
			"path": "/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
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

#### `PATCH /cases/{caseId}`

Modifica los datos de una causa para corregir información errónea
(HU19).

**Rol requerido:** cualquier usuario autenticado (matriz de permisos, HU18 a
HU25). No hace falta ser el abogado responsable: la restricción al responsable
es solo para los actos procesales e interruptivos.

Es el formulario "Modificar causa" del detalle. Todos los campos son
opcionales, pero debe enviarse al menos uno. Un campo omitido no cambia; un
campo anulable enviado en `null` se vacía. Cada cambio queda asentado con
usuario y fecha, como dice la nota del formulario, según
`AUDITORIA_Y_TRAZABILIDAD.md`; no hay endpoint para consultarlo.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

Corrección de identificación:

```json
{
	"court": "Fisc. de Distrito I, 3º turno",
	"instructorName": "Dra. Verónica Ledesma"
}
```

Cambio de responsable y de calificaciones en una causa penal:

```json
{
	"responsibleLawyerId": 5,
	"legalQualifications": [
		{ "legalQualificationId": 1, "offenseDate": "2021-02-27" },
		{ "legalQualificationId": 7, "offenseDate": "2021-02-27" }
	]
}
```

Cambio de cliente, con la carátula que propone el cliente para el nuevo:

```json
{
	"clientId": 9,
	"caption": "FERREYRA, Lucas Martín p.s.a. Robo calificado"
}
```

| Campo                   | Tipo             | Nulo | Restricciones                                                                                   |
| ----------------------- | ---------------- | :--: | ----------------------------------------------------------------------------------------------- |
| `sacNumber`             | String           |  Sí  | Exactamente 8 dígitos y único entre las causas vigentes. `null` deja la causa sin SAC    |
| `caption`               | String           |  No  | No vacío. Hasta 255 caracteres                                                                  |
| `court`                 | String           |  Sí  | Hasta 255 caracteres                                                                            |
| `instructorName`        | String           |  Sí  | Hasta 150 caracteres                                                                            |
| `tribunalPhone`         | String           |  Sí  | Hasta 50 caracteres                                                                             |
| `instructorExtension`   | String           |  Sí  | Hasta 20 caracteres                                                                             |
| `clientId`              | Integer          |  No  | Cliente vigente. Ver **Cliente** más abajo                                               |
| `proceduralRole`        | `ProceduralRole` |  No  | Debe corresponder al fuero de la causa                                                          |
| `legalQualifications`   | Object[]         |  No  | Solo en `CRIMINAL`. **Reemplaza la lista completa**; `[]` deja la causa sin calificaciones. Misma estructura y reglas que en el alta |
| `clientDetained`        | Boolean          |  No  | Solo en `CRIMINAL`                                                                              |
| `counterparty`          | String           |  Sí  | Solo en `ADMINISTRATIVE` y `AMPARO`. Hasta 255 caracteres                                      |
| `subjectMatter`         | String           |  No  | Solo en `ADMINISTRATIVE` y `AMPARO`. No vacío, hasta 800 caracteres                            |
| `injunctionGranted`     | Boolean          |  No  | Solo en `AMPARO`                                                                                |
| `harmfulActDate`        | String (fecha)   |  Sí  | Solo en `AMPARO`. No posterior a hoy. `null` borra el acto lesivo y, con él, sus datos asociados |
| `harmfulActRenews`      | Boolean          |  No  | Solo en `AMPARO`                                                                                |
| `harmfulActRenewalDays` | Integer          |  Sí  | Solo en `AMPARO`, con las mismas reglas que en el alta                                          |
| `harmfulActTermDays`    | Integer          |  Sí  | Solo en `AMPARO`, con las mismas reglas que en el alta                                          |
| `harmfulActTermDayType` | `DayType`        |  Sí  | Solo en `AMPARO`, con las mismas reglas que en el alta                                          |
| `administrativeRemedyExhaustedOn` | String (fecha) | Sí | Solo en `ADMINISTRATIVE`. No posterior a hoy. `null`: la vía no se agotó                  |
| `courtFeePaid`          | Boolean          |  No  | En los tres fueros                                                                              |
| `responsibleLawyerId`   | Integer          |  No  | Abogado vigente (RN3)                                                                           |
| `startDate`             | String (fecha)   |  Sí  | Mismas reglas que en el alta: obligatoria si la causa queda con SAC; `null` si queda sin SAC. No posterior a hoy |

**No se modifican** el fuero (`jurisdiction`), la carpeta (tiene su
propio endpoint), el estado procesal (lo mueven los actos), la prescripción y
su declaración (calculada y HU33) ni `active` (la baja es `DELETE`). Un campo
que no está en la tabla, `jurisdiction` incluido, responde
`400 VALIDATION_ERROR`. Si una causa se registró en el fuero equivocado, se da
de baja y se registra de nuevo; su SAC queda libre para eso.

**Reglas**

- **SAC.** Se puede agregar, corregir o quitar ("Opcional. Identifica la causa
  de forma única"). Un SAC que ya tiene otra causa vigente responde
  `409 CASE_SAC_ALREADY_EXISTS`; el de una causa dada de baja se puede usar
 . Quitar el SAC exige quitar también la fecha de inicio (`startDate` en
  `null`) en la misma petición, y agregarlo exige enviar `startDate` si la
  causa no la tiene: es la misma regla del alta.
- **Datos que no son del fuero.** Un dato propio de otro fuero responde
  `400 VALIDATION_ERROR`, igual que en el alta.
- **Cliente.** Se puede cambiar por otro cliente vigente. El backend no
  recalcula la carátula: como en el alta, la propone el cliente con el cliente
  nuevo y la envía en `caption`, en la misma petición. Si no la envía, la
  carátula queda como estaba. La hoja de carátula toma el cliente nuevo desde
  la próxima vez que se emita, porque no se guarda.
- **Responsable.** Cambiarlo cambia quién registra los actos de la causa desde
  la próxima petición. Los actos ya registrados conservan su
  `registeredBy`. La carpeta en Drive **se mueve** a la del nuevo abogado
  (`/VZ Causas/Causas/{abogado}/{fuero}/`), que se crea si no existe.
- **Carátula (`caption`).** Cambiarla **renombra** la carpeta de la causa en
  Drive, con las mismas reglas de nombre que al crearla.
- **Carpeta en Drive.** El movimiento y el cambio de nombre no hacen fallar la
  modificación: si Drive no responde, la causa se guarda igual y la carpeta
  queda donde estaba, con su nombre anterior; `folder.path` informa siempre la
  ubicación real. Se corrige reintentando
  [`POST /cases/{caseId}/folder`](#post-casescaseidfolder) o sola, con el
  proceso diario. Una causa sin la carpeta
  creada no tiene nada que mover.
- **Calificaciones legales.** Reemplazar la lista recalcula la prescripción en
  la siguiente lectura, porque nada se guarda calculado (§4, Prescripción).
  Los actos interruptivos de la causa siguen rigiendo para las calificaciones
  nuevas.
- **Acto lesivo.** Cambiar sus datos recalcula `harmfulActDeadline`.
- **Causa en estado terminal.** Se puede corregir —es el caso más común de una
  causa archivada con un dato mal cargado—, salvo lo que cambiaría su
  prescripción en una causa "Prescripta": `legalQualifications` responde
  `422 CASE_IN_TERMINAL_STATE`.

**Respuestas**

**`200 OK`**

Devuelve el recurso causa completo, igual que `GET /cases/{caseId}`.

```json
{
	"data": {
		"id": 1,
		"sacNumber": "13284571",
		"caption": "GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
		"court": "Fisc. de Distrito I, 3º turno",
		"jurisdiction": "CRIMINAL",
		"proceduralRole": "DEFENSA",
		"instructorName": "Dra. Verónica Ledesma",
		"...": "resto del recurso causa, sin cambios",
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
			"startDate": "Sin número de SAC la causa no tiene fecha de inicio."
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
			"jurisdiction": "El fuero de una causa no se puede modificar."
		}
	}
}
```

Un cuerpo sin ningún campo responde `400 VALIDATION_ERROR`, como en los demás
`PATCH` del contrato. Un `caseId` que no es un entero responde
`INVALID_PATH_PARAMETER`.

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

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "La causa está prescripta: no se pueden cambiar sus calificaciones legales.",
		"details": null
	}
}
```

---

#### `DELETE /cases/{caseId}`

Da de baja una causa (HU21), para retirar registros incorrectos o
duplicados.

**Rol requerido:** cualquier usuario autenticado (matriz de permisos, HU18 a
HU25).

La baja es **lógica** (RN12): el backend pone `active` en `false` y conserva la
causa con todos sus actos, actos interruptivos, carátula y expedientes, como
dice la nota del prototipo ("la causa sale de los listados activos pero se
conserva con todos sus actos y documentos").

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

Opcional. Es el "Motivo (opcional)" del formulario de baja:

```json
{
	"reason": "Causa duplicada: se registró dos veces con distinto SAC."
}
```

| Campo    | Tipo   | Requerido | Restricciones          |
| -------- | ------ | :-------: | ---------------------- |
| `reason` | String |    No     | Hasta 500 caracteres   |

Es el único `DELETE` del contrato con cuerpo. Sin cuerpo, la baja
procede igual. El motivo, el usuario y la fecha quedan registrados en la
auditoría de la causa; no hay endpoint para consultarlos, porque para el
cliente la causa deja de existir.

**Efectos de la baja**

- **Para el cliente la causa no existe** (§4, Bajas): `GET /cases/{caseId}` y
  todos sus subrecursos responden `404 CASE_NOT_FOUND`, y no aparece en
  `GET /cases` con ningún filtro. No hay reactivación por la API.
- **Deja de contar** en los `activeCases` de su abogado, su cliente y sus
  calificaciones legales, en los tableros y en el proceso diario, que no la
  verifica ni avisa por ella (§4, Proceso automático diario).
- **El SAC queda libre.** El SAC de una causa dada de baja se puede volver a
  registrar, en el alta o en la modificación de otra causa: es lo que permite
  cargar de nuevo, bien, una causa registrada mal. La causa dada
  de baja conserva su SAC en la base, y el SAC sigue siendo único entre las
  causas vigentes.
- **La carpeta en Drive no se toca**: no se borra, no se mueve ni se renombra.
  Los documentos son del estudio y RN9 pide conservarlos.
- **Cualquier estado.** Se puede dar de baja una causa en cualquier estado,
  incluidos los terminales: lo que se retira es un registro mal cargado, no una
  causa terminada.

**Respuestas**

**`204 No Content`**

La respuesta no contiene cuerpo. El prototipo vuelve al listado de causas.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"reason": "Debe tener hasta 500 caracteres."
		}
	}
}
```

Un `caseId` que no es un entero responde `INVALID_PATH_PARAMETER`.

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

Causa inexistente o ya dada de baja.

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

#### `GET /cases/{caseId}/cover`

Emite la hoja de carátula de la causa en PDF (HU24), para rotular el
expediente físico.

**Rol requerido:** cualquier usuario autenticado (matriz de permisos, HU18 a
HU25).

La genera el backend en cada pedido, con los datos vigentes de la causa: no se
guarda nada de la carátula. Es una hoja A4 con el logo del estudio y
seis recuadros, en mayúsculas, como las plantillas del estudio. Sirve para tres
cosas del prototipo:

- La **"Vista previa"** de la carátula al entrar a "Generar expediente".
- **Imprimir la carátula sola**, para rotular la carpeta de papel, que es lo
  que pide HU24.
- La **hoja 1 del expediente**: `POST /cases/{caseId}/case-files` usa la misma
  generación, con los dos datos que este endpoint deja vacíos (ver más
  abajo).

No usa la carpeta en Drive: funciona aunque la causa no tenga carpeta.

**Plantilla.** La elige el backend según el fuero: la penal en `CRIMINAL`, la
administrativa en `ADMINISTRATIVE` y en `AMPARO`. No se envía ni se
devuelve.

**Recuadros de la hoja**

> Los rótulos son los del prototipo y quedan **pendientes de confirmar contra
> las plantillas del estudio** (`Caratula penal.docx`, `Caratula penal
> QUERELLANTE.docx`, `Caratula administrativo.docx`): el equipo los va a
> enviar y la hoja usa los rótulos que tengan ellas.

| Recuadro de la hoja    | De dónde sale                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Expte. / SAC           | `sacNumber`. Vacío si la causa no tiene SAC                                                     |
| Autos                  | `caption`                                                                                      |
| Actor / querellante    | Según el fuero y el rol procesal, ver la tabla siguiente                                       |
| Demandado / imputado   | Según el fuero y el rol procesal, ver la tabla siguiente                                       |
| Órgano interviniente   | Dos líneas: `court` y "SECRETARIO/A: " + `instructorName`. El instructor de la causa es el secretario/a del órgano. Un dato `null` deja la línea con el rótulo solo |
| Observaciones          | **Vacío.** Se completa solo en el expediente, con las observaciones que envía el cliente       |

**Partes.** El backend las arma con los datos de la causa:

| Fuero y rol procesal                     | Actor / querellante                                      | Demandado / imputado                               |
| ---------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| `CRIMINAL`, `QUERELLANTE_PARTICULAR`     | `QUERELLANTE ({cliente})` y, en otra línea, `DEFENSOR: DR/DRA. {abogado}` | **Vacío**: el imputado no está en la causa; en el expediente lo envía el cliente |
| `CRIMINAL`, `DEFENSA`                    | **Vacío**: el querellante no está en la causa; en el expediente lo envía el cliente | `{cliente}` y, en otra línea, `DEFENSOR: DR/DRA. {abogado}` |
| `ADMINISTRATIVE` o `AMPARO`, rol `DEMANDADA` | `counterparty`                                       | `{cliente}`                                        |
| `ADMINISTRATIVE` o `AMPARO`, otro rol    | `{cliente}`                                              | `counterparty`                                     |

`{cliente}` es `APELLIDO NOMBRES` del cliente y `{abogado}`, el apellido y los
nombres del abogado responsable. El tratamiento es el prefijo fijo
`DR/DRA.`, igual para todos los abogados: el sistema no sabe si corresponde
"Dr." o "Dra." y el estudio prefirió no cargar ese dato. Es la única
excepción a que el nombre no lleve "Dr." ni "Dra.", porque esta hoja la
escribe el backend. Un dato `null` deja
su parte vacía.

Como nada se guarda, la hoja sigue siempre a los datos vigentes de la causa:
si se modifica el cliente, el rol procesal, el responsable, el instructor o la
contraparte, la próxima emisión ya lo refleja.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Parámetros de consulta**

| Parámetro     | Tipo    | Requerido | Valor por defecto | Descripción                                                                                           |
| ------------- | ------- | :-------: | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `disposition` | String  |    No     | `inline`          | `inline` para mostrarla en el navegador (vista previa, imprimir); `attachment` para descargarla        |

**Respuestas**

**`200 OK`**

El cuerpo es el PDF:

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="Caratula_13284571.pdf"
```

El nombre es `Caratula_{SAC}.pdf`, o `Caratula_causa-{id}.pdf` si la causa no
tiene SAC.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "INVALID_REQUEST",
		"message": "Parámetros de query inválidos.",
		"details": {
			"disposition": "Debe ser inline o attachment."
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

#### `GET /cases/{caseId}/timeline`

Obtiene la **línea de vida** de una causa (HU27): todo lo que le pasó, en un
solo listado. Es la fuente del "Ciclo de vida de la causa" del detalle.

**Rol requerido:** cualquier usuario autenticado, sobre cualquier causa (RN11).
No hace falta ser el abogado responsable.

Cada entrada tiene un `type`, una `date` y **el recurso tal como lo define su
propia sección**, sin cambios: el acto procesal de
[§3.8](#38-actos-procesales-casescaseidprocedural-acts), el acto interruptivo
de [§3.9](#39-actos-interruptivos-casescaseidinterruptive-acts) y el
`prescriptionDeclaration` de la causa.

Por eso el acto procesal de cada entrada suma `lastModifiedBy` y
`lastModifiedAt` (HU28), y el cliente puede mostrar "Modificado por … el …"
debajo de "Registrado por …". Después de modificar un acto, `current` puede
pasar a otro acto si cambió cuál es el más reciente (ver
[`PATCH /cases/{caseId}/procedural-acts/{actId}`](#patch-casescaseidprocedural-actsactid)).

| `type`                     | `date`                                 | Trae                       | Además                                                                                       |
| -------------------------- | -------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `PROCEDURAL_ACT`           | `actDate` del acto                     | `proceduralAct`            | `current`: `true` en el acto que llevó la causa a su estado actual. **Su plazo es el abierto**; los de los demás actos están cerrados |
| `INTERRUPTIVE_ACT`         | `actDate` del acto                     | `interruptiveAct`          | `governsPrescription`: `true` en el acto interruptivo más reciente, el que rige el cómputo de la prescripción |
| `PRESCRIPTION_DECLARATION` | `prescriptionDate` de la declaración   | `prescriptionDeclaration`  | —                                                                                            |

**Orden:** de la más reciente a la más antigua por `date`. Si dos entradas
tienen la misma fecha, primero la última registrada (`registeredAt`).

**Sin paginar, a propósito.** Es la segunda colección no paginada del
contrato, junto a `GET /cases/custom-states`. Una línea de vida incompleta es
incorrecta sin que nada lo delate: si se cortara en la página 1, los actos más
antiguos —y el acto interruptivo que quizás rige la prescripción— quedarían
afuera. La historia de una causa es acotada: pocas decenas de entradas.

Qué **no** aparece:
- El estado inicial ("Iniciada"): no lo originó ningún acto (ver `currentState`).
- En las causas que no son penales, actos interruptivos y prescripción: no
  aplican a esos fueros. Su línea de vida tiene solo actos procesales.
- Un acto interruptivo con fecha anterior a otro **sí aparece**, en su lugar
  cronológico y con `governsPrescription` en `false`: queda en la historia
  aunque no rija el cómputo.

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Respuestas**

**`200 OK`**

```json
{
	"data": [
		{
			"type": "PROCEDURAL_ACT",
			"date": "2026-09-15",
			"current": true,
			"proceduralAct": {
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
					"manuallyAdjusted": false,
					"manualTimeLimitDays": null
				},
				"registeredBy": { "id": 3, "lastName": "Ríos", "firstName": "Malena" },
				"registeredAt": "2026-09-15T11:42:00-03:00"
			}
		},
		{
			"type": "INTERRUPTIVE_ACT",
			"date": "2024-07-04",
			"governsPrescription": true,
			"interruptiveAct": {
				"id": 3,
				"caseId": 1,
				"name": "Indagatoria",
				"actDate": "2024-07-04",
				"notes": null,
				"registeredBy": { "id": 3, "lastName": "Ríos", "firstName": "Malena" },
				"registeredAt": "2026-09-10T09:15:00-03:00"
			}
		}
	]
}
```

Una causa sin actos devuelve `data` vacío: no es un error. La causa está en su
estado inicial.

**`400 Bad Request`**

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

#### `POST /cases/{caseId}/prescription`

Marca una causa penal como prescripta (HU33).

**Rol requerido:** `ADMINISTRATOR` o `LAWYER`. No hace falta ser el abogado
responsable de la causa: el prototipo habilita "Marcar prescripta" a los dos
perfiles sobre cualquier causa penal, y no a la Secretaría.

Es la acción "Marcar prescripta" del detalle, que el prototipo ofrece solo en
el fuero penal. Su nota dice qué hace: *"La causa pasa al estado Prescripta,
deja de figurar en los tableros y se cierran los plazos abiertos. Queda
accesible en el historial."*

HU33 pide que la causa se registre como prescripta **automáticamente** cuando
vence el plazo. El prototipo resuelve otra cosa: una acción manual que exige la
resolución que declara la prescripción. Este contrato sigue al prototipo: el proceso diario detecta el plazo cumplido (HU52), deja
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
sin calificación no puede prescribir. No se exige, en cambio, que el plazo
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
(HU39, HU40).

**Rol requerido:** cualquier usuario autenticado, igual que el alta de la
causa.

El prototipo no tiene un botón para esto: existe porque el alta de causa **no
falla** cuando el almacenamiento en la nube no responde, y hace falta una forma
de completar lo que quedó pendiente (ver
[Carpeta de la causa](#carpeta-de-la-causa)).
Cubre cinco situaciones, y una sexta:

| Situación de la causa                                         | Qué hace                                             |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `folder` en `null`: se registró antes de que existiera la carpeta | Crea la carpeta                                      |
| `folder.status` en `PENDING`: se registró sin carpeta         | Crea la carpeta                                      |
| `folder.status` en `ERROR`                                    | Reintenta la creación                                |
| `folder.status` en `CREATING`                                 | No hace nada: ya hay una creación en curso. Responde `200` con la carpeta tal como está |
| `folder.status` en `CREATED` con `templatesPending` mayor a `0` | Copia los modelos que faltan, si `copyTemplates` es `true` |
| `folder.status` en `CREATED`, con la carpeta en otro lugar o con otro nombre del que corresponde | La mueve a la carpeta del responsable y la renombra con la carátula vigentes: completa el cambio que Drive no aceptó durante un `PATCH` |

Espera el resultado igual que el alta, hasta el mismo límite del servidor: si la
creación falla a tiempo responde `502`; si no termina a tiempo responde `200` con
`folder.status` en `CREATING`, y el cliente ve el final con
`GET /cases/{caseId}`.

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
		"path": "/VZ Causas/Causas/Ríos, Malena/Penal/GÓMEZ, Ariel Fernando p.s.a. Robo calificado",
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

El recurso cubre el registro (HU26), su previsualización, la consulta (HU27) y
la modificación de un acto ([`PATCH /cases/{caseId}/procedural-acts/{actId}`](#patch-casescaseidprocedural-actsactid),
HU28), también reservada al abogado responsable. La baja de un acto ("Anular",
HU29) no forma parte del contrato.

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
| `lastModifiedBy`   | Object \| `null`              |  Sí  | Usuario que modificó el acto por última vez (HU28): `id`, `lastName` y `firstName`. `null` si nunca se modificó |
| `lastModifiedAt`   | String (ISO 8601) \| `null`   |  Sí  | Fecha y hora de la última modificación. `null` si nunca se modificó         |

`lastModifiedBy` y `lastModifiedAt` aparecen en todas las respuestas
que devuelven un acto procesal: el `POST` (con `null`), el listado, el `GET` de
un acto, el nuevo `PATCH` y la línea de vida. Son lo que el prototipo promete
al modificar ("El cambio queda asentado con usuario y fecha"). El historial
completo de cambios queda en la auditoría, sin endpoint.

**`deadline`**

| Campo              | Tipo                          | Descripción                                                                           |
| ------------------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| `timeLimitDays`    | Integer                       | Días del plazo según la tabla del fuero al momento del registro. `0` si no abre plazo |
| `dayType`          | `DayType`                     | Forma de cómputo según la tabla, al momento del registro                              |
| `countsFrom`       | String (fecha ISO 8601)       | Fecha desde la que corre el plazo: `notificationDate` en `ADMINISTRATIVE`, `actDate` en los demás |
| `computedDueDate`  | String (fecha ISO 8601) \| `null` | Vencimiento que resulta de la tabla. `null` si el estado no abre plazo            |
| `dueDate`          | String (fecha ISO 8601)       | Vencimiento vigente: el calculado o, si se ajustó, el manual                          |
| `manuallyAdjusted` | Boolean                       | `true` si `dueDate` se cargó a mano                                                   |
| `manualTimeLimitDays` | Integer \| `null`          | Días del plazo que resultan del vencimiento cargado a mano, contados según `dayType`. `null` si `manuallyAdjusted` es `false` o si `dayType` es `NONE` |

Los valores de la tabla se **copian** al acto: si luego se modifica el plazo
del estado procesal, este vencimiento no cambia (ver §3.4).

**`manualTimeLimitDays`**. `timeLimitDays` es siempre el plazo de la
tabla, así que no describe un vencimiento ajustado a mano. Para ese caso el
backend informa cuántos días hay desde `countsFrom` (excluido) hasta `dueDate`
(incluido), con la misma regla de [§4](#cómputo-de-días): días hábiles en
`BUSINESS`, días corridos en `CONSECUTIVE`. El cliente muestra el plazo como
`manualTimeLimitDays ?? timeLimitDays` y no lo calcula por su cuenta.

- Un acto con `dayType` `NONE` (estado escrito a mano, o estado que no abre
  plazo) no tiene unidad en la que contar: vale `null` aunque tenga vencimiento
  manual.
- Si la fecha manual cae en un día no hábil, cuenta igual que el día hábil
  anterior: desde el viernes 23/10/2026, tanto el viernes 30/10 como el sábado
  31/10 dan `5`.
- Como el cómputo no excluye feriados ni feria judicial, un vencimiento
  corrido a mano para salvar un feriado informa un día más que el plazo legal. Quién ajustó a mano
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

**Estados terminales.** Un acto procesal **puede llevar la
causa a un estado terminal**, como "Archivada": es la forma de cerrarla. La excepción es "Prescripta", que tiene su propio botón y su propio
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
   `computedDueDate`, y `manualTimeLimitDays` informa los días que da la
   fecha manual.
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
			"manuallyAdjusted": false,
			"manualTimeLimitDays": null
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
			"manuallyAdjusted": true,
			"manualTimeLimitDays": null
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

**Para la línea de vida de la causa** no se usa este listado sino
[`GET /cases/{caseId}/timeline`](#get-casescaseidtimeline), que la devuelve
completa, sin paginar y ya intercalada con los actos interruptivos.

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
				"manuallyAdjusted": false,
				"manualTimeLimitDays": null
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
			"manuallyAdjusted": false,
			"manualTimeLimitDays": null
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

#### `PATCH /cases/{caseId}/procedural-acts/{actId}`

Modifica los datos de un acto procesal registrado, para corregir
errores en la carga (HU28).

**Rol requerido:** abogado responsable de la causa, igual que el registro. Cualquier otro usuario, aunque tenga el rol `LAWYER` o
`ADMINISTRATOR`, recibe `403 FORBIDDEN`. Si después de registrar el acto la
causa cambió de responsable, lo modifica el responsable **actual**, no quien
lo registró.

Es el mismo formulario de "Registrar acto procesal", abierto desde "Modificar"
en un acto del ciclo de vida, con el título "Modificar acto procesal" y el
botón "Guardar cambios". El panel "Cómputo del plazo" sigue usando
[`deadline-preview`](#get-casescaseidprocedural-actsdeadline-preview).

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                           |
| --------- | ------- | ------------------------------------- |
| `caseId`  | Integer | Identificador único de la causa       |
| `actId`   | Integer | Identificador único del acto procesal |

**Cuerpo de la petición**

Todos los campos son opcionales, aunque debe enviarse al menos uno. Los campos
y sus restricciones son los del registro
([`POST`](#post-casescaseidprocedural-acts)):

```json
{
	"actDate": "2026-09-10",
	"notes": "Con acusación, pero con oposición. Se corrigió la fecha del acto."
}
```

Corrección del estado elegido, quitando el ajuste manual:

```json
{
	"proceduralStateId": 14,
	"manualDueDate": null
}
```

| Campo               | Tipo           | Nulo | Restricciones                                                                                    |
| ------------------- | -------------- | :--: | ------------------------------------------------------------------------------------------------ |
| `proceduralStateId` | Integer        |  No  | Estado vigente del fuero de la causa, salvo "Prescripta". Excluyente con `customState`           |
| `customState`       | String         |  No  | Hasta 255 caracteres. No puede coincidir con un estado vigente del fuero. Excluyente con `proceduralStateId` |
| `actDate`           | String (fecha) |  No  | No posterior a hoy                                                                               |
| `notificationDate`  | String (fecha) |  Sí  | Solo en `ADMINISTRATIVE`. Entre `actDate` y hoy. Obligatoria si el estado resultante abre plazo  |
| `manualDueDate`     | String (fecha) |  Sí  | Ajuste manual del vencimiento. `null` quita el ajuste y vuelve al calculado                      |
| `notes`             | String         |  Sí  | Hasta 2000 caracteres. `null` borra las observaciones                                            |

Las restricciones se validan sobre **el acto como queda después del cambio**:
por ejemplo, una `notificationDate` que ya estaba cargada tiene que seguir
siendo posterior o igual al `actDate` nuevo.

**Recálculo del plazo**

El `deadline` del acto se vuelve a calcular con las reglas del registro
([Cómputo del vencimiento](#post-casescaseidprocedural-acts)), con una
diferencia sobre **qué plazo de tabla se usa**:

- Si **cambia el estado** (`proceduralStateId` o `customState`), se toman el
  `timeLimitDays` y el `dayType` **vigentes hoy** en la tabla del estado
  nuevo, como en un registro nuevo.
- Si el estado **no cambia**, se conservan los que el acto copió al
  registrarse (§3.4: cambiar el plazo de un estado no recalcula vencimientos
  ya abiertos). Cambiar la fecha del acto o de notificación mueve el
  vencimiento con ese mismo plazo.
- Un ajuste manual (`manualDueDate`) que no se toca se conserva, aunque cambie
  la fecha del acto, siempre que siga sin ser anterior a la fecha desde la que
  corre el plazo; si queda anterior, `400 VALIDATION_ERROR` sobre
  `manualDueDate`.

**Efecto sobre la causa**

La causa está en el estado del acto con la **fecha de acto más reciente**. Después de modificar, el backend vuelve a aplicar esa regla:

- Si el acto modificado **es** el que rige el estado actual, la causa toma su
  estado y su vencimiento nuevos (`currentState`).
- Si un cambio de `actDate` hace que **otro** acto pase a ser el más reciente
  —o que este lo sea—, el estado actual pasa a ser el de ese acto. Así la
  corrección de una fecha no deja a la causa en un estado que ya no le
  corresponde.
- Si el acto que rige pasa a un **estado terminal**, la causa se cierra como
  con un registro. Si deja de serlo —se corrige un "Archivada" mal
  elegido—, la causa **vuelve a estar activa** y admite actos nuevos.
- Una causa **"Prescripta"** no admite modificar sus actos:
  `422 CASE_IN_TERMINAL_STATE`. La prescripción no la puso un acto, y corregir
  un acto no puede sacarla de ese estado.
- Una causa en otro estado terminal **sí** admite modificar sus actos: es la
  única forma de corregir el acto que la cerró.

`registeredBy` y `registeredAt` no cambian; `lastModifiedBy` y
`lastModifiedAt` pasan a ser el usuario y el momento de esta modificación.

**Respuestas**

**`200 OK`**

Devuelve el acto modificado, con el mismo recurso que el `POST`.

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
		"actDate": "2026-09-10",
		"notificationDate": null,
		"notes": "Con acusación, pero con oposición. Se corrigió la fecha del acto.",
		"deadline": {
			"timeLimitDays": 5,
			"dayType": "BUSINESS",
			"countsFrom": "2026-09-10",
			"computedDueDate": "2026-09-17",
			"dueDate": "2026-09-17",
			"manuallyAdjusted": false,
			"manualTimeLimitDays": null
		},
		"registeredBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"registeredAt": "2026-09-09T11:42:00-03:00",
		"lastModifiedBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"lastModifiedAt": "2026-09-15T09:20:00-03:00"
	}
}
```

El cliente vuelve al detalle de la causa y lo pide de nuevo: el estado actual
pudo haber cambiado.

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"proceduralStateId": "Elegí un estado de la tabla o escribí uno, no las dos cosas.",
			"manualDueDate": "No puede ser anterior a la fecha desde la que corre el plazo."
		}
	}
}
```

Un `caseId` o un `actId` que no son enteros responden `INVALID_PATH_PARAMETER`.

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
		"message": "Solo el abogado responsable de la causa puede modificar sus actos procesales.",
		"details": null
	}
}
```

**`404 Not Found`**

Causa inexistente o dada de baja (`CASE_NOT_FOUND`), o acto inexistente o de
otra causa:

```json
{
	"error": {
		"code": "PROCEDURAL_ACT_NOT_FOUND",
		"message": "No se encontró el acto procesal solicitado.",
		"details": null
	}
}
```

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "CASE_IN_TERMINAL_STATE",
		"message": "La causa está prescripta: sus actos procesales no se pueden modificar.",
		"details": null
	}
}
```

---

### 3.9 Actos interruptivos: /cases/{caseId}/interruptive-acts

**Autenticación requerida:** Sí.
**Rol requerido:** abogado responsable de la causa, para el registro. La
consulta es de cualquier usuario autenticado (RN11).

Un acto interruptivo **reinicia el cómputo de la prescripción** de la causa
desde su fecha (RN8, HU31). No mueve el estado procesal ni abre un plazo: en la
línea de tiempo el prototipo lo muestra como "No modifica el estado procesal",
con la marca "Acto interruptivo". Por eso es un recurso distinto del acto
procesal y no un acto procesal con una marca.

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
catálogo de actos interruptivos.

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
lectura.

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

Este listado es parte de HU27. Para la línea de vida de la causa no se
usa este listado sino [`GET /cases/{caseId}/timeline`](#get-casescaseidtimeline),
que ya los intercala con los actos procesales.

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
| `active`          | Boolean                |  No  | Estado de alta. Vale siempre `true`                                                  |

**Sobre `jurisdictions`:** el formulario de alta del prototipo permite elegir
varios fueros, con la opción "Todos los fueros". Un modelo cargado para más de
un fuero es **un solo modelo**, que aparece en la vista de cada uno de sus
fueros y se copia a las causas nuevas de todos ellos.

**Sobre `name`:** no puede haber dos modelos con el mismo nombre, sin distinguir
mayúsculas de minúsculas. El alta de un nombre repetido responde
`409 DOCUMENT_TEMPLATE_ALREADY_EXISTS`.

**Sobre `lastVersionAt` y `lastVersionBy`:** coinciden con el alta del modelo,
porque los modelos no se modifican por API.

**Sobre el tipo:** el prototipo muestra un tipo de escrito ("Escrito de fondo",
"Recurso"…), pero el modelo formal no tiene tipo.

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
| Registrar causa → "6 modelos parametrizados para el fuero Penal"    | `jurisdiction=CRIMINAL&copyToNewCases=true&limit=1`; el número es `pagination.totalItems`. Solo para Administrador y Abogado: a la Secretaría el formulario le muestra la casilla sin el número |

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
tamaño está acotado por la cantidad de causas activas del estudio. Se calculan en cada petición, así que
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
no hábiles. El calendario del tablero sombrea
los fines de semana.

---

#### `GET /dashboards/lawyer`

Obtiene el tablero del abogado: "Mi día" (HU41).

**Rol requerido:** `LAWYER`. El tablero es el del abogado vinculado al usuario
autenticado (su `lawyerId`); no recibe parámetros y no permite ver el de otro
abogado.

El alcance son **las causas de las que ese abogado es responsable**. El abogado
ve solo su tablero; si además es `ADMINISTRATOR`, también ve la pestaña
"Estudio".

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

### 3.12 Documentación de la causa: /cases/{caseId}/documents y /cases/{caseId}/case-files

**Autenticación requerida:** Sí.
**Rol requerido:** cualquier usuario autenticado para consultar los documentos
de la causa (HU38) y para generar el expediente (HU25). Descargar un documento
que no es un expediente requiere `LAWYER` o `SECRETARY`.

La documentación de una causa vive en **su carpeta de Drive** (HU39). Los
abogados y la secretaría suben ahí los escritos, las cédulas y los
comprobantes, directamente desde Drive; el sistema copia los modelos al crear
la carpeta y guarda ahí los expedientes que genera. Esta sección no sube
archivos: **lee** la carpeta y **genera** el expediente.

| Endpoint                                              | HU | Para qué                                                                 |
| ----------------------------------------------------- | -- | ------------------------------------------------------------------------ |
| `GET /cases/{caseId}/documents`                       | 38 | Tarjeta "Documentación" del detalle y lista de "Generar expediente"       |
| `GET /cases/{caseId}/documents/{documentId}/file`     | 38, 25 | Descargar un documento, o el expediente recién generado               |
| `POST /cases/{caseId}/case-files`                     | 25 | Generar el expediente en un único PDF                                    |

**Lectura directa de Drive.** La lista no se guarda en la base: se lee
de la carpeta en cada pedido, como dice el prototipo ("esta lista se lee de ahí
cada vez que abrís el detalle"). Lo que alguien suba, renombre o borre en Drive
se ve en el siguiente pedido. Para que el backend vea los archivos que **no
creó** —los que suben las personas— el backend opera con el permiso
`drive.readonly` además de `drive.file`, como anticipa
`ADR-003_GOOGLE_DRIVE.md` §4.1. Con `drive.file` solo, la
lista mostraría únicamente los modelos copiados y los expedientes generados.

El recurso documento posee la siguiente estructura:

| Campo        | Tipo                    | Nulo | Descripción                                                                                       |
| ------------ | ----------------------- | :--: | ------------------------------------------------------------------------------------------------- |
| `id`         | String                  |  No  | Identificador del archivo en Drive. Es opaco: el cliente no lo interpreta                         |
| `name`       | String                  |  No  | Nombre del archivo, con su extensión: `Cédula de notificación.pdf`                                |
| `extension`  | String \| `null`        |  Sí  | Extensión en minúsculas, sin punto: `pdf`, `docx`, `jpg`. `null` si el nombre no tiene, o si es un documento nativo de Google |
| `mimeType`   | String                  |  No  | Tipo del archivo según Drive: `application/pdf`                                                   |
| `sizeBytes`  | Integer \| `null`       |  Sí  | Tamaño en bytes. `null` en los documentos nativos de Google, que Drive no mide                    |
| `createdAt`  | String (ISO 8601)       |  No  | Fecha y hora en que se subió o creó en Drive                                                      |
| `modifiedAt` | String (ISO 8601)       |  No  | Fecha y hora de la última modificación en Drive                                                   |
| `uploadedBy` | String \| `null`        |  Sí  | Nombre de quien subió el archivo, tal como lo informa Drive. `null` si Drive no lo informa. No es un usuario del sistema: es una cuenta de Google |
| `url`        | String                  |  No  | Enlace para abrirlo en Drive (botón "Abrir")                                                      |
| `convertibleToPdf` | Boolean           |  No  | `true` si puede formar parte del expediente: PDF, Word (`.doc`, `.docx`), documento de Google o imagen JPG o PNG. Ver [`POST /cases/{caseId}/case-files`](#post-casescaseidcase-files) |
| `caseFile`   | Object \| `null`        |  Sí  | Si el archivo es un **expediente generado por el sistema**: `id` y `version`. `null` en los demás |

El prototipo muestra por cada documento un tipo ("PDF", "DOC", "IMG"), el
autor, la fecha y el peso. El tipo lo deriva el cliente de `extension` o de
`mimeType`; el autor es `uploadedBy`; la fecha, `createdAt`. El prototipo
rotula el autor como el abogado responsable o "Secretaría" según si el escrito
fue "Presentado" o "Recibido": esa clasificación **no existe en Drive** y no se
contrata.

---

#### `GET /cases/{caseId}/documents`

Consulta los documentos de la carpeta de la causa (HU38).

**Rol requerido:** cualquier usuario autenticado. La matriz de
permisos le niega "Consultar documentos de causa" al Administrador, pero el
equipo decidió abrírsela: sin la lista, un Administrador sin otro rol no
podría elegir los documentos de "Generar expediente", que la matriz sí le da.
Ver la lista no le da acceso a la carpeta en Drive ni le permite
descargar los documentos que no son expedientes.

Devuelve los archivos que están directamente en la carpeta de la causa, sin
entrar en subcarpetas y sin las subcarpetas mismas, ordenados del más reciente
al más antiguo por `createdAt`. No incluye lo que está en la papelera de Drive.

**No está paginado**: la carpeta de una causa tiene decenas de
archivos, no miles, y la lista del prototipo los muestra todos con
desplazamiento. Es la cuarta colección no paginada del contrato (§5.1).

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Respuestas**

**`200 OK`**

La respuesta es un objeto, no una lista, porque lleva además la situación de
la carpeta y el momento de la lectura ("Sincronizado con Drive · 10:42"):

| Campo          | Tipo                 | Descripción                                                                  |
| -------------- | -------------------- | ---------------------------------------------------------------------------- |
| `folderStatus` | `CaseFolderStatus` \| `null` | El `folder.status` de la causa. `null` si la causa no tiene carpeta (registrada antes de que existiera la carpeta) |
| `folderUrl`    | String \| `null`     | El `folder.url` de la causa, para "Abrir carpeta en Drive"                    |
| `readAt`       | String (ISO 8601) \| `null` | Momento en que se leyó la carpeta. `null` si no se leyó porque no está creada |
| `documents`    | Object[]             | Los documentos. Vacío si la carpeta está vacía o no está creada               |

```json
{
	"data": {
		"folderStatus": "CREATED",
		"folderUrl": "https://drive.google.com/drive/folders/1Qw8zT3nKcVb5LhXy2RmPd7sUeJ4oAfG9",
		"readAt": "2026-09-15T10:42:00-03:00",
		"documents": [
			{
				"id": "1b7Hc3kQp9Wm2xYzR4tVnLs8dFgA0eJuK",
				"name": "Cédula de notificación.pdf",
				"extension": "pdf",
				"mimeType": "application/pdf",
				"sizeBytes": 90112,
				"createdAt": "2026-09-09T12:15:00-03:00",
				"modifiedAt": "2026-09-09T12:15:00-03:00",
				"uploadedBy": "Gestión Estudio",
				"url": "https://drive.google.com/file/d/1b7Hc3kQp9Wm2xYzR4tVnLs8dFgA0eJuK/view",
				"convertibleToPdf": true,
				"caseFile": null
			},
			{
				"id": "1Zt5Np0aQe8Lr3Ku6Vb1Xc9Hj2Mf7Wd4S",
				"name": "Requerimiento de elevación a juicio.pdf",
				"extension": "pdf",
				"mimeType": "application/pdf",
				"sizeBytes": 421888,
				"createdAt": "2026-09-02T16:03:00-03:00",
				"modifiedAt": "2026-09-02T16:03:00-03:00",
				"uploadedBy": "Malena Ríos",
				"url": "https://drive.google.com/file/d/1Zt5Np0aQe8Lr3Ku6Vb1Xc9Hj2Mf7Wd4S/view",
				"convertibleToPdf": true,
				"caseFile": null
			},
			{
				"id": "1Qd2Rf8Hs4Lk7Mn0Pb3Vc6Xz9Wa5Ty1Ue",
				"name": "Expediente_13284571_v1.pdf",
				"extension": "pdf",
				"mimeType": "application/pdf",
				"sizeBytes": 768000,
				"createdAt": "2026-08-20T09:30:00-03:00",
				"modifiedAt": "2026-08-20T09:30:00-03:00",
				"uploadedBy": "VZ Causas",
				"url": "https://drive.google.com/file/d/1Qd2Rf8Hs4Lk7Mn0Pb3Vc6Xz9Wa5Ty1Ue/view",
				"convertibleToPdf": true,
				"caseFile": {
					"id": 4,
					"version": 1
				}
			}
		]
	}
}
```

Si la carpeta no está creada (`folderStatus` en `PENDING`, `CREATING` o
`ERROR`, o `null`), la respuesta es `200` con `documents` vacío y `readAt` en
`null`: el cliente ofrece crearla o reintentarla con
[`POST /cases/{caseId}/folder`](#post-casescaseidfolder).

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

Drive no respondió. El cliente muestra la tarjeta sin lista y permite
reintentar.

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo leer la carpeta de la causa en Drive. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

#### `GET /cases/{caseId}/documents/{documentId}/file`

Descarga un archivo de la carpeta de la causa a través de la API (HU38, HU25).

**Rol requerido:**

| Archivo                                             | Rol                            |
| --------------------------------------------------- | ------------------------------ |
| Un expediente generado por el sistema (`caseFile` no `null`) | Cualquier usuario autenticado: lo pudo generar cualquiera (HU25) |
| Cualquier otro documento                            | `LAWYER` o `SECRETARY` (HU38)  |

Existe por el mismo motivo que la descarga de modelos: un enlace de
Drive no respeta los perfiles del sistema, y un usuario que solo es
`ADMINISTRATOR` no tiene acceso a la carpeta del estudio en Drive. Es lo
que usan "Descargar" e "Imprimir" del diálogo "Expediente generado". "Abrir"
en la tarjeta "Documentación" usa `url`, que abre Drive.

Los documentos nativos de Google (documentos, hojas de cálculo) se descargan
exportados a PDF.

**Parámetros de ruta**

| Parámetro    | Tipo    | Descripción                                             |
| ------------ | ------- | ------------------------------------------------------- |
| `caseId`     | Integer | Identificador único de la causa                         |
| `documentId` | String  | `id` del documento, tal como lo devolvió el listado     |

**Parámetros de consulta**

| Parámetro     | Tipo   | Requerido | Valor por defecto | Descripción                                                               |
| ------------- | ------ | :-------: | ----------------- | ------------------------------------------------------------------------- |
| `disposition` | String |    No     | `attachment`      | `attachment` para descargar; `inline` para abrirlo en el navegador e imprimirlo |

**Respuestas**

**`200 OK`**

El cuerpo es el archivo, con su `Content-Type` y su nombre:

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="Expediente_13284571_v2.pdf"
```

**`401 Unauthorized`**, **`403 Forbidden`** (un documento que no es un
expediente, pedido por un usuario sin `LAWYER` ni `SECRETARY`) y **`404 Not
Found`** (`CASE_NOT_FOUND`) como en el listado.

**`404 Not Found`**

El archivo no existe, se borró de Drive o **no está en la carpeta de esta
causa**. La API no descarga archivos de otras carpetas aunque se conozca su
`id`.

```json
{
	"error": {
		"code": "DOCUMENT_NOT_FOUND",
		"message": "No se encontró el documento en la carpeta de la causa.",
		"details": null
	}
}
```

**`502 Bad Gateway`**

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo descargar el documento de Drive. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

#### `POST /cases/{caseId}/case-files`

Genera el **expediente** de la causa: un único PDF, para imprimir, con la
carátula y los documentos que el usuario elige, en el orden que define (HU25).

**Rol requerido:** cualquier usuario autenticado (matriz de permisos, HU18 a
HU25).

Es la pantalla "Generar expediente" del prototipo:

1. **Carátula**, siempre primera. Se genera igual que
   [`GET /cases/{caseId}/cover`](#get-casescaseidcover), con los datos de la
   causa, más las observaciones y, en el fuero penal, la parte que no está
   registrada en la causa, que envía el cliente en `cover`. No se elige
   ni se quita.
2. **Documentos de la causa**, los que el usuario incluye, en el orden de la
   lista ("Arrastrá para cambiar el orden"). Los que no son PDF se convierten
   ("Se convierte a PDF").

El resultado se **guarda como nueva versión** en la carpeta de la causa
("Quedó guardado como nueva versión en la documentación de la causa y en su
carpeta de Drive. Las versiones anteriores se conservan").

**Parámetros de ruta**

| Parámetro | Tipo    | Descripción                    |
| --------- | ------- | ------------------------------ |
| `caseId`  | Integer | Identificador único de la causa |

**Cuerpo de la petición**

Causa penal con el cliente como defensa:

```json
{
	"cover": {
		"opposingParty": "QUERELLANTE: PERALTA Juan Carlos\nAPODERADO: DR. Martín Sosa",
		"notes": "Causa conexa en DI T6"
	},
	"documentIds": [
		"1Zt5Np0aQe8Lr3Ku6Vb1Xc9Hj2Mf7Wd4S",
		"1b7Hc3kQp9Wm2xYzR4tVnLs8dFgA0eJuK"
	]
}
```

Amparo, sin observaciones:

```json
{
	"documentIds": [
		"1Vd2Kp8sLq4Wx7Zn0Rb3Ty6Uh9Me5Gc1J"
	]
}
```

| Campo         | Tipo     | Requerido | Restricciones                                                                                   |
| ------------- | -------- | :-------: | ----------------------------------------------------------------------------------------------- |
| `cover`       | Object   |    No     | Lo que la hoja de carátula necesita y la causa no tiene. Ver estructura más abajo              |
| `documentIds` | String[] |    Sí     | Al menos uno ("Elegí al menos un documento"), sin repetir. Cada uno, un documento de la carpeta de esta causa que no sea un expediente (`caseFile` en `null`). Uno con `convertibleToPdf` en `false` responde `422 DOCUMENT_NOT_CONVERTIBLE`. El orden de la lista es el orden del expediente |

**`cover`** (cuerpo de la petición)

| Campo           | Tipo   | Requerido | Restricciones                                                                                    |
| --------------- | ------ | :-------: | ------------------------------------------------------------------------------------------------ |
| `opposingParty` | String |    No     | Solo en `CRIMINAL`. La parte que no está registrada en la causa: el querellante si el cliente es `DEFENSA`, el imputado si es `QUERELLANTE_PARTICULAR`. Hasta 500 caracteres, con saltos de línea. Va al recuadro vacío de la hoja (ver [Partes](#get-casescaseidcover)). Sin él, ese recuadro queda vacío. En otro fuero responde `400 VALIDATION_ERROR` |
| `notes`         | String |    No     | Recuadro "Observaciones". Hasta 500 caracteres. Sin él, el recuadro queda vacío                  |

La pantalla "Generar expediente" pide la parte porque la causa no la registra:
de las partes de una causa penal, la causa solo conoce al cliente. Nada de
`cover` se guarda en la causa: el próximo expediente lo vuelve a pedir.
El texto se imprime en mayúsculas, tal como llega.

**Reglas**

- **Un expediente no se incluye en otro.** Los expedientes anteriores no se
  ofrecen en la lista del prototipo; el contrato lo valida.
- **Conversión.** PDF, tal cual. Word (`.doc`, `.docx`) y documentos de Google,
  convertidos con Drive. Imágenes JPG y PNG, una por hoja, ajustadas a A4. Otro
  tipo responde `422 DOCUMENT_NOT_CONVERTIBLE`.
- **Nombre y versión.** El archivo se llama `Expediente_{SAC}_v{n}.pdf`, o
  `Expediente_causa-{id}_v{n}.pdf` si la causa no tiene SAC. `n` empieza en `1`
  y sube con cada expediente que se genera de esa causa; lo lleva el sistema,
  así que borrar un expediente en Drive no reutiliza su número.
- **Se guarda en la carpeta de la causa.** La causa necesita la carpeta
  creada (`folder.status` en `CREATED`); si no, `422 CASE_FOLDER_NOT_AVAILABLE`.
  La carátula sola no la necesita: `GET /cases/{caseId}/cover`.
- **Sincrónico.** La respuesta llega con el expediente ya generado y guardado.
  Si Drive falla al leer un documento o al guardar el resultado, no queda nada
  a medias: `502 DOCUMENT_STORAGE_UNAVAILABLE` y no se consume el número de
  versión. Cuánto puede tardar o pesar un expediente es un punto abierto
 .
- **No cambia la causa.** Generar un expediente no mueve el estado ni toca la
  carátula.

**Respuestas**

**`201 Created`**

Devuelve el expediente generado: el recurso documento de la carpeta, con sus
partes en orden. Con `id` el cliente lo descarga o lo imprime con
[`GET /cases/{caseId}/documents/{documentId}/file`](#get-casescaseiddocumentsdocumentidfile).

| Campo       | Tipo              | Descripción                                                                                 |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `document`  | Object            | El PDF guardado, con la estructura del recurso documento. `caseFile` trae `id` y `version`  |
| `version`   | Integer           | Número de versión del expediente                                                            |
| `pageCount` | Integer           | Cantidad de hojas del PDF                                                                   |
| `parts`     | Object[]          | Las partes, en orden: `position` (desde `1`), `kind` (`COVER` o `DOCUMENT`), `documentId` (`null` en la carátula) y `name` |
| `generatedBy` | Object          | Usuario que lo generó: `id`, `lastName` y `firstName`                                       |
| `generatedAt` | String (ISO 8601) | Fecha y hora de la generación                                                             |

```json
{
	"data": {
		"document": {
			"id": "1Hn6Tq2Wz8Ce4Rb0Yv5Ux3Ma7Kd9Lp1Gs",
			"name": "Expediente_13284571_v2.pdf",
			"extension": "pdf",
			"mimeType": "application/pdf",
			"sizeBytes": 574464,
			"createdAt": "2026-09-15T10:48:00-03:00",
			"modifiedAt": "2026-09-15T10:48:00-03:00",
			"uploadedBy": "VZ Causas",
			"url": "https://drive.google.com/file/d/1Hn6Tq2Wz8Ce4Rb0Yv5Ux3Ma7Kd9Lp1Gs/view",
			"convertibleToPdf": true,
			"caseFile": {
				"id": 5,
				"version": 2
			}
		},
		"version": 2,
		"pageCount": 9,
		"parts": [
			{ "position": 1, "kind": "COVER", "documentId": null, "name": "Carátula" },
			{ "position": 2, "kind": "DOCUMENT", "documentId": "1Zt5Np0aQe8Lr3Ku6Vb1Xc9Hj2Mf7Wd4S", "name": "Requerimiento de elevación a juicio.pdf" },
			{ "position": 3, "kind": "DOCUMENT", "documentId": "1b7Hc3kQp9Wm2xYzR4tVnLs8dFgA0eJuK", "name": "Cédula de notificación.pdf" }
		],
		"generatedBy": {
			"id": 3,
			"lastName": "Ríos",
			"firstName": "Malena"
		},
		"generatedAt": "2026-09-15T10:48:00-03:00"
	}
}
```

Con `version`, `parts` y `document.sizeBytes` el cliente arma el diálogo
"Expediente generado": "Versión 2 · 3 partes · 561 KB".

**`400 Bad Request`**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"documentIds": "Elegí al menos un documento."
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
			"documentIds": "Un documento no está en la carpeta de la causa o es un expediente anterior."
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
			"cover": "La parte de la carátula solo corresponde al fuero penal."
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

**`422 Unprocessable Content`**

```json
{
	"error": {
		"code": "CASE_FOLDER_NOT_AVAILABLE",
		"message": "La causa no tiene su carpeta en Drive creada. Creala antes de generar el expediente.",
		"details": null
	}
}
```

```json
{
	"error": {
		"code": "DOCUMENT_NOT_CONVERTIBLE",
		"message": "Uno de los documentos no se puede convertir a PDF.",
		"details": null
	}
}
```

**`502 Bad Gateway`**

```json
{
	"error": {
		"code": "DOCUMENT_STORAGE_UNAVAILABLE",
		"message": "No se pudo generar el expediente porque Drive no respondió. Intentá de nuevo en unos minutos.",
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

La tabla es la matriz de permisos del 11/10/2026, la misma que figura en la
Definición del Producto V2, §5.1. La **consulta** de abogados está
abierta a los tres perfiles; su **administración** (alta, modificación y baja)
es solo del Administrador.

Esta versión es la primera en la que la matriz **restringe la lectura** de algo:
los modelos formales y los tableros no están abiertos a los tres perfiles.

Dos apartamientos de la matriz, decididos por el equipo:

- **Consultar documentos de causa (HU38).** La matriz dice "—" para el
  Administrador, pero generar el expediente (HU25), que se arma eligiendo
  documentos, es de los tres. El equipo abrió la **lista** a los tres perfiles
 . La descarga de un documento que no es un expediente sigue siendo de
  `LAWYER` o `SECRETARY`.
- **Descargar Modelo Formal (HU23).** Figura dentro de "Gestionar causas"
  (HU18 a HU25), abierta a los tres, pero descarga modelos formales: quien no
  puede ver los modelos no los descarga. Por eso queda restringida a
  `ADMINISTRATOR` o `LAWYER`.

**Actos procesales.** Las filas marcadas con ¹ se restringen además a cada
causa: solo el abogado responsable opera sus actos. Ningún otro abogado ni el
`ADMINISTRATOR` puede hacerlo sobre una causa ajena.

#### Matriz por recurso

| Recurso                            | Lectura (`GET`)               | Escritura                                                        |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `/auth`                            | -                             | Cualquier usuario autenticado (`logout`, `password`)             |
| `/users`                           | `ADMINISTRATOR`               | `ADMINISTRATOR`                                                  |
| `/lawyers`                         | Cualquier usuario autenticado | `ADMINISTRATOR`                                                  |
| `/procedural-states`               | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/legal-qualifications`            | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/clients`                         | Cualquier usuario autenticado | Cualquier usuario autenticado                                    |
| `/cases`                           | Cualquier usuario autenticado | Cualquier usuario autenticado, también `PATCH` y `DELETE` |
| `/cases/{caseId}/cover`            | Cualquier usuario autenticado | -                                                       |
| `/cases/{caseId}/prescription`     | -                             | `ADMINISTRATOR` o `LAWYER`                                       |
| `/cases/{caseId}/folder`           | -                             | Cualquier usuario autenticado                                    |
| `/cases/{caseId}/procedural-acts`  | Cualquier usuario autenticado; `deadline-preview`, solo el abogado responsable | Abogado responsable de la causa, también `PATCH` |
| `/cases/{caseId}/interruptive-acts` | Cualquier usuario autenticado | Abogado responsable de la causa                                 |
| `/cases/{caseId}/documents`        | Cualquier usuario autenticado; la descarga de un documento que no es un expediente, `LAWYER` o `SECRETARY` | -  |
| `/cases/{caseId}/case-files`       | -                             | Cualquier usuario autenticado                           |
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

**Excepciones al JSON.** Estos endpoints manejan archivos y no usan JSON en uno
de sus sentidos:

| Operación                                                                                    | Qué cambia                                                                       |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `POST /document-templates`                                                                   | El **cuerpo** es `multipart/form-data`, con el archivo en el campo `file`. La respuesta es JSON |
| `GET /document-templates/{templateId}/file`                                                  | La **respuesta** exitosa es el archivo, con su `Content-Type` y `Content-Disposition: attachment`. Los errores son JSON |
| `GET /cases/{caseId}/cover`                                                          | La **respuesta** exitosa es un PDF (`application/pdf`), `inline` por defecto. Los errores son JSON |
| `GET /cases/{caseId}/documents/{documentId}/file`                                    | La **respuesta** exitosa es el archivo, `attachment` por defecto. Los errores son JSON |

Las dos descargas nuevas aceptan el parámetro `disposition` (`inline`
o `attachment`); la de modelos no cambia. Con `inline` el navegador muestra el
PDF y el cliente puede imprimirlo, que es lo que hace "Imprimir" en el
prototipo.

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
excluyen, lo que deja
resuelto por ahora el pendiente P-02 de la arquitectura de backend. Si más
adelante se incorporan, cambiarán los valores calculados, no la estructura del
contrato.

### Prescripción

- **Solo el fuero `CRIMINAL`** computa prescripción: los amparos no prescriben,
  y una causa penal sin calificación legal tampoco. En los demás fueros,
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
  se refleja de inmediato.

### Carpeta de la causa

HU39 y HU40. El almacenamiento en la nube es Google Drive (RNF 6), en la
**cuenta de Gmail de gestión del estudio**, que es la dueña de todas las
carpetas que crea el sistema.

- **Cómo actúa el backend.** Con una autorización que alguien del estudio
  otorga **una sola vez**, iniciando sesión con la cuenta de gestión y aceptando
  los permisos. El backend la guarda en su configuración y opera en nombre de
  esa cuenta; nadie del equipo necesita su contraseña.
- **Estructura.** `/VZ Causas/Causas/{abogado}/{fuero}/{carátula}`. `Causas` es la carpeta raíz de causas del estudio (CA-39.3): ninguna carpeta de causa se crea fuera de ella:

  | Nivel      | Qué es                                                                                   | Ejemplo                                        |
  | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
  | `abogado`  | El abogado responsable de la causa, como `Apellido, Nombres`. Sigue al responsable y al nombre vigentes | `Ríos, Malena` |
  | `fuero`    | El rótulo en castellano del fuero                                                        | `Penal`, `Administrativo`, `Amparo`            |
  | `carátula` | La carátula de la causa (`caption`), tal como está registrada                            | `GÓMEZ, Ariel Fernando p.s.a. Robo calificado` |

  Las carpetas del abogado y del fuero las crea el sistema la primera vez que
  hacen falta. El nombre de la carpeta de la causa es **solo la carátula**: no
  lleva el identificador interno ni el número de SAC, que puede no existir al
  registrar la causa. Se le quitan los caracteres que la nube no admite
  (`/ \ : * ? " < > |` y los de control), se juntan los espacios repetidos y se
  corta en 255 caracteres, así que `GÓMEZ, Ariel c/ PÉREZ` queda como
  `GÓMEZ, Ariel c PÉREZ`. Por eso `folder.path` es un dato para mostrar, no para
  separar en partes. Dos causas con la misma carátula tienen carpetas distintas.
- **Modelos formales.** Viven en `/VZ Causas/Modelos formales`, fuera de las
  carpetas de los abogados y de `Causas`.
- **Quién accede.** El sistema **comparte la carpeta raíz `VZ Causas`** con el
  correo de cada usuario vigente que tenga el rol `LAWYER` o `SECRETARY`, como
  editor; todo lo que hay adentro hereda ese acceso. Son los perfiles que
  consultan documentos de causa según la matriz de permisos; un usuario que solo
  es `ADMINISTRATOR` no recibe acceso. Ese usuario ve la lista de
  documentos por la API, pero no entra a Drive. El correo con que se
  registra al usuario tiene que ser de una cuenta de Google: es la que recibe
  el acceso. El acceso se da y se quita solo, con el
  alta, la modificación y la baja de usuarios (ver
  [§3.2](#32-gestión-de-usuarios-users)), y el proceso diario lo revisa.
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
- **La carpeta sigue a la causa**:

  | Cambio                                                        | Qué pasa en Drive                                                         |
  | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
  | Cambia la carátula (`PATCH /cases/{caseId}`)                  | Se renombra la carpeta de la causa, con las mismas reglas de nombre       |
  | Cambia el responsable (`PATCH /cases/{caseId}`)               | La carpeta de la causa se mueve a `/{nuevo abogado}/{fuero}/`, que se crea si no existe |
  | Cambia el nombre de un abogado (`PATCH /lawyers/{lawyerId}`)  | Se renombra la carpeta del abogado. Las de sus causas quedan adentro      |
  | Se da de baja la causa (`DELETE /cases/{caseId}`)             | Nada                                                                      |

  El fuero no cambia, así que una carpeta nunca cambia de carpeta de
  fuero. Mover y renombrar no necesitan más permisos que `drive.file`, porque
  la app creó esas carpetas; lo que las personas subieron adentro se mueve con
  ellas. **Si Drive no responde, la modificación no falla**: se guarda igual y
  la carpeta queda como estaba, `folder.path` informa dónde está realmente, y
  se corrige al reintentar `POST /cases/{caseId}/folder` o con el proceso
  diario. Es el mismo criterio que la creación (R-03).
- **Qué hay adentro.** Los modelos copiados. El resto de la documentación la
  suben los abogados y la secretaría directamente a Drive. Además, los
  expedientes que genera el sistema (HU25).
- **Lectura de los documentos.** `GET /cases/{caseId}/documents` lee la
  carpeta en cada pedido. Para ver lo que suben las personas, el
  backend opera con el permiso `drive.readonly` además de `drive.file`
  (ADR-003 §4.1).

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
| Ajustar     | 19, 14 | Revisa que las carpetas de las causas y de los abogados tengan el nombre y la ubicación que corresponden, y corrige los movimientos y cambios de nombre que Drive no aceptó en su momento |

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
  de 3 días hábiles, corrida a las 08:00 y copia al responsable.
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
  causas como prescriptas: eso lo hace una persona (HU33).

El aviso "no reemplaza el control del abogado responsable": los tableros
muestran lo mismo sin depender del correo.

El proceso tiene que correr todos los días; cómo se garantiza depende del
mecanismo de ejecución programada del despliegue (R-01 de la arquitectura de
backend).

### Bajas

Las bajas de usuarios, abogados, estados procesales, calificaciones legales y
**causas** (HU21) son **lógicas**: el backend establece el campo
`active` en `false` y conserva el registro por trazabilidad (RN12).

Una causa dada de baja arrastra a sus subrecursos: actos procesales e
interruptivos, línea de vida, carátula, documentos y expedientes responden
`404 CASE_NOT_FOUND`, porque la causa que los contiene no existe para el
cliente. La causa no figura en los tableros ni en los conteos, y su SAC queda
libre: es único solo entre las causas vigentes (ver
[`DELETE /cases/{caseId}`](#delete-casescaseid)).

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

Las colecciones no paginadas son tres casos acotados: `GET /cases/custom-states`,
que devuelve una lista corta de textos en `data`; `GET /cases/{caseId}/timeline`,
la línea de vida de una causa, que tiene que llegar completa para ser correcta; y las listas que vienen **dentro** de un tablero (`GET /dashboards/lawyer`
y `GET /dashboards/administrator`), cuyo tamaño está limitado por la cantidad de
causas activas del estudio. Se suma una cuarta: `documents` dentro de
`GET /cases/{caseId}/documents`, acotada a lo que hay en la carpeta de una
causa.

**GET — Archivo**

`GET /document-templates/{templateId}/file` no devuelve un sobre `data`: su
cuerpo es el archivo (ver [Formato de intercambio](#formato-de-intercambio)).
Lo mismo `GET /cases/{caseId}/cover` y
`GET /cases/{caseId}/documents/{documentId}/file`.

**DELETE**

Responde `204 No Content`, sin cuerpo. `DELETE /cases/{caseId}` es el
único que acepta un cuerpo, opcional, con el motivo de la baja.

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
| `DOCUMENT_NOT_FOUND`                     | 404  | Documento inexistente, borrado de Drive o que no está en la carpeta de la causa |
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
| `CASE_IN_TERMINAL_STATE`                 | 422  | Acto procesal, acto interruptivo o marca de prescripción sobre una causa en estado terminal. También: modificar un acto de una causa "Prescripta", o cambiar el fuero o las calificaciones legales de una causa "Prescripta" |
| `CASE_FOLDER_NOT_AVAILABLE`              | 422  | Generar el expediente de una causa sin su carpeta en Drive creada |
| `DOCUMENT_NOT_CONVERTIBLE`               | 422  | Un documento elegido para el expediente no se puede convertir a PDF |
| `PRESCRIPTION_NOT_APPLICABLE`            | 422  | **Nuevo.** Acto interruptivo o marca de prescripción sobre una causa que no es del fuero penal, o marca de prescripción sobre una causa sin calificaciones legales |
| `PROCEDURAL_STATE_PROTECTED`             | 422  | **Nuevo.** Modificación o baja del estado de sistema "Prescripta"  |
| `BUSINESS_RULE_VIOLATION`                | 422  | Violación de una regla de negocio                                  |
| `TOO_MANY_LOGIN_ATTEMPTS`                | 429  | Bloqueo progresivo por intentos fallidos. Exclusivo de `POST /auth/login` |
| `TOO_MANY_REQUESTS`                      | 429  | Límite de pedidos por dirección IP superado                        |
| `INTERNAL_SERVER_ERROR`                  | 500  | Error interno inesperado                                           |
| `DOCUMENT_STORAGE_UNAVAILABLE`           | 502  | **Nuevo.** El almacenamiento en la nube (Google Drive) no respondió. También al leer los documentos, descargarlos o generar el expediente |

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
| `413`  | `Content Too Large`     | Archivo más grande que el máximo admitido               |
| `422`  | `Unprocessable Content` | Violación de una regla de negocio                       |
| `429`  | `Too Many Requests`     | Límite de frecuencia superado (ver §4)                  |
| `500`  | `Internal Server Error` | Error interno inesperado                                |
| `502`  | `Bad Gateway`           | Un servicio externo del que depende la operación no respondió |

Los códigos `400` y `422` no son intercambiables: `400` indica que los datos
enviados son inválidos y corresponde señalarlos en el formulario; `422` indica
que los datos son válidos pero la operación no puede realizarse por una regla
de negocio, y corresponde informarlo como aviso.

El `429` trae siempre el encabezado `Retry-After` (segundos) y el mismo valor
en `details.retryAfterSeconds`. Puede aparecer en cualquier endpoint, no solo
en `/auth` — ver [Límite de frecuencia](#límite-de-frecuencia).

El `502` distingue una falla **ajena al sistema** —el
almacenamiento en la nube— de un error propio (`500`).
Para el cliente significa "no es un problema de los datos ni del sistema:
reintentar más tarde". No todas las operaciones que usan esos servicios
responden `502`: el alta de causa nunca lo hace, porque registra la causa y
deja la carpeta pendiente (ver [Carpeta de la causa](#carpeta-de-la-causa)).
