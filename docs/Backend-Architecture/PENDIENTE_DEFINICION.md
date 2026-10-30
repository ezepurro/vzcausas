# Pendientes de definición

## P-02 · Ausencia del calendario de feriados judiciales

### Problema

RN5 exige que el cómputo del plazo distinga días hábiles de días corridos. El Plan de Proyecto establece que la tabla de plazos será provista por el estudio ya depurada, pero no menciona el origen del calendario de feriados judiciales, sin el cual la distinción no es computable. Ninguna fuente del proyecto lo especifica.

### Impacto

Afecta a la función central del sistema. Sin calendario, `deadlines` solo puede excluir fines de semana, lo que produce vencimientos calculados con días de diferencia en cualquier semana con feriado. Adicionalmente, y como se documenta en ESTRATEGIA_DE_TESTING.md §7, los tests de RN5 darán resultado positivo sobre una implementación incompleta, lo que oculta el defecto.

### Resolución requerida

Definición de si el calendario se carga como parametría anual a cargo del estudio, si se consume de una fuente externa, o si se asume una regla fija. La primera opción agrega entidades a `legal-parameters`.

---

## P-04 · Registro de actos procesales en fuero administrativo (RN6)

### Problema

RN6 establece que en procesos administrativos el plazo no corre de oficio y que la fecha de notificación se registra manualmente. No está definido qué ocurre entre el registro del acto y la carga de esa fecha: si el acto se registra con vencimiento pendiente y se completa después, o si no puede registrarse hasta disponer de la fecha.

### Impacto

Determina un invariante de construcción de `ProceduralAct`. Si el acto puede existir sin vencimiento, el invariante debe admitir el estado intermedio desde el inicio; agregarlo después obliga a modificar la entidad, su persistencia y sus tests.

### Resolución requerida

Definición del cliente sobre el procedimiento real del estudio en el fuero administrativo.

---

## P-05 · Ausencia de política de reasignación de causas

### Problema

RN3 exige que toda causa tenga un abogado responsable asignado. HU15 permite dar de baja a un abogado. Ninguna historia del backlog especifica qué ocurre con las causas de las que ese abogado era responsable. El invariante de RN3 y la operación de HU15 son incompatibles sin una política intermedia.

### Impacto

Sin definición, la baja de un abogado deja causas en estado inconsistente respecto de RN3, o bien HU15 resulta inejecutable en la práctica. También afecta a C7: si el responsable está dado de baja, ningún usuario puede cambiar el estado de esas causas.

### Resolución requerida

Definición de si la baja exige reasignación previa obligatoria, si se conserva el responsable histórico con la causa marcada como sin responsable activo, o si se asigna automáticamente a un rol administrador.

---

## P-06 · Perfil de los Coordinadores sin definir

### Problema

El Estudio Inicial releva cuatro roles organizacionales; la decisión C5 define tres perfiles de sistema. Los Coordinadores —dos personas que delegan causas y supervisan el cumplimiento de plazos— quedan colapsados dentro de `ADMINISTRADOR`, lo que les otorga permisos de administración de usuarios que su rol organizacional no necesariamente justifica.

### Impacto

Bajo, en términos de arquitectura: el modelo de permisos asignables (§7.5) permite agregar un cuarto rol sin cambios estructurales. El impacto es de seguridad y de fidelidad al relevamiento, no de diseño.

### Resolución requerida

Validación con el cliente de si la supervisión de causas y la administración de usuarios deben estar en el mismo perfil.

---

## P-08 · Ubicación de la generación de carátula y expediente

### Problema

HU24 y HU25 exigen generar y emitir la carátula y el expediente como salidas imprimibles. No está definido si esa generación es responsabilidad de `cases` —dueño del dato— o de un adaptador de salida de generación documental compartido.

### Impacto

Acotado y postergable. Afecta la ubicación de un adaptador, no el modelo de dominio. Si más adelante aparecen otras salidas documentales, la segunda opción evita duplicación.

### Resolución requerida

Decisión del equipo al planificar el Sprint 4.

### Resolución (29/10/2026) — opción B

Decidido al planificar HU24: **`cases` decide qué dice la hoja y `documents` la dibuja.**

- `cases` arma los datos de la hoja (los seis recuadros y la regla de partes, D-94) y los entrega por un puerto declarado en su propio dominio.
- Un adaptador en `cases/infrastructure/acl/` llama al caso de uso de `documents` que genera el PDF (mecanismo de `ARQUITECTURA_BACKEND_V1.md` §6.2).
- La carátula suelta (HU24) y el expediente (HU25) comparten así un único generador, y la librería de PDF vive en un solo subsistema.
- Es una llamada síncrona por puerto, no un evento: la respuesta de `GET /cases/{caseId}/cover` es el PDF y un evento de integración (ADR-005) no devuelve datos.

Consecuencia: `DocumentsModule` hoy no exporta nada (`documents.module.ts:23-28`); pasa a exportar el caso de uso de generación.

---
