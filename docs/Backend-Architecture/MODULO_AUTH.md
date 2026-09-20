## Autenticación y autorización

- **Autenticación:** _¿sos quien decís ser?_ Se resuelve una vez, al iniciar sesión.
- **Autorización:** _¿podés hacer esto?_ Se resuelve **en cada acceso**, como exige el RNF 9.

### 1 Modelo de identidad

`User` y `Lawyer` son entidades **distintas**, en subsistemas distintos, vinculadas por identificador.

```mermaid
erDiagram
    USER ||--o| LAWYER : "lawyerId (opcional)"
    USER }o--|| ROLE : "tiene"
    ROLE }o--o{ PERMISSION : "agrupa"
    LAWYER ||--o{ CASE : "es responsable de"

    USER {
        uuid id
        string email
        string passwordHash
        uuid roleId
        uuid lawyerId "NULL si no es abogado"
        bool active
    }
    LAWYER {
        uuid id
        string firstName
        string lastName
        string registrationNumber
        bool active
    }
    CASE {
        uuid id
        string sacNumber
        uuid responsibleLawyerId
        string status
    }
```

La causa referencia a `Lawyer`, no a `User`, porque el responsable de una causa es un hecho **profesional**, no un hecho de seguridad. Un abogado puede existir en el sistema antes de tener credenciales (HU12 y HU4 son historias separadas, en sprints distintos), y puede perder el acceso sin dejar de ser el responsable histórico de sus causas.

- Un usuario con rol **Abogado** tiene `lawyerId` obligatorio.
- Un usuario con rol **Administrador** o **Secretaria** tiene `lawyerId` nulo.
- Cuando `cases` necesita saber si el usuario actuante es el responsable de la causa, compara `Case.responsibleLawyerId` con el `lawyerId` del usuario autenticado.

### 2 Resguardo de credenciales (RNF 8)

- Algoritmo: **bcrypt**, con sal generada automáticamente por cada contraseña.
- El factor de costo se define en configuración, no fijo en el código.
- La contraseña en texto plano **no se escribe en ningún log, en ningún DTO de respuesta, y en ninguna excepción**.
- La entidad `User` no expone el hash: no hay _getter_ público de `passwordHash`. La verificación se hace mediante un método de la entidad, `verifyPassword(plain, hasher)`, que recibe el servicio de hashing por puerto.

### 3 Mecanismo de sesión

**Token de acceso + token de refresco**.

| Token             | Dónde viaja                               | Vida útil       | Contenido                                         |
| ----------------- | ----------------------------------------- | --------------- | ------------------------------------------------- |
| **Access token**  | Encabezado `Authorization: Bearer`        | Corta (minutos) | `userId`, `roleId`, `lawyerId`, lista de permisos |
| **Refresh token** | Cookie `httpOnly` + `Secure` + `SameSite` | Larga (días)    | Identificador opaco, persistido en base           |

**Refresh en cookie `httpOnly`:** Es el credencial de larga vida: si lo captura código malicioso en el navegador, el atacante mantiene acceso persistente a datos sensibles alcanzados por la Ley 25.326. Una cookie `httpOnly` no es legible desde JavaScript. El atributo `Secure` exige HTTPS, lo que se apoya directamente en el RNF 7.

**Refresh Persistente:** Un token de acceso firmado no se puede invalidar antes de su expiración. Si el refresh no se persistiera, **HU2 (Cerrar Sesión) sería decorativa**: el usuario "cierra sesión" pero su token sigue siendo válido. Al persistirlo, cerrar sesión lo revoca y la renovación falla.

Flujos:

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as API
    participant ID as identity

    Note over C,ID: Inicio de sesión (HU1)
    C->>API: POST /auth/login (email, password)
    API->>ID: AuthenticateUser.execute()
    ID->>ID: bcrypt.compare
    ID->>ID: emite access + persiste refresh
    API-->>C: access en cuerpo + refresh en cookie httpOnly

    Note over C,ID: Renovación
    C->>API: POST /auth/refresh (cookie automática)
    ID->>ID: valida y rota el refresh
    API-->>C: nuevo access + nueva cookie

    Note over C,ID: Cierre de sesión (HU2)
    C->>API: POST /auth/logout
    ID->>ID: revoca el refresh persistido
    API-->>C: cookie eliminada
```

**Rotación.** Cada uso del refresh emite uno nuevo y revoca el anterior. Si se intenta reutilizar un refresh ya consumido, se revoca la familia completa de tokens de ese usuario: es la señal de que fue robado.

### 4 Modelo de permisos

**Roles con permisos predefinidos**, persistidos en base.

Un usuario podrá tener uno o muchos roles y cada rol tendrá ciertos permisos **no modificables**. Si se quiere dar o quitar permisos se dan o quitan roles.

Roles iniciales (datos semilla, no constantes de código):

| Rol             | Descripción                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| `ADMINISTRADOR` | Socios directores y coordinadores. Administra usuarios, abogados, parametría y reportes |
| `ABOGADO`       | Abogados especialistas. Opera causas, actos procesales y documentos                     |
| `SECRETARIA`    | Secretaría administrativa. Registra clientes y causas, consulta                         |

### 5 Los dos niveles de autorización

**Nivel 1 — Autorización por operación (guard de infraestructura).**
Responde: _"¿el rol de este usuario habilita invocar esta operación?"_. Es información que está íntegra en el token: no requiere leer la base. Se resuelve con un _guard_ de NestJS y un decorador declarativo sobre el método del controlador.

**Nivel 2 — Autorización por instancia (dentro del caso de uso).**
Responde: _"¿este usuario puede operar sobre **esta** causa en particular?"_. Requiere leer el dato. **No puede resolverse en un guard**, porque el guard corre antes de que la causa se haya cargado.

```mermaid
flowchart TD
    A[Petición HTTP] --> B{JwtAuthGuard<br/>¿token válido?}
    B -->|no| X[401 Unauthorized]
    B -->|sí| C{PermissionsGuard<br/>¿el rol tiene case:change-status?}
    C -->|no| Y[403 Forbidden]
    C -->|sí| D[Controlador → Caso de uso]
    D --> E[Carga la causa del repositorio]
    E --> F{¿user.lawyerId ===<br/>case.responsibleLawyerId?}
    F -->|no| Z[Error de dominio<br/>NotTheResponsibleLawyer → 403]
    F -->|sí| G[case.changeStatusTo - la entidad valida RN4]
    G --> H[Persiste y audita]
```

**Cómo llega el usuario al caso de uso.** El contexto del usuario autenticado se pasa **como parámetro explícito** al método `execute()`, dentro del comando de entrada. No se usan proveedores de alcance de petición ni almacenamiento implícito.

Razones:

1. El caso de uso se vuelve **testeable sin HTTP**: en el test se construye el usuario a mano y se invoca.
2. La dependencia de la autorización queda **visible en la firma del método**. Quien lee el código ve que ese caso de uso depende de quién lo invoca.
3. Los proveedores de alcance de petición tienen costo de rendimiento y hacen que el flujo sea imposible de seguir leyendo.

El tipo que viaja es propiedad del _kernel compartido_, no de `identity`:

```typescript
// src/shared/domain/authenticated-user.ts
export interface AuthenticatedUser {
	readonly userId: string;
	readonly roleName: string;
	readonly lawyerId: string | null; // null si no es abogado
	readonly permissions: readonly string[];
}
```

> **Nota sobre RN11 y el secreto de sumario.** RN11 establece que no existen causas de visibilidad restringida, y por eso **no se implementa filtrado de datos por usuario**. Sin embargo, el _Plan de Proyecto_ menciona el secreto de sumario, bajo el cual la información no es accesible ni al propio cliente. Ambas afirmaciones podrían no ser compatibles.

---
