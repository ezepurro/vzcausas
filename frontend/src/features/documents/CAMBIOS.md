# Modelos formales — registro de cambios

Cambios sobre las pantallas de modelos formales que no salen del prototipo ni
del contrato.

---

## 2026-10-29 — Textos de la página y de "Registrar modelo formal"

**Pedido:** Luciano Cipolla. Los textos del prototipo parecían notas para el
equipo, y el de la página no era del todo cierto.

**Antes (prototipo):**

- Bajo el título de la página: "Los escritos tipo del estudio. Al registrar
  una causa, los modelos vigentes del fuero se copian a su carpeta en Drive."
- Bajo el título de "Registrar modelo formal": "Los modelos se copian a la
  carpeta de cada causa nueva de los fueros elegidos."

**Ahora:**

- Página (`DocumentTemplatesPage`): "Los escritos tipo del estudio, por fuero.
  Los que estén marcados para copiar se suman a la carpeta en Drive de cada
  causa nueva."
- "Registrar modelo formal" (`DocumentTemplateFormModal`): "Subí el modelo en
  Word (.docx, hasta 10 MB) y elegí los fueros en los que se usa."

No se copian todos los modelos vigentes del fuero: sólo los marcados para
copiar (`copyToNewCases`), y sólo si al registrar la causa queda tildado
"Copiar modelos" (HU40). El texto del diálogo repetía la casilla "Copiar en las
causas nuevas de los fueros elegidos" y quedaba mal con ella destildada; ahora
dice qué archivo se sube (CA-34.10).

Falta pedir el mismo cambio en el prototipo.
