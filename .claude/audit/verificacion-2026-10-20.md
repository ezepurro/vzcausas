## Turno cerrado 20/10/2026 12:20:30

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 20/10/2026 12:21:09

﻿## Turno cerrado 20/10/2026 10:58:36

### Cambios respecto de HEAD

```
D	docs/support/cambios-bdd-sprint3.md
?? .claude/audit/verificacion-2026-10-20.md
M	.claude/audit/verificacion-2026-10-19.md
M	backend/.env.example
M	backend/package.json
M	backend/src/app.module.ts
M	backend/src/subsystems/cases/case.module.ts
M	backend/src/subsystems/cases/core/application/common/register-case.interfaces.ts
M	backend/src/subsystems/cases/core/application/use-cases/get-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/list-cases.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/case-query.port.ts
M	backend/src/subsystems/cases/infrastructure/http/controllers/cases.controller.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/case.response.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/register-case.request.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.spec.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts
M	backend/src/subsystems/documents/core/application/common/failure-reason.spec.ts
M	backend/src/subsystems/documents/core/application/use-cases/assure-space.use-case.spec.ts
M	backend/src/subsystems/documents/core/application/use-cases/assure-space.use-case.ts
M	backend/src/subsystems/documents/core/domain/errors/documents.errors.ts
M	backend/src/subsystems/documents/core/domain/ports/document-storage.port.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage.ts
M	backend/test/shared/harness/test-app.ts
M	backend/test/subsystems/cases/list-cases.int.spec.ts
M	backend/test/subsystems/cases/register-case.int.spec.ts
M	backend/test/subsystems/documents/consult-document-templates.int.spec.ts
M	backend/test/subsystems/documents/document-space-event-flow.int.spec.ts
M	backend/test/subsystems/documents/register-document-template.int.spec.ts
M	docs/Api-Contract/API_CONTRACT_V4.md
M	docs/Backend-Architecture/ADR-003_GOOGLE_DRIVE.md
M	docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md
?? .claude/audit/2026-10-19.md
?? backend/scripts/documents-setup-storage.ts
?? backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
?? backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
?? backend/src/subsystems/cases/core/domain/ports/case-folder-outcome.port.ts
?? backend/src/subsystems/cases/core/domain/ports/case-folder-state.port.ts
?? backend/src/subsystems/cases/core/domain/value-objects/jurisdiction-folder-label.ts
?? backend/src/subsystems/cases/core/test-support/case-folder-fakes.ts
?? backend/src/subsystems/cases/infrastructure/acl/events/case-folder-outcome.listener.spec.ts
?? backend/src/subsystems/cases/infrastructure/acl/events/case-folder-outcome.listener.ts
?? backend/src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes.spec.ts
?? backend/src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes.ts
?? backend/src/subsystems/cases/infrastructure/http/dtos/request-case-folder.request.dto.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-prisma.mapper.spec.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-prisma.mapper.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-state-prisma.adapter.ts
?? backend/src/subsystems/documents/core/application/common/keyed-mutex.spec.ts
?? backend/src/subsystems/documents/core/application/common/keyed-mutex.ts
?? backend/src/subsystems/documents/core/application/use-cases/setup-cloud-storage.use-case.spec.ts
?? backend/src/subsystems/documents/core/application/use-cases/setup-cloud-storage.use-case.ts
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-error.mapper.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-error.mapper.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-retry.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
?? backend/test/shared/factories/cloud-structure.factory.ts
?? backend/test/subsystems/cases/case-folder.int.spec.ts
?? docs/Backend-Architecture/ADR-005_EVENTOS_DE_INTEGRACION.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1092 passed, 1092 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:22:54

## Turno cerrado 20/10/2026 06:50:13

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 20/10/2026 10:00:24

## Turno cerrado 20/10/2026 11:06:10

### Cambios respecto de HEAD

```
?? .claude/audit/verificacion-2026-10-20.md
M	.claude/audit/verificacion-2026-10-19.md
M	backend/.env.example
M	backend/package.json
M	backend/src/app.module.ts
M	backend/src/subsystems/cases/case.module.ts
M	backend/src/subsystems/cases/core/application/common/register-case.interfaces.ts
M	backend/src/subsystems/cases/core/application/use-cases/get-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/list-cases.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/case-query.port.ts
M	backend/src/subsystems/cases/infrastructure/http/controllers/cases.controller.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/case.response.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/register-case.request.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.spec.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts
M	backend/src/subsystems/documents/core/application/common/failure-reason.spec.ts
M	backend/src/subsystems/documents/core/application/use-cases/assure-space.use-case.spec.ts
M	backend/src/subsystems/documents/core/application/use-cases/assure-space.use-case.ts
M	backend/src/subsystems/documents/core/domain/errors/documents.errors.ts
M	backend/src/subsystems/documents/core/domain/ports/document-storage.port.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage.ts
M	backend/test/shared/harness/test-app.ts
M	backend/test/subsystems/cases/list-cases.int.spec.ts
M	backend/test/subsystems/cases/register-case.int.spec.ts
M	backend/test/subsystems/documents/consult-document-templates.int.spec.ts
M	backend/test/subsystems/documents/document-space-event-flow.int.spec.ts
M	backend/test/subsystems/documents/register-document-template.int.spec.ts
M	docs/Api-Contract/API_CONTRACT_V4.md
M	docs/Backend-Architecture/ADR-003_GOOGLE_DRIVE.md
M	docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md
?? .claude/audit/2026-10-19.md
?? .claude/audit/verificacion-2026-10-20.md
?? backend/scripts/documents-setup-storage.ts
?? backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
?? backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
?? backend/src/subsystems/cases/core/domain/ports/case-folder-outcome.port.ts
?? backend/src/subsystems/cases/core/domain/ports/case-folder-state.port.ts
?? backend/src/subsystems/cases/core/domain/value-objects/jurisdiction-folder-label.ts
?? backend/src/subsystems/cases/core/test-support/case-folder-fakes.ts
?? backend/src/subsystems/cases/infrastructure/acl/events/case-folder-outcome.listener.spec.ts
?? backend/src/subsystems/cases/infrastructure/acl/events/case-folder-outcome.listener.ts
?? backend/src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes.spec.ts
?? backend/src/subsystems/cases/infrastructure/events/in-memory-case-folder-outcomes.ts
?? backend/src/subsystems/cases/infrastructure/http/dtos/request-case-folder.request.dto.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-prisma.mapper.spec.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-prisma.mapper.ts
?? backend/src/subsystems/cases/infrastructure/persistence/case-folder-state-prisma.adapter.ts
?? backend/src/subsystems/documents/core/application/common/keyed-mutex.spec.ts
?? backend/src/subsystems/documents/core/application/common/keyed-mutex.ts
?? backend/src/subsystems/documents/core/application/use-cases/setup-cloud-storage.use-case.spec.ts
?? backend/src/subsystems/documents/core/application/use-cases/setup-cloud-storage.use-case.ts
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-error.mapper.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-error.mapper.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/drive-retry.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.spec.ts
?? backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
?? backend/test/shared/factories/cloud-structure.factory.ts
?? backend/test/subsystems/cases/case-folder.int.spec.ts
?? docs/Backend-Architecture/ADR-005_EVENTOS_DE_INTEGRACION.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1092 passed, 1092 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:33:41

## Turno cerrado 20/10/2026 10:07:28

## Turno cerrado 20/10/2026 12:31:50

### Cambios respecto de HEAD

```
?? .claude/audit/verificacion-2026-10-20.md
M	backend/package-lock.json
M	backend/package.json
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/people-lookup.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fakes.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
M	backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
M	backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.ts
M	backend/test/README.md
M	backend/test/shared/factories/cloud-structure.factory.ts
M	docs/Backend-Architecture/GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
?? .claude/audit/2026-10-20.md
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.wiring.spec.ts
?? backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.spec.ts
?? backend/test/shared/fakes/fake-google.ts
?? backend/test/shared/harness/case-folder-scenario.ts
?? backend/test/shared/harness/google-stack.ts
?? backend/test/subsystems/cases/case-folder-contract.int.spec.ts
?? backend/test/subsystems/documents/google-drive-case-folder.int.spec.ts
?? backend/test/subsystems/documents/google-drive-templates.int.spec.ts
?? backend/test/subsystems/documents/google-oauth-refresh.int.spec.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1099 passed, 1099 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:46:41

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 20/10/2026 12:51:59

## Turno cerrado 20/10/2026 10:29:32

## Turno cerrado 20/10/2026 12:33:18

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
?? .claude/audit/verificacion-2026-10-20.md
M	backend/package-lock.json
M	backend/package.json
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/people-lookup.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fakes.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
M	backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
M	backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.ts
M	backend/test/README.md
M	backend/test/shared/factories/cloud-structure.factory.ts
M	docs/Backend-Architecture/GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
?? .claude/audit/2026-10-20.md
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.wiring.spec.ts
?? backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.spec.ts
?? backend/test/shared/fakes/fake-google.ts
?? backend/test/shared/harness/case-folder-scenario.ts
?? backend/test/shared/harness/google-stack.ts
?? backend/test/subsystems/cases/case-folder-contract.int.spec.ts
?? backend/test/subsystems/documents/google-drive-case-folder.int.spec.ts
?? backend/test/subsystems/documents/google-drive-templates.int.spec.ts
?? backend/test/subsystems/documents/google-oauth-refresh.int.spec.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1099 passed, 1099 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:55:08

## Turno cerrado 20/10/2026 12:00:27

## Turno cerrado 20/10/2026 12:37:04

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
?? .claude/audit/2026-10-20.md
?? Criterios_Sprint3.docx
?? .claude/audit/verificacion-2026-10-20.md
M	backend/package-lock.json
M	backend/package.json
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/people-lookup.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fakes.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
M	backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
M	backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.ts
M	backend/test/README.md
M	backend/test/shared/factories/cloud-structure.factory.ts
M	docs/Backend-Architecture/GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
?? .claude/audit/2026-10-20.md
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.wiring.spec.ts
?? backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.spec.ts
?? backend/test/shared/fakes/fake-google.ts
?? backend/test/shared/harness/case-folder-scenario.ts
?? backend/test/shared/harness/google-stack.ts
?? backend/test/subsystems/cases/case-folder-contract.int.spec.ts
?? backend/test/subsystems/documents/google-drive-case-folder.int.spec.ts
?? backend/test/subsystems/documents/google-drive-templates.int.spec.ts
?? backend/test/subsystems/documents/google-oauth-refresh.int.spec.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1099 passed, 1099 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:23:33

### Cambios respecto de HEAD

```
?? .claude/audit/verificacion-2026-10-20.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:37:35

### Cambios respecto de HEAD

```
M	frontend/src/features/cases/pages/RegisterCasePage.tsx
M	frontend/tests/components/cases/RegisterCasePage.test.tsx
?? .claude/audit/2026-10-20.md
?? .claude/audit/verificacion-2026-10-20.md
?? frontend/src/features/cases/utils/toFormErrors.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 13:02:08

## Turno cerrado 20/10/2026 13:07:33

## Turno cerrado 20/10/2026 12:45:14

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
?? .claude/audit/2026-10-20.md
M	frontend/src/features/cases/pages/CaseDetailPage.tsx
M	frontend/src/features/cases/pages/RegisterCasePage.tsx
M	frontend/src/features/clients/index.ts
M	frontend/src/features/clients/pages/ClientsPage.tsx
M	frontend/src/features/documents/pages/DocumentTemplatesPage.tsx
M	frontend/src/features/lawyers/pages/LawyersPage.tsx
M	frontend/src/features/legal-params/index.ts
M	frontend/src/features/users/pages/UsersPage.tsx
M	frontend/tests/components/cases/RegisterCasePage.test.tsx
?? .claude/audit/2026-10-20.md
?? .claude/audit/verificacion-2026-10-20.md
?? frontend/src/features/cases/utils/toFormErrors.ts
?? frontend/src/features/cases/utils/toInterruptiveActFormErrors.ts
?? frontend/src/features/cases/utils/toPrescriptionDeclarationFormErrors.ts
?? frontend/src/features/clients/utils/toFormErrors.ts
?? frontend/src/features/documents/utils/toFormErrors.ts
?? frontend/src/features/lawyers/utils/toFormErrors.ts
?? frontend/src/features/users/utils/toFormErrors.ts
?? frontend/tests/unit/cases/toFormErrors.test.ts
?? frontend/tests/unit/clients/toFormErrors.test.ts
?? frontend/tests/unit/documents/toFormErrors.test.ts
?? frontend/tests/unit/lawyers/toFormErrors.test.ts
?? frontend/tests/unit/users/toFormErrors.test.ts
M	backend/package-lock.json
M	backend/package.json
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/people-lookup.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fakes.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
M	backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
M	backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.ts
M	backend/test/README.md
M	backend/test/shared/factories/cloud-structure.factory.ts
M	docs/Backend-Architecture/GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
?? .claude/audit/2026-10-20.md
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.wiring.spec.ts
?? backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.spec.ts
?? backend/test/shared/fakes/fake-google.ts
?? backend/test/shared/harness/case-folder-scenario.ts
?? backend/test/shared/harness/google-stack.ts
?? backend/test/subsystems/cases/case-folder-contract.int.spec.ts
?? backend/test/subsystems/documents/google-drive-case-folder.int.spec.ts
?? backend/test/subsystems/documents/google-drive-templates.int.spec.ts
?? backend/test/subsystems/documents/google-oauth-refresh.int.spec.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1099 passed, 1099 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 13:11:31

## Turno cerrado 20/10/2026 13:25:44

## Turno cerrado 20/10/2026 12:57:54

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
M	frontend/CLAUDE.md
?? .claude/audit/2026-10-20.md
M	backend/prisma/seed.ts
M	frontend/src/features/cases/pages/CaseDetailPage.tsx
M	frontend/src/features/cases/pages/RegisterCasePage.tsx
M	frontend/src/features/clients/index.ts
M	frontend/src/features/clients/pages/ClientsPage.tsx
M	frontend/src/features/documents/pages/DocumentTemplatesPage.tsx
D	frontend/src/features/home/pages/HomePage.tsx
M	frontend/src/features/lawyers/pages/LawyersPage.tsx
M	frontend/src/features/legal-params/index.ts
M	frontend/src/features/users/pages/UsersPage.tsx
M	frontend/tests/components/cases/RegisterCasePage.test.tsx
?? .claude/audit/2026-10-20.md
?? .claude/audit/verificacion-2026-10-20.md
?? frontend/src/features/cases/utils/toFormErrors.ts
?? frontend/src/features/cases/utils/toInterruptiveActFormErrors.ts
?? frontend/src/features/cases/utils/toPrescriptionDeclarationFormErrors.ts
?? frontend/src/features/clients/utils/toFormErrors.ts
?? frontend/src/features/documents/utils/toFormErrors.ts
?? frontend/src/features/lawyers/utils/toFormErrors.ts
?? frontend/src/features/users/utils/toFormErrors.ts
?? frontend/tests/unit/cases/toFormErrors.test.ts
?? frontend/tests/unit/clients/toFormErrors.test.ts
?? frontend/tests/unit/documents/toFormErrors.test.ts
?? frontend/tests/unit/lawyers/toFormErrors.test.ts
?? frontend/tests/unit/users/toFormErrors.test.ts
M	backend/package-lock.json
M	backend/package.json
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/request-case-folder.use-case.ts
M	backend/src/subsystems/cases/core/domain/errors/case.errors.ts
M	backend/src/subsystems/cases/core/domain/ports/people-lookup.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fakes.ts
M	backend/src/subsystems/documents/documents.module.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.spec.ts
M	backend/src/subsystems/documents/infrastructure/storage/document-storage.factory.ts
M	backend/src/subsystems/documents/infrastructure/storage/google-drive/google-drive-document-storage.adapter.ts
M	backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.ts
M	backend/test/README.md
M	backend/test/shared/factories/cloud-structure.factory.ts
M	docs/Backend-Architecture/GOOGLE_OAUTH_CLIENTE_COMPARTIDO.md
?? .claude/audit/2026-10-20.md
?? backend/src/subsystems/documents/infrastructure/storage/document-storage.wiring.spec.ts
?? backend/src/subsystems/people/infrastructure/acl/cases-people-lookup.adapter.spec.ts
?? backend/test/shared/fakes/fake-google.ts
?? backend/test/shared/harness/case-folder-scenario.ts
?? backend/test/shared/harness/google-stack.ts
?? backend/test/subsystems/cases/case-folder-contract.int.spec.ts
?? backend/test/subsystems/documents/google-drive-case-folder.int.spec.ts
?? backend/test/subsystems/documents/google-drive-templates.int.spec.ts
?? backend/test/subsystems/documents/google-oauth-refresh.int.spec.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1099 passed, 1099 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 13:36:26

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-20.md
M	backend/prisma/seed.ts
M	backend/src/subsystems/cases/core/application/common/register-case.interfaces.ts
M	backend/src/subsystems/cases/core/application/use-cases/get-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/get-case.use-case.ts
M	backend/src/subsystems/cases/core/application/use-cases/list-cases.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/list-cases.use-case.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.spec.ts
M	backend/src/subsystems/cases/core/application/use-cases/register-case.use-case.ts
M	backend/src/subsystems/cases/core/domain/business-days.ts
M	backend/src/subsystems/cases/core/domain/entities/administrative.ts
M	backend/src/subsystems/cases/core/domain/entities/amparo.ts
M	backend/src/subsystems/cases/core/domain/entities/cases.ts
M	backend/src/subsystems/cases/core/domain/entities/criminal.ts
M	backend/src/subsystems/cases/core/domain/factories/case.factory.spec.ts
M	backend/src/subsystems/cases/core/domain/factories/case.factory.ts
M	backend/src/subsystems/cases/core/domain/ports/case-query.port.ts
M	backend/src/subsystems/cases/core/test-support/case-fixtures.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/case.response.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/dtos/register-case.request.dto.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.spec.ts
M	backend/src/subsystems/cases/infrastructure/http/mappers/case-http.mapper.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-prisma.mapper.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts
M	backend/src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts
M	backend/test/shared/factories/case.factory.ts
M	backend/test/subsystems/cases/get-case.int.spec.ts
M	backend/test/subsystems/cases/list-cases.int.spec.ts
M	backend/test/subsystems/cases/register-case.int.spec.ts
?? backend/src/subsystems/cases/core/domain/value-objects/harmful-act.spec.ts
?? backend/src/subsystems/cases/core/domain/value-objects/harmful-act.ts
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1158 passed, 1158 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

<<<<<<< HEAD
## Turno cerrado 20/10/2026 13:49:56

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 20/10/2026 13:53:43

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 14:08:19

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-20.md
M	.claude/audit/verificacion-2026-10-20.md
M	frontend/CLAUDE.md
M	frontend/src/app/providers/AuthContext.ts
M	frontend/src/app/providers/AuthProvider.tsx
M	frontend/src/features/auth/api/auth.api.ts
M	frontend/src/features/auth/types/session.ts
M	frontend/src/features/auth/utils/sessionStorage.ts
M	frontend/src/features/dashboard/pages/HomePage.tsx
M	frontend/src/features/users/pages/UsersPage.tsx
M	frontend/src/shared/api/http.ts
M	frontend/tests/components/app/AppLayout.test.tsx
M	frontend/tests/components/app/RedirectIfSession.test.tsx
M	frontend/tests/components/app/RequireAccess.test.tsx
M	frontend/tests/components/auth/ChangePasswordModal.test.tsx
M	frontend/tests/components/auth/tokenRenewal.test.tsx
M	frontend/tests/components/documents/DocumentTemplatesPage.test.tsx
M	frontend/tests/components/lawyers/LawyersPage.test.tsx
M	frontend/tests/components/users/UsersPage.test.tsx
M	frontend/tests/setup/render.tsx
M	frontend/tests/unit/auth/sessionStorage.test.ts
?? frontend/tests/components/auth/sessionSync.test.tsx
?? frontend/tests/components/dashboard/HomePage.roles.test.tsx
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---
=======
## Turno cerrado 20/10/2026 13:51:20

Sin cambios en el working tree respecto de HEAD.
>>>>>>> 5784d4a675e948894e3944de9ad101ef98d9d6c0

## Turno cerrado 20/10/2026 14:11:45

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 20/10/2026 14:35:17

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 14:39:39

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 16:17:49

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 16:23:35

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-20.md
M	.claude/audit/verificacion-2026-10-20.md
M	frontend/src/app/providers/AuthProvider.tsx
M	frontend/src/shared/api/http.ts
M	frontend/tests/components/auth/sessionSync.test.tsx
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---
