# CLAUDE.md — Frontend de VZ Causas

Sistema de gestión para un estudio jurídico. Este archivo dice **cómo se trabaja
adentro de un módulo** (`src/features/<módulo>/`). El resto ya está documentado:
no lo repito, leelo.

## Antes de escribir código, leé

1. `frontend/docs/ESTRUCTURA.md` — el mapa general, las tres reglas entre
   carpetas, los nombres y qué épica corresponde a qué módulo.
2. `frontend/src/shared/README.md` — todos los componentes compartidos, el
   cliente HTTP y `ApiError`. Tiene su propia guía para Claude al final.
3. `frontend/src/shared/mocks/README.md` — **antes de escribir cualquier
   llamada a la API**. Tiene las divergencias del contrato y cómo disparar cada
   error.
4. `docs/api contract v1.md` — la fuente de verdad del backend. Si un documento
   y el contrato no coinciden, manda el contrato.

## Reglas que no se negocian

- **No inventes endpoints.** Si lo que te piden necesita un endpoint que no está
  en el contrato, frená y preguntá. Hoy el contrato sólo cubre `auth`, `users`,
  `lawyers` y `procedural-states`.
- **No traigas código de otros proyectos** (componentes, estilos, hooks). Este
  proyecto tiene su propio sistema de diseño en `shared/` y `styles/`.
- **No mezcles patrones.** Si ya existe una forma de hacer algo, seguila.
- **No uses `react-hook-form` ni instales `zod`.** `react-hook-form` está
  instalado pero nadie lo usa, y `zod` figura en `ESTRUCTURA.md` pero no está
  instalado. Es una decisión pendiente del equipo. Hasta entonces, formularios
  controlados como `FormModal` (`values` + `onChange`).
- **Si el build o el lint fallan por algo que no tocaste, avisá.** No lo
  arregles al paso.
- **Código en inglés** (archivos, tipos, funciones, props, clases CSS).
  **Textos de pantalla y comentarios en castellano**, con el vocabulario del
  estudio: causa, fuero, SAC, acto procesal. Ver `ESTRUCTURA.md` §8.
- **Imports siempre con el alias `@`**, nunca con `../../..` para salir del
  módulo.

## Stack instalado

React 19 + TypeScript + Vite · React Router · TanStack Query · axios (sólo a
través de `http`) · MSW (sólo para los mocks) · CSS global con clases `vz-*` y
tokens `var(--vz-*)` · lint con **oxlint**.

---

## Anatomía de un módulo

Las seis carpetas existen siempre, aunque estén vacías (con `.gitkeep`):

```
features/users/
├── types/        user.ts
├── api/          users.api.ts · users.keys.ts · useUsers.ts · useUser.ts
│                 useCreateUser.ts · useUpdateUser.ts · useDeleteUser.ts
├── schemas/      user.schema.ts
├── utils/        buildUserPatch.ts · toCreateUserBody.ts
├── components/   UsersTable.tsx · UserFormModal.tsx
└── pages/        UsersPage.tsx
```

El ejemplo es `users` porque es el único recurso con el CRUD completo en el
contrato. En otro módulo, **creá sólo los hooks de los endpoints que existan**:
`lawyers`, por ejemplo, hoy sólo tiene `POST`.

Dependencias permitidas dentro del módulo, en una sola dirección:

```
pages, components  →  api, schemas, utils, types
api, schemas, utils  →  types
types  →  (nada)
```

Hacia afuera: el módulo puede usar `shared/` y `domain/`. **Nunca importa de
otro módulo ni de `@/shared/mocks`.**

### `types/` — las formas de los datos

Un archivo por entidad, sacado del contrato. Separá las formas, porque no es lo
mismo lo que llega que lo que se manda:

| Tipo | Qué es |
|---|---|
| `User` | El recurso tal como viene dentro de `data` |
| `CreateUserBody` | El cuerpo del `POST` (sin `id`, sin campos que genera el backend) |
| `UpdateUserBody` | El cuerpo del `PATCH`: todo opcional |
| `UserFormValues` | Los valores del formulario. Sólo `string` y `boolean`, porque es lo que admite `FormValues` de `FormModal`. Nunca `undefined` |

Los valores cerrados (roles, fueros) van como unión de literales **y** como
arreglo tipado con esa unión, así el arreglo deja de compilar si la unión
cambia.

**No copies los tipos de `shared/mocks/contract.ts`**: los mocks son sólo para
desarrollo. Escribilos en el módulo a partir del contrato.

### `api/` — todo lo que habla con el servidor

**`<plural>.api.ts`** — una función por endpoint.
- Siempre con `http` de `@/shared/api/http`. Nunca `fetch` ni `axios` directo.
- **Sacá el envoltorio del contrato**: para un recurso devolvé `data`; para una
  colección, `{ data, pagination }`. Ni los hooks ni las páginas tienen que
  saber que existe axios ni que la respuesta viene envuelta.
- No sabe de React, de caché ni de pantallas.

**`<plural>.keys.ts`** — las claves de caché, en jerarquía:

```
all       → ['users']
lists()   → ['users', 'list']
list(p)   → ['users', 'list', p]        p = página, límite y filtros
details() → ['users', 'detail']
detail(id)→ ['users', 'detail', id]
```

Los listados son paginados y filtrables: **los parámetros van en la clave**, si
no, dos páginas distintas pisan la misma entrada de caché. Nadie escribe una
clave a mano fuera de este archivo.

**Un hook por archivo**, y el archivo se llama igual que el hook
(`useUser.ts` exporta `useUser`).
- Consultas: `useQuery`. La consulta por id lleva `enabled` para no salir con
  un id inválido.
- Mutaciones: `useMutation`, y **son responsables de dejar la caché bien**
  después de escribir. No se delega a la página:

| Mutación | Detalle | Listados |
|---|---|---|
| Alta | Sembrar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Edición | Reemplazar `detail(id)` con lo que devolvió el servidor | Invalidar `lists()` |
| Baja | **Remover** `detail(id)` (invalidarlo dispara un GET que da 404) | Invalidar `lists()` |

Invalidá `lists()` y no `list(p)`: una alta o una baja cambia todas las
páginas, no sólo la que está en pantalla.

Si hay baja **en lote**, usá `Promise.allSettled` y devolvé `{ deleted, failed }`:
una baja puede fallar sola (`409` si tiene dependencias, `422` si viola una
regla) y no tiene que cancelar las demás.

El `queryClient` ya está configurado (no reintenta mutaciones, `staleTime`
60 s). No crees otro.

**Acá no van mocks.** Los mocks son compartidos y viven en `shared/mocks/`. Si
tu módulo necesita un endpoint que el mock no tiene, se agrega ahí, siguiendo
su README.

### `schemas/` — validación de los formularios

`<entidad>.schema.ts`. Mientras no se decida lo de `zod`, son **funciones
puras** que reciben los valores del formulario y devuelven un error por campo:
`Partial<Record<keyof UserFormValues, string>>`. Así, el día que entre `zod`,
cambia el interior del archivo y no dónde está.

Es la primera barrera, no la única: el backend también valida y devuelve sus
errores campo por campo en los `400` (ver `pages/`).

### `utils/` — transformaciones del módulo

Funciones puras, sin React y sin HTTP:

- **De formulario a cuerpo de alta** (`toCreateUserBody`): recorta espacios y
  convierte `''` en "no se mandó".
- **De formulario a cuerpo de edición** (`buildUserPatch`): compara con el
  original y devuelve **sólo lo que cambió**, recortando antes de comparar. Si
  no cambió nada, no se manda: el contrato responde `400` a un `PATCH` vacío.
- **Mapas de presentación** que usa más de una pantalla del módulo, por ejemplo
  estado → tono de `Pill`.

**Las reglas jurídicas no van acá.** Cómputo de plazos, prescripción, actos
interruptivos, estados por fuero: todo eso va en `src/domain/`, sin React.

### `components/` — piezas del módulo

Tablas, formularios y modales de este módulo, aunque los use una sola pantalla
(así lo fija `ESTRUCTURA.md`). **Antes de crear uno, buscá en
`shared/README.md`**, en la tabla "Si necesitás X, usá Y". Si algo de `shared`
casi sirve, se extiende ahí; no se duplica.

### `pages/` — una pantalla por ruta

La página **orquesta**: llama a los hooks, guarda el estado de la pantalla
(página actual, filtros, qué modal está abierto) y arma todo con componentes.
No llama al servidor directo.

- **Patrón de listado:** `PageHeader` → `Panel` con los filtros en `actions` →
  `DataTable` → `FormModal` para alta, edición y confirmación de baja.
- **La paginación y los filtros viven en la página** y se pasan al hook como
  parámetros; `DataTable` no pagina ni filtra.
- **Un solo estado por modo.** Por ejemplo, "qué modal está abierto y con qué
  registro" es un estado, no dos booleanos que se pueden contradecir.
- **Errores del servidor** (siempre llegan como `ApiError`):
  - para ramificar, `e.is('CODIGO')` o los getters (`isConflict`,
    `isBusinessRule`, `isNotFound`…). **Nunca compares `e.message`.**
  - para marcar campos, `e.fieldError('campo')` en los `400`. Un conflicto que
    es de un campo (usuario repetido, matrícula repetida) se muestra **en ese
    campo**, no en un aviso suelto.
  - para mostrar, `e.message`: ya viene en castellano. No escribas mensajes de
    error genéricos propios.
- **Avisos:** `useToast()` de `@/app/providers/ToastContext`.
  `success` para lo que se creó o se guardó, `info` para una baja (salió bien,
  pero no es un logro), `error` para lo que falló.

---

## Enchufar un módulo nuevo

1. Registrar las páginas en `src/app/router/index.tsx`.
2. Si falta, agregar el ítem en `src/app/layouts/AppLayout.tsx`.
3. Si el mock no tiene el endpoint, agregarlo en `src/shared/mocks/`.

## Verificar

- `npm run lint` (oxlint) y `npm run build` desde `frontend/`.
- Para desarrollar sin backend: `VITE_USE_MOCKS=true` en `.env.local`.
- Ojo: `getToken()` en `http.ts` devuelve `null` hasta que exista el login, así
  que contra los mocks todo endpoint protegido responde `401`. Está documentado
  en `shared/README.md`, en Observaciones.

## Checklist de un módulo

1. Tipos a partir del contrato.
2. `.api.ts`, sacando el envoltorio `{ data }`.
3. `.keys.ts` con los parámetros del listado en la clave.
4. Hooks, uno por archivo, con la caché resuelta en cada mutación.
5. Validación en `schemas/` y transformaciones en `utils/`.
6. Componentes del módulo, después de revisar `shared/README.md`.
7. Página, ruta y, si falta, ítem del menú.
8. Lint y build.
