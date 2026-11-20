# Plan — Asistente de ayuda (demo)

Estado: **F0 a F4 hechas y probadas contra Gemini real (20/11/2026). Sigue F5.**

F4, streaming (20/11/2026):
- Mismo endpoint con `Accept: text/event-stream`. `LlmPort.stream()`, Gemini con
  `generateContentStream`, `AskHelpAssistant.stream()` y el controller escribe
  SSE con `EventStreamWriter`. Lo que falla antes del primer evento sigue
  respondiendo JSON con su código.
- **`StreamingAnswer`** (dominio) retiene sólo el último renglón mientras pueda
  ser `FUENTES:`; probado en vivo: la línea nunca llegó al cliente.
- **Cambio a la propuesta:** `done` trae `{ answer, sources }` (antes, solo
  `sources`), y manda sobre los `delta`.
- Cerrar la conexión aborta la llamada a Gemini (`AbortSignal.any` con el
  tiempo límite).
- Front: `fetch` sólo para el streaming; un `401` se repite por `http` en JSON.
- **Medido en vivo:** con `gemini-3.5-flash-lite` casi toda la espera es hasta
  la primera palabra (2 a 8 s en la capa gratuita, igual que en JSON) y el
  texto completo llega en ~200 ms. El streaming luce en respuestas largas; en
  las cortas casi no cambia la espera.

Prueba en vivo (20/11/2026, `gemini-3.5-flash-lite`, capa gratuita):
- 5 preguntas por API y 2 desde el panel: todas `200`, de 1,2 a 2,4 s.
- ~6.200 tokens de entrada por pregunta (el manual entero) y 33 a 89 de
  salida: el tope de 2048 sobra. Gemini no reportó tokens cacheados.
- Consejo jurídico → deriva; fuera del manual → lo dice; pedido de mostrar las
  instrucciones → se niega. Las fuentes llegan validadas.
- El log no guarda el contenido de preguntas ni respuestas.
- Ajustado el mismo día: ante una duda de uso que el manual no cubre derivaba
  al abogado responsable; ahora deriva al Administrador (regla 1 de
  `help-assistant.profile.ts`). Lo jurídico sigue yendo al abogado. Probado en
  vivo.
- Para mirar en F5: en la respuesta jurídica citó "Registrar una causa" como
  fuente sin haberla usado. Es una fuente válida del manual, pero de más.

Cambios de F3 respecto de lo planeado:
- El mock del endpoint va **fuera de `ROUTES`** (`shared/mocks/assistant.demo.ts`):
  `tests/unit/contract/endpoints.test.ts` exige que lo de `ROUTES` esté en
  `docs/openapi`, y la demo no toca el contrato. Se registra en `browser.ts`
  con el flag; los tests lo enchufan con `server.use(...)`.
- No existía un panel lateral en `shared`: el panel es propio del módulo, con
  estilos en `styles/assistant.css`. El botón es **Asistente** con un avatar
  SVG propio (`AssistantAvatar.tsx`), a la derecha de la campana: no se toca
  `Icon.tsx`.
- El asistente marca los botones con `**…**`: el panel dibuja sólo esa marca
  (`utils/boldSegments.ts`), sin interpretar HTML.
- `frontend/.env.example` no existe: las variables están documentadas en
  `features/assistant/CAMBIOS.md`. En el `.env.local` del worktree se sumó
  `VITE_API_URL=/api/v1` (el compose lo setea; corriendo en el host, no).

Cambios de F2 respecto de lo planeado:
- El límite por usuario no es un guard: Nest corre los guards antes de la
  validación y un `400` habría gastado cupo. Es un puerto
  (`AssistantQuotaPort`) que el caso de uso consume después de validar.
- El módulo se carga con `ConditionalModule.registerWhen` de `@nestjs/config`,
  no con el chequeo de `process.env` de `DeadlinesModule`: ese chequeo corre
  antes de que se cargue el `.env` y en el host nunca ve las variables (por lo
  mismo, `DeadlinesModule` tampoco carga fuera de Docker; nombrado, no tocado).
- SDK `@google/genai` fijado en 2.32.0. Modelo por defecto
  `gemini-3.5-flash-lite`, tope de salida 2048: **pendiente de confirmar con
  una llamada real**.
- La integración no corre desde el worktree con `npm run test:int`: el
  `testMatch` no entra a `.claude/`. Se corre con una copia de la config que
  usa `testRegex` (fuera del repo). En la carpeta principal anda normal.

- F1, propuesta de contrato: `docs/experimental/asistente/PROPUESTA_CONTRATO.md`.
- F1, manual borrador: `backend/src/subsystems/assistant/infrastructure/manual/content/`
  (23 secciones, ~3900 palabras, ~6-7 mil tokens). Rama `feat/asistente-ayuda-demo`
(worktree `.claude/worktrees/asistente-ayuda-demo`, sale de `develop` en
`68687c3`).

## 0. Marco

- **Es una demo personal**, fuera del alcance del seminario. Se muestra al
  grupo y, si la aprueban, se integra con un merge normal a `develop`.
- **Se construye con los estándares del proyecto** (subsistema hexagonal,
  contrato primero, tests) para que integrarla no implique reescribirla.
- **Riesgo cero para la app real:**
  - Todo vive en esta rama y en archivos nuevos. Los archivos existentes que se
    tocan son los de la lista de §6, y cada cambio está detrás de un flag.
  - No se tocan `API_CONTRACT_V6.md` ni `DECISIONES.md`: la propuesta de
    contrato va en un documento aparte (§2).
  - No hay migración ni se escribe en la base.
  - Sin la clave de la API, el backend arranca igual y no carga el módulo.
    Sin `VITE_ASSISTANT_ENABLED`, el front no muestra el botón.

## 1. Decisiones tomadas (20/11/2026)

| Tema | Decisión |
| --- | --- |
| Manual | Borrador de demo en markdown, redactado a partir de V6, el prototipo y las pantallas del front. Marcado como borrador. Cuando exista el Manual de Usuario real, se reemplazan los archivos y el código no cambia |
| Alcance | Backend y frontend |
| Proveedor | **Gemini, capa gratuita** para la demo. Si la demo sigue, se pasa a **Anthropic** (Claude Haiku 5.5 para la ayuda) |
| Criterio | Hacerlo bien y escalable: que el asistente de escritos reutilice la misma pieza |
| Fuentes | La respuesta trae `sources` (secciones del manual usadas) |
| Límite | Por usuario, no por IP (en el estudio todos salen por la misma IP). Inicial: 6 por minuto y 60 por día, configurables |
| Topes | 20 mensajes por pedido y 2000 caracteres por mensaje |
| UI | Botón **Asistente** con avatar propio en la barra superior de `AppLayout` (a la derecha de la campana) y panel lateral a la derecha, sin tapar la pantalla |

### Qué implica la capa gratuita de Gemini

- **Google usa lo que se manda para mejorar sus productos.** Por eso:
  - El backend no adjunta ningún dato de la app: solo el manual y la pregunta.
  - El panel muestra un aviso fijo: "Demo: no escribas datos de causas ni de
    clientes".
  - Nada de esto sirve para producción. Cambiar de proveedor es requisito para
    integrarla (§8).
- **Tiene límites de pedidos por minuto y por día.** Cuando se agota la cuota,
  el usuario recibe `502 ASSISTANT_UNAVAILABLE` (§2).
- **Hay que verificar contra la documentación de Google al implementar, no de
  memoria:** el nombre del SDK de JavaScript, el modelo gratuito vigente, sus
  límites y si cachea el prompt.

## 2. Propuesta de contrato (documento aparte)

Va en `docs/experimental/asistente/PROPUESTA_CONTRATO.md`, con el formato de V6.
Se pasa a `API_CONTRACT_V6.md` (o V7) y a `DECISIONES.md` solo si el grupo
aprueba. Por eso **no lleva número de decisión**: se le asigna al integrarla,
para no chocar con la numeración real (la última es D-147).

**`POST /help/assistant`** — cualquier usuario autenticado.

- **Request:** `{ "messages": [{ "role": "user" | "assistant", "content": string }] }`.
  El backend no guarda nada: el cliente manda el historial en cada pedido.
  - Entre 1 y 20 mensajes; el último es `user`. Cada `content` tiene entre 1 y
    2000 caracteres.
  - Si no se cumple, `400 VALIDATION_ERROR` con `details` por campo.
  - El front manda solo los últimos 20 mensajes, así que en uso normal nunca
    ve ese 400.
- **Respuesta `200`:**
  `{ "answer": string, "sources": [{ "id": string, "title": string }] }`.
  - `sources` son las secciones del manual en las que se apoya la respuesta.
    Puede venir vacío: por ejemplo, cuando el asistente dice que el manual no
    cubre la pregunta.
  - El backend descarta todo `id` que no exista en el manual. Una fuente
    inventada nunca llega al cliente.
- **Respuesta en streaming (fase 4):** el mismo endpoint con
  `Accept: text/event-stream` devuelve eventos `delta` (texto parcial), `done`
  (con `sources`) y `error` (con el mismo `code` que la respuesta JSON). Es
  una excepción nueva a "todo JSON" (`API_CONTRACT_V6.md:10260`) y la
  propuesta lo dice explícitamente.
- **Errores:**
  - `502 ASSISTANT_UNAVAILABLE` (nuevo): el proveedor no respondió, tardó
    demasiado o agotó su cuota. Hay que ampliar la descripción del 502 en §6
    de V6, que hoy habla solo del almacenamiento en la nube.
  - `429 TOO_MANY_REQUESTS`: ya existe, con `Retry-After` y
    `details.retryAfterSeconds` como en el resto de la API. Este endpoint
    tiene además un límite propio **por usuario**: 6 pedidos por minuto y 60
    por día.
  - **Si el modelo se niega a responder**, no es error: devuelve `200` con una
    respuesta fija.

## 3. Backend — subsistema `assistant`

**Dónde está la escalabilidad:** en el puerto `LlmPort` y en los perfiles. El
asistente de ayuda y el de escritos son dos perfiles del mismo servicio. Pasar
de Gemini a Anthropic es cambiar el adaptador, sin tocar el core.

**El bucle de herramientas no entra en la ayuda.** El manual entra entero en el
contexto, así que buscar secciones con una herramienta solo agregaría latencia y
costo. El puerto ya acepta herramientas y streaming, y el bucle se implementa
con el asistente de escritos, que sí lo necesita.

| Capa | Archivo (en `backend/src/subsystems/assistant/`) | Qué hace |
| --- | --- | --- |
| dominio | `core/domain/ports/llm.port.ts` | `complete(request)`: `model`, `system`, `turns`, `maxOutputTokens` → `text`, `outcome` (`COMPLETED`, `REFUSED`, `TRUNCATED`) y `usage`. Vocabulario propio: ningún tipo de un SDK entra al core. Streaming y herramientas se agregan cuando un perfil los necesite |
| dominio | `core/domain/ports/help-manual.port.ts` y `assistant-quota.port.ts` | De dónde sale el manual; consumir una pregunta del cupo |
| dominio | `core/domain/value-objects/` | `HelpManual`, `Conversation`, `AssistantReply` (fuentes validadas), `UsageLimits` y `QuestionHistory` (la regla del límite, ventanas móviles) |
| dominio | `core/domain/profiles/` | `AssistantProfile` (interfaz y token) y `HelpAssistantProfile` (reglas del prompt). El de escritos irá al lado |
| dominio | `core/domain/errors/assistant.errors.ts` | `AssistantUnavailableError` (502) y `TooManyAssistantRequestsError` (429) |
| aplicación | `core/application/use-cases/ask-help-assistant.use-case.ts` | Valida la conversación, consume el cupo, llama al modelo y arma la respuesta. Falsos en `test-support/assistant-fakes.ts` |
| infraestructura | `infrastructure/llm/gemini/` (`gemini-llm.adapter.ts`, `gemini.mapper.ts`) y `llm/llm-provider.factory.ts` | Adaptador de Gemini (hace la llamada; lee `GEMINI_API_KEY` y `ASSISTANT_TIMEOUT_MS`), `GeminiMapper` (traduce pedido, respuesta y errores) y elección por `ASSISTANT_LLM_PROVIDER`. Anthropic irá en `llm/anthropic/` |
| infraestructura | `infrastructure/manual/` | Lector de archivos y `content/*.md` |
| infraestructura | `infrastructure/persistence/in-memory/in-memory-assistant-quota.ts` | Guarda la `QuestionHistory` de cada usuario. En memoria: alcanza para una instancia (deuda si se escala) |
| infraestructura | `infrastructure/http/{controllers,dtos,mappers}/` | Controller, DTO de entrada y de respuesta, `AssistantReplyHttpMapper` |
| infraestructura | `infrastructure/config/` | `createHelpProfile` (modelo y tope desde el entorno) y `positiveIntFromConfig` |
| módulo | `assistant.module.ts` | Solo composición. `AppModule` lo carga con `ConditionalModule` si está `ASSISTANT_LLM_PROVIDER` |

**Reglas del prompt (perfil `HELP`):**
- Responde solo con lo que dice el manual. Si no está, lo dice y no inventa.
- Cierra con una línea `FUENTES: <id>, <id>` usando los `id` de las secciones.
  El caso de uso la separa del texto, valida los `id` contra el manual y arma
  `sources`. Se eligió así, y no con salida estructurada en JSON, porque
  funciona igual con streaming y con cualquier proveedor.
- No da consejo jurídico ni opina sobre causas: deriva.
- Responde en castellano rioplatense, corto.

**Logs:** usuario, duración, tokens y resultado. **Nunca el contenido** de las
preguntas ni de las respuestas (mismo criterio que
`ARQUITECTURA_BACKEND_V1.md:694`).

**Variables nuevas:** `ASSISTANT_LLM_PROVIDER`, `GEMINI_API_KEY`,
`ASSISTANT_HELP_MODEL`, más los topes y el límite de pedidos.

## 4. Frontend — módulo `features/assistant/`

Sigue `ESTRUCTURA.md` §7 (`docs/Frontend-Architecture/ESTRUCTURA.md:380`).

- **No es una sección, es un panel:** no lleva ruta ni entrada en
  `ROUTE_ACCESS`.
- `api/`: mutación de TanStack Query sobre `http` (`shared/api/http.ts:161`).
- `components/HelpPanel.tsx`: panel lateral a la derecha que no tapa la
  pantalla, para que el usuario siga las instrucciones mientras lee. Incluye:
  - el historial y el campo de texto, con contador hasta 2000 caracteres;
  - las fuentes de cada respuesta, como etiquetas con el título de la sección;
  - el aviso de demo;
  - los estados de carga y de error: `502` con "intentá en un rato" y `429`
    con la espera de `retryAfterSeconds`.
- `components/HelpButton.tsx`: ícono "?" en la barra superior de
  `AppLayout.tsx`, solo si `VITE_ASSISTANT_ENABLED` está activo.
- **Historial:** se guarda en memoria y se pierde al recargar. Una conversación
  por pestaña. Al servidor se mandan solo los últimos 20 mensajes.
- **Mock de MSW** del endpoint (`shared/mocks/handlers.ts`), para que el front
  funcione en modo mock sin backend ni clave.

## 5. Fases

Cada fase termina con la app real intacta, tipos compilando y tests en verde.

| Fase | Qué | Cómo se valida |
| --- | --- | --- |
| F0 | Preparar el worktree: dependencias con `npm ci`, `.env` propios, **base propia de demo** y clave de Gemini (la creás vos en Google AI Studio). Detalle en §5.1 | El backend del worktree levanta contra su base y la app real sigue igual |
| F1 | Propuesta de contrato y borrador del manual | Los revisás vos |
| F2 | Backend con respuesta JSON | Unitarios, integración y una prueba real con la clave |
| F3 | Frontend con el panel y el mock | Tests de componentes y verlo funcionando en el navegador |
| F4 | Streaming: SSE en el backend y `fetch` con `ReadableStream` en el front | Tests y verlo en el navegador |
| F5 | Medición: 15 preguntas de prueba, consumo de tokens y ajuste del prompt | Resultado escrito en `docs/experimental/asistente/EVALUACION.md` |

### 5.1 Entorno de la demo (F0)

| Pieza | App real | Demo |
| --- | --- | --- |
| Backend | 3000 (Docker) | 3001 (host, `demo-backend` en `.claude/launch.json`) |
| Frontend | 5173 | 5176 contra el backend de la demo (`demo-frontend`); 5177 con mocks (`demo-frontend-mocks`) |
| Base | `causas-db` (5432) | `causas-demo-db` (5433), volumen `causas-demo-db-data`, usuario `demo`, base `vzcausas_demo` |
| Proceso diario | Según su `.env` | Apagado: `INTERNAL_TRIGGER_SECRET` vacío, así `DeadlinesModule` no carga (`app.module.ts:41`) |
| Documentos | Google Drive del equipo | **En memoria**: `GOOGLE_OAUTH_*` vacías, así `document-storage.factory.ts:37` elige `InMemoryDocumentStorage`. La demo nunca toca el Drive real |
| Usuario de prueba | — | `admin` (roles `ADMINISTRATOR` y `LAWYER`), lo crea `dev-seed.service.ts` al arrancar con `DEV_SEED_USERNAME` / `DEV_SEED_PASSWORD` del `.env` |

- **Por qué una base propia:** al arrancar en desarrollo, el backend carga datos
  de prueba (`dev-seed.service.ts:93`). Contra la base de dev eso no sería
  riesgo cero.
- **Montar la base** (Docker Desktop abierto, desde la raíz del worktree):
  1. Crear el contenedor; la contraseña sale de `DEMO_DB_PASSWORD` en
     `backend/.env`.
  2. `npx prisma migrate deploy` en `backend/`: aplica las migraciones
     existentes y nunca ofrece resetear.
  3. `npx prisma db seed` en `backend/`: roles, permisos y estados de sistema.
  - Los pasos 2 y 3 los corrés vos, como toda migración.
- **Para borrarla:** `docker rm -f causas-demo-db` y
  `docker volume rm causas-demo-db-data`.
- **Línea base al crear el worktree (`68687c3`):** backend 2031/2031 unitarios
  en verde. Frontend 985/986: falla siempre
  `tests/components/app/SessionTransitionProvider.test.tsx` ("entrar es
  corto…"), que ya viene de `develop` y no es de la demo.

**Por qué el streaming va aparte (F4):** axios no hace streaming en el
navegador, así que hay que usar `fetch` y repetir el manejo del token y del
`401` con renovación que hoy resuelve el interceptor de
`shared/api/http.ts:261`. Conviene que la versión JSON ya funcione antes.

## 6. Archivos existentes que se tocan

| Archivo | Cambio |
| --- | --- |
| `backend/package.json` y `package-lock.json` | SDK de Gemini |
| `backend/src/app.module.ts` | Carga condicional de `AssistantModule` (`ConditionalModule`) |
| `backend/test/shared/harness/global-setup.ts` | Variables de test del asistente (clave inventada) |
| `backend/test/smoke/app.int.spec.ts` | La ruta en la lista del `401` |
| `backend/nest-cli.json` | Copiar `content/*.md` al build, como los PNG de `documents` |
| `backend/.env.example` | Variables nuevas, comentadas |
| `frontend/src/app/layouts/AppLayout.tsx` | `HelpAssistant` en la barra superior, detrás del flag |
| `frontend/src/styles/index.css` | Importa `assistant.css` |
| `frontend/src/shared/mocks/browser.ts` | Registra el mock de la demo con el flag (el mock en sí es un archivo nuevo, fuera de `ROUTES`) |
| `.claude/launch.json` | Configuraciones `demo-*`. **Se sacan antes de integrar** |

Todo lo demás son archivos nuevos.

## 7. Tests

**Backend:**
- **Unitarios del caso de uso** (`LlmPort` falso): el manual va en el system
  prompt, la falla termina en `AssistantUnavailableError`, y `REFUSED` y
  `TRUNCATED` tienen su respuesta.
- **Unitarios de las fuentes:** la línea `FUENTES:` se separa del texto, un
  `id` inexistente se descarta, sin línea da `sources` vacío y una línea mal
  formada no rompe la respuesta.
- **Unitarios del guard:** pasa hasta el tope por minuto y por día, después
  `429` con `retryAfterSeconds`. Cada usuario tiene su contador y el tiempo se
  maneja con `ClockPort` falso, sin esperas reales.
- **Contrato del puerto** (`llm-port.contract.ts`): la misma batería corre
  contra cada adaptador. Es lo que hace segura la migración a Anthropic. En CI
  corre solo contra el falso; contra los reales, a mano.
- **Adaptador de Gemini:** traducción de errores con el cliente del SDK
  simulado.
- **Manual:** carga todas las secciones y falla si falta alguna o está vacía.
- **Integración** (`test/subsystems/assistant/help-assistant.int-spec.ts`, con
  el falso en `test/shared/fakes/`):
  - `401` sin token, `200` con cada rol, `400` por validación, `502` con el
    falso fallando y `429` al pasar el límite.
  - Forma de la respuesta contra `test/shared/contract/`.
  - **Nunca llama a la API real.**

**Frontend:**
- Componentes del panel (envío, carga, error, aviso de demo) y del flag
  (sin flag, sin botón), según `TESTING.md`.

## 8. Antes de integrar (si el grupo aprueba)

1. Cambiar a Anthropic: adaptador nuevo, que pase la batería de contrato del
   puerto, y cambiar `ASSISTANT_LLM_PROVIDER`.
2. Pasar la propuesta a `API_CONTRACT_V6.md` (o V7) y a `DECISIONES.md`, con
   número.
3. Reemplazar el borrador por el Manual de Usuario real.
4. Decidir quién paga la API y con qué tope.

## 9. Pendiente de decidir

Nada que bloquee. Los cuatro puntos se cerraron el 20/11/2026 (§1). Las cifras
del límite se ajustan en F5 con lo que se mida, sin tocar código porque son
configurables.
