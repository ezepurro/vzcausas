# Plan de resolución (Fase 2)

12/11/2026 · rama `feat/auditoria-front` · **propuesta: no se programa nada
hasta que el equipo lo acuerde.**

Rutas relativas a `frontend/`. Los `H-xx` son los de
[01-DIAGNOSTICO_INICIAL.md](01-DIAGNOSTICO_INICIAL.md); A y B, las áreas de
[02-DIVISION_DE_TRABAJO.md](02-DIVISION_DE_TRABAJO.md). El contrato que se cita
es `docs/Api-Contract/API_CONTRACT_V6.md` (ver la decisión 1).

## 0. Lo que se revisó a pedido: selectores de "Registrar causa" y "Modificar causa"

El pedido fue: que el cliente y las calificaciones legales se elijan
escribiendo para filtrar; revisar si sólo llegan los primeros 100 clientes y
qué pasa con uno recién creado que cae después del 100; y poder registrar
clientes y calificaciones desde "Modificar causa". Se leyó el código; **no se
reprodujo en el navegador** (las semillas del mock no llegan a 100).

### Lo que hay hoy

| Punto | Qué pasa | Dónde |
|---|---|---|
| Selector de cliente | Es un `<select>` nativo: no se puede escribir para filtrar | `src/features/cases/components/CaseForm.tsx:236` |
| Selector de calificaciones | Otro `<select>` nativo ("Agregar calificación…") | `src/features/cases/components/LegalQualificationPicker.tsx` (bloque `vz-field-row`) |
| Cuántos llegan | Sólo la primera página de 100, en el orden del backend: clientes por apellido, calificaciones por nombre | `src/features/cases/pages/RegisterCasePage.tsx:86`, `:134-136`; contrato `GET /clients` (`:3097`) y `GET /legal-qualifications` (`:2624`), `limit` "entre 1 y 100" |
| Cliente después del 100 | **No se puede elegir.** No es "los 100 primeros cargados" sino los 100 primeros por apellido: con 150 clientes, de la "P" en adelante no aparecen | Ídem |
| Cliente recién creado fuera de los 100 | Está resuelto a medias: la página lo guarda en un estado (`createdClient`) y lo suma a mano a las opciones. Se pierde si se recarga: el borrador conserva `clientId` pero no el cliente, y queda elegido sin opción ni resumen (**sin verificar**) | `RegisterCasePage.tsx:115`, `:138-143`, `:411-416` |
| Calificación fuera de las 100 | **Peor**: una elegida que el listado no trae se muestra como "Calificación dada de baja… quitala para poder registrar la causa" y **bloquea el alta**. Le pasa a una recién creada que cae después de la 100 | `RegisterCasePage.tsx:208-214`, `:317` |
| Lo mismo en "Modificar causa" | Una causa cuya calificación quedó fuera de las 100 la mostraría como dada de baja al abrir el diálogo | `src/features/cases/api/useCaseEdit.ts:22`, `:94-109` |
| Registrar calificación desde "Modificar causa" | No está: el selector se arma sin `onCreate` | `src/features/cases/components/CaseEditForm.tsx:218-227` |
| Registrar cliente desde "Modificar causa" | No está, **a propósito**: ver abajo | `CaseEditForm.tsx:64-65`, `:196-198` |

Esto agrega tres hallazgos al diagnóstico: **H-28 (ALTO)**, la calificación
fuera de las 100 tratada como dada de baja; **H-29 (MEDIO)**, selectores sin
filtro; **H-30 (MEDIO)**, "Modificar causa" sin "Registrar calificación
nueva". H-03 queda confirmado para clientes.

### Lo que sí se puede hacer sin tocar el contrato

Los dos listados aceptan `search` (`GET /clients`: por apellido, nombre y
documento; `GET /legal-qualifications`: por nombre y artículo) y existe el
`GET` por id de cada uno. Alcanza para un selector que busca en el servidor.

### Lo que choca con el contrato: cliente en "Modificar causa"

**El cliente de una causa no se modifica** (D-111, `DECISIONES.md:77`):
`PATCH /cases/{caseId}` rechaza `clientId` con `400`. El diálogo lo muestra
deshabilitado con la nota "No se modifica. Si la causa se registró con otro
cliente, dala de baja y registrala de nuevo." (`CaseEditForm.tsx:197`).
Registrar un cliente desde ahí no serviría para nada: no habría cómo
asignárselo a la causa. **No se planifica**; si el equipo lo quiere, primero
hay que revertir D-111 en el contrato y en el backend (decisión 6).

## 1. Decisiones del equipo que frenan tareas

| # | Decisión | Frena |
|---|---|---|
| 1 | ¿Contrato vigente V5 o V6? El `CLAUDE.md` raíz dice V5; el del front, V6 (H-15) | Todo: contra qué se audita |
| 2 | Campana de notificaciones: ¿se saca de producción? (H-08) | T-22 |
| 3 | Modal con datos cargados: ¿confirmar, no cerrar con clic afuera, o dejar? (H-05) | T-13 |
| 4 | ¿El front pasa a leer `permissions` del backend o sigue con sus tablas por rol? (H-10) | T-27 |
| 5 | ¿Se agrega Prettier? Reescribe casi todo: si va, es un commit aparte y **antes** de la ola 2 (H-17) | T-41 |
| 6 | ¿Se mantiene D-111 (el cliente de una causa no se modifica)? | "Registrar cliente" en "Modificar causa" |
| 7 | El selector con filtro, ¿reemplaza también al de abogado responsable? (Se propone que no: son pocos) | T-11 |

## 2. Tareas

Cada ola se puede repartir entre los dos. Dentro de una ola, las tareas de A
y de B no comparten archivos salvo donde se indica.

### Ola 1 — Verificar antes de tocar (sin código)

| Id | Área | Qué | Terminado cuando |
|---|---|---|---|
| T-01 | A | Reproducir H-01: dos pestañas, salir en una; después, entrar con otro usuario | Queda escrito qué ve y qué pide cada pestaña |
| T-02 | A | `RouteErrorPage.test.tsx` aislado, tres corridas (H-02) | Se sabe si es el test, el entorno o la pantalla |
| T-03 | A | `npm run build`, tamaño por chunk, buscar el secreto de la campana en `dist/`, `npm run test:e2e`, `npm audit` | Resultados en un informe de esta carpeta |
| T-04 | A | Sembrar en el mock más de 100 clientes y calificaciones (local, sin commitear) y reproducir H-03 y H-28 | Capturas del cliente que no aparece y de la calificación "dada de baja" |
| T-05 | B | Las 14 pantallas en 320, 390, 768, 1024, 1366 y 1440 px, con los tres perfiles | Capturas y lista de defectos con gravedad |
| T-06 | B | Recorrido con teclado y de foco; estados de carga, vacío y error por pantalla | Lista de defectos |

T-05 y T-06 van a sumar hallazgos: la ola 4 se termina de armar con eso.

### Ola 2 — Bugs altos

**T-10 · Sesión entre pestañas (H-01).** Área A.
- *Solución:* `AuthProvider` escucha `storage`. Si desaparece la sesión → se
  cierra acá también (motivo `'expired'`, para no borrar borradores). Si
  cambió el usuario → se vacía la caché y se toma la sesión nueva. Si es el
  mismo usuario con otro token → sólo se actualiza el estado.
- *Archivos:* `src/app/providers/AuthProvider.tsx`; test nuevo en
  `tests/components/auth/`.
- *Depende de:* T-01. *Riesgo:* **alto** (convive con la renovación y su
  candado; leer antes `tokenRenewal.test.tsx`).
- *Terminado cuando:* test nuevo en verde, los de `auth/` siguen en verde y
  T-01 repetido da bien.

**T-11 · Selector con filtro para cliente y calificaciones (H-03, H-28,
H-29).** A y B, en dos partes que se pueden hacer a la vez.

- **T-11a · El control** (B). Un componente nuevo, `SearchSelect`, en
  `src/shared/components/forms/`: al abrirlo muestra todas las opciones; al
  escribir, filtra; flechas, Enter y Escape; "Sin resultados"; estado
  "Buscando…". Sigue el patrón ARIA de `combobox` con lista. No se estira
  `Combobox.tsx`: ese es texto libre con sugerencias (el estado del acto) y
  mezclar los dos usos lo complica. Recibe las opciones y avisa lo que se
  escribe (`onSearch`); no sabe de dónde salen.
  *Archivos:* `SearchSelect.tsx` (nuevo), `forms/index.ts`,
  `src/styles/controls.css`, test en `tests/components/shared/`.
  *Riesgo:* bajo (archivo nuevo). *Terminado cuando:* test propio de teclado
  y filtro, y se ve bien a 320 px y adentro de un modal.

- **T-11b · Los datos** (A).
  1. Las opciones se piden con `search` (con `useDebouncedValue`) en vez de
     una página fija de 100. Con el campo vacío se muestran las primeras 100
     y, si `pagination.totalItems` es mayor, un renglón "Escribí para buscar
     entre los N".
  2. Lo **elegido** se resuelve por id, no buscándolo en el listado: el
     cliente con `GET /clients/{clientId}` (el alta ya deja su detalle en la
     caché, `useCreateClient.ts`) y cada calificación con
     `GET /legal-qualifications/{qualificationId}`. Desaparece el parche
     `createdClient`.
  3. "Dada de baja" pasa a decidirse por el `404` de ese `GET`, no por faltar
     en la página (arregla H-28). En "Modificar causa", nombre y plazo salen
     de la causa misma.
  *Archivos:* `src/features/cases/pages/RegisterCasePage.tsx`,
  `api/useCaseEdit.ts`, `components/{CaseForm,CaseEditForm,LegalQualificationPicker}.tsx`;
  hooks nuevos `useClient` y `useLegalQualification` en sus módulos y sus
  `index.ts`; **a confirmar** que el mock implementa los dos `GET` por id.
  *Depende de:* T-04 y T-11a. *Riesgo:* **alto**: 14 líneas de test eligen
  cliente o calificación en un `<select>` (`RegisterCasePage*.test.tsx`,
  `CaseDetailPage.edit.test.tsx`, `tests/e2e/cases.spec.ts`) y hay que
  reescribirlas; el borrador del alta guarda `clientId`.
  *Terminado cuando:* con 150 clientes y 150 calificaciones sembrados se
  elige, se crea y se recarga con borrador sin perder nada; tests en verde.

**T-12 · "Registrar calificación nueva" en "Modificar causa" (H-30).** Área A.
- *Solución:* `useCaseEdit` maneja el modal de alta (el mismo
  `LegalQualificationFormModal` en modo `fromCase` que usa el alta de causa) y
  le pasa `onCreate` al selector.
- *Archivos:* `api/useCaseEdit.ts`, `components/CaseEditForm.tsx`.
- *Depende de:* **T-13** (queda un modal encima de otro) y T-11b.
  *Riesgo:* medio. *Terminado cuando:* test en `CaseDetailPage.edit.test.tsx`;
  Escape cierra sólo el de arriba.

**T-13 · Modales apilados y cierre con datos (H-05, H-06).** Compartido:
lo toma A, B revisa.
- *Solución:* sólo el modal de más arriba atiende Escape y Tab (una pila en
  el módulo). Y lo que salga de la decisión 3.
- *Archivos:* `src/shared/components/ui/Modal.tsx`, quizá `FormModal.tsx`.
- *Riesgo:* **alto** (todos los diálogos). *Terminado cuando:* test de dos
  modales apilados; toda la suite en verde.

### Ola 3 — Medios

| Id | Área | Hallazgo | Solución | Archivos | Riesgo |
|---|---|---|---|---|---|
| T-20 | B | H-04 | Avisos: los de error no se van solos (o duran más), pausa al pasar el mouse, temporizadores cancelados, un solo anuncio para lector de pantalla, clases `vz-toast*` y CSS a `src/styles/feedback.css` | `ToastProvider.tsx`, `ToastProvider.css`, `feedback.css` | Medio: hay tests que esperan que el aviso desaparezca |
| T-21 | B | H-07 | Ítems del rail como enlaces (`NavLink`); menú del teléfono con el fondo inerte y foco atrapado | `AppShell.tsx`, `AppLayout.tsx`, `shell.css` | **Alto**: tests de `AppLayout` buscan botones |
| T-22 | B | H-08 | Según decisión 2: la campana sólo se dibuja si `DAILY_RUN_ENABLED` | `AppLayout.tsx` | Bajo |
| T-23 | A | H-11 | Timeout propio para subir un modelo y para las descargas | `documentTemplates.api.ts`, `cases.api.ts` | Bajo |
| T-24 | A | H-14 | Comparar `estimatedExpiry` con el backend en días 29–31; si difiere, ajustar el fin de mes | `cases/utils/prescription.ts` + unit | Bajo |
| T-25 | A | H-02 | Lo que salga de T-02 | `RouteErrorPage.test.tsx` o `RouteErrorPage.tsx` | Bajo |
| T-26 | A | H-09 | Sólo análisis: medir cuántas renovaciones dispara un `403` de causa ajena. Se toca sólo si T-01 muestra un problema | — | — |
| T-27 | A | H-10 | Según decisión 4 | `access.ts`, `session.ts` | **Alto** |

T-21 y T-22 tocan `AppLayout.tsx`: van juntas, una sola persona.

### Ola 4 — Responsive y visual (B)

Se completa con lo que salga de T-05 y T-06. Lo ya conocido:

| Id | Hallazgo | Solución | Archivos |
|---|---|---|---|
| T-30 | H-13 | Lo que falle a 320 px y en los anchos intermedios; dejar los cortes listados en un comentario de `tokens.css` | `src/styles/*` |
| T-31 | H-25 | Controles de menos de 32 px en el teléfono | `controls.css`, `cases.css` |
| T-32 | H-26 | La marca en el login del teléfono | `login.css`, `LoginPage.tsx` |
| T-33 | H-20 | Título de pestaña por pantalla | Un hook en `shared/hooks/` y una línea por página (**compartido**: coordinar con A) |
| T-34 | H-23 | Fuentes con `<link>` y `preconnect` en `index.html`, fuera del `@import` | `index.html`, `styles/index.css` |

### Ola 5 — Limpieza (A)

| Id | Hallazgo | Qué |
|---|---|---|
| T-40 | H-16, H-18, H-19 | Sacar `react-hook-form` (si el equipo confirma que no se va a usar), imports relativos y comentados, carpetas vacías, el comentario viejo de `http.ts:7` |
| T-41 | H-17 | Prettier, según decisión 5 |
| T-42 | H-12 | **No se planifica todavía.** Primero leer completas las páginas de `cases`; un refactor sólo si destraba una corrección |

## 3. Orden y reparto

```
Ola 1   A: T-01 T-02 T-03 T-04        B: T-05 T-06
Ola 2   A: T-10 → T-13 → T-11b → T-12 B: T-11a  (después revisa T-13)
Ola 3   A: T-23 T-24 T-25 T-26        B: T-20 → T-21+T-22
Ola 4                                 B: T-30 … T-34
Ola 5   A: T-40 T-41
```

Después de cada tarea: `npm run lint`, `npx tsc -b`, `npx vitest run`, y lo
modificado probado en el navegador. Al cerrar cada ola, además
`npm run test:e2e` y `npm run build`. Una tarea no está terminada si un test
quedó rojo o si su regla no tiene test: en ese caso se anota como pendiente de
revisión manual.

## 4. Lo que este plan no cubre

- Todo lo que aparezca en la ola 1: es la mitad de la auditoría.
- El Sprint 5 (V6): pantallas nuevas, no correcciones.
- Pruebas contra el backend real: el plan se verifica con los mocks, salvo
  T-03 y T-23, que necesitan el backend levantado.
