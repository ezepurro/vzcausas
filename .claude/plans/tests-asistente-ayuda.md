# Plan de tests — Asistente de ayuda (demo, F2)

Fuente: `docs/experimental/asistente/PROPUESTA_CONTRATO.md` (no hay HU ni CA:
los "criterios" de abajo salen de la propuesta). Plan general:
`.claude/plans/asistente-ayuda-demo.md`.

**Ningún test llama a Gemini.** Unitarios con puertos falsos; integración con
`LLM_PORT` reemplazado por `FakeLlm` (`test/shared/fakes/llm.fake.ts`). La
prueba contra el modelo real es manual (F2, último paso) y queda anotada.

## Criterios → tests

| # | Criterio (propuesta) | Test | Nivel |
| --- | --- | --- | --- |
| C1 | `200` con `{ data: { answer, sources } }`, forma exacta | feliz, `Object.keys` de `data` y de cada fuente | Integración |
| C2 | Cualquier perfil puede usarlo (Administrador, Abogado, Secretaría) | `it.each` de roles → `200` | Integración |
| C3 | `401` sin token | ruta agregada a `test/smoke/app.int.spec.ts` | Integración (smoke) |
| C4 | `400 VALIDATION_ERROR` por forma: `messages` ausente, vacío o con más de 20; `role` inválido; `content` vacío o de más de 2000 | `details` exacto (`toEqual`) para cada caso, con claves `messages`, `messages.0.role`, `messages.0.content` | Integración (uno representativo + `it.each`) |
| C5 | `400` si el último mensaje no es del usuario | `Conversation.create` lanza `ValidationError` con `details.messages` exacto | Unitario (dominio) + 1 integración |
| C6 | El manual va entero en las instrucciones, la conversación en orden y con los roles traducidos | el caso de uso arma el pedido al `LlmPort` | Unitario (caso de uso) |
| C7 | `sources` sale de la línea `FUENTES:`, sin repetidos, en orden, y solo con `id` que existen | `AssistantReply`: línea válida, `id` inexistente descartado, sin línea → `[]`, línea mal formada → `[]` y texto intacto, línea fuera del final → no se toma | Unitario (dominio) |
| C8 | La línea `FUENTES:` nunca aparece en `answer` | mismo spec de C7 | Unitario |
| C9 | Negativa del modelo → `200` con el texto fijo y `sources: []` | `REFUSED` en el caso de uso; y en integración con `FakeLlm` | Unitario + Integración |
| C10 | Respuesta cortada → texto + aviso fijo al final | `TRUNCATED` en el caso de uso | Unitario |
| C11 | Proveedor caído → `502 ASSISTANT_UNAVAILABLE`, `message` textual, `details: null` | `FakeLlm.failNext()` | Integración |
| C12 | El adaptador de Gemini traduce: roles `assistant`→`model`, `systemInstruction`, tope de salida; `finishReason` y `blockReason` → `COMPLETED`/`REFUSED`/`TRUNCATED`; `ApiError` y corte por tiempo → `AssistantUnavailableError` | cliente del SDK simulado | Unitario (adaptador) |
| C13 | Límite por usuario: 6 por minuto y 60 en 24 h; el siguiente → `429 TOO_MANY_REQUESTS` con `retryAfterSeconds` exacto; cada usuario cuenta aparte; un pedido rechazado no consume cupo | `AssistantUsageLimiter` con reloj falso | Unitario |
| C14 | `429` por HTTP con `Retry-After` igual a `details.retryAfterSeconds` | límite bajado por configuración en el spec (tope 2 por minuto) | Integración |
| C15 | Un pedido inválido (`400`) no consume cupo del límite | 400 seguidos y después `200` | Integración |
| C16 | El manual carga todas las secciones, con `id` único y cuerpo no vacío; un archivo sin `id` o un `id` repetido hace fallar el arranque | `HelpManual` + adaptador de archivos contra el contenido real | Unitario |
| C17 | Sin `ASSISTANT_LLM_PROVIDER`, la app arranca sin el módulo | cubierto por cómo se carga, como `DeadlinesModule`; **revisión manual** (la suite siempre lo carga) | Manual |

## Textos del contrato (propuesta) que los tests fijan

- `502`: "El asistente no está disponible en este momento. Intentá de nuevo en unos minutos."
- `429`: "Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar."
- `400` (`message`): "Los datos enviados no son válidos."
- `details.messages`: "Debe incluir entre 1 y 20 mensajes." / "El último mensaje debe ser del usuario."
- `details.messages.N.role`: "Debe ser user o assistant."
- `details.messages.N.content`: "Debe tener entre 1 y 2000 caracteres."
- Negativa: "No puedo ayudarte con eso. Puedo responder preguntas sobre cómo usar VZ Causas."
- Cortada: "(La respuesta quedó cortada. Probá con una pregunta más concreta.)"

## Límites de la suite

Una suite nueva, `test/subsystems/assistant/help-assistant.int.spec.ts`, con
hasta 5 `describe` de hasta 3 `it` (`.claude/rules/flujo-hu-backend.md`).
