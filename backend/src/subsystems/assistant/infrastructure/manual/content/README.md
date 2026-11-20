# Manual de Usuario — BORRADOR DE DEMO

**No es el Manual de Usuario oficial.** Es un borrador escrito para la demo del
asistente de ayuda (rama `feat/asistente-ayuda-demo`, 20/11/2026), a partir de:

- el contrato vigente (`docs/Api-Contract/API_CONTRACT_V6.md`);
- las pantallas del frontend, recorridas en modo mock;
- `frontend/src/app/access/access.ts` (qué ve y qué opera cada perfil).

Cuando exista el Manual de Usuario real, estos archivos se reemplazan y el
código no cambia.

## Formato

- Un archivo `.md` por pantalla o tema. Este `README.md` no se carga.
- Encabezado obligatorio entre `---`:
  - `id`: identificador estable, en minúsculas con guiones. Es lo que viaja en
    `sources`: **cambiarlo cambia la respuesta de la API**.
  - `title`: título que se muestra en el panel.
  - `pantalla` (opcional): ruta de la pantalla.
- El cuerpo es markdown simple: párrafos, listas y negritas.
- Lo que depende del perfil se dice explícitamente: Administrador, Abogado,
  Secretaría.
- **No se inventa.** Lo que el contrato o la pantalla no confirman no va. Si
  algo no existe en la aplicación (por ejemplo, recuperar la contraseña), se
  dice que no existe.
