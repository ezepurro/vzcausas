# Glosario de traducción del dominio

**De cumplimiento obligatorio.** Todo identificador de código que refiera a un concepto del dominio usa la forma de esta tabla. Ampliaciones del glosario requieren acuerdo del equipo y actualización de este documento.

## Regla de precedencia

Cuando este glosario y `API_CONTRACT_V1.md` no coincidan, **manda el contrato**: es la superficie que backend y frontend comparten, y cambiarla cuesta una migración de los dos lados. Este documento se adapta al contrato, no al revés.

De ahí sale la segunda regla: **un concepto que viaja por la API se nombra igual en el dominio y en el contrato**. Tener `Term` en el código y `timeLimitDays` en el JSON obliga a traducir mentalmente en cada lectura, que es exactamente lo que un glosario existe para evitar.

Los códigos van en inglés; los rótulos que lee el usuario, en castellano. Las dos excepciones son términos sin equivalente real: `Amparo` y `SacNumber`.

---

## 1. Dominio jurídico

| Español (dominio / UI) | Inglés (código)  | Nota                                                                                   |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| Causa                  | `Case`           | —                                                                                      |
| Amparo                 | `Amparo`         | **Sin traducción.** Acción constitucional sin equivalente directo. En la API, `AMPARO`  |
| Número de SAC          | `SacNumber`      | **Sigla conservada.** Sistema de Administración de Causas del Poder Judicial de Córdoba |
| Fuero                  | `Jurisdiction`   | Traducción aproximada. Se conserva por consistencia estructural                        |
| Estado procesal        | `ProceduralState` | La denominación la carga el estudio, en castellano y como texto libre (RN4)            |
| Acto procesal          | `ProceduralAct`  | —                                                                                      |
| Acto interruptivo      | `InterruptiveAct` | —                                                                                     |
| Plazo                  | `TimeLimit`      | El plazo configurado (la regla). En la API, `timeLimitDays`                             |
| Vencimiento            | `Deadline`       | La fecha concreta calculada                                                            |
| Prescripción           | `Prescription`   | —                                                                                      |
| Tipo de día            | `DayType`        | Cómo se cuentan los días de un plazo                                                   |
| Carátula               | `CaseCover`      | —                                                                                      |
| Expediente             | `CaseFile`       | —                                                                                      |
| Modelo formal          | `DocumentTemplate` | —                                                                                    |
| Tasa judicial          | `CourtFee`       | —                                                                                      |
| Rol procesal           | `ProceduralRole` | No confundir con `Role` de seguridad                                                   |

## 2. Personas y acceso

| Español (dominio / UI)  | Inglés (código)     | Nota                                                     |
| ----------------------- | ------------------- | -------------------------------------------------------- |
| Usuario                 | `User`              | La cuenta que inicia sesión                              |
| Perfil / rol de usuario | `Role`              | Concepto de `identity`. No confundir con `ProceduralRole` |
| Abogado                 | `Lawyer`            | La ficha profesional. Un usuario puede tener una vinculada |
| Abogado responsable     | `ResponsibleLawyer` | —                                                        |
| Cliente                 | `Client`            | —                                                        |

**Usuario y abogado son entidades distintas.** El usuario es la cuenta; el abogado es la persona matriculada. Se vinculan, pero no son lo mismo: una secretaría tiene usuario y no tiene ficha de abogado.

## 3. Valores cerrados

Los enumerados del contrato, con el rótulo que se muestra en pantalla.

### `Role` — perfil del usuario

| Rótulo (UI)   | Código          |
| ------------- | --------------- |
| Administrador | `ADMINISTRATOR` |
| Abogado       | `LAWYER`        |
| Secretaría    | `SECRETARY`     |

Un usuario puede poseer más de un rol. Cuando la interfaz muestra uno solo, gana el de mayor peso: `ADMINISTRATOR` › `SECRETARY` › `LAWYER`.

### `Jurisdiction` — fuero

| Rótulo (UI)    | Código           |
| -------------- | ---------------- |
| Penal          | `CRIMINAL`       |
| Administrativo | `ADMINISTRATIVE` |
| Amparo         | `AMPARO`         |

### `DayType` — cómo se cuentan los días

| Rótulo (UI) | Código        |
| ----------- | ------------- |
| Hábiles     | `BUSINESS`    |
| Corridos    | `CONSECUTIVE` |
| Sin plazo   | `NONE`        |

## 4. Campos de la API

Los nombres que viajan en los payloads. Un módulo los escribe igual en sus tipos.

| Español (dominio / UI)   | Inglés (código)      | Dónde aparece                      |
| ------------------------ | -------------------- | ---------------------------------- |
| Nombre de usuario        | `username`           | `User`                             |
| Nombre y apellido        | `fullName`           | `User`, `Lawyer`                    |
| Correo electrónico       | `email`              | `User`                             |
| Contraseña               | `password`           | Alta de usuario                    |
| Contraseña actual        | `currentPassword`    | Cambio de contraseña               |
| Contraseña nueva         | `newPassword`        | Cambio de contraseña               |
| Matrícula                | `registrationNumber` | `Lawyer`                           |
| Último acceso            | `lastLoginAt`        | `User`                             |
| Denominación             | `name`               | `ProceduralState`                  |
| Posición en el ciclo     | `position`           | `ProceduralState`                  |
| Días del plazo           | `timeLimitDays`      | `ProceduralState`                  |
| Estado terminal          | `terminal`           | `ProceduralState`. Cierra el ciclo de vida |
| Causas activas           | `activeCases`        | `Lawyer`, `ProceduralState`. Calculado, sólo lectura |

## 5. Alta y baja

| Español (dominio / UI) | Inglés (código)                  | Nota                                   |
| ---------------------- | -------------------------------- | -------------------------------------- |
| Baja lógica            | `deactivate` / `active: boolean` | **Nunca `delete`** (RN12)              |
| Dado de alta / activo  | `active: true`                   | Estado normal de un registro           |
| Dado de baja           | `active: false`                  | El registro se conserva, deja de operar |

`DELETE` en la API **no borra**: establece `active` en `false`. El registro se conserva para no romper las referencias de las causas, y se reactiva con un `PATCH` que ponga `active` en `true`. Los listados devuelven sólo los activos salvo que se pida lo contrario con el parámetro `active`.

---

## Inconsistencias conocidas

Pendientes de resolver con el equipo. No corregir por cuenta propia: cambiarlas de un lado sin el otro empeora el problema.

| Dónde | Dice | Debería decir | Estado |
| --- | --- | --- | --- |
| `frontend/src/shared/mocks/` | Todo el vocabulario anterior | El del contrato vigente | Los mocks implementan el contrato anterior de punta a punta |
| `frontend/src/features/users/` | `ADMINISTATOR`, `SECRETARIAT`, `role`, `abogadoId` | `ADMINISTRATOR`, `SECRETARY`, `roles`, `lawyerId` | Migrar junto con los mocks |
| `frontend/src/features/legal-params/` | `proceduralTimeLimit: string` | `timeLimitDays: number` | Migrar junto con los mocks |

Las tres **se migran juntas o no se migra ninguna**: si los módulos hablan el vocabulario nuevo y los mocks el anterior, la aplicación deja de funcionar contra `VITE_USE_MOCKS=true`. Los dos módulos arrastran además los campos que el contrato incorporó y todavía no existen en el código: `fullName`, `email`, `lawyer` y `active` en usuarios; `position`, `terminal`, `activeCases` y `active` en estados procesales.

`ARQUITECTURA_BACKEND_V1.md` ya fue corregido: `ProceduralState`, `ProceduralStatePort`, `TimeLimit`, `TimeLimitPort` y `DeadlineCalculatorPort`.
