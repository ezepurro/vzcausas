Como administrador o abogado quiero dar de baja un modelo formal para retirar documentos obsoletos.

Épica: EP-07 · Gestión Documental e Integración Cloud
Sprint previsto: Sprint 5
Prioridad: Baja
Estimación: 15 SP (1 SP = 1 hora trabajada)

Fuente: Seguimiento de Proyecto V1 — §3.2 Historias de usuario.

Perfiles habilitados: Administrador y Abogado (matriz de permisos §5.1).

Actualización (11/10/2026): permisos alineados con la matriz de permisos por perfil de la Definición del Producto V2 §5.1.

Criterios de aceptación (API Contract V6)

Endpoint: DELETE /document-templates/{templateId} (§3.10). Botón "Dar de baja" de la lista de modelos: "Deja de copiarse en las causas nuevas. Las copias ya distribuidas no se tocan".

CA-37.1 · Baja lógica
Dado un Administrador o un Abogado y un modelo vigente, cuando lo da de baja, entonces responde 204, el modelo no se elimina físicamente (active: false) y deja de existir para el sistema: no aparece en el listado de modelos con ningún filtro, y su consulta y la descarga de su archivo responden 404 DOCUMENT_TEMPLATE_NOT_FOUND.

CA-37.2 · Sin reactivación (D-126)
Dado un modelo dado de baja, cuando se abre la lista de modelos, entonces no aparece, ni con la marca "Dado de baja" ni con un botón "Reactivar". Para volver a usar un escrito, se registra de nuevo. El prototipo lista los modelos dados de baja y los reactiva: manda la decisión del equipo.

CA-37.3 · Efecto sobre las causas
Dado un modelo dado de baja, cuando se registra una causa nueva de uno de sus fueros, entonces el modelo ya no se copia a su carpeta. Las copias que ya están en las carpetas de las causas no se tocan.

CA-37.4 · Su archivo va a la Papelera (D-131)
Dada la baja, cuando se aplica, entonces el archivo del modelo en /VZ Causas/Modelos formales/{fuero}, uno por cada fuero de su lista, se mueve a /VZ Causas/Papelera/. Si Drive no responde, la baja no falla: el modelo queda dado de baja y el proceso diario mueve los archivos después.

CA-37.5 · Nombre liberado (D-139)
Dado un modelo dado de baja, cuando se registra o se modifica otro con el mismo nombre, entonces se acepta: el nombre es único solo entre los modelos vigentes.

CA-37.6 · Perfil no habilitado
Dado un usuario sin perfil Administrador ni Abogado, cuando intenta dar de baja un modelo, entonces responde 403 FORBIDDEN.

CA-37.7 · Modelo inexistente o ya dado de baja
Dado un modelo inexistente o ya dado de baja, cuando se intenta darlo de baja, entonces responde 404 DOCUMENT_TEMPLATE_NOT_FOUND. Un templateId que no es entero responde 400 INVALID_PATH_PARAMETER.

Trazabilidad

RN12 (CA-37.1) · D-126 (CA-37.2) · D-131 (CA-37.4) · D-139 (CA-37.5) · RN11 y RNF9 (CA-37.6).

Actualización (09/11/2026): criterios de aceptación según el API Contract V6, §3.10.
