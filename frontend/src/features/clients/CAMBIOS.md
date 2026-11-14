# Clientes — registro de cambios

Cambios sobre las pantallas de clientes que no salen del prototipo ni del
contrato.

---

## 2026-10-29 — Textos de la página y de "Registrar cliente"

**Pedido:** Luciano Cipolla. Los textos del prototipo parecían notas para el
equipo, y además decían algo que el sistema no hace.

**Antes (prototipo):**

- Bajo el título de la página: "El estudio trabaja por causa, pero el cliente
  es quien firma el convenio y recibe los avisos. Un mismo cliente puede tener
  varias causas abiertas."
- Bajo el título de "Registrar cliente": "Los datos de contacto se usan para
  los avisos de vencimiento."

**Ahora:**

- Página (`ClientsPage`): "Las personas que representa el estudio. Registrá
  cada cliente una vez y elegilo en todas sus causas."
- "Registrar cliente" (`ClientFormModal`, fuera del alta de causa): "Después
  lo vas a poder elegir al registrar sus causas. El teléfono y el correo son
  opcionales."

El cliente no recibe avisos: los correos de vencimientos y prescripción van a
la casilla de gestión del estudio y, en copia, al abogado responsable (V4,
proceso diario, "A quién"; D-79). Su teléfono y su correo no se usan para
avisar nada.

Falta pedir el mismo cambio en el prototipo.

---

## 2026-11-14 — "Modificar cliente" y "Eliminar cliente" (HU10, HU11)

**Decisión:** Facundo Fiorani, al programar las dos historias. Lo que manda el
contrato sobre el prototipo (el teléfono obligatorio, D-109; no dar de baja un
cliente con causas activas, D-122) no va acá: está en `API_CONTRACT_V6.md`
§3.6.

**Antes (prototipo):**

- "Modificar cliente" confirma con "Guardar".
- "Eliminar cliente" avisa "Tiene N causas activas." antes de confirmar, y
  deja eliminar igual.

**Ahora:**

- "Modificar cliente" confirma con "Guardar cambios", como "Modificar
  abogado" y "Modificar usuario".
- "Eliminar cliente" no avisa nada antes de confirmar. Si el backend responde
  `409 CLIENT_HAS_ACTIVE_CASES`, el diálogo queda abierto con ese mensaje y
  la lista de las causas activas del cliente (carátula y estado), y "Eliminar"
  se deshabilita (CA-11.2). La lista no está en el prototipo; la arma `cases`
  (`ClientActiveCases`).

Falta pedir el mismo cambio en el prototipo.
