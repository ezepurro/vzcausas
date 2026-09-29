# Pendientes de definición

## P-01 · Alcance real de RN11 frente al secreto de sumario

### Problema

RN11 establece que la totalidad del estudio accede a la totalidad de las causas, y que la diferenciación es de operación y no de ámbito. Sobre esa base, §7.6 no implementa filtrado de datos por usuario. Sin embargo, el Plan de Proyecto consigna que bajo secreto de sumario la información no es accesible ni al propio cliente. Ambas afirmaciones podrían no ser compatibles, y ninguna fuente del proyecto resuelve la contradicción.

### Impacto

El filtrado por instancia en las consultas atraviesa la totalidad de los repositorios y casos de uso de lectura del sistema. Incorporarlo una vez construidos los subsistemas `cases`, `documents` y `reporting` implica revisar cada consulta existente y sus tests. El costo de la incorporación tardía es desproporcionado respecto del costo de preverla.

### Resolución requerida

Confirmación del cliente sobre si existen causas o documentos con visibilidad restringida, y bajo qué condición.

---

## P-02 · Ausencia del calendario de feriados judiciales

### Problema

RN5 exige que el cómputo del plazo distinga días hábiles de días corridos. El Plan de Proyecto establece que la tabla de plazos será provista por el estudio ya depurada, pero no menciona el origen del calendario de feriados judiciales, sin el cual la distinción no es computable. Ninguna fuente del proyecto lo especifica.

### Impacto

Afecta a la función central del sistema. Sin calendario, `deadlines` solo puede excluir fines de semana, lo que produce vencimientos calculados con días de diferencia en cualquier semana con feriado. Adicionalmente, y como se documenta en ESTRATEGIA_DE_TESTING.md §7, los tests de RN5 darán resultado positivo sobre una implementación incompleta, lo que oculta el defecto.

### Resolución requerida

Definición de si el calendario se carga como parametría anual a cargo del estudio, si se consume de una fuente externa, o si se asume una regla fija. La primera opción agrega entidades a `legal-parameters`.

---

## P-03 · Formato del número de SAC sin especificar

### Problema

RN2 establece el número de SAC como identificador unívoco de la causa, pero ninguna fuente documenta su formato. El objeto de valor `SacNumber` requiere una regla de validación concreta.

### Impacto

Una validación incorrecta admite identificadores inválidos o rechaza identificadores legítimos, comprometiendo la regla de identidad central del dominio. El ejemplo de EJEMPLO_CASO_DE_USO.md §1 contiene una expresión regular ilustrativa que no debe llegar al código.

### Resolución requerida

Especificación del formato por parte del cliente, incluyendo si admite variantes por fuero o por año.

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

## P-07 · Obligatoriedad del vínculo usuario–abogado

### Problema

El modelo de §7.2 exige que todo usuario con rol `ABOGADO` tenga `lawyerId` asignado. Esa obligatoriedad fue adoptada por el equipo para hacer verificable C7, pero no está respaldada por ninguna fuente del proyecto.

### Impacto

Si el estudio necesitara crear un usuario con rol Abogado antes de registrar su ficha profesional —o viceversa—, el flujo de alta de HU4 y HU12 quedaría acoplado en un orden fijo no relevado.

### Resolución requerida

Decisión del equipo, verificando previamente con el cliente el orden real de incorporación de un profesional al estudio.

---

## P-08 · Ubicación de la generación de carátula y expediente

### Problema

HU24 y HU25 exigen generar y emitir la carátula y el expediente como salidas imprimibles. No está definido si esa generación es responsabilidad de `cases` —dueño del dato— o de un adaptador de salida de generación documental compartido.

### Impacto

Acotado y postergable. Afecta la ubicación de un adaptador, no el modelo de dominio. Si más adelante aparecen otras salidas documentales, la segunda opción evita duplicación.

### Resolución requerida

Decisión del equipo al planificar el Sprint 4.

---

## P-09 · Inconsistencia documental entre arquitecturas declaradas

### Problema

El Seguimiento de Proyecto v1, §2.1.f, declara NodeJS + Express con arquitectura en capas. El presente documento adopta NestJS con arquitectura hexagonal. Ambas están vigentes simultáneamente en la documentación del proyecto.

### Impacto

El Definition of Done exige que toda historia esté documentada en el documento de definición de producto correspondiente. Con dos arquitecturas declaradas, ese criterio es inverificable. Es además una inconsistencia detectable por la cátedra en la lectura cruzada de entregables.

### Resolución requerida

Versionar el Seguimiento de Proyecto a v1.1 incorporando el cambio de decisión y su justificación.
