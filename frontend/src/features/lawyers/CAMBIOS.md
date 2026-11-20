# Abogados — registro de cambios

Cambios sobre las pantallas de abogados que no salen del prototipo ni del
contrato.

---

## 2026-11-19 — Baja de abogado: las causas sin asignar quedan huérfanas (D-143)

Revisión de V6 del 16/11/2026. En `DELETE /lawyers/{lawyerId}` cada causa
activa va a otro abogado (`{ caseId, responsibleLawyerId }`) o queda sin
responsable (`{ caseId, unassigned: true }`): una causa huérfana, vigente y
con sus plazos corriendo (V6 §3.3 y §4, "Causa huérfana"). El prototipo solo
ofrece reasignar; el contrato pide que el formulario aclare que esas causas
quedan sin responsable y que la confirmación las liste.

**Cómo quedó** (decisión de Luciano Cipolla):

- **No hace falta asignarlas todas.** La columna "Sin asignar" es la del
  prototipo; lo que se confirma ahí queda huérfano. "Eliminar y reasignar"
  ya no espera a que esté vacía. La nota dice "Tiene N causas activas. Las
  que no asignes quedan sin responsable.".
- **La confirmación** aparece si el abogado tiene usuario vinculado (como
  antes, CA-15.5) **o** si queda alguna causa sin asignar. Va en bloques
  separados: el aviso del usuario en el recuadro rojo, una línea con la baja
  ("Se reasigna 1 causa y se da de baja a …"), y aparte "Queda(n) sin
  asignar · N", "Sin responsable hasta que se la(s) reasigne." y la lista.
- **El cuerpo** manda las sin asignar con `unassigned: true`
  (`toDeleteLawyerBody`), y el aviso de éxito las cuenta ("1 causa queda sin
  asignar.").
- Se probó y se descartó tener "Sin asignar" como un destino más de "Pasan
  a": chocaba con el nombre de la columna y era un paso de más.

`LawyerReassignment` (`types/lawyerDeletion.ts`) pasó a ser una unión: una
entrada lleva una cosa o la otra, nunca las dos.

Tests: `components/lawyers/LawyersPage.delete.test.tsx` y
`unit/lawyers/reassignment.test.ts`.
