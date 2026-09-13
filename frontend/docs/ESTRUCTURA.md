# Estructura del frontend — VZ Causas

Este documento explica cómo está organizado el código del frontend: qué hay en cada
carpeta, qué va adentro de cada una y por qué. La idea es que cualquiera del equipo
sepa dónde buscar algo y, sobre todo, dónde poner lo que escribe.

Si tenés una duda del tipo "¿esto dónde va?", saltá a la sección
[Dónde pongo esto](#6-dónde-pongo-esto).

---

## 1. El stack

Lo acordado en el Sprint 0:

| Qué | Con qué |
|---|---|
| Librería de interfaz | React + TypeScript |
| Empaquetador | Vite |
| Ruteo | React Router |
| Datos del servidor | TanStack Query |
| Formularios | React Hook Form |
| Validación | Zod |
| Estilos | CSS propio con variables (tokens) |

El backend es aparte (Node + Express + Prisma + Postgres) y se consume por HTTP.

---

## 2. Mapa general

```
frontend/
├── docs/                 este documento y lo que se escriba sobre el front
├── public/               archivos que se sirven tal cual (favicon, imágenes fijas)
└── src/
    ├── app/              el armado de la aplicación
    │   ├── router/       las rutas y los permisos de acceso
    │   ├── layouts/      los marcos de pantalla (con menú, sin menú)
    │   └── providers/    lo que envuelve a toda la app (sesión, datos, avisos)
    ├── features/         un módulo por área funcional del sistema
    │   ├── auth/
    │   ├── users/
    │   ├── clients/
    │   ├── lawyers/
    │   ├── legal-params/
    │   ├── cases/
    │   ├── proceedings/
    │   ├── deadlines/
    │   ├── documents/
    │   └── dashboard/
    ├── shared/           lo reutilizable por cualquier módulo
    │   ├── api/          el cliente HTTP y el manejo de errores
    │   ├── components/   componentes sin dueño
    │   │   ├── ui/       botones, inputs, tablas, modales
    │   │   ├── forms/    piezas para armar formularios
    │   │   └── feedback/ avisos, carteles de error, estados vacíos
    │   ├── hooks/        hooks reutilizables
    │   ├── lib/          utilidades sueltas (fechas, textos, clases CSS)
    │   ├── mocks/        datos y servidor simulado para desarrollar sin backend
    │   └── types/        tipos que usan varios módulos
    ├── domain/           las reglas del negocio jurídico, sin React
    ├── api-contract/     cómo se habla con el backend
    └── styles/           los tokens y la hoja de estilos
```

---

## 3. La idea de fondo

La organización es **por funcionalidad, no por tipo de archivo**.

No hay una carpeta `components/` gigante con todos los componentes del sistema ni una
`services/` con todas las llamadas al servidor. En vez de eso, cada área funcional es
una cajita cerrada que tiene adentro todo lo suyo: sus llamadas al backend, sus
componentes, sus pantallas y sus validaciones.

Esto tiene tres ventajas concretas:

1. **Para tocar una funcionalidad, abrís una sola carpeta.** Todo lo de causas está en
   `features/cases/`.
2. **Se puede repartir el trabajo sin pisarse.** Dos personas en dos módulos distintos
   casi no tocan los mismos archivos, y hay menos conflictos al mergear.
3. **Se puede borrar una funcionalidad de una.** Si un módulo se cae del alcance, se
   borra su carpeta y no quedan restos desparramados.

---

## 4. Carpeta por carpeta

### `src/app/` — el armado de la aplicación

Acá vive el andamiaje: lo que existe una sola vez y envuelve a todo lo demás. **No va
lógica de negocio.**

- **`router/`**: el mapa de rutas. Qué URL muestra qué pantalla. También las guardas:
  la que manda al login si no hay sesión y la que controla, según el perfil del
  usuario, si puede entrar a una pantalla.
- **`layouts/`**: los marcos de pantalla. Uno con la barra de navegación y el
  encabezado, para el sistema ya logueado, y otro sin nada, para el login.
- **`providers/`**: lo que tiene que estar disponible en toda la app: la sesión del
  usuario, el cliente de TanStack Query y el sistema de avisos (toasts).

### `src/features/` — un módulo por área funcional

Cada módulo cubre un área del sistema y **adentro siempre tiene las mismas seis
carpetas**:

| Subcarpeta | Qué va | Ejemplo |
|---|---|---|
| `api/` | Llamadas al backend y los hooks de TanStack Query que las usan | `useCases.ts`, `cases.api.ts` |
| `components/` | Componentes que sólo usa este módulo | `CasesTable.tsx`, `CaseForm.tsx` |
| `pages/` | Las pantallas completas, las que el router monta | `CasesPage.tsx`, `CaseDetailPage.tsx` |
| `schemas/` | Validación con Zod de los formularios del módulo | `case.schema.ts` |
| `types/` | Los tipos de este módulo | `case.ts` |
| `utils/` | Funciones auxiliares del módulo | `caseStatusTone.ts` |

Si una de esas carpetas queda vacía, se deja igual: la estructura tiene que ser
predecible.

**Los módulos y qué cubre cada uno:**

| Módulo | Qué hace |
|---|---|
| `auth/` | Iniciar y cerrar sesión, cambiar contraseña |
| `users/` | Alta, baja, consulta y permisos de los usuarios del sistema |
| `clients/` | Los clientes del estudio |
| `lawyers/` | Los abogados del staff |
| `legal-params/` | Datos maestros del dominio: fueros, estados procesales y sus plazos |
| `cases/` | Causas y amparos: alta, consulta, detalle, línea de tiempo, carátula y expediente |
| `proceedings/` | Actos procesales y actos interruptivos de cada causa |
| `deadlines/` | Vencimientos, prescripción y alertas |
| `documents/` | Documentos de cada causa y los modelos formales del estudio |
| `dashboard/` | La pantalla de inicio accionable y los reportes |

### `src/shared/` — lo reutilizable

Lo que usa más de un módulo. La regla para que algo entre acá es simple: **si lo
necesitan dos módulos distintos, va a `shared/`; si lo usa uno solo, se queda en su
módulo.**

- **`api/`**: el cliente HTTP (con la URL base, el token de sesión y el manejo de
  errores) y la configuración de TanStack Query.
- **`components/ui/`**: los ladrillos visuales, sin nada de negocio adentro: botón,
  input, select, tabla, modal, casilla, etiqueta.
- **`components/forms/`**: piezas para armar formularios (un campo con su rótulo, su
  error y su ayuda).
- **`components/feedback/`**: avisos, mensajes de error, estados de carga y de lista
  vacía.
- **`hooks/`**: hooks reutilizables, por ejemplo uno de búsqueda con demora o uno que
  guarda algo en el navegador.
- **`lib/`**: funciones sueltas sin estado: formatear fechas, armar clases de CSS,
  formatear números.
- **`mocks/`**: datos de mentira y un servidor simulado, para poder desarrollar
  pantallas antes de que el backend esté listo.
- **`types/`**: tipos que cruzan módulos, como el perfil del usuario o la forma de una
  respuesta paginada.

### `src/domain/` — las reglas del negocio

Acá van las reglas jurídicas del sistema, escritas como funciones y tipos **sin React
adentro**: nada de componentes, hooks ni llamadas HTTP. Entra sola y se puede probar
sin levantar la interfaz.

Es la carpeta que en este proyecto pesa más que en un ABM común, porque el negocio
tiene reglas de verdad:

- el cómputo de un plazo según el fuero y el tipo de día (hábil o corrido);
- la prescripción de la acción y cómo un acto interruptivo reinicia su cómputo;
- qué estados procesales corresponden a cada fuero;
- el cálculo de cuánto falta para un vencimiento y desde cuándo está en alerta.

**Por qué separado:** son las reglas que más caro sale equivocar, y las que más van a
cambiar a medida que el estudio corrija detalles. Tenerlas juntas y sin interfaz
alrededor permite probarlas de forma aislada y que no queden desparramadas adentro de
un componente.

### `src/api-contract/` — el contrato con el backend

La forma de lo que viaja entre el front y el back: qué manda cada endpoint y qué
devuelve. Sirve como única fuente de verdad cuando el backend cambia algo, y evita que
cada módulo invente su propia versión de lo mismo.

### `src/styles/` — los estilos

La hoja de estilos global y los tokens: colores, tipografías, espaciados, bordes y
sombras, definidos como variables CSS. Todo lo visual sale de ahí, así cambiar un
color de la marca es tocar un solo lugar.

### `public/` — archivos servidos tal cual

El favicon, el logo y cualquier archivo que se sirva sin pasar por el empaquetador.

### `docs/` — documentación del front

Este documento y lo que se vaya escribiendo sobre decisiones del frontend.

---

## 5. Las tres reglas que sostienen todo

Si se respetan estas tres, la estructura se mantiene sola con el tiempo:

1. **Un módulo no importa de otro módulo.** `cases/` no importa nada de `clients/`. Si
   dos módulos necesitan lo mismo, eso se muda a `shared/` o a `domain/`.
2. **`shared/` no sabe que los módulos existen.** Es de una sola mano: los módulos usan
   `shared/`, nunca al revés. Un componente de `shared/ui` no puede saber qué es una
   causa.
3. **`domain/` no sabe nada de React ni del servidor.** Son funciones y tipos puros. Si
   necesitás un hook, va en el módulo o en `shared/hooks`.

Cuando algo no entra en estas reglas, casi siempre es señal de que está en el lugar
equivocado.

---

## 6. Dónde pongo esto

| Lo que estás escribiendo | Va en |
|---|---|
| Una pantalla nueva | `features/<módulo>/pages/` |
| Un componente que usa una sola pantalla | `features/<módulo>/components/` |
| Un componente que ya va por el tercer módulo | `shared/components/ui/` |
| La llamada a un endpoint | `features/<módulo>/api/` |
| El manejo de errores del HTTP, igual para todos | `shared/api/` |
| La validación de un formulario | `features/<módulo>/schemas/` |
| El cálculo de un plazo o de la prescripción | `domain/` |
| Formatear una fecha para mostrarla | `shared/lib/` |
| El tipo de una causa | `features/cases/types/` |
| El tipo del perfil del usuario, que usan varios | `shared/types/` |
| Una ruta nueva | `app/router/` |
| Un color o un espaciado nuevo | `styles/` |

---

## 7. Cómo agregar un módulo nuevo

1. Creá la carpeta en `features/` con las seis subcarpetas de siempre.
2. Definí los tipos en `types/` y las validaciones en `schemas/`.
3. Escribí las llamadas al backend en `api/`, con sus hooks de TanStack Query.
4. Armá la pantalla en `pages/` y lo que necesite en `components/`.
5. Registrá la ruta en `app/router/`, con la guarda de perfil si corresponde.

Si mientras lo hacés necesitás un componente que ya existe en otro módulo, no lo
copies: mudalo a `shared/components/` y que los dos lo usen de ahí.

---

## 8. Nombres

- **Carpetas**: en minúscula y con guiones (`legal-params`).
- **Componentes y pantallas**: `PascalCase.tsx` (`CaseDetailPage.tsx`).
- **Todo lo demás**: `camelCase.ts` (`formatDate.ts`), y cuando el archivo tiene un rol
  fijo se nombra con punto: `case.schema.ts`, `cases.api.ts`.
- **Las carpetas van en inglés, el dominio en castellano.** Es decir: la carpeta se
  llama `cases/`, pero adentro se habla de causa, fuero, SAC y acto procesal, tal como
  los nombra el estudio. El sistema tiene que usar el vocabulario jurídico y no
  términos genéricos de sistemas de gestión.

Equivalencias, para no traducir distinto cada vez:

| Carpeta | Dominio |
|---|---|
| `cases` | causas y amparos |
| `proceedings` | actos procesales e interruptivos |
| `deadlines` | plazos, vencimientos y prescripción |
| `lawyers` | abogados |
| `clients` | clientes |
| `legal-params` | fueros, estados procesales y tabla de plazos |
| `documents` | documentos de causa y modelos formales |

---

## 9. De las épicas del backlog a las carpetas

Cada módulo sale de una épica del Product Backlog, así se puede ir del documento al
código y al revés:

| Épica | Módulo |
|---|---|
| EP-01 Seguridad, autenticación y accesos | `features/auth/`, `features/users/`, guardas en `app/router/` |
| EP-02 Profesionales y clientes | `features/lawyers/`, `features/clients/` |
| EP-03 Parametrización jurídica | `features/legal-params/` |
| EP-04 Causas y expedientes | `features/cases/` |
| EP-05 Actuaciones procesales | `features/proceedings/` |
| EP-06 Plazos, alertas y vencimientos | `features/deadlines/` + reglas en `domain/` |
| EP-07 Documentación e integración cloud | `features/documents/` |
| EP-08 Tablero de control y reportes | `features/dashboard/` |
