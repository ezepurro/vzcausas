## Turno cerrado 20/10/2026 10:58:36

### Cambios respecto de HEAD

```
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

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1092 passed, 1092 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 11:06:10

### Cambios respecto de HEAD

```
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

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1092 passed, 1092 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 12:31:50

### Cambios respecto de HEAD

```
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

## Turno cerrado 20/10/2026 12:33:18

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
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

## Turno cerrado 20/10/2026 12:37:04

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
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

## Turno cerrado 20/10/2026 12:45:14

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
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

## Turno cerrado 20/10/2026 12:57:54

### Cambios respecto de HEAD

```
M	.claude/audit/verificacion-2026-10-20.md
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

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests: 1158 passed, 1158 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 20/10/2026 13:51:20

Sin cambios en el working tree respecto de HEAD.
