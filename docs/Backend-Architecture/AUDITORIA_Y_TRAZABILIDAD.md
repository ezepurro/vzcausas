# Trazabilidad y auditoría

## Por qué existe esta sección

Tres exigencias convergen:

- **Ley 25.326**: el sistema almacena datos personales y sensibles de causas penales, y debe garantizar confidencialidad y control de acceso.
- **Secreto profesional**: la información no puede ser accesible a usuarios ajenos al estudio.
- **RN12 y trazabilidad histórica**: las bajas son lógicas _"preservando la trazabilidad histórica"_.

Un control de acceso sin registro de qué se hizo es un control que no se puede demostrar.

## 2 Dos niveles de registro

**Nivel técnico — log de aplicación.** Qué petición entró, cuánto tardó, qué falló. Efímero, para diagnóstico.

**Nivel de negocio — registro de auditoría persistido.** Quién hizo qué, sobre qué entidad, cuándo. Persistido en base, consultable, no borrable.

## 3 Puerto de auditoría

```typescript
// src/shared/domain/audit-trail.port.ts
export interface AuditTrailPort {
	record(entry: {
		actorUserId: string;
		action: string; // 'case.status-changed'
		entityType: string; // 'Case'
		entityId: string;
		occurredAt: Date;
		metadata?: Record<string, unknown>; // SIN datos sensibles
	}): Promise<void>;
}
```

Se invoca **desde el caso de uso**, no desde un interceptor HTTP genérico. Razón: un interceptor registra _"llegó un PATCH"_; el caso de uso registra _"el abogado X cambió la causa Y del estado A al estado B"_. Lo segundo es auditoría; lo primero es un log de acceso.

## 4 Qué se audita obligatoriamente

| Acción                                                  | Fundamento                                  |
| ------------------------------------------------------- | ------------------------------------------- |
| Inicio de sesión exitoso y fallido                      | Ley 25.326 — control de acceso              |
| Alta, modificación y baja de usuarios y de sus permisos | Ley 25.326                                  |
| Cambio de estado procesal de una causa                  | RN13 — el cambio lo consigna el responsable |
| Registro de acto interruptivo                           | RN8 — reinicia la prescripción              |
| Registro de causa como prescripta                       | HU33 — consecuencia jurídica severa         |
| Baja lógica de cliente, causa o abogado                 | RN12                                        |
| Acceso al detalle de una causa                          | Secreto profesional                         |

> El `metadata` del registro **nunca contiene el contenido de los documentos ni datos del caso más allá de identificadores**. La auditoría registra _que_ se accedió, no _qué_ se leyó.

## 9 Historial de estados de la causa

Separado de la auditoría, y por motivos distintos: la auditoría es un requisito legal y transversal; el historial de estados es **una necesidad funcional del negocio** (HU23, Línea de Tiempo de la Causa).

`case_status_history` es propiedad de `cases`, forma parte del agregado `Case`, y registra cada transición con su estado de origen, destino, fecha, acto procesal que la originó y abogado actuante. La línea de tiempo se construye leyendo esa tabla, no la de auditoría.
