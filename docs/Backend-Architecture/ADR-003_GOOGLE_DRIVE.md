# ADR-003 — Uso de Google Drive como almacenamiento documental

| Campo        | Valor                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------- |
| Estado       | Aceptada                                                                                  |
| Fecha        | 14/10/2026                                                                                |
| Subsistema   | `documents` (con un puerto desde `identity`)                                              |
| Historias    | HU34, HU35, HU39, HU40 (Sprint 3). Anticipa HU38 (Sprint 4)                                |
| Relacionado  | `ARQUITECTURA_BACKEND_V1.md` (ADR-001, §6, R-03) · `API_CONTRACT_V4.md` (D-62, D-63, D-88, D-89) |

Continúa la numeración de los ADR de `ARQUITECTURA_BACKEND_V1.md`: ADR-001
(monolito modular) y ADR-002 (excepción de `reporting`).

---

## 1. Contexto

RNF 6 exige que la documentación de cada causa viva en Google Drive, organizada
por causa y accesible desde cualquier lugar. El contrato del Sprint 3
(`API_CONTRACT_V4.md`) fija qué tiene que hacer el sistema:

- crear la carpeta de cada causa en `/VZ Causas/{abogado}/{fuero}/{carátula}`;
- copiar en ella los modelos formales del fuero;
- guardar los modelos formales y permitir descargarlos;
- dar acceso a la carpeta del estudio a los usuarios con rol Abogado o
  Secretaría, y quitárselo cuando dejan de serlo.

Las restricciones son:

- **El estudio usa una cuenta de Gmail común**, la de gestión, que es la que
  tiene que ser dueña de todo. Cada abogado tiene su propia cuenta de Gmail.
  No hay Google Workspace y el presupuesto es nulo.
- **La arquitectura ya resolvió la forma** (ADR-001, §6): Drive es un detalle
  reemplazable detrás de un puerto, y su falla no puede abortar el alta de una
  causa (R-03).

De la documentación de Google surgen cuatro hechos que condicionan la decisión:

| Hecho | Fuente |
| --- | --- |
| Una cuenta de servicio no tiene espacio en Drive: *"Service accounts don't have storage quota in Drive"* | Drive API, *Transfer file ownership* |
| Las unidades compartidas son de Google Workspace; una cuenta de Gmail común solo tiene "Mi unidad" | Drive Help |
| Con la app en estado *Testing*, el refresh token vence a los 7 días | Google Identity, *OAuth 2.0* |
| `drive.file` es un permiso **no sensible** y da acceso archivo por archivo: a lo que la app crea o abre. `drive` y `drive.readonly` son **restringidos** | Drive API, *Choose Drive API scopes* |

---

## 2. Decisión

**El backend opera sobre el "Mi unidad" de la cuenta de gestión mediante la
Drive API v3, con una autorización OAuth 2.0 que el estudio otorga una sola vez,
y comparte la carpeta raíz con las cuentas de Google de los usuarios.**

### 2.1 Autorización

> **Corregido 19/10/2026 (N-10, `IMPLEMENTACION_NOTIFICACIONES.md`).** Esta
> sección describía originalmente un cliente OAuth propio de `documents`,
> con su propio script de autorización. Esa parte quedó obsoleta: se
> decidió **un único cliente OAuth compartido**, con los dos scopes
> (`drive.file` + `gmail.send`) pedidos juntos en una sola autorización, un
> solo refresh token para toda la app. Lo construyó mmachuca en
> `shared/infrastructure/google/` para HU30/HU32 porque este subsistema
> (`documents`) todavía no había arrancado. El detalle de cómo consumirlo
> está en `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md` — leerlo antes de escribir
> el adaptador de Drive. Lo que sigue de esta sección es la parte que
> **no** cambió.

- Un proyecto de Google Cloud del equipo, con la Drive API habilitada y una
  pantalla de consentimiento **externa** publicada **"In production"**. En
  *Testing* el refresh token vence a los 7 días y la integración se cortaría
  sola cada semana.
- Un cliente OAuth de tipo **aplicación de escritorio**, usado solo por el
  script de autorización compartido (`npm run google:authorize`, ver
  `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md` §2) — no por uno propio de `documents`.
- **Permiso: `https://www.googleapis.com/auth/drive.file`.** Es no sensible y
  alcanza para todo el Sprint 3: la app crea las carpetas, sube los modelos y
  hace las copias, y por lo tanto tiene acceso a todo eso.
- **Alguien del estudio autoriza una vez** con la cuenta de gestión. El
  *refresh token* resultante es un secreto del servidor. El backend lo canjea
  por permisos de una hora en cada operación; la librería oficial lo hace sola.
- Nadie del equipo conoce ni guarda la contraseña de la cuenta de gestión.

### 2.2 Estructura y propiedad

```text
VZ Causas/                                   ← raíz, creada por el script de autorización
├── Modelos formales/                        ← los .docx de HU34
├── Ríos, Malena/                            ← abogado responsable (Apellido, Nombres)
│   └── Penal/                               ← rótulo del fuero
│       └── GÓMEZ, Ariel Fernando p.s.a. Robo calificado/   ← carátula
│           ├── designacion-defensor.docx    ← copias de los modelos (HU40)
│           └── …                            ← lo que suben los abogados a mano
└── Peralta, Ignacio/
    └── Administrativo/
        └── PEREYRA, Marcos D. — Sumario administrativo/
```

- La cuenta de gestión es dueña de todo lo que crea el sistema.
- **Todo se referencia por identificador de Drive**, guardado en la base, nunca
  por nombre ni por ruta. Si alguien renombra o mueve una carpeta a mano, el
  sistema sigue funcionando. `folder.path` del contrato es solo informativo.
- Las carpetas del abogado y del fuero se crean la primera vez que hacen falta,
  y su identificador se reutiliza después.

### 2.3 Acceso de los usuarios

- La carpeta raíz se comparte como **editor** (`role: writer`, `type: user`) con
  el correo de cada usuario vigente con rol `LAWYER` o `SECRETARY`. Los permisos
  de Drive se heredan (*"All child files and folders automatically inherit
  permissions from their parent folder"*), así que una sola concesión por
  usuario cubre todas las causas, actuales y futuras. Es RN11: todo el estudio
  ve todas las causas.
- Un usuario que solo es `ADMINISTRATOR` no recibe acceso: la matriz de
  permisos no le da documentos de causa.
- Se comparte con el aviso de Google activado, que es el comportamiento por
  defecto: el abogado recibe el correo de "se compartió contigo".
- El correo tiene que ser de una cuenta de Google. Si no lo es, Drive rechaza
  el permiso y el acceso queda pendiente (C-45 del contrato).

### 2.4 Dónde vive cada pieza

**`documents`** es el único subsistema que habla con Drive. Expone casos de uso;
ninguno devuelve tipos de la librería de Google.

| Caso de uso (`documents`)   | Lo invoca                             | Drive API                                         |
| --------------------------- | ------------------------------------- | ------------------------------------------------- |
| `CreateCaseFolder`          | `cases`, por `CaseFolderPort`         | `files.create` (carpetas) y `files.copy` (modelos) |
| `RegisterDocumentTemplate`  | controlador HTTP de `documents`       | `files.create` con el archivo, carga reanudable   |
| `DownloadDocumentTemplate`  | controlador HTTP de `documents`       | `files.get` con `alt=media`, en *streaming*       |
| `GrantStudioFolderAccess`   | `identity`, por `StudioFolderAccessPort` | `permissions.create` sobre la raíz             |
| `RevokeStudioFolderAccess`  | `identity`, por `StudioFolderAccessPort` | `permissions.delete` sobre la raíz             |
| `SyncStudioFolderAccess`    | `identity`, desde su disparador diario | `permissions.list`, y luego altas y bajas por diferencia |

Puerto de salida propio de `documents`, que es lo único que conoce Google:

```ts
// documents/core/domain/ports/cloud-storage.port.ts
export interface CloudStoragePort {
  createFolder(name: string, parentId: string): Promise<CloudFolder>;    // { id, webViewLink }
  copyFile(fileId: string, parentId: string, name: string): Promise<CloudFile>;
  uploadFile(name: string, parentId: string, content: Readable, mimeType: string): Promise<CloudFile>;
  downloadFile(fileId: string): Promise<Readable>;
  grantWriter(folderId: string, email: string): Promise<void>;
  revokeAccess(folderId: string, email: string): Promise<void>;
  listUserAccess(folderId: string): Promise<string[]>;                   // correos con acceso directo
}
```

Implementaciones: `GoogleDriveStorageAdapter` (producción, con `googleapis`) y
`InMemoryCloudStorage` (pruebas).

**Sentido de las dependencias.** `identity` decide quién debe tener acceso y le
pide a `documents` que lo aplique; `documents` nunca consulta usuarios. Así no
hay una dependencia circular entre módulos. La revisión diaria la dispara un
adaptador de entrada programado de `identity` (§6.4 de la arquitectura): calcula
la lista de correos que corresponden y llama a `SyncStudioFolderAccess`, que
compara con los permisos actuales de la raíz y corrige solo la diferencia. La
cuenta dueña nunca se toca.

Puertos nuevos en el mapa de §6.3 de la arquitectura:

| Consumidor | Proveedor   | Puerto                   | Motivo                                                       |
| ---------- | ----------- | ------------------------ | ------------------------------------------------------------ |
| `identity` | `documents` | `StudioFolderAccessPort` | Dar, quitar y reconciliar el acceso a la carpeta del estudio |

### 2.5 Fallas, reintentos y datos

- **Complementario, como dice R-03.** Ni el alta de una causa ni el alta, la
  modificación o la baja de un usuario fallan por Drive. La causa queda con la
  carpeta `PENDING` y se reintenta con `POST /cases/{caseId}/folder`; el acceso
  de un usuario lo corrige la revisión diaria.
- **Atómico donde el contrato lo exige.** El alta de un modelo formal (CA-34.7)
  sube el archivo primero y registra el modelo después: si la subida falla, no
  queda nada y responde `502 DOCUMENT_STORAGE_UNAVAILABLE`. Si falla el registro
  en la base, se borra el archivo recién subido.
- **Reintentos dentro de la operación.** Ante un error transitorio de Drive
  (5xx, `429`, `403 rateLimitExceeded` o `userRateLimitExceeded`, o un corte de
  red), hasta 3 intentos con espera exponencial antes de dar la operación por
  fallida.
- **Autorización perdida.** Si Google responde `invalid_grant` —el token se
  revocó, o pasaron seis meses sin usarse—, todo lo que use Drive queda
  pendiente o responde `502`, y se registra un error de severidad alta: hay que
  repetir la autorización (§2.6). Ningún dato del estudio se pierde.
- **Carpeta borrada a mano.** Si Drive responde `404` sobre una carpeta que la
  base tiene registrada, se marca pendiente y el reintento la vuelve a crear.
- **Carreras.** Dos causas del mismo abogado y fuero creadas a la vez podrían
  duplicar la carpeta intermedia. Se evita con una restricción de unicidad en la
  base sobre la carpeta intermedia (abogado y fuero) y creando dentro de una
  transacción: el que pierde reutiliza el identificador del que ganó.
- **Carga de archivos.** Drive limita la carga simple y la multiparte a 5 MB, y
  el contrato admite modelos de hasta 10 MB: se usa la **carga reanudable**.

Tablas que escribe `documents` (§4.4 de la arquitectura):

| Tabla                     | Qué guarda                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `drive_folders`           | Carpetas de estructura: raíz, modelos, abogado y fuero. Tipo, clave única e identificador de Drive |
| `case_folders`            | Carpeta de cada causa: identificador de Drive, enlace, ruta informativa y estado (`CREATED`, `PENDING`) |
| `document_templates`      | Modelos formales, con el identificador del archivo en Drive                         |
| `document_template_copies`| Qué modelo se copió a qué causa, y el identificador de la copia. Da `templatesCopied`, `templatesPending` y `usageCount` |

### 2.6 Puesta en marcha y configuración

> **Corregido 19/10/2026 (N-10).** No hay un script `drive:authorize`
> propio: la autorización corre una sola vez para toda la app con
> `npm run google:authorize` (`backend/scripts/google-authorize.ts`,
> detallado en `GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md` §2), y entrega
> `GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` para **todo Google**, Drive
> incluido — no hace falta correrlo de nuevo si `deadlines` ya lo hizo en
> ese entorno. Lo que ese script **no hace** es crear `VZ Causas` ni
> `VZ Causas/Modelos formales`: eso sigue siendo tarea de `documents`, a
> resolver con una rutina propia (extender el script, o un comando de
> arranque que use `CloudStoragePort` una vez el adaptador exista) que
> imprima `GOOGLE_DRIVE_ROOT_FOLDER_ID`/`GOOGLE_DRIVE_TEMPLATES_FOLDER_ID`.

Variables de entorno. Reemplazan a `GOOGLE_DRIVE_CREDENTIALS`, que §7.6 de la
arquitectura había previsto para una cuenta de servicio:

```text
GOOGLE_OAUTH_CLIENT_ID              # compartido con `deadlines` — ver GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
GOOGLE_OAUTH_CLIENT_SECRET           # ídem
GOOGLE_OAUTH_REFRESH_TOKEN          # ídem, secreto: nunca en el repositorio ni en los logs
GOOGLE_DRIVE_ROOT_FOLDER_ID          # propias de `documents`, pendientes (arriba)
GOOGLE_DRIVE_TEMPLATES_FOLDER_ID
```

Como el resto de la configuración (§7.6), la presencia se valida al arrancar y
el formato, en el constructor del adaptador.

**Entornos.** Desarrollo y pruebas usan **otro proyecto de Google Cloud**
(`vzcausas-dev`), nunca la cuenta del estudio ni su proyecto de producción.
Dentro de ese proyecto de desarrollo, **cada integrante autoriza con su
propia cuenta de Gmail de prueba** — mismo `GOOGLE_OAUTH_CLIENT_ID/SECRET`
para todos (agregados como *test user* por quien administra el proyecto),
pero cada uno con su propio `GOOGLE_OAUTH_REFRESH_TOKEN`, obtenido corriendo
`npm run google:authorize` él mismo (detalle paso a paso en
`GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md` §2). Las pruebas automáticas usan
`InMemoryCloudStorage`; la integración real se prueba a mano, cada uno
contra su propia cuenta.

---

## 3. Alternativas evaluadas

| Alternativa | Por qué se descartó |
| --- | --- |
| **Cuenta de servicio** | No tiene espacio en Drive, así que no puede ser dueña de los archivos. Compartirle una carpeta de la cuenta de gestión tampoco alcanza: lo que crease seguiría siendo suyo, sin espacio |
| **Google Workspace con unidad compartida** | Es la solución de fondo: los archivos son del estudio y no de cada abogado, la app puede ser interna y no hace falta verificación. Es paga y choca con el presupuesto nulo. Queda como evolución si el cliente la acepta |
| **Delegación de dominio** | Solo existe en Google Workspace |
| **Pedir ya `drive` o `drive.readonly`** | Son restringidos y dan acceso a todo el Drive de la cuenta de gestión, incluido lo que no tiene que ver con el sistema. Para el Sprint 3 no hace falta: se pide el permiso mínimo |
| **Compartir carpeta por carpeta, solo con el responsable** | Contradice RN11 y obliga a mover permisos cada vez que cambia el responsable |
| **Compartir la raíz a mano, una vez** | Funciona, pero el acceso no seguiría a las altas y bajas de usuarios. El equipo eligió que lo haga el sistema (D-88 del contrato) |
| **Guardar los archivos fuera de Drive** (base de datos, almacenamiento de objetos) | Contradice RNF 6 y le quita al estudio la posibilidad de trabajar en Drive como hoy |

---

## 4. Consecuencias

**Lo que se gana**

- Costo cero, y la cuenta y los archivos siguen siendo del estudio.
- El permiso pedido es el mínimo y no sensible: no requiere verificación de
  Google.
- Los abogados trabajan en Drive con sus propias cuentas, como ya lo hacen.
- Drive queda encapsulado en un adaptador de `documents`. Pasar a Google
  Workspace, o a otro almacenamiento, cambia ese adaptador y la puesta en marcha,
  no los casos de uso ni el contrato.

**Lo que se paga, y cómo se mitiga**

| Riesgo | Mitigación |
| --- | --- |
| **Lo que sube un abogado a mano es de su cuenta** y ocupa su espacio (*"add your own files into a folder that someone else shared with you and those files will use your storage"*). Si el abogado borra su cuenta o los archivos, desaparecen de la causa. Con Gmail común el traspaso a la cuenta del estudio requiere que el abogado lo acepte | Explicárselo al cliente. Política del estudio: traspasar la propiedad al dejar el estudio. Solución de fondo: Workspace |
| **Un solo punto de falla:** la autorización de la cuenta de gestión. Se pierde si alguien la revoca o si pasan seis meses sin uso | El sistema la usa todos los días, por la revisión diaria. Ante `invalid_grant`, nada se pierde: queda pendiente y se avisa. Procedimiento documentado: correr de nuevo `drive:authorize` |
| **15 GB** de la cuenta de gestión, compartidos con su correo y sus fotos | Lo que crea el sistema pesa poco: modelos y copias. Lo que suben los abogados ocupa su propio espacio |
| **El refresh token da acceso a lo que creó la app** | Se guarda como secreto, nunca en el repositorio ni en los logs. Con `drive.file` no alcanza al resto del Drive de la cuenta |
| **Correos que no son de Google** no pueden recibir acceso | Exigir o verificar cuentas de Google al registrar usuarios (C-45) |

### 4.1 Evolución prevista: HU38 (Sprint 4)

Consultar los documentos de la causa implica listar archivos que suben los
abogados a mano, y **`drive.file` no los ve** porque no los creó la app. Listar
una carpeta es simple (`files.list` con `'ID' in parents`); lo que cambia es el
permiso:

- Se agrega **`drive.readonly`**, que es restringido, y la cuenta de gestión
  autoriza de nuevo una vez.
- La app queda sin verificar, amparada en la excepción de **uso personal** de
  Google: *"If the app is for your personal use (fewer than 100 users), you and
  your limited number of users can continue using the app without going
  through verification (users will be allowed to click through 'unverified
  app' warning screens during sign-in)"*. Autoriza una sola cuenta, la de
  gestión, que acepta una vez el aviso de "app no verificada".
- Es una excepción de política, no una garantía. Si VZ Causas se ofreciera a
  otros estudios, haría falta la verificación de permisos restringidos, con su
  auditoría de seguridad anual.
- Alternativa, si el estudio prefiere no ampliar el permiso: que los documentos
  se suban desde VZ Causas. Así los crea la app y siguen dentro de `drive.file`,
  lo que además resuelve el riesgo de propiedad.

La decisión se toma al planificar HU38; este ADR deja preparado el camino: el
puerto ya existe y la reautorización es un paso del script de puesta en marcha.

---

## 5. Fuentes

- Google Identity — *Using OAuth 2.0 to Access Google APIs* (vencimiento del
  refresh token): https://developers.google.com/identity/protocols/oauth2
- Google Identity — *OAuth 2.0 for iOS & Desktop Apps* (redirección *loopback*):
  https://developers.google.com/identity/protocols/oauth2/native-app
- Google Identity — *OAuth production readiness*:
  https://developers.google.com/identity/protocols/oauth2/production-readiness/overview
- Google Cloud — *When is verification not needed*:
  https://support.google.com/cloud/answer/13464323
- Drive API — *Choose Google Drive API scopes*:
  https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Drive API — *Share files, folders, and drives*:
  https://developers.google.com/workspace/drive/api/guides/manage-sharing
- Drive API — *permissions.create*:
  https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions/create
- Drive API — *Transfer file ownership*:
  https://developers.google.com/workspace/drive/api/guides/transfer-file
- Drive API — *Search for files and folders*:
  https://developers.google.com/workspace/drive/api/guides/search-files
- Drive API — *Upload file data*:
  https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Google Drive Help — *How your Google storage works*:
  https://support.google.com/drive/answer/9312312
- Google Drive Help — *Share files with non-Google Accounts*:
  https://support.google.com/drive/answer/6033939
