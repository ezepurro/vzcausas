# Módulo `cases` (Causas)

Gestiona las causas del estudio. Hoy implementa una sola historia de usuario: **HU18 Registrar Causa** (`POST /api/v1/cases`).

## Responsabilidades

- Ser dueño del agregado **causa** y de sus tablas (`cases`, `offenses`, `procedural_acts`): ningún otro subsistema las escribe.
- Dar de alta causas de los tres fueros (penal, administrativo y amparo) con sus reglas propias.
- Computar la prescripción de cada hecho de una causa penal.
- Hacer nacer cada causa en el estado inicial «Iniciada» de su fuero.

**No hace (todavía):** consultar causas (`GET /cases`), modificarlas ni darlas de baja, ni registrar actos procesales. Tampoco es dueño de clientes, abogados, calificaciones legales ni estados procesales: los consulta a través de puertos.

## Estructura

Un hexágono, como el resto de los subsistemas (ver `docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md`).

```
cases/
├── case.module.ts                    composición: qué adaptador cumple cada puerto
├── core/
│   ├── domain/
│   │   ├── entities/                 Case (abstracta), CriminalCase, AdministrativeCase, Amparo, Offense, ProceduralAct
│   │   ├── factories/case.factory.ts reglas de validación del alta; arma la causa del fuero que corresponde
│   │   ├── ports/                    interfaces que el dominio necesita (ver tabla)
│   │   ├── value-objects/            JurisdictionCode, ProceduralRole, Instructor, Deadline, DayType
│   │   └── errors/                   CaseSacAlreadyExistsError
│   ├── application/
│   │   ├── use-cases/register-case.use-case.ts
│   │   └── common/register-case.interfaces.ts   comando y resultado del caso de uso
│   └── test-support/                 fakes y datos de prueba de los specs
└── infraestructure/
    ├── http/                         controlador, DTOs de entrada y de respuesta
    ├── persistence/                  repositorio y mapper de Prisma
    └── acl/                          adaptadores propios de `cases` (hoy, el reloj)
```

### Entidades

- **`Case`**: raíz del agregado. Guarda sus datos y referencia por id al cliente, al abogado responsable, al usuario que la creó, al fuero y al estado actual. Cada fuero es una subclase, todas en la tabla `cases`.
- **`CriminalCase`**: suma sus hechos (`offenses`), que pueden ser ninguno. No tiene contraparte ni objeto.
- **`AdministrativeCase`** y **`Amparo`**: suman `counterparty` (opcional) y `subjectMatter` (obligatorio).
- **`Offense`** (hecho): una calificación legal asignada a una causa penal, con su fecha del hecho y su fecha de prescripción. Calcula esa fecha con `calculatePrescription()` y la guarda en `prescriptionExpiresOn` (columna `offenses.prescription_date`).
- **`ProceduralAct`**: el acto procesal. Solo tiene sus atributos; todavía no se usa.

### Puertos y adaptadores

`cases` declara los puertos con su propio vocabulario. Cada adaptador implementa uno; los de otros subsistemas viven en el proveedor y su módulo exporta solo el token del puerto.

| Puerto (token) | Qué pide | Adaptador | Estado |
|---|---|---|---|
| `CASE_REPOSITORY` | guardar y leer causas (agregado y listado/detalle), SAC repetido, estado actual, conteos de causas activas | `PrismaCaseRepository` (`cases`) | real |
| `PEOPLE_LOOKUP` | abogado y cliente vigentes por id | `CasesPeopleLookupAdapter` (`people`) | real |
| `LEGAL_PARAMETERS_LOOKUP` | estado inicial «Iniciada» de un fuero y calificaciones legales vigentes por id | `CasesLegalParametersLookupAdapter` (`legal-parameters`) | real |
| `CLOCK` (shared) | el instante actual y la fecha de hoy en Córdoba (`now()`, `today()`) | `CordobaClockAdapter` (`APP_TIMEZONE`) | real |

`CasesModule` importa `PeopleModule` y `LegalParametersModule` únicamente para recibir esos tokens exportados. Ningún puerto está mockeado: el cliente, el abogado, las calificaciones y el estado inicial se leen de la base real.

## Funcionamiento de Registrar Causa

`RegisterCase.execute(command)` recibe el comando ya traducido por el controlador y sigue estos pasos:

1. Toma la fecha de hoy y el instante actual (`CLOCK`).
2. Consulta, sin guardar nada, el estado inicial del fuero, el cliente, el abogado responsable y las calificaciones pedidas.
3. Arma los **errores de referencia**: un cliente, un abogado o una calificación inexistente o dada de baja se informa sobre su campo (`clientId`, `responsibleLawyerId`, `legalQualifications`). Si el fuero no tiene estado inicial, informa `jurisdiction` y corta.
4. `CaseFactory.create` valida todas las reglas del alta, suma los errores de referencia y, si hay alguno, lanza **un único** `ValidationError` (`400 VALIDATION_ERROR`) con `details` por campo. Si no hay errores, arma la causa del fuero que corresponde, con el `jurisdictionId` y el `currentStateId` del estado inicial.
5. Si hay SAC, verifica que no exista en el sistema (RN2); si existe, lanza `CaseSacAlreadyExistsError` (`409 CASE_SAC_ALREADY_EXISTS`).
6. Calcula la prescripción de cada hecho que todavía no la tenga.
7. Guarda la causa con sus hechos, en una sola operación.
8. Relee de la base el estado procesal en el que quedó la causa y lo devuelve junto con la causa, el cliente, el abogado y los hechos.

### Reglas de validación

| Campo | Regla |
|---|---|
| `sacNumber` | opcional; si se informa, exactamente 8 dígitos y único |
| `startDate` | obligatoria si hay SAC; no se informa si no hay SAC; nunca posterior a hoy |
| `caption` | obligatoria, hasta 255 caracteres |
| `court`, `counterparty` | hasta 255 caracteres |
| `instructorName` / `instructorPhone` / `instructorExtension` | hasta 150 / 50 / 20 caracteres |
| `proceduralRole` | debe corresponder al fuero (Penal: Defensa, Querellante particular; Administrativo: Defensa, Recurrente; Amparo: Actora, Demandada) |
| `subjectMatter` | obligatorio en administrativo y amparo (hasta 800); no se informa en penal |
| `counterparty` | solo administrativo y amparo; no se informa en penal |
| `legalQualifications` | solo penal; cada una con fecha del hecho obligatoria y no posterior a hoy; sin repetir |

Los textos se recortan y un texto en blanco cuenta como no informado.

### Prescripción

Cada hecho computa `fecha del hecho + meses de prescripción de su calificación`. Si el mes de llegada es más corto, cae en su último día (31/01 + 1 mes = 28/02). La fecha de inicio de la causa no interviene. Se guarda con el hecho en `offenses.prescription_date`.

### Estado inicial

La causa nace en el estado «Iniciada» de su fuero (`is_initial = true`), sin acto procesal vigente y sin vencimiento. El estado de la tabla lo fija el primer acto procesal.

## Criterios de aceptación

Cobertura: **U** = tests unitarios de este módulo; **Front** = pertenece al frontend; **Parcial** = ver las notas.

**CA-18.1 · Alta exitosa** — *U, Parcial.*
Dado un usuario autenticado de cualquier perfil, cuando registra una causa con su carátula, su fuero, su cliente, el rol procesal del cliente y su abogado responsable, entonces la causa queda registrada y disponible para consultarse.

**CA-18.2 · Número de SAC** — *U.*
Dado el número de SAC, cuando se informa, entonces debe tener exactamente 8 dígitos, esto obliga a registrar la fecha de inicio de la causa, debe ser único en todo el sistema (RN2); si no se informa, el alta procede igual, en este caso la fecha de inicio no se debe rellenar, porque la causa puede iniciarse antes de que el Poder Judicial le asigne el número.

**CA-18.3 · Rol procesal según el fuero** — *U.*
Dado el rol procesal del cliente, cuando no corresponde al fuero de la causa, entonces el sistema rechaza el alta. En el fuero Penal corresponden Defensa y Querellante particular; en el Administrativo, Defensa y Recurrente; en Amparo, Actora y Demandada.

**CA-18.4 · Campos propios del fuero** — *U.*
Dados los fueros Administrativo y Amparo, cuando se registra la causa, entonces se cargan la contraparte u organismo y el objeto del reclamo, siendo el objeto obligatorio; en el fuero Penal esos campos no se cargan.

**CA-18.5 · Calificaciones legales** — *U.*
Dada una causa penal, cuando se registran calificaciones legales, entonces cada una lleva su fecha del hecho, obligatoria y no posterior al día de hoy, y no puede repetirse dentro de la causa. Una causa penal puede registrarse sin calificaciones: en ese caso no computa prescripción hasta que se le cargue una.

**CA-18.6 · Cómputo de la prescripción** — *U.*
Dada una calificación legal con su fecha del hecho, cuando se registra la causa, entonces el sistema computa su vencimiento de prescripción como la fecha del hecho más los meses de prescripción de esa calificación. La fecha de inicio de la causa no interviene en el cómputo.

**CA-18.7 · Estado inicial** — *U.*
Dada la causa registrada, cuando se confirma el alta, entonces nace en el estado inicial de su fuero, «Iniciada», sin vencimiento y sin movimientos en su ciclo de vida: el estado de la tabla lo fija el primer acto procesal.

**CA-18.8 · Abogado responsable** — *U.*
Dada el alta, cuando se confirma, entonces la causa tiene siempre un abogado responsable vigente asignado.

**CA-18.9 · Datos inexistentes o dados de baja** — *U.*
Dado un cliente, un abogado o una calificación legal inexistente o dado de baja, cuando se intenta registrar la causa, entonces el sistema informa el error sobre el campo correspondiente del formulario para que el usuario lo corrija.

**CA-18.10 · Carátula sugerida** — *Front.*
Dado el formulario de alta, cuando se eligen el cliente y las calificaciones o la contraparte, entonces la interfaz sugiere la carátula; el usuario puede ajustarla y se registra la carátula final.

**CA-18.11 · Acceso al alta de cliente** — *Front.*
Dado que el usuario está registrando una causa y tiene permiso de alta de clientes, cuando presiona "+ Nuevo cliente" junto al selector de Cliente, entonces se abre el modal de alta de cliente, cuyo comportamiento, campos y validaciones se rigen por la HU-8 Registrar Cliente; el formulario de la causa permanece visible e inactivo detrás del modal.

**CA-18.12 · Retorno exitoso del alta de cliente** — *Front.*
Dado el modal de alta de cliente abierto desde Registrar Causa, cuando el usuario guarda un cliente válido, entonces el modal se cierra, el cliente creado queda seleccionado automáticamente en el selector de Cliente y los demás datos ya cargados en la causa se conservan sin cambios.

**CA-18.13 · Cancelación del alta de cliente** — *Front.*
Dado el modal de alta de cliente abierto desde Registrar Causa con datos ya cargados en la causa, cuando el usuario cierra el modal mediante "Cancelar", el ícono de cierre o la tecla ESC, entonces vuelve al formulario de la causa con todos los datos que había cargado, el selector de Cliente mantiene el valor previo a la apertura del modal y no se registra ningún cliente nuevo.

**CA-18.14 · Acceso al alta de calificación legal** — *Front.*
Dado que el usuario está registrando una causa y tiene permiso de alta de calificaciones legales, cuando presiona "+ Nueva calificación legal" junto al selector de Calificación Legal, entonces se abre el modal de alta de calificación legal, cuyo comportamiento, campos y validaciones se rigen por la HU-XXX Registrar Calificación Legal; el formulario de la causa permanece visible e inactivo detrás del modal.

**CA-18.15 · Retorno exitoso del alta de calificación legal** — *Front.*
Dado el modal de alta de calificación legal abierto desde Registrar Causa, cuando el usuario guarda una calificación legal válida, entonces el modal se cierra, la calificación legal creada queda seleccionada automáticamente en el selector de Calificación Legal y los demás datos ya cargados en la causa se conservan sin cambios.

**CA-18.16 · Cancelación del alta de calificación legal** — *Front.*
Dado el modal de alta de calificación legal abierto desde Registrar Causa con datos ya cargados en la causa, cuando el usuario cierra el modal mediante "Cancelar", el ícono de cierre o la tecla ESC, entonces vuelve al formulario de la causa con todos los datos que había cargado, el selector de Calificación Legal mantiene el valor previo a la apertura del modal y no se registra ninguna calificación legal nueva.

## Notas y pendientes

- **CA-18.1, «disponible para consultarse»:** el alta guarda la causa, pero `GET /cases` y `GET /cases/{id}` todavía no existen.
- **CA-18.2, fecha de inicio sin SAC:** `cases.start_date` es `NOT NULL`, así que una causa sin SAC no puede quedar sin fecha de inicio: se guarda con la fecha de hoy. Para que de verdad quede vacía, la columna tiene que admitir nulos. Además, el API Contract §3.7 dice que `startDate` es opcional y vale hoy por defecto; con este criterio el frontend tiene que enviarla cuando informa el SAC y no enviarla cuando no hay SAC.
- **Un puerto por subsistema:** `PEOPLE_LOOKUP` y `LEGAL_PARAMETERS_LOOKUP` agrupan lo que `cases` pide a cada uno. El adaptador de calificaciones consulta una por una (una causa lleva pocas); si hiciera falta, se agrega un método por lote al repositorio de `legal-parameters`.
- **Rol procesal:** el API usa los códigos en castellano del dominio (`DEFENSA`, `QUERELLANTE_PARTICULAR`, `RECURRENTE`, `ACTORA`, `DEMANDADA`), aunque el contrato todavía dice inglés.
- **Errores de formato:** un tipo mal formado (por ejemplo, un `clientId` que no es número) lo rechaza el `ValidationPipe` global con `error_N`, no con el mapa por campo. Las reglas de negocio de arriba sí salen por campo.
- **Nombre de la fecha de prescripción:** en el dominio es `prescriptionExpiresOn` (nombre del contrato); en la base, `prescription_date`.

## Tests

Los unitarios están junto al código que prueban y no usan Nest, Prisma, HTTP ni otros subsistemas: los puertos se reemplazan por fakes en memoria (`core/test-support/`).

| Spec | Qué prueba |
|---|---|
| `core/domain/entities/case/offense.entity.spec.ts` | cálculo de la prescripción (CA-18.6) |
| `core/domain/value-objects/case/procedural-role.spec.ts` | rol según el fuero (CA-18.3) |
| `core/domain/factories/case.factory.spec.ts` | todas las reglas de validación y qué causa se arma |
| `core/application/use-cases/case/register-case.use-case.spec.ts` | el flujo del caso de uso con puertos falsos |

```bash
cd backend
npx jest src/subsystems/cases
```

Quedan para una tanda de integración el controlador, los DTOs, el repositorio de Prisma y los adaptadores.
