# Tests del frontend — VZ Causas

Este documento explica cómo se testea el frontend: con qué herramientas, **qué
se testea y qué no**, cuántos tests tiene sentido escribir, dónde va cada
archivo y cómo se escribe un test. Lo que acordamos en el equipo es que
**cada uno testea sus propias features**, así que la idea es que todos lo
hagamos de la misma forma.

Si tenés una duda del tipo "¿este test dónde va?", saltá a
[Dónde pongo este test](#9-dónde-pongo-este-test). Si la duda es "¿vale la pena
este test?", andá a [Antes de escribir un test](#4-antes-de-escribir-un-test).

> **Estado actual (18/10/2026):** **254 tests de Vitest** (76 de `unit/` y 178
> de `components/`) y **9 de Playwright** en 6 archivos. Pasan 217 y fallan 37:
> 34 son los del Sprint 3, escritos antes que sus pantallas (ver
> [§11](#sprint-3-los-tests-que-ya-están-escritos)), 2 esperan un comportamiento
> que V4 cambió y 1 es el de contrato. Además hay 4 archivos del Sprint 3 que no
> cargan porque su código todavía no existe. El 18/10 se recortó lo que pasaba
> el techo de la [§4](#4-antes-de-escribir-un-test): los permisos del servidor
> falso (de 72 tests a 4, uno por grupo de la matriz), `DataTable` (de 5 a 1) y
> las pantallas `RegisterCasePage`, `UsersPage` y `ClientsPage`.
>
> **Revisión del 09/10/2026:** 173 tests de Vitest y 9 de Playwright, todos en
> verde. Antes de esa revisión eran 1019 de Vitest y 24 de Playwright: se
> sacaron los tests de piezas sueltas (tablas, modales, filtros), los de
> funciones triviales y los duplicados entre capas, y se sumó el E2E que faltaba
> de la transacción principal (registrar una causa y su primer acto). Un repaso
> posterior sumó los casos de uso que habían quedado sin test (ver
> [§6](#6-mapa-de-carpetas)). La cobertura de `src/` —sin el servidor falso—
> quedó en ~88 % de líneas y ~80 % de ramas (antes 93 % y 89 %): es lo esperado y está bien, ver
> [§1](#1-qué-buscamos-con-los-tests). Los números de hoy te los dice `npm test`.
> Primera vez en tu máquina: `npm install` y `npx playwright install chromium`,
> que descarga el navegador de los E2E. Ese segundo paso hay que repetirlo cada
> vez que se actualiza Playwright (ver [§14](#14-problemas-comunes)).

---

## 1. Qué buscamos con los tests

Un test sirve si **nos avisa cuando algo que le importa a una persona se
rompe** y, cuando falla, **nos dice dónde**. Más tests no es mejor: cada test
es código que hay que leer, mantener y correr, y un test que repite a otro no
da confianza extra, sólo un segundo lugar para arreglar cuando algo cambia.

De la documentación de Testing Library, Playwright y Kent C. Dodds sacamos
cuatro ideas, y son las que ordenan todo lo que sigue:

1. **"Write tests. Not too many. Mostly integration."** La base es el chequeo
   estático (TypeScript y lint), después las funciones puras, y el grueso son
   los componentes probados con la API simulada. No hay un porcentaje mágico:
   cada test es una inversión de tiempo que tiene que dar confianza a cambio.
2. **Cuanto más se parece un test a cómo se usa el software, más confianza da.**
   Se prueba lo que ve y hace una persona (leer, escribir, hacer click), nunca
   la implementación (estado interno, props de un hijo, nombres de funciones).
3. **Interceptar la red, no mockear el cliente.** Las llamadas salen de verdad
   por axios y las atrapa MSW.
4. **Pocos E2E, independientes entre sí, y sin probar lo que no es nuestro.**

Y una quinta, propia de este proyecto: **el frontend no es el dueño de las
reglas del negocio.** El backend ordena las causas por urgencia, calcula los
vencimientos y las prescripciones, y decide qué es único. El front *muestra* lo
que recibe y *valida lo que se escribe antes de mandarlo*. Un test que verifica
que "las vencidas van primero" está probando el servidor falso, no la pantalla:
si mañana el backend real ordena distinto, ese test sigue en verde.


### Lo que dice la investigación (y por qué la suite es chica)

- **La cobertura no mide si los tests sirven.** Inozemtseva y Holmes (ICSE
  2014, premio al paper más influyente en 2024) encontraron que, descontado el
  tamaño de la suite, la cobertura se relaciona poco con la cantidad de fallas
  que detecta. Por eso **no hay meta de cobertura**: sirve para encontrar código
  que nadie prueba, no para decidir cuántos tests escribir.
- **Cada test es un costo.** Khorikov (*Unit Testing Principles, Practices, and
  Patterns*) mide un test por cuatro cosas: si atrapa regresiones, si sobrevive
  a un refactor, si es rápido y si es fácil de mantener. El código trivial
  —mapeos de una línea, componentes que sólo pintan props— no vale un test
  propio; la lógica de dominio va con test unitario; lo que coordina piezas (una
  pantalla) va con test de integración.
- **Se prueban casos de uso, no código** (Kent C. Dodds). Se listan los casos
  de uso, se ordenan por importancia y se cubren: un E2E del camino feliz de
  los críticos, tests de pantalla para sus variantes y errores, unitarios para
  la lógica que lo merece.

La consecuencia práctica: **un archivo de test por pantalla, no por pieza.** La
tabla, el modal y el filtro de una pantalla se prueban a través de la pantalla.
Si un cambio en el modal rompe algo que la persona ve, lo atrapa el test de la
pantalla; si no lo ve, no hacía falta un test.

---

## 2. El stack de testing

| Qué | Con qué | Para qué |
|---|---|---|
| Chequeo estático | **TypeScript** (`tsc -b`, dentro de `npm run build`) y **oxlint** (`npm run lint`) | Atrapa tipos mal puestos, tests que no compilan y tests mal escritos. No cuesta nada y corre siempre |
| Runner de tests unitarios y de componentes | **Vitest** | Usa la misma config de Vite (alias `@`, TypeScript, JSX), no hay que configurar nada aparte |
| Renderizar componentes | **React Testing Library** | Probar el componente como lo usa una persona: escribir, clickear, leer lo que aparece |
| Simular el navegador en Node | **jsdom** | Que Vitest tenga `document`, `window`, etc. |
| Interacciones realistas | **@testing-library/user-event** | Tipear y clickear como un usuario, no disparando eventos a mano |
| Matchers de DOM | **@testing-library/jest-dom** | `toBeInTheDocument()`, `toBeDisabled()`, `toHaveValue()`… |
| API simulada | **MSW** | Los mismos handlers de `src/shared/mocks` que usamos para desarrollar |
| Tests de punta a punta | **Playwright** | Flujos completos en un navegador real |

---

## 3. Las cuatro capas

```
            ▲  más lento, más frágil, prueba más cosas juntas
            │
   ┌────────┴────────┐
   │      e2e/       │  Playwright · camino feliz de lo crítico
   ├─────────────────┤
   │   components/   │  Vitest + RTL + MSW · una por pantalla
   ├─────────────────┤
   │      unit/      │  Vitest · lógica de dominio · reglas en su límite
   ├─────────────────┤
   │    estática     │  tsc + oxlint · gratis, en todo momento
   └─────────────────┘
            │
            ▼  más rápido, más preciso para encontrar el error
```

### 3.0 Estática

`npm run build` corre `tsc -b`, y `tsconfig.test.json` incluye `tests/`: **un
test que no compila rompe el build**. `npm run lint` corre oxlint, con reglas
específicas para los tests (ver [§12](#12-lint-de-los-tests)).

### 3.1 `unit/` — lógica de dominio

Funciones puras con **reglas que importan** y que la pantalla no recorre
entera: el cómputo de vencimientos, la prescripción, la tabla de acceso por
perfil, las reglas de cada esquema (`schemas/`), cómo cambia el formulario al
cambiar de fuero, la sesión guardada.

- Son los tests más baratos: milisegundos cada uno.
- **Una regla, un test**, en su caso límite: el DNI acepta 7 y 8 dígitos y
  rechaza 9; el plazo rechaza `-1` y `10000`. No hace falta probar diez valores
  inválidos de la misma regla. Si son una tabla, `it.each` con pocas filas.
- **No llevan test propio** los mapeos de una línea (`toCreate…Body`,
  `toFormErrors`, formateadores, rótulos): los recorre el camino feliz de la
  pantalla, y si arman mal el cuerpo, el servidor falso responde `400`.
- No hace falta `render`, ni MSW, ni providers.
- Acá va también el test de contrato ([§3.4](#34-el-test-de-contrato)).

### 3.2 `components/` — una pantalla con la API simulada

El grueso. **Un archivo por pantalla** (página o ruta): se renderiza la página,
se usa como lo haría una persona y se verifica lo que aparece.

- Las llamadas a la API **salen de verdad** por axios y las atrapa MSW con los
  handlers de `src/shared/mocks`. No se mockea axios ni React Query a mano.
- Las piezas de la pantalla (su tabla, su modal de alta, sus filtros) **no
  tienen archivo propio**: se prueban a través de la página.
- **No se repiten acá las reglas que ya prueba `unit/`.** Si "el SAC tiene 8
  dígitos" está en `case.schema.test.ts`, la pantalla sólo necesita mostrar que
  *un* error de validación aparece en su campo. Ver
  [§5](#5-un-dueño-por-cada-regla).
- `components/shared/` sólo tiene lo que ninguna pantalla ejercita: el foco
  atrapado del `Modal`, el teclado del `Combobox`, la demora de
  `useDebouncedValue`. `components/app/` tiene las guardas del router.

### 3.3 `e2e/` — flujos completos en el navegador

Playwright levanta la app y la maneja en un navegador real: router, sesión,
navegación entre pantallas, todo junto.

- **Corren contra la app con los mocks encendidos** (`VITE_USE_MOCKS=true`),
  no contra el backend real. Así son estables y no dependen de que el back ni
  la base estén levantados.
- **Uno por flujo crítico, sólo el camino feliz.** Hoy son 9: entrar, salir,
  consultar causas, registrar una causa y su primer acto, y el alta de cada ABM
  (clientes, abogados, estados, calificaciones, usuarios). Los errores y los
  perfiles se prueban en `components/`.

### 3.4 El test de contrato

Toda la suite corre contra el servidor falso. Si el servidor falso se desvía
del backend, **ningún otro test lo avisa**. Para eso está
`tests/unit/contract/endpoints.test.ts`: compara cada `MÉTODO /ruta` que
implementa el mock (`ROUTE_TABLE`) con las operaciones que declara la
especificación OpenAPI en `docs/openapi/`.

A su lado está `tests/unit/contract/permissions.test.ts`, que cubre lo que el
anterior no mira: **quién puede cada operación**. Con un usuario por perfil,
recorre la matriz de permisos del contrato (V3 §4) y comprueba qué endpoints
responden `403` y cuáles no.

- Falla si el mock **inventa** un endpoint que el contrato no tiene, o si
  **deja sin implementar** uno que el contrato sí tiene.
- Lee `docs/openapi/` y no `build/openapi.yaml`, porque `build/` se genera y
  está ignorado por git.
- **No valida la forma de las respuestas** (los campos de cada JSON). Es la red
  mínima, sin dependencias nuevas. Validar los cuerpos contra los esquemas de la
  especificación es el siguiente paso natural; pide sumar un validador (por
  ejemplo, Ajv) y por eso quedó afuera.

Cuando se agrega un endpoint: primero va en `docs/openapi/`, después en el
mock. Si falta alguno de los dos, este test lo marca.

---

## 4. Antes de escribir un test

Cuatro preguntas. Si la respuesta a alguna es "no", el test no va (o va en
otro lado):

1. **¿Es un caso de uso o una regla que importa?** Algo que una persona hace o
   nota (registrar, buscar, ver un error en su campo, no poder entrar), o una
   regla de dominio (un plazo, una prescripción, quién puede qué). Si es un
   detalle de cómo está armado el código, no.
2. **¿La regla es del frontend y no la prueba ya su dueño?** Si es del backend
   (el orden del listado, que algo sea único) se prueba sólo que la pantalla
   *muestra* lo que recibe. Si ya la prueba otro nivel ([§5](#5-un-dueño-por-cada-regla)),
   no se repite.
3. **¿Seguiría pasando si cambia la implementación pero no lo que ve la
   persona?** Si se rompe por renombrar una función, mover un estado o partir
   un componente en dos, está probando la implementación: reescribilo.
4. **Si falla, ¿el nombre del test dice qué se rompió?** Un test = un
   comportamiento que la persona nota.

### Cuántos tests lleva cada pieza

Es un techo, no una cuota. Si te pasás, probablemente estás repitiendo:

| Pieza | Tests | Qué cubren |
|---|---|---|
| Esquema (`schemas/`) | 1 por regla no obvia, en su límite | Formato, rango, reglas cruzadas entre campos. No cada valor inválido, ni "es obligatorio" (lo prueba la pantalla con el envío vacío) |
| Función de dominio (`utils/` con lógica) | 1 por rama que importa | Cortes (vence hoy, en 5 días, en 6), cálculos, combinaciones |
| Mapeo, formateador, rótulo | 0 | Los cubre la pantalla |
| Tabla, modal, filtro o panel de una pantalla | 0 propios | Se prueban en el test de la pantalla |
| Pantalla de ABM | 6 a 10 | Lista cargada, vacío o búsqueda sin resultados, error de carga, alta feliz, envío vacío (el error en su campo), conflicto del servidor (409) en su campo, error general, edición, baja, el permiso que la habilita |
| Pantalla de una transacción (alta de causa, registro de acto) | 8 a 12 | Cada variante del camino feliz, la validación que cambia según lo elegido, errores del servidor, quién puede operarla |
| Componente de `shared/` | sólo lo que ninguna pantalla recorre | Teclado, foco, tiempos |
| Flujo E2E | 1 por flujo crítico | El camino feliz |
| Un bug que se arregló | 1 | El caso que lo reproducía, en el nivel más bajo que lo muestre |

**Señales de alarma:** un archivo de test para una tabla o un modal; una
pantalla con más de 12 tests; el mismo caso en `unit/` y en `components/`; diez
filas de `it.each` para la misma regla; un test que afirma el orden o un valor
que *calcula el mock*; un test que se rompe al partir un componente sin cambiar
la pantalla.

---

## 5. Un dueño por cada regla

Cada regla se prueba **en un solo lugar**. En los demás niveles, a lo sumo se
prueba que la pieza está conectada.

| Regla | Dueño | En las pantallas sólo se prueba… |
|---|---|---|
| Formato, rango y reglas cruzadas de un campo (SAC, DNI, matrícula, fecha no futura, plazo y tipo de día) | `unit/<feature>/*.schema` | que *un* error aparece en su campo (el envío vacío) |
| Cómo se arma el cuerpo que se manda a la API | **nadie aparte** | el camino feliz de la pantalla: si el cuerpo está mal, el mock responde `400` |
| Cómo cambia el formulario al elegir otra cosa (`changeJurisdiction`, `changeSacNumber`) | `unit/cases/caseForm` | que la pantalla muestra los campos del fuero elegido |
| Vencimientos, prescripción, cómputo del plazo de un acto | `unit/cases/deadlineStatus`, `unit/cases/prescription`, `unit/proceedings/deadlinePreview` | que se muestra el valor |
| Orden del listado, unicidad, qué ve cada perfil | **Backend** | que se muestra lo que llega, y que un `409` va a su campo |
| Respuesta `400`, `409` o `500` del servidor | la pantalla | un test de cada una por formulario |
| Quién entra a cada sección y quién opera cada acción | `unit/app/access` y `unit/app/actionAccess` | un perfil habilitado y uno no, en la guarda o la pantalla |
| Sesión guardada y renovación del token | `unit/auth/sessionStorage` y `components/auth/tokenRenewal` | nada |
| Que el mock sea el contrato | `unit/contract/endpoints` (qué endpoints hay) y `unit/contract/permissions` (quién puede cada uno) | nada |
| Foco del `Modal`, teclado del `Combobox` | `components/shared/` | nada |
| Cómo se presenta un dato (una raya, "Sin SAC", el chip de vencimiento) | la pantalla que lo muestra | — |

### Lo que no se testea (a propósito)

| Qué | Por qué |
|---|---|
| Un porcentaje de cobertura | La cobertura no dice si los tests atrapan fallas ([§1](#1-qué-buscamos-con-los-tests)); se mira sólo para encontrar código que nadie prueba |
| Tablas, modales, filtros y paneles por separado | Se prueban a través de su pantalla; un test propio sólo repite y se rompe al refactorizar |
| Mapeos, formateadores y rótulos (`toCreate…Body`, `toFormErrors`, `formatDni`, `profileLabel`) | Los recorre el camino feliz de la pantalla |
| Cada valor inválido de una regla | Alcanza con el límite: un valor de cada lado |
| El servidor falso y sus datos semilla | Es andamiaje de desarrollo. La verdad es el backend y el contrato; el contrato lo cubre `unit/contract` |
| El orden, filtro o cálculo que hace el backend | El front sólo lo muestra |
| Que la pantalla **no** ofrezca algo fuera de alcance (Drive, modificar, dar de baja) | Se revisa en el PR; el test se rompe el día que llega el sprint siguiente |
| `api/` (hooks y llamadas a axios) | Quedan cubiertos por los tests de pantalla, que pasan por MSW |
| `types/` y `*.keys.ts` | Son tipos y constantes, no tienen lógica |
| `LoginAside`, layouts, textos y estilos | Presentación pura; la recorren los E2E |

Si alguno de los últimos empieza a tener lógica (un hook que transforma datos,
un layout que decide qué mostrar según el rol), pasa a tener test.

**La excepción a lo de `api/`** es `tests/components/auth/tokenRenewal.test.tsx`.
Lo que prueba ahí no es la llamada de una feature sino el interceptor de
`src/shared/api/http.ts`: que un `401 UNAUTHENTICATED` renueve la sesión, que
reintente el pedido una sola vez y que, si no lo logra, mande al login. Es el
mecanismo que sostiene a todas las features y ninguna pantalla lo cubre de
casualidad, así que tiene test propio.

---

## 6. Mapa de carpetas

`tests/` vive en `frontend/`, al lado de `src/`. Adentro de cada nivel se
**repiten los nombres de las features de `src/features/`**, así cada uno sabe
cuál es su carpeta. Hay carpetas que no son una feature y siguen la misma
idea: `app/` para lo de `src/app/` (`unit/app/` para la tabla de acceso,
`components/app/` para las guardas del router y el `AppLayout`),
`components/shared/` para el comportamiento de `src/shared/` que ninguna
pantalla recorre, y `unit/contract/` para el test de contrato.

```
frontend/
├── src/                                  el código, no se toca
├── scripts/
│   └── ca-matrix.mjs                     genera la matriz de criterios (ver §10)
├── tests/
│   ├── setup/                            configuración compartida
│   │   ├── vitest.setup.ts               enciende MSW y limpia entre tests
│   │   ├── render.tsx                    renderWithProviders() y signInAs()
│   │   ├── clock.ts                      usePrototypeToday(): fija el día del prototipo
│   │   └── names.ts                      personName(): el nombre de una persona en cualquiera de sus formas (V4 D-68, D-81)
│   │
│   ├── unit/                             Vitest · lógica de dominio y esquemas
│   │   ├── app/                          las tablas de acceso: por ruta y por acción
│   │   ├── contract/                     el mock ⟷ la especificación OpenAPI
│   │   ├── auth/
│   │   ├── cases/
│   │   ├── clients/
│   │   ├── lawyers/
│   │   ├── legal-params/
│   │   ├── proceedings/
│   │   └── users/
│   │
│   ├── components/                       Vitest + RTL + MSW · un archivo por pantalla
│   │   ├── app/                          guardas del router y AppLayout
│   │   ├── shared/                       foco, teclado y tiempos de src/shared/
│   │   ├── auth/
│   │   ├── cases/
│   │   ├── clients/
│   │   ├── dashboard/                    los tableros de Inicio (HomePage)
│   │   ├── documents/
│   │   ├── lawyers/
│   │   ├── legal-params/
│   │   ├── proceedings/
│   │   └── users/
│   │
│   └── e2e/                              Playwright
│       ├── fixtures/                     helpers compartidos (loginAs, etc.)
│       └── <feature>.spec.ts
│
├── vitest.config.ts
├── playwright.config.ts
└── tsconfig.test.json                    los tests se chequean en `npm run build`
```

Una feature que todavía no se empezó (hoy, `deadlines`) **no tiene carpeta en
`tests/`**. La carpeta se crea cuando alguien empieza a trabajar la feature
(ver [sección 11](#11-cuando-arrancás-una-feature-nueva)): `dashboard` y
`documents` la tienen desde que se escribieron los tests del Sprint 3. Inicio
(`HomePage`) es la página de `dashboard`, así que sus tests van en
`components/dashboard/`.

### Cuántos tests hay en cada módulo

Tests que corren al 18/10/2026 (un `it.each` cuenta una vez por fila). Incluye
los del Sprint 3 que todavía están en rojo; no incluye los 4 archivos que no
cargan (`documents` y los esquemas de acto interruptivo y de marca de
prescripción):

| Módulo | `unit/` | `components/` | `e2e/` |
|---|---:|---:|---:|
| `app` (acceso, guardas, layout) | 8 | 9 | — |
| `auth` | 4 | 13 | 2 |
| `cases` | 22 | 60 | 2 |
| `clients` | 5 | 10 | 1 |
| `dashboard` | — | 20 | — |
| `lawyers` | 3 | 10 | 1 |
| `legal-params` | 8 | 17 | 2 |
| `proceedings` | 7 | 11 | — |
| `users` | 8 | 10 | 1 |
| `shared` | 4 | 18 | — |
| `contract` | 7 | — | — |
| **Total** | **76** | **178** | **9** |

De los 60 de `components/cases`, 34 son del detalle de causa (cinco archivos,
uno por historia: ver [§11](#sprint-3-los-tests-que-ya-están-escritos)) y 17
del alta (11 en `RegisterCasePage` y 6 en `RegisterCasePage.folder`).

**Recorte del 18/10/2026.** Con los tests del Sprint 3 la suite había pasado a
334. Se recortó lo que pasaba el techo de la [§4](#4-antes-de-escribir-un-test),
sin perder cobertura de reglas:

- `unit/contract/permissions`: de 72 a 4. Era una fila por endpoint y por
  perfil; ahora es un test por grupo de la matriz (abierto a todos, sólo
  Administrador, Administrador o Abogado, sólo Abogado), que compara el mapa
  entero y en el diff dice qué endpoint y qué perfil no coinciden.
- `components/shared/DataTable`: de 5 a 1. Es un solo comportamiento, la tabla
  responsive.
- `RegisterCasePage`: de 14 a 11. Sale "con SAC la fecha de inicio es
  obligatoria", que es del esquema (`unit/cases/case.schema`), y los botones de
  alta se prueban con un perfil, no con los tres: los tres pueden.
- `UsersPage`: de 13 a 10. Salen el filtro por perfil (lo filtra el backend; la
  conexión del filtro la prueba el buscador), el segundo `409` en su campo (la
  ficha ya vinculada: el del nombre de usuario prueba lo mismo) y el error al
  eliminar (como el de estados).
- `ClientsPage`: de 12 a 10. "Registrar cliente" se prueba con un perfil.

El registro de actos (`proceedings`) tiene su E2E dentro de `cases.spec.ts`,
porque el flujo arranca en el alta de la causa.

Cada pantalla tiene un archivo: `CasesPage`, `CaseDetailPage`,
`RegisterCasePage`, `RegisterProceduralActPage`, `ClientsPage`, `LawyersPage`,
`ProceduralStatesPage`, `LegalQualificationsPage`, `UsersPage` y `LoginPage`,
más `ChangePasswordModal`, que se abre desde cualquier pantalla. Las piezas que
usan (tablas, modales, filtros, paneles) no tienen archivo propio, a propósito.

**Repaso del 09/10/2026.** Después del recorte se cruzó lo que hace cada pantalla
con lo que prueban los tests y se sumaron los casos de uso que no tenían ninguno:
registrar una calificación desde el alta de causa (CA-48.8), registrar un acto
con un estado escrito a mano y con el vencimiento ajustado a mano, el aviso sin
red, el buscador de Usuarios, Abogados y Estados, el filtro por perfil, la ficha
ya vinculada a otro usuario, y en Causas el cambio de fuero con un estado elegido
y "Limpiar filtros". Quedan sin test propio, a propósito: el plazo 0 que oculta
el tipo de día, la edición sin cambios, el error al eliminar un estado, el click
en el fondo del modal y la página 404.

---

## 7. Convenciones

### 7.1 Nombres de archivo

| Nivel | Termina en | Ejemplo |
|---|---|---|
| `unit/` y `components/` | `.test.ts` / `.test.tsx` | `LoginPage.test.tsx` |
| `e2e/` | `.spec.ts` | `auth.spec.ts` |

La diferencia no es de estilo: **Vitest agarra sólo los `.test.*` y Playwright
sólo los `.spec.*`**. Si un test de Playwright termina en `.test.ts`, Vitest lo
va a intentar correr y va a fallar.

El nombre del test repite el nombre del archivo que prueba:
`buildUserPatch.ts` → `buildUserPatch.test.ts`.

### 7.2 Idioma

Igual que el resto del código: **nombres en inglés, textos en castellano**. Las
descripciones de `describe` / `it` van en castellano, porque es lo que se lee
cuando un test falla.

```ts
describe('validateLogin', () => {
    it('marca el usuario como obligatorio si está vacío', () => { /* … */ })
    it('no recorta la contraseña: un espacio es una clave válida', () => { /* … */ })
})
```

### 7.3 Imports

Siempre con el alias `@`, igual que en `src/`. Nunca `../../../src/...`.

```ts
import { validateLogin } from '@/features/auth/schemas/login.schema'
```

### 7.4 Cómo buscar elementos en pantalla

En orden de preferencia (es el orden que recomienda Testing Library):

1. `getByRole('button', { name: 'Ingresar' })`: lo que ve y usa una persona
   (y un lector de pantalla).
2. `getByLabelText('Usuario')`: para inputs de formulario.
3. `getByText('El nombre de usuario es obligatorio.')`: para mensajes.
4. `getByTestId(...)`: **último recurso**, sólo si no hay otra forma.

Si no podés encontrar un elemento por su rol o su label, muchas veces es señal
de que al componente le falta accesibilidad (un `<label>` o un `aria-label`).

Y unas pocas reglas más de Testing Library que evitan tests frágiles:

- **Escribir con `user.type`**, no con `fireEvent.change`: simula el tecleo de
  verdad.
- **Esperar con `findBy*`**, no con `waitFor(() => getBy*)`. Un `waitFor` lleva
  *una* aserción adentro, nunca una acción ni un callback vacío.
- **`getBy*` para lo que tiene que estar, `queryBy*` sólo para comprobar que
  no está** (`expect(queryByText(…)).not.toBeInTheDocument()`).
- **Matchers de `jest-dom`**: `toBeDisabled()`, no `expect(button.disabled).toBe(true)`.
- **No uses `container.querySelector`** ni clases CSS para buscar: si hace
  falta, el componente necesita un rol o una etiqueta.
- **No envuelvas en `act`** lo que ya viene envuelto (`render`, `user.*`), ni
  lo uses para silenciar una advertencia.

---

## 8. Cómo se escribe cada tipo de test

> Los ejemplos están simplificados. Para ver casos completos, mirá los tests
> que ya existen: `tests/components/users/UsersPage.test.tsx` es el más
> completo (listado, alta, edición y baja).

### 8.1 Un test de `unit/`

```ts
// tests/unit/cases/deadlineStatus.test.ts
import { describe, expect, it } from 'vitest'
import { deadlineStatus } from '@/features/cases/utils/deadlineStatus'

const dueIn = (days: number) => ({ dueDate: '2026-09-15', businessDaysRemaining: days })

describe('deadlineStatus', () => {
    /* CA-20.5: los cortes que ve la persona en el listado. */
    it('con 0 días hábiles dice "Vence hoy", en rojo', () => {
        expect(deadlineStatus(dueIn(0))).toEqual({ label: 'Vence hoy', tone: 'danger', dot: true })
    })

    it.each([
        [5, 'En 5 días hábiles'],   // el último que se destaca
    ])('con %i días hábiles dice "%s", en bronce', (days, label) => {
        expect(deadlineStatus(dueIn(days))).toEqual({ label, tone: 'warn', dot: true })
    })
})
```

Entrada → salida. Nada más. Se prueban **los cortes** (0, 5, 6), no cada día:
el 2 y el 3 caen en la misma rama que el 5.

### 8.2 Un test de `components/`

```tsx
// tests/components/auth/LoginPage.test.tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { LoginPage } from '@/features/auth/pages/LoginPage'

describe('LoginPage', () => {
    it('enviado vacío muestra los errores', async () => {
        const { user } = renderWithProviders(<LoginPage />, { route: '/login' })

        await user.click(screen.getByRole('button', { name: 'Ingresar' }))

        expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
    })
})
```

Tres cosas para notar:

- **`renderWithProviders`** en vez de `render`. Envuelve el componente con
  todo lo que necesita para funcionar (Router, QueryClient, AuthProvider,
  ToastProvider). Sin eso, cualquier componente que use `useNavigate` o
  `useQuery` explota. Devuelve también `user` (un `userEvent` ya armado) y
  `router`.
- **`user`** (de `userEvent`) en vez de `fireEvent`. Simula a una persona de
  verdad (foco, tecleo letra por letra, click).
- **`await`** en cada interacción y en todo lo que espere una respuesta de la
  API (`findByText`, `waitFor`).

#### Opciones de `renderWithProviders`

| Opción | Para qué | Ejemplo |
|---|---|---|
| `as` | Abre la sesión con un usuario de los fixtures antes de renderizar | `{ as: 'fvazquez' }` (administrador y abogado), `'mrios'` (abogado), `'gestion'` (secretaría) |
| `route` | URL en la que arranca (acepta query) | `{ route: '/usuarios?page=2' }` |
| `path` | Patrón de ruta donde se monta el componente | `{ path: '/abogados' }` |
| `routes` | Rutas extra para verificar a dónde navega | `{ routes: [{ path: '/inicio', element: <p>Inicio</p> }] }` |
| `children` | Rutas hijas, para marcos y guardas con `<Outlet />` | ver `tests/components/app/` |
| `state` | `location.state` de la entrada inicial | `{ state: { from: '/usuarios' } }` |

`tests/setup/render.tsx` exporta también **`signInAs(username)`**, que es lo que
`as` usa por dentro: emite un token en la base del mock y lo guarda donde lo
busca la aplicación, igual que después de un login de verdad. Sirve cuando hace
falta la sesión abierta pero no querés renderizar todavía. Hay que llamarla
**antes** de renderizar, porque `AuthProvider` lee la sesión guardada en el
primer render.

Las pantallas de administración piden un administrador: casi todos los tests
de páginas usan `as: 'fvazquez'`.

**Qué responde el mock a cada perfil** (contrato V3 §4, permisos por perfil):

| Operación | Quién puede | El resto recibe |
|---|---|---|
| Leer abogados, estados, calificaciones, clientes y causas | Cualquiera con sesión | — |
| Leer y escribir `/users` | `fvazquez` | `403` |
| Escribir abogados | `fvazquez` | `403` |
| Escribir estados y calificaciones | Cualquiera con sesión | — |
| Registrar un cliente | Cualquiera con sesión | — |
| Registrar una causa | Cualquiera con sesión | — |
| Registrar un acto procesal y previsualizar su vencimiento | El abogado responsable de **esa** causa | `403` |

**Los actos no dependen del rol sino de la causa** (V3 D-30): sólo los registra
su abogado responsable. `mrios` lleva las causas 1 y 17; `fvazquez`, la 4, la 6
y la 20; `mferreyra`, la 7. Con otro usuario —aunque sea abogado o
administrador— el mock responde `403`. Antes de escribir un test de actos,
mirá quién lleva la causa (`responsibleLawyerId` en `CASE_SEEDS`).

Por eso entrar como `mrios` **ya no sirve para probar el estado de error de un
listado**: desde V3 un abogado lee abogados y estados sin problema. Hoy ese
atajo sólo funciona en `/users`. Para el resto, el error se fuerza con
`server.use(...)` (ver [Probar un error del servidor](#probar-un-error-del-servidor)),
y conviene responder un `403` y no un `500`: las consultas reintentan los `5xx`
y el test tardaría segundos en ver el error.

#### Las piezas de una pantalla

Los modales, tablas y filtros que sólo reciben props y avisan con callbacks
(`LawyerFormModal`, `UsersTable`, `CaseFilters`…) **no tienen test propio**:
se prueban a través de la página que los usa, que es como los ve la persona.
Un test de la pieza con `render` y `vi.fn()` afirma que "se llamó a
`onChange` con tal clave", que es un detalle de implementación: se rompe al
reorganizar el componente aunque la pantalla siga andando igual.

#### Cuando la pantalla muestra datos viejos mientras carga

Las tablas usan `keepPreviousData`: al buscar o cambiar de página, siguen
mostrando lo anterior hasta que llega lo nuevo. Por eso, después de filtrar,
**esperá a que se vaya lo viejo** antes de afirmar sobre lo nuevo:

```tsx
await user.type(screen.getByRole('searchbox', { name: 'Buscar abogado' }), 'Ríos')
await waitFor(() => expect(screen.queryByText('Dr. Fernando G. Vázquez')).not.toBeInTheDocument())
expect(screen.getByText('Dra. Malena Ríos')).toBeInTheDocument()
```

Y un test que verifica el estado de carga tiene que esperar igual a que
termine: si no, el pedido queda colgando y le cae al test siguiente.

#### Probar un error del servidor

Los handlers de MSW responden lo normal. Para forzar un error **en un test
puntual**, se pisa el handler con `server.use(...)`:

```tsx
import { http, HttpResponse } from 'msw'
import { server } from '@/shared/mocks/server'

it('muestra el error si el servidor falla', async () => {
    server.use(
        http.post('*/auth/login', () =>
            HttpResponse.json({ /* cuerpo de error del contrato */ }, { status: 500 }),
        ),
    )

    // … render, completar el form, enviar …

    expect(await screen.findByRole('alert')).toBeInTheDocument()
})
```

El override dura **sólo ese test**: `tests/setup/vitest.setup.ts` hace
`server.resetHandlers()` después de cada uno. Para armar el cuerpo del error,
usá los helpers de `@/shared/mocks` (`errorBody`, `ERRORS`) en vez de
escribirlo a mano; así respeta el contrato. Antes de forzar un error, fijate en
`src/shared/mocks/README.md`: muchos errores ya se pueden disparar con datos
especiales de los fixtures, sin override.

#### Los datos del mock se reinician

MSW trabaja sobre una base en memoria (`src/shared/mocks/db.ts`). Si un test
crea un usuario, el siguiente **no lo ve**: el setup llama a `resetMockDb()`
después de cada test. Cada test arranca siempre con los mismos fixtures, así
que podés confiar en los datos de `@/shared/mocks` (`USERS`, `LAWYERS`,
`CLIENTS`, `CASE_SEEDS`, `CREDENTIALS`…).

Lo que **no** conviene escribir a mano en un test son los valores que el mock
calcula: `activeCases`, el estado actual de una causa, su vencimiento. Para
eso están `toCase`, `toLawyer`, `toClient` y compañía, que devuelven el recurso
tal como lo devuelve la API:

```ts
import { db, toCase } from '@/shared/mocks'

const gomez = toCase(db.cases[0])   // la causa 13284571, con su estado y su vencimiento
```

#### Tests que dependen del día

Los actos recientes de las causas semilla se ubican **respecto de hoy** ("4
días hábiles atrás"), para que el listado se vea como el prototipo cualquier
día que se abra: una causa que vence hoy, otra vencida hace dos días, otra a
tres días hábiles. La contra es que un test que afirme "Vence hoy" o una fecha
concreta pasaría un martes y fallaría un sábado.

La solución es fijar el reloj en el día del prototipo —martes 15/09/2026— y
rearmar la base **después** de fijarlo:

```ts
import { afterEach, beforeEach, vi } from 'vitest'
import { resetMockDb } from '@/shared/mocks'

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })          // sólo Date: los timers siguen reales
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    resetMockDb()                                    // las semillas se recalculan con ese "hoy"
})
afterEach(() => {
    vi.useRealTimers()
})
```

Con el reloj fijo, las seis causas del prototipo tienen exactamente sus
vencimientos del prototipo (16/09, 11/09, 18/09…). `toFake: ['Date']` importa:
si se falsean también los temporizadores, `findByText` y `waitFor` se quedan
esperando para siempre. En `tests/setup/clock.ts` está hecho como
`usePrototypeToday()`: importalo en vez de copiar el bloque.

Lo mismo vale para una validación que compara contra hoy (`validateCase`,
`validateProceduralAct`): sin fijar el día, "no puede ser posterior a hoy" se
prueba con una fecha que algún día deja de ser futura.

### 8.3 Un test de `e2e/`

```ts
// tests/e2e/lawyers.spec.ts
import { test, expect } from '@playwright/test'
import { goTo, loginAs } from './fixtures/auth'

test('registrar un abogado y verlo en la tabla', async ({ page }) => {
    await loginAs(page, 'admin')
    await goTo(page, 'Abogados') // con el menú, nunca con page.goto (ver abajo)

    await page.getByRole('button', { name: 'Registrar abogado' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel(/^apellido y nombre/i).fill('Dra. Ana Pérez')
    await dialog.getByLabel(/^Matrícula/).fill('1-50000')
    await dialog.getByRole('button', { name: 'Registrar abogado' }).click()

    await expect(page.getByRole('cell', { name: 'Dra. Ana Pérez' })).toBeVisible()
})
```

Los rótulos de los campos obligatorios llevan el asterisco pegado
("Matrícula\*"), por eso se buscan con una expresión regular (`/^Matrícula/`)
y no con el texto exacto. Con la `i` final tampoco importan las mayúsculas, así
un cambio de "Nombre" a "nombre" en el rótulo no rompe el test. Lo mismo vale
en Testing Library.

- Los selectores son los mismos que en Testing Library (`getByRole`,
  `getByLabel`): se aprende una sola forma.
- **`loginAs`** vive en `e2e/fixtures/` para que nadie repita el login en cada
  test. Si un paso se repite en muchos flujos, va a `fixtures/`.
- Playwright espera solo: `expect(...).toBeVisible()` reintenta hasta que
  aparezca. **No uses `waitForTimeout`**, hace los tests lentos y frágiles.

#### No recargues la página después del login

Es la regla más importante de los E2E. El mock de MSW guarda sus datos
(usuarios, abogados, **sesiones**) en la memoria de la pestaña. Un
`page.goto()` o `page.reload()` después de iniciar sesión vuelve todo al estado
semilla: el token que la app tiene guardado deja de existir para el mock y te
manda al login. Por eso:

- se entra con `loginAs(page, 'admin')`, que es el único `goto` del test;
- se navega con el menú: `goTo(page, 'Usuarios')` (en `e2e/fixtures/auth.ts`);
- después de "Cerrar sesión", esperá a estar en `/login` antes de volver a
  entrar.

La ventaja es que **cada test arranca con los datos semilla**: lo que crea un
test no lo ve el siguiente.

#### En un E2E el día es el de hoy

En `components/` se puede fijar el reloj (ver
[Tests que dependen del día](#tests-que-dependen-del-día)); en un E2E no: la
aplicación corre en el navegador con la fecha real, y los vencimientos de las
causas semilla se mueven con ella. Por eso un E2E sólo afirma lo que vale
cualquier día —cuántas causas hay, cuáles tienen vencimiento, cuáles siguen en
"Iniciada"— y deja los textos exactos ("Vence hoy", "En 3 días hábiles") y el
orden exacto para los tests de `components/`. Así está hecho
`tests/e2e/cases.spec.ts`.

#### Un test que documenta un bug

Si un E2E encuentra un bug que no se arregla en ese momento, no se borra ni se
deja fallando: se marca con `test.fail()` y un comentario que explique el bug.
La suite queda en verde, y el día que se arregle, Playwright avisa que el test
"pasó inesperadamente" para que se saque la marca. Hoy no hay ningún test
marcado así.

---

## 9. Dónde pongo este test

| Quiero probar… | Va en | Herramienta |
|---|---|---|
| Una validación de `schemas/` | `tests/unit/<feature>/` | Vitest |
| Una función de `utils/` con lógica de dominio (plazos, prescripción, acceso) | `tests/unit/<feature>/` | Vitest |
| Un mapeo o un formateador | ningún test propio: lo recorre la pantalla | — |
| Que un form muestre el error de un campo | `tests/components/<feature>/` | Vitest + RTL |
| Que un modal llame a la API y cierre | `tests/components/<feature>/` | Vitest + RTL + MSW |
| Que una página muestre la lista, el vacío o el error | `tests/components/<feature>/` | Vitest + RTL + MSW |
| Que una ruta protegida redirija | `tests/components/app/` | Vitest + RTL |
| Una tabla, un modal o un filtro de una pantalla | el test de **esa pantalla** | Vitest + RTL + MSW |
| Teclado, foco o tiempos de un componente de `shared/` que ninguna pantalla recorre | `tests/components/shared/` | Vitest + RTL |
| Que el mock no invente ni olvide endpoints del contrato | `tests/unit/contract/` | Vitest |
| Un flujo que pasa por varias pantallas | `tests/e2e/<feature>.spec.ts` | Playwright |
| Algo que se repite en muchos E2E (login) | `tests/e2e/fixtures/` | Playwright |
| Fijar el día del prototipo | `tests/setup/clock.ts` (`usePrototypeToday()`) | Vitest |
| Buscar el nombre de un abogado o un usuario | `tests/setup/names.ts` (`personName()`, `personNameIn()`) | Vitest |

**Regla práctica:** la regla de dominio va en `unit/`, el caso de uso en la
pantalla y sólo el camino feliz del flujo crítico en E2E. Un caso borde en E2E
es lento y, cuando falla, no dice dónde está el problema. Y si la regla ya
tiene dueño ([§5](#5-un-dueño-por-cada-regla)), no la repitas en otro nivel.

---

## 10. Trazabilidad con los criterios de aceptación

Cada test que sale de un criterio de aceptación lo dice en un comentario
(`/* CA-8.4 */`). El script `ca-matrix` junta esos comentarios y arma la
matriz **criterio → tests**:

```bash
npm run ca-matrix        # regenera docs/Frontend-Architecture/MATRIZ_CA.md
```

La matriz sirve para dos cosas: ver de un vistazo qué criterio no tiene ningún
test, y saber qué se rompe si se toca una pantalla. Se regenera cada vez que se
agrega o se borra un test con criterio; el archivo está versionado, así que el
cambio se ve en el PR.

Dos convenciones:

- **Un criterio que prueba el backend** (el orden de los estados, un plazo, una
  unicidad) no se repite en el front. Se deja marcado en el encabezado del
  archivo del test con `@backend CA-x.y`, y la matriz lo muestra como "dueño:
  backend". Hoy hay uno: CA-9.11.
- **Borrar un test no puede dejar un criterio huérfano.** Si el test que se va
  era el único que citaba un CA, o se mueve el comentario al test que queda, o
  se justifica con `@backend`.

---

## 11. Cuando arrancás una feature nueva

1. Creá `tests/unit/<feature>/` y `tests/components/<feature>/`.
2. Por cada esquema de `schemas/` con reglas no obvias → un `.test.ts` en
   `unit/<feature>/`, un test por regla en su límite. Una función de `utils/`
   lleva test si tiene lógica de dominio (plazos, cálculos, permisos); un mapeo
   o un formateador no ([§4](#4-antes-de-escribir-un-test)).
3. Por cada **pantalla** (página o ruta) → un `.test.tsx` en
   `components/<feature>/` con los casos de la tabla de la
   [§4](#4-antes-de-escribir-un-test). Sus tablas, modales y filtros no llevan
   archivo propio.
4. Si la feature agrega un flujo crítico → un E2E de su camino feliz en
   `e2e/<feature>.spec.ts`.
5. Si la feature usa endpoints nuevos, primero tienen que estar en el contrato
   (`docs/openapi`) **y** en los mocks (`src/shared/mocks`). El test de
   contrato falla si uno de los dos queda sin el otro. Sin handler, el test de
   pantalla también falla a propósito.
6. Si la pantalla tiene una acción que opera un solo perfil, su permiso va en
   `ACTION_ACCESS` y su caso en `tests/unit/app/actionAccess.test.ts`.
7. Tras agregar los tests, `npm run ca-matrix` para actualizar la matriz.

### Los tests primero

Se puede —y conviene— escribir los tests **antes** que la feature, a partir de
los criterios de aceptación de la historia: después se programa hasta que
pasen. Así se hizo con `clients` (HU-8 y HU-9) y con el listado de causas
(HU-20). Cada test dice en un comentario qué criterio cubre (`/* CA-8.4 */`),
así se ve de un vistazo si quedó alguno sin cubrir.

Antes de escribirlos conviene armar la lista de casos con el criterio que cubre
cada uno, quitar los que ya tienen dueño en otra capa ([§5](#5-un-dueño-por-cada-regla)),
y revisar al final que ningún criterio haya quedado sin test. Un test que no
sale de un criterio —el estado de carga y el de error que pide el
[mínimo](#mínimo-por-feature), un botón que está en el prototipo— también va,
con un comentario que diga de dónde sale.

Dos cosas a tener en cuenta:

- **Un test que importa un archivo que todavía no existe no compila**, y un
  test que no compila rompe `npm run build` y `npm test` (ver
  [§6](#6-mapa-de-carpetas)). Mientras la feature no esté, esos tests viven en
  la rama de la feature: no se suben solos a `develop`.
- **Los tests fijan nombres y textos.** Si el test busca el botón "Registrar
  cliente" o importa `@/features/clients/pages/ClientsPage`, el código tiene
  que llamarse así. Los textos salen del prototipo; si al programar hace falta
  otro, se cambia en el test y en la pantalla juntos.

### Mínimo por feature

Antes de abrir el PR de una feature, tiene que tener:

- [ ] Un test por cada regla de dominio (esquema o `utils/` con lógica), en su
      límite.
- [ ] Cada pantalla con: la lista cargada, el vacío y el error de carga; y en
      cada alta o edición, el camino feliz, un error de validación **mostrado en
      su campo** y el error del servidor.
- [ ] Un E2E del camino feliz, si la feature agrega un flujo crítico.
- [ ] `npm test`, `npm run lint` y `npm run build` en verde.

El mínimo es un piso y la tabla de la [§4](#4-antes-de-escribir-un-test) es
el techo: entre los dos está lo que vale la pena.

### Sprint 3: los tests que ya están escritos

Los tests del Sprint 3 se escribieron antes que las pantallas y están en rojo
hasta que se programe cada historia. Salen del contrato V4 (revisión del
19/10/2026), del prototipo y de los criterios de Jira del 17/10/2026; cada uno
dice qué `CA-x.y` cubre o, si no tiene criterio, de qué parte del contrato o
del prototipo sale. Los mocks ya implementan todo V4
(`src/shared/mocks/README.md`).

| HU | Frontend | Tests |
| --- | --- | --- |
| 27 Línea de vida | Ezequiel Purro | `components/cases/CaseDetailPage.timeline.test.tsx` |
| 31 Actos interruptivos | Ezequiel Purro | `components/cases/CaseDetailPage.interruptiveAct.test.tsx`, `unit/cases/interruptiveAct.schema.test.ts` |
| 33 Marcar prescripta | Ezequiel Purro | `components/cases/CaseDetailPage.prescription.test.tsx`, `unit/cases/prescriptionDeclaration.schema.test.ts`, `unit/app/actionAccess.test.ts` |
| 34 y 35 Modelos formales | Luciano Cipolla | `components/documents/DocumentTemplatesPage.test.tsx`, `unit/documents/documentTemplate.schema.test.ts` |
| 39 y 40 Carpeta y modelos | Luciano Cipolla | `components/cases/RegisterCasePage.folder.test.tsx`, `components/cases/CaseDetailPage.folder.test.tsx` |
| 41 Tablero del abogado | Facundo Fiorani | `components/dashboard/HomePage.lawyer.test.tsx` |
| 42 Tablero del administrador | Facundo Fiorani | `components/dashboard/HomePage.administrator.test.tsx` |
| 30, 32, 51 y 52 | Sólo backend | Sin tests de pantalla. Lo visible de HU-32 (alertas, barra de prescripción) se prueba en los tableros y en el detalle |

El detalle de causa lleva un archivo por historia, y no uno por pantalla:
suma cuatro historias de dos personas y en un solo archivo pasaría el techo de
la [§4](#4-antes-de-escribir-un-test).

**Los nombres que fijan los tests.** El código tiene que llamarse así:

| Qué | Dónde |
| --- | --- |
| Página de modelos | `DocumentTemplatesPage` en `@/features/documents/pages/` |
| Inicio con los tableros | `HomePage` de `@/features/dashboard/pages/` (el módulo `home` se eliminó el 18/10/2026) |
| Acto interruptivo | `validateInterruptiveAct` en `@/features/cases/schemas/interruptiveAct.schema`; `InterruptiveActFormValues` (`name`, `actDate`, `notes`) en `@/features/cases/types/interruptiveAct` |
| Marca de prescripción | `validatePrescriptionDeclaration` en `@/features/cases/schemas/prescriptionDeclaration.schema`; `PrescriptionDeclarationFormValues` (`prescriptionDate`, `resolution`, `grounds`) en `@/features/cases/types/prescriptionDeclaration` |
| Modelo formal | `validateDocumentTemplate` en `@/features/documents/schemas/documentTemplate.schema`; `DocumentTemplateFormValues` (`name`, `jurisdictions`, `copyToNewCases`, `file`) en `@/features/documents/types/documentTemplate` |
| "Marcar prescripta" | `cases.declarePrescription` en `ACTION_ACCESS`: Administrador y Abogado |
| Secciones | `/inicio` y `/modelos` sólo para Administrador y Abogado; la Secretaría entra directo a `/causas` (CA-41.13, CA-35.8) |

**Lo que el equipo decidió** donde el contrato y el prototipo no alcanzan
(19/10/2026). Si cambia, se cambian el test y la pantalla juntos:

- **Nombres de personas** (V4 D-68, D-81): apellido y nombres van separados;
  el formato en pantalla es libre y el "Dr."/"Dra." no es obligatorio, porque
  no todos los abogados son doctores y un usuario puede no ser abogado. Los
  tests buscan los nombres con `personName` / `personNameIn`
  (`tests/setup/names.ts`), que aceptan "Nombres Apellido", con o sin
  tratamiento, y "Apellido, Nombres". El subtítulo de "Modificar usuario" sí
  es fijo: "Ávila, Romina · ravila".
- **Formularios de usuario y de abogado**: campos "Apellido" y "Nombres", con
  los mensajes "El apellido es obligatorio." y "Los nombres son
  obligatorios.". En el alta de usuario con ficha de abogado nueva, la ficha
  sólo pide la matrícula: el apellido y los nombres son los del usuario.
- **Carpeta en el alta de causa**: las dos casillas vienen tildadas. Sin
  carpeta, "Copiar los modelos" queda destildada, deshabilitada y con el
  mensaje "Primero hay que crear la carpeta en Drive para poder copiar los
  modelos." a la vista (CA-40.3). La ubicación que muestra el resumen es la
  del contrato, `/VZ Causas/{Apellido, Nombres}/{Fuero}/{carátula}` (D-61),
  no la del prototipo. Si Drive falla, la causa se registra igual y la
  pantalla avisa que la carpeta no se creó; el texto lo elige la pantalla. La
  Secretaría no ve cuántos modelos se copian, porque no consulta modelos
  (CA-40.10).
- **Carpeta en el detalle**: "Abrir carpeta en Drive" abre su enlace en otra
  pestaña. Los estados se rotulan como `CaseFolderStatus`: "Carpeta
  pendiente", "Creando carpeta", "Error en la carpeta". Cuando Drive falla el
  estado es `ERROR`, aunque CA-39.4 diga "pendiente": manda el contrato. El
  botón para crear o reintentar no está en el prototipo; su texto es libre y
  el test acepta "Crear carpeta", "Crear la carpeta" o "Reintentar".
- **Línea de vida**: cada movimiento es un `listitem` del panel "Ciclo de
  vida de la causa". El acto interruptivo que rige lleva un texto con "rige";
  un estado escrito a mano, "escrito a mano"; un vencimiento ajustado,
  "ajustado a mano". Si no carga, el error se muestra dentro del panel.
- **Tableros**: "Mi día" y "Estudio" son pestañas (`tab` con
  `aria-selected`); quien es Administrador y Abogado ve las dos y arranca en
  "Mi día". Sin datos: "Sin plazos abiertos", "Todas tus causas tienen un
  plazo en curso." y "Ninguna causa superó el 70 % de su plazo de
  prescripción.".
- **Errores**: se muestra el `message` del contrato, por ejemplo "No se pudo
  acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.".

**Tests viejos que cambiaron con V4.** `UsersPage` y `LawyersPage` pasaron a
apellido y nombres; `CaseDetailPage` y `RegisterProceduralActPage` buscan al
responsable con `personName`; en `CasesPage` el amparo 13619027 tiene el
vencimiento del acto lesivo (D-82); el aviso del alta de causa suma "·
carpeta creada en Drive con 6 modelos"; `access`, `AppLayout` y
`RedirectIfSession` sacan Inicio y Modelos a la Secretaría; `permissions`
ya no tiene `/notification-settings` (D-79).

Desde el 18/10/2026 el código de la app sigue V4 (`lastName` y `firstName`,
`caseCount`, los datos por fuero de la causa) y la suite vieja volvió a verde.
Quedan en rojo dos tests que esperan un comportamiento que V4 cambió y hay que
decidir: `LegalQualificationsPage` espera la tabla "sin acciones", pero la
modificación y la baja ya están hechas (HU-49, HU-50); y
`RegisterProceduralActPage` espera que no se ofrezcan los estados terminales,
pero V4 los permite salvo "Prescripta" (D-69). `endpoints.test.ts` sigue en
rojo hasta que el swagger del sprint (VZ-177) sume prescripción, carpeta,
modelos y tableros.

**Lo que queda para el backend**, sin test de pantalla: CA-27.7, 27.10, 27.16
y 27.17; CA-31.3 a 31.5, 31.7 y 31.12 a 31.14; CA-33.6 a 33.8 y 33.10 a
33.15; CA-34.11; CA-35.3 y 35.7; CA-39.9 a 39.13 y 39.15; CA-40.5 a 40.9;
CA-41.6, 41.9 y 41.11; CA-42.8; y HU-30, HU-32 (salvo lo visible), HU-51 y
HU-52.

---

## 12. Lint de los tests

`oxlint` corre también sobre `tests/` con reglas propias (plugin `vitest`, en
`frontend/.oxlintrc.json`). Las que cortan el PR:

| Regla | Qué evita |
|---|---|
| `vitest/expect-expect` | Un test sin ninguna aserción (`expect`, o `expect*` de un helper) |
| `vitest/no-focused-tests` | Un `it.only` olvidado, que deja al resto sin correr |
| `vitest/no-disabled-tests` | Un `it.skip` que nadie vuelve a mirar |
| `vitest/no-identical-title` | Dos tests con el mismo nombre en el mismo `describe` |
| `vitest/valid-expect` | Un `expect(x)` sin matcher, que nunca falla |

Y avisa (sin cortar) `valid-title` y `no-commented-out-tests`: un test
comentado es un test borrado sin decirlo.

```bash
npm run lint
```

---

## 13. Comandos

| Comando | Qué hace | Cuándo |
|---|---|---|
| `npm test` | Corre `unit/` y `components/` una vez | Antes de cada commit |
| `npm run test:watch` | Lo mismo, pero se re-ejecuta al guardar | Mientras programás |
| `npm run lint` | `oxlint` sobre `src/` y `tests/` | Antes de cada commit |
| `npm run ca-matrix` | Regenera `MATRIZ_CA.md` | Al agregar o quitar tests con criterio |
| `npm run test:e2e` | Corre Playwright: levanta la app con mocks en el puerto 5199 | Antes de abrir un PR |
| `npm run test:e2e:ui` | Playwright con interfaz visual, paso a paso | Para depurar un E2E |

Para correr un solo archivo o una sola feature:

```bash
npm test -- tests/unit/users
npm test -- LoginPage
npx playwright test tests/e2e/auth.spec.ts
```

Para ver la cobertura hay que tener `@vitest/coverage-v8` (no está en las
dependencias del proyecto: se instala a mano, con `npm i -D` o `--no-save`).
Se mira **por archivo de `src/`**, excluyendo `src/shared/mocks`, y sólo para
encontrar código con lógica que ningún test recorre. **No hay meta de
cobertura** ([§1](#1-qué-buscamos-con-los-tests)): hoy ronda el 88 % de líneas y
lo que queda afuera es, sobre todo, presentación que recorren los E2E.

---

## 14. Problemas comunes

**"El test falla con `[MSW] Cannot bypass a request when using the "error" strategy`"**
El componente llamó a un endpoint que no tiene handler en los mocks. En los
tests MSW está configurado con `onUnhandledRequest: 'error'` a propósito, para
que un endpoint mal escrito falle en vez de salir a la red. Revisá la URL o
agregá el handler en `src/shared/mocks`.

**"`useNavigate()` may be used only in the context of a `<Router>`"** (o lo
mismo con `QueryClient`)
Usaste `render` en vez de `renderWithProviders`.

**"Un test pasa solo pero falla cuando corro todos"**
Algo quedó compartido entre tests. Lo típico: un override de `server.use`
fuera de un `it`, o estado guardado en `sessionStorage` / `localStorage`. El
setup limpia MSW y la base del mock, pero si tu feature guarda algo en el
navegador, limpialo en un `afterEach`.

**"Un test de vencimientos pasa hoy y falla mañana"** (o pasa de lunes a
viernes y falla el fin de semana)
Las causas semilla tienen los vencimientos atados a hoy. Fijá el día antes de
rearmar la base: ver [Tests que dependen del día](#tests-que-dependen-del-día).

**"Fijé el reloj y ahora `findByText` no termina nunca"**
Se falsearon también los temporizadores. Usá
`vi.useFakeTimers({ toFake: ['Date'] })`, que sólo toca `Date`.

**"Entro como `mrios` y la pantalla no muestra el error que esperaba"**
Desde V3 leer abogados, estados, calificaciones, clientes y causas está abierto
a cualquier perfil: el mock ya no responde `403`. Forzá el error con
`server.use(...)`.

**"Registro un acto en un test y el mock responde `403`"**
El usuario no es el abogado responsable de esa causa. Desde la revisión del
05/10/2026 no alcanza con tener el rol `LAWYER`: ver la tabla de
[qué responde el mock a cada perfil](#82-un-test-de-components).

**"`getByText` no encuentra el mensaje de error"**
Si el mensaje aparece después de una respuesta de la API, usá `findByText`
(que espera) en vez de `getByText` (que no espera).

**"`findByRole('dialog')` encontró el modal pero después `within(dialog)` no encuentra nada"**
El modal se volvió a montar y tu referencia quedó vieja (desconectada del
documento). Volvé a buscarlo con `screen.getByRole('dialog')` después de la
acción. Si el modal no debería remontarse, es un bug del componente: pasaba en
`UserFormModal` con el error "Elegí al menos un perfil", ya se arregló, y
`UsersPage.test.tsx` lo verifica buscando adentro de la referencia original.

**"Un E2E me devuelve al login sin razón"**
Casi seguro hubo un `page.goto()` o un `reload()` después del login. Ver
[No recargues la página después del login](#no-recargues-la-página-después-del-login).

**"Todos los E2E fallan de golpe con `browserType.launch: Executable doesn't exist`"**
No es que se rompió nada: falta el navegador. Pasa la primera vez en una máquina
nueva y, sobre todo, **cada vez que se actualiza Playwright**, porque cada
versión trae su propio build de Chromium. Se arregla con `npx playwright install
chromium`. Mientras falte, todos los E2E fallan antes de arrancar, así que el
error se reconoce porque fallan *todos* y ninguno llega a abrir una pantalla.

**"El E2E anda en mi máquina y falla en la de otro"**
Casi siempre es un `waitForTimeout` o un selector por clase CSS. Usá
`getByRole` / `getByLabel` y dejá que Playwright espere solo.

---

## 15. Referencias

- `docs/Frontend-Architecture/ESTRUCTURA.md`: la estructura de `src/`, que
  `tests/` copia.
- `docs/Frontend-Architecture/MATRIZ_CA.md`: criterio de aceptación → tests
  (generada con `npm run ca-matrix`).
- `frontend/src/shared/mocks/README.md`: los mocks, los fixtures y cómo
  disparar cada error.
- `docs/openapi/`: el contrato de la API que verifica el test de
  `tests/unit/contract/`.
- `docs/Api-Contract/API_CONTRACT_V3.md`: lo que la API tiene que responder, y
  lo que implementan hoy los mocks (con su revisión del 05/10/2026, §7.8).
  `API_CONTRACT_V2.md` queda como registro del Sprint 1.
- `frontend/CLAUDE.md`: cómo quedó aplicada esa revisión en el código, en
  "Revisiones del contrato".
- Las ideas de fondo: [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) ·
  [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) ·
  [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) ·
  [Guiding principles de Testing Library](https://testing-library.com/docs/guiding-principles)
- Herramientas: [Vitest](https://vitest.dev) ·
  [Testing Library](https://testing-library.com/docs/react-testing-library/intro) ·
  [MSW](https://mswjs.io) ·
  [Playwright (buenas prácticas)](https://playwright.dev/docs/best-practices)
