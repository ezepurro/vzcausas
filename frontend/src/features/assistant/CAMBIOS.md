# Cambios de `assistant`

## 2026-11-20 — Asistente de ayuda (demo)

**Es una demo, no una función del producto.** El endpoint `POST /help/assistant`
no está en V6: sale de la propuesta
`docs/experimental/asistente/PROPUESTA_CONTRATO.md`, en la rama
`feat/asistente-ayuda-demo`. Por eso todo está detrás de un flag.

- **Cuándo aparece:** con `VITE_ASSISTANT_ENABLED=true` en `.env.local`. Sin la
  variable no hay botón, no hay pedido y la app es la de siempre.
- **Qué es:** el botón **Asistente** de la barra superior (a la derecha de la
  campana, cuando la campana está) abre un panel a la derecha, que no tapa la
  pantalla. Se pregunta cómo se usa la app y responde a partir del
  manual, con las secciones en las que se apoya. Escape o la cruz lo cierran.
- **La conversación** vive en memoria: cerrar y abrir el panel la conserva,
  recargar la página la borra. Al servidor viajan los últimos 20 mensajes.
- **Errores:** `429` dice cuántos segundos esperar (`retryAfterSeconds`); `502`,
  que el asistente no está disponible.
- **Aviso fijo** en el panel: no escribir datos de causas ni de clientes (la
  demo usa la capa gratuita de Gemini).
- **El avatar** (`components/AssistantAvatar.tsx`) es un SVG dibujado para la
  demo, sin imágenes externas: un abogado de traje con vincha y micrófono de
  atención sobre el verde del estudio, y un destello dorado por la IA. Usa los
  tokens de color salvo la piel. Va en el botón, en la cabecera del panel y en
  el saludo inicial.

### Lo que toca fuera del módulo

| Archivo | Qué |
| --- | --- |
| `app/layouts/AppLayout.tsx` | Dibuja `HelpAssistant` en la barra superior si `ASSISTANT_ENABLED` |
| `styles/assistant.css` (+ `index.css`) | Estilos del panel |
| `shared/mocks/assistant.demo.ts` (+ `browser.ts`) | Mock del endpoint, **fuera de `ROUTES`** |

**Por qué el mock va fuera de `ROUTES`:** `tests/unit/contract/endpoints.test.ts`
exige que todo lo que está en `ROUTES` exista en `docs/openapi`, y la demo no
toca el contrato oficial. El mock se registra aparte en el navegador, y los
tests lo enchufan con `server.use(...)`. Si la demo se integra, el endpoint pasa
a `docs/openapi` y el mock a `ROUTES`, como cualquier otro.

### Para probarlo

- **Con mocks:** `VITE_USE_MOCKS=true` y `VITE_ASSISTANT_ENABLED=true`. El mock
  responde con frases fijas según palabras de la pregunta; no hay modelo.
- **Contra el backend de la demo:** `VITE_USE_MOCKS=false`,
  `VITE_ASSISTANT_ENABLED=true`, `VITE_API_URL=/api/v1` y
  `VITE_BACKEND_URL=http://localhost:3001`. El backend necesita
  `ASSISTANT_LLM_PROVIDER` y `GEMINI_API_KEY`.
