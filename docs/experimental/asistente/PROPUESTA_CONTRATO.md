# Propuesta de contrato — Asistente de ayuda

| Campo | Valor |
| --- | --- |
| Estado | **Propuesta de demo. No es contrato vigente.** El contrato vigente es `docs/Api-Contract/API_CONTRACT_V6.md` |
| Rama | `feat/asistente-ayuda-demo` |
| Base | V6 (09/11/2026), sin cambios en lo que ya existe |
| Plan | `.claude/plans/asistente-ayuda-demo.md` |
| Fecha | 20/11/2026 |

Este documento propone un endpoint nuevo y los cambios que necesita en las
reglas transversales de V6. Si el grupo aprueba la demo:

- lo que sigue se copia a `API_CONTRACT_V6.md` (o a una V7) con la marca de la
  versión;
- la decisión de §5 pasa a `DECISIONES.md` con el número que le toque (hoy la
  última es D-147).

Hasta entonces no tiene número de decisión, para no chocar con la numeración
real.

---

## 1. Fila para el índice (§1 de V6)

| Método | Endpoint | Autenticación | Rol | Descripción |
| --- | --- | :---: | --- | --- |
| `POST` | `/help/assistant` | Sí | Cualquier usuario autenticado | Preguntarle al asistente de ayuda cómo se usa la aplicación |

---

## 2. Endpoint

### 3.14 Asistente de ayuda: /help/assistant

**Autenticación requerida:** Sí.
**Rol requerido:** ninguno en particular; alcanza con estar autenticado.

Es el botón "?" de la barra superior. Abre un panel lateral donde el usuario le
pregunta al asistente **cómo se usa la aplicación**: dónde se registra una
causa, qué significa una alerta, por qué no ve un botón. El asistente responde
**solo con lo que dice el Manual de Usuario**.

Lo que el asistente **no** hace:

- **No lee datos del estudio.** No conoce las causas, los clientes, los
  abogados ni los plazos cargados. El backend le manda solo el manual y la
  conversación. Por eso el endpoint no depende del rol ni de RN11: no hay nada
  que filtrar.
- **No opera.** No registra, modifica ni da de baja nada.
- **No da consejo jurídico.** Si le preguntan por el fondo de una causa o por
  un plazo legal, lo dice y deriva.
- **No guarda la conversación.** El historial vive en el cliente, que lo manda
  completo en cada pedido. Recargar la página empieza una conversación nueva.

#### `POST /help/assistant`

**Cuerpo**

```json
{
	"messages": [
		{ "role": "user", "content": "¿Dónde registro una causa nueva?" },
		{
			"role": "assistant",
			"content": "Desde el botón Nueva causa del menú lateral, o desde Causas con Registrar causa."
		},
		{ "role": "user", "content": "¿Y si todavía no tengo el número de SAC?" }
	]
}
```

| Campo | Tipo | Obligatorio | Regla |
| --- | --- | :---: | --- |
| `messages` | arreglo | Sí | Entre 1 y 20 elementos, en orden cronológico. **El último es del usuario** |
| `messages[].role` | texto | Sí | `user` (lo escribió el usuario) o `assistant` (lo respondió el asistente en un turno anterior) |
| `messages[].content` | texto | Sí | Entre 1 y 2000 caracteres, sin contar los espacios del principio y del final |

- **El cliente recorta el historial.** Manda solo los últimos 20 mensajes de
  la conversación. Si la conversación es más larga, los primeros se pierden
  para el asistente, pero el panel puede seguir mostrándolos.
- **El servidor no confía en el historial.** Una respuesta `assistant` que
  manda el cliente se trata como texto de la conversación, no como algo que
  el servidor haya validado.

**Respuesta exitosa — `200 OK`**

```json
{
	"data": {
		"answer": "Sí, podés registrarla sin el número de SAC: es opcional. La causa queda sin fecha de inicio hasta que cargues el SAC, porque las dos cosas se cargan juntas.",
		"sources": [{ "id": "causas-registrar", "title": "Registrar una causa" }]
	}
}
```

Va en el sobre `data` de toda respuesta exitosa (§5.1 de V6).

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `answer` | texto | La respuesta, en castellano. Puede tener párrafos separados por una línea en blanco y listas con guiones; el cliente la muestra como texto, sin interpretar HTML |
| `sources` | arreglo | Las secciones del manual en las que se apoya la respuesta, en el orden en que el asistente las nombró. **Puede venir vacío** |
| `sources[].id` | texto | Identificador estable de la sección del manual |
| `sources[].title` | texto | Título de la sección, para mostrar |

- **Una fuente siempre existe.** El servidor descarta todo identificador que
  no sea una sección del manual vigente. El cliente nunca recibe una fuente
  inventada.
- **`sources` vacío** significa que el asistente no encontró la respuesta en
  el manual o que la pregunta estaba fuera de tema. El panel lo puede marcar
  como "respuesta sin respaldo en el manual".
- **Respuesta que el modelo no quiso dar.** Si el proveedor de IA se niega a
  responder, el servidor contesta igual `200` con este texto fijo y `sources`
  vacío: "No puedo ayudarte con eso. Puedo responder preguntas sobre cómo usar
  VZ Causas."
- **Respuesta cortada.** Si la respuesta llega al tope de largo, el servidor
  devuelve lo que tiene y le agrega al final: "(La respuesta quedó cortada.
  Probá con una pregunta más concreta.)"

**Respuesta en streaming (fase 4 de la demo)**

Con `Accept: text/event-stream`, el mismo pedido devuelve la respuesta a medida
que se genera, como eventos SSE:

```text
event: delta
data: {"text":"Sí, podés registrarla "}

event: delta
data: {"text":"sin el número de SAC: es opcional."}

event: done
data: {"sources":[{"id":"causas-registrar","title":"Registrar una causa"}]}
```

| Evento | `data` | Cuándo |
| --- | --- | --- |
| `delta` | `{ "text": string }` | Cada fragmento nuevo de la respuesta. Concatenados forman `answer` |
| `done` | `{ "sources": [...] }` | Al terminar. Es el último evento de una respuesta exitosa |
| `error` | `{ "code": string, "message": string }` | Si el proveedor falla **después** de empezar a responder. Mismo `code` y `message` que la respuesta JSON |

- **Lo que falla antes de empezar** (autenticación, validación, límite,
  proveedor caído) responde con el error JSON de siempre y su código HTTP, no
  con un evento.
- **La línea de fuentes nunca aparece en los `delta`**: el servidor la separa
  antes de mandar el texto.

**Errores**

| HTTP | `code` | Cuándo |
| :---: | --- | --- |
| `400` | `VALIDATION_ERROR` | El cuerpo no cumple las reglas de la tabla de arriba |
| `401` | `UNAUTHENTICATED` | Como en todo endpoint protegido |
| `429` | `TOO_MANY_REQUESTS` | Superó el límite propio del asistente (ver abajo) o el general por IP |
| `502` | `ASSISTANT_UNAVAILABLE` | **Nuevo.** El proveedor de IA no respondió, tardó demasiado o agotó su cuota |

**Ejemplo — validación**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Los datos enviados no son válidos.",
		"details": {
			"messages.2.content": "Debe tener entre 1 y 2000 caracteres."
		}
	}
}
```

Textos de `details`, por campo:

| Clave | Texto |
| --- | --- |
| `messages` | "Debe incluir entre 1 y 20 mensajes." |
| `messages` | "El último mensaje debe ser del usuario." |
| `messages.<i>.role` | "Debe ser user o assistant." |
| `messages.<i>.content` | "Debe tener entre 1 y 2000 caracteres." |

V6 no tiene todavía campos de arreglos en `details`. Esta propuesta usa la
forma `campo.índice.subcampo`, con el índice desde 0: es la que ya arma el
backend para los campos anidados (`flatten` en `backend/src/app.setup.ts:112`),
así que no hace falta tocar la validación global.

**Ejemplo — límite del asistente**

```json
{
	"error": {
		"code": "TOO_MANY_REQUESTS",
		"message": "Hiciste muchas preguntas seguidas. Esperá un momento antes de volver a preguntar.",
		"details": { "retryAfterSeconds": 35 }
	}
}
```

Trae el encabezado `Retry-After` con el mismo valor, como todo `429` (§4 de V6,
"Límite de frecuencia").

**Ejemplo — proveedor caído**

```json
{
	"error": {
		"code": "ASSISTANT_UNAVAILABLE",
		"message": "El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.",
		"details": null
	}
}
```

---

## 3. Cambios a las reglas transversales de V6

### §4, "Formato de intercambio"

Agregar a la tabla **Excepciones al JSON**:

| Operación | Qué cambia |
| --- | --- |
| `POST /help/assistant` con `Accept: text/event-stream` | La **respuesta** exitosa es un flujo de eventos (`text/event-stream`). El cuerpo del pedido es JSON. Los errores anteriores al primer evento son JSON |

### §4, "Límite de frecuencia"

Agregar un tercer mecanismo:

- **Por usuario, solo en `POST /help/assistant`.** Cada pedido consulta a un
  proveedor de IA externo y cuesta dinero. Por eso tiene un límite propio
  **por usuario y no por IP**: en el estudio todos salen a internet por la
  misma dirección, y un límite por IP dejaría sin asistente a toda la oficina
  por culpa de uno.
  - El tope inicial es **6 pedidos por minuto y 60 en las últimas 24 horas**
    (ventanas móviles, no por día calendario). Es configuración
    del servidor, como `availableFrom` del reporte (D-137).
  - Responde `429 TOO_MANY_REQUESTS`, con `Retry-After` y
    `details.retryAfterSeconds`.
  - Se suma al límite general por IP, no lo reemplaza.

### §5.3, "Catálogo de códigos de error"

Agregar:

| Código | HTTP | Situación |
| --- | :---: | --- |
| `ASSISTANT_UNAVAILABLE` | 502 | El proveedor de IA del asistente de ayuda no respondió, tardó demasiado o agotó su cuota |

### §6, "Códigos HTTP"

Ampliar el párrafo del `502`: hoy dice que distingue una falla del
almacenamiento en la nube. Pasa a decir que distingue una falla de **un servicio
externo del que depende la operación**: el almacenamiento en la nube o el
proveedor de IA del asistente. Para el cliente sigue significando lo mismo:
"no es un problema de los datos ni del sistema; reintentar más tarde".

---

## 4. Qué viaja al proveedor de IA

| Viaja | No viaja |
| --- | --- |
| El texto del Manual de Usuario | Datos de causas, clientes, abogados, plazos o documentos |
| Las instrucciones fijas del asistente | El nombre, el usuario o los roles de quien pregunta |
| Los mensajes de la conversación, tal como los escribió el usuario | Tokens, cookies o identificadores internos |

- **El único dato del estudio que puede llegar al proveedor es el que el
  usuario escriba en el chat.** Por eso el panel muestra un aviso fijo ("no
  escribas datos de causas ni de clientes").
- **Demo:** usa la capa gratuita de Gemini, que usa lo que recibe para mejorar
  los productos de Google. Con datos reales, esto no es aceptable (secreto
  profesional y Ley 25.326).
- **Para integrar:** pasar a un proveedor que no entrene con los datos
  (Anthropic, plan pago) antes de habilitarlo al estudio.
- **El servidor no registra el contenido** de las preguntas ni de las
  respuestas, solo quién preguntó, cuánto tardó, cuántos tokens usó y si
  terminó bien (mismo criterio que `ARQUITECTURA_BACKEND_V1.md:694`).

---

## 5. Decisión propuesta (para `DECISIONES.md`)

| ID | Decisión | Motivo |
| --- | --- | --- |
| D-xxx | **Asistente de ayuda.** `POST /help/assistant` responde preguntas sobre el uso de la aplicación a partir del Manual de Usuario. Nace el subsistema `assistant`. No lee datos del estudio, no opera, no guarda conversaciones y responde con las secciones del manual en las que se apoya (`sources`). Límite propio por usuario (6 por minuto, 60 por día). Nuevo código `502 ASSISTANT_UNAVAILABLE`. El proveedor de IA queda detrás de un puerto (`LlmPort`), así que cambiarlo no toca el contrato | Propuesta de la demo (20/11/2026). Es la primera pieza de IA del sistema y la de menor riesgo: no maneja datos sensibles. Sirve de base al asistente de escritos, que reutiliza el mismo servicio con otro perfil |

**Alternativas descartadas:**

- **Guardar las conversaciones en la base:** no hacía falta para la ayuda y
  sumaba datos personales sin necesidad (Ley 25.326).
- **Que el modelo devuelva JSON estructurado** con la respuesta y las fuentes:
  no funciona igual con streaming ni con todos los proveedores. Se usa una
  línea de fuentes al final de la respuesta que el servidor separa y valida.
- **Buscar secciones del manual con una herramienta del modelo:** el manual
  entra entero en el contexto, así que la búsqueda solo sumaba latencia y
  costo. Se reserva para el asistente de escritos.
- **Límite por IP:** dejaba sin asistente a todo el estudio, que sale por una
  misma dirección.

---

## 6. Fuera de esta propuesta

- **El asistente de escritos** (`POST /cases/{caseId}/drafts/assistant`, en
  análisis): lee datos de la causa, así que tiene su propia propuesta, con RN11
  y el secreto profesional en el centro.
- **El Manual de Usuario definitivo.** La demo usa un borrador
  (`backend/src/subsystems/assistant/infrastructure/manual/content/`).
  Reemplazarlo no cambia el contrato; puede cambiar los `id` de `sources`.
