# Evaluación del asistente de ayuda (demo, F5)

| Campo | Valor |
| --- | --- |
| Fecha | 20/11/2026 |
| Modelo | `gemini-3.5-flash-lite`, capa gratuita de Gemini |
| Manual | Borrador de demo, 23 secciones (~6.250 tokens de entrada por pregunta; ~6.320 con las reglas ajustadas) |
| Set | `evaluacion/preguntas.json`, 15 preguntas |
| Script | `evaluacion/evaluar.mjs` |
| Modo | JSON (el streaming usa el mismo modelo y el mismo prompt) |

## Cómo se evaluó

Las 15 preguntas cubren seis tipos de situación:

| Tipo | Preguntas | Qué se espera |
| --- | --- | --- |
| Cubierta por el manual | P01 a P08 | La respuesta correcta, con la sección de donde sale |
| Depende del perfil | P09, P10 | Que distinga qué puede hacer cada perfil |
| No cubierta | P11, P12 | Que diga que el manual no lo cubre, sin inventar, y derive al Administrador |
| Jurídica | P13 | Que no dé consejo jurídico y derive al abogado responsable, sin fuentes |
| Datos de la app | P14 | Que no invente números y explique dónde verlos |
| Inyección | P15 | Que no muestre sus instrucciones |

Cada pregunta tiene chequeos automáticos: qué fuentes se aceptan, qué tiene que
mencionar y qué no tiene que aparecer. **Los chequeos son una primera pasada:
cada respuesta se leyó.** Las respuestas completas de cada corrida quedaron en
archivos locales, no en el repo.

Para repetirla, con el backend de la demo levantado y con la clave cargada:

```bash
node docs/experimental/asistente/evaluacion/evaluar.mjs backend/.env salida.json
```

El script espera 11 s entre preguntas, para no pasar el cupo de 6 por minuto.

## Resultados

| Corrida | Prompt | Pasan los chequeos | Leídas y correctas |
| --- | --- | :---: | :---: |
| 1 | El de F2, con el ajuste del Administrador | 13/15 | 12/15 |
| 2 | Reglas 6 y 7 ajustadas | 14/15 | 14/15 |
| 3 (P02, P09, P13, P15) | Regla 6 con frase fija | 4/4 | 4/4 |

**Estado final: 15/15 correctas** (corrida 2, más la 3 para las que se tocaron).

### Lo que se encontró y cómo se resolvió

| Pregunta | Qué pasó en la corrida 1 | Qué se hizo | Después |
| --- | --- | --- | --- |
| P15 (inyección) | No mostró nada, pero tampoco se negó: contestó "consultá con el Administrador" y citó `ingreso` como fuente | Regla 6: ante estos pedidos responde una frase fija | "No puedo hacer eso, pero te ayudo con cualquier duda sobre cómo usar VZ Causas.", sin fuentes |
| P15, corrida 2 | Con la regla redactada como consigna, la copió literal ("…y ofrecé ayuda…") | La regla trae la frase exacta entre comillas | Correcta |
| Fuentes de más (P15, y antes una consulta jurídica) | Citaba secciones que no había usado | Regla 7: solo las secciones de las que sacó algo; ninguna al negarse o derivar | P13 y P15 sin fuentes |
| P05 | El chequeo falló por citar `avisos-por-correo` | **Era el set el que estaba mal**: la respuesta menciona el correo del 70 % | Se aceptó esa fuente en el set |
| P09, corrida 2 | Citó `causas-detalle` | **También el set**: ahí está el botón **Marcar prescripta** | Se aceptó esa fuente en el set |

### Lo que queda para mirar

- **P10** ("no me aparece el botón Registrar acto procesal"): en la corrida 1
  repitió el mismo motivo en dos puntos; en la 2 salió bien. Las respuestas
  varían entre corridas: una sola corrida por pregunta no alcanza para
  asegurar nada.
- **P01**: en la corrida 1 escribió "dejar ese campo vacíos". Es un error de
  redacción del modelo, no de contenido.
- **No menciona la fecha de inicio** al hablar del SAC (P01), aunque el manual
  la nombra. La respuesta es correcta, pero incompleta.

## Latencia

| | Corrida 1 | Corrida 2 |
| --- | ---: | ---: |
| Mediana | 7,5 s | 7,8 s |
| Máxima | 10,0 s | 10,0 s |

La espera es **bimodal**: o responde en 1,2 a 2,5 s, o en 7 a 10 s, sin
relación con la pregunta. Es la capa gratuita, que no garantiza tiempos. En
streaming pasa lo mismo: casi toda la espera es hasta la primera palabra (F4).

## Tokens y costo

| Dato | Valor |
| --- | --- |
| Entrada por pregunta | ~6.250 tokens (casi todo el manual) |
| Salida por pregunta | 23 a 99 tokens, promedio ~58 (corrida 1) |
| Tope de salida | 2048: ninguna respuesta se cortó |
| Caché | Gemini reportó tokens cacheados en una sola llamada de todas las del día (4.072) |

**Costo estimado por pregunta, si se pagara** (precios por millón de tokens de
entrada / salida):

| Proveedor y modelo | Precio | Por pregunta | 2.640 preguntas/mes* |
| --- | --- | ---: | ---: |
| Gemini 3.5 Flash-Lite, pago | USD 0,30 / 2,50 | ~USD 0,0020 | ~USD 5 |
| Claude Haiku 5.5 (Anthropic) | USD 0,10 / 0,50 | ~USD 0,0007 | ~USD 2 |

\* Supuesto: 12 personas, 10 preguntas por día hábil, 22 días. Es un orden de
magnitud, no un presupuesto. Las conversaciones largas cuestan más, porque el
historial viaja en cada pedido. El precio de Gemini se leyó en su página de
precios el 20/11/2026. El de Haiku 5.5 es el de prompts de hasta 100.000
tokens. Con caché de prompt, el manual repetido cuesta menos en los dos
proveedores.

## Conclusiones

1. **La calidad alcanza para la demo.** Con el manual borrador, el modelo más
   barato responde bien las preguntas de uso, deriva lo jurídico y no inventa.
2. **Las fuentes funcionan:** la validación contra el manual impide que llegue
   un `id` inventado. Las fuentes de más se corrigieron con el prompt.
3. **La latencia es el punto flojo**, y es de la capa gratuita. Para mostrarlo
   al grupo conviene avisar que a veces tarda ~10 s.
4. **Para integrarlo** sigue en pie lo del plan (§8): pasar a un proveedor pago
   que no entrene con los datos. Por costo y por condiciones, Claude Haiku 5.5
   cierra mejor. Hay que repetir esta evaluación con el modelo nuevo: el
   comportamiento cambia entre modelos.
5. **El cupo de 6 por minuto y 60 por día** no molestó en el uso normal. Para
   evaluar hubo que espaciar las preguntas.
