# Causas — registro de cambios

Cambios sobre las pantallas de causas que no salen del prototipo ni del
contrato.

---

## 2026-10-21 — Registrar causa: borrador y calificaciones dadas de baja

**Pedido:** que lo cargado en "Registrar causa" no se pierda al irse a otra
pantalla, sin perder la posibilidad de salir y volver con el formulario vacío.

**Antes:** el formulario vivía sólo en el estado de la página. Ir a otra
sección del rail lo desmontaba y al volver arrancaba vacío.

**Ahora:**

- Cada cambio se guarda como borrador en `sessionStorage`
  (`utils/caseDraft.ts`), con la clave `vz-draft:case:{id del usuario}`. Dura
  lo que la pestaña. El formulario sin tocar no se guarda.
- Al volver con un borrador, un modal pregunta "Tenés una causa sin terminar":
  **Recuperar** lo carga, **Empezar de nuevo** lo borra. No se cierra de
  ninguna otra forma: ni con Escape ni con un click en el fondo. Por eso usa
  `Modal` y no `FormModal`, que con esos dos gestos llama a `onCancel`.
- El borrador se borra al registrar la causa, con Cancelar o la miga "Causas",
  con "Empezar de nuevo" y al cerrar sesión a pedido del usuario
  (`clearDrafts()` de `shared/lib/drafts.ts`, desde `AuthProvider`). Si la
  sesión se cierra por un token vencido **se conserva**: quien vuelve a entrar
  lo recupera. Como la clave lleva el usuario, otro que entre en la misma
  pestaña no lo ve.
- Un borrador con otra forma que la del formulario actual —claves de más o de
  menos, o un valor de otro tipo— se descarta sin preguntar. Así, sumar o
  sacar un campo de `CaseFormValues` invalida solo los borradores viejos.
- Se guardan sólo los valores: ni los errores ni el modal de cliente o
  calificación que estuviera abierto.

**Calificaciones dadas de baja.** Una calificación elegida que ya no viene en
el listado —se dio de baja mientras se cargaba la causa, o venía en un
borrador— antes desaparecía de la pantalla pero seguía viajando en el `POST`,
y el `400` del backend no se podía corregir: la fila con "Quitar" no existía.
Ahora se dibuja como "Calificación dada de baja" con su botón "Quitar"
(`UnavailableQualification` en `LegalQualificationPicker`), no cuenta para la
prescripción del resumen, y "Registrar causa" no sale hasta que se quite. El
cliente y el abogado no cambian: el select queda sin elegir y el `400` del
backend marca el campo (CA-18.10).

**Límite conocido:** el listado de calificaciones se pide con `limit: 100`
(`OPTIONS_LIMIT` en `RegisterCasePage`). Con más de 100 vigentes, las que
quedan afuera se verían como dadas de baja.
