
## Turno cerrado 18/10/2026 18:49:12

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 18/10/2026 19:02:43

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:14:57

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:16:52

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:19:34

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:20:13

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:22:53

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:25:04

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:25:49

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:26:32

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:29:35

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:36:54

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/package-lock.json
M	backend/package.json
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:39:43

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/package-lock.json
M	backend/package.json
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:43:50

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/package-lock.json
M	backend/package.json
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:45:33

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/package-lock.json
M	backend/package.json
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 19:55:12

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/.env.example
M	backend/package-lock.json
M	backend/package.json
M	docker/.env.example
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 20:00:21

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/.env.example
M	backend/package-lock.json
M	backend/package.json
M	docker/.env.example
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 20:15:08

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/.env.example
M	backend/package-lock.json
M	backend/package.json
M	docker/.env.example
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/shared/infrastructure/google/google-oauth-client.service.spec.ts
?? backend/src/shared/infrastructure/google/google-oauth-client.service.ts
?? backend/src/shared/infrastructure/google/google-oauth.module.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 20:18:39

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	backend/.env.example
M	backend/package-lock.json
M	backend/package.json
M	docker/.env.example
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
?? backend/scripts/google-authorize.ts
?? backend/src/shared/infrastructure/google/google-oauth-client.service.spec.ts
?? backend/src/shared/infrastructure/google/google-oauth-client.service.ts
?? backend/src/shared/infrastructure/google/google-oauth.module.ts
?? backend/src/subsystems/deadlines/core/domain/ports/email-sender.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/lawyer-contact-lookup.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
?? backend/src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice.ts
?? backend/src/subsystems/deadlines/core/domain/value-objects/jurisdiction-code.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **FALLÓ**

```
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(99,13): error TS2353: Object literal may only specify known properties, and 'isPrescribed' does not exist in type 'ProceduralStateSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-prisma.repository.ts(107,23): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(24,3): error TS2353: Object literal may only specify known properties, and 'interruptiveActs' does not exist in type 'CaseInclude<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(318,60): error TS2339: Property 'actDate' does not exist on type 'never'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(344,39): error TS2339: Property 'lastName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-query-prisma.adapter.ts(345,40): error TS2339: Property 'firstName' does not exist on type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(51,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/case-timeline-prisma.adapter.ts(54,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(1,18): error TS2305: Module '"../../../../generated/prisma/client"' has no exported member 'InterruptiveAct'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.mapper.ts(18,53): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActUncheckedCreateInput'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-prisma.repository.ts(19,26): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(14,20): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActInclude'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(16,22): error TS2694: Namespace '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member 'InterruptiveActGetPayload'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(22,28): error TS2724: '"C:/Users/teoma/Proyects/vzcausas/backend/src/generated/prisma/internal/prismaNamespace"' has no exported member named 'InterruptiveActOrderByWithRelationInput'. Did you mean 'UserOrderByWithRelationInput'?
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(40,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/interruptive-act-query-prisma.adapter.ts(47,22): error TS2339: Property 'interruptiveAct' does not exist on type 'PrismaTransactionalClient'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(18,35): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(21,46): error TS2344: Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' does not satisfy the constraint 'boolean | ProceduralActDefaultArgs<DefaultArgs> | null | undefined'.
  Type '{ include: { proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }; }' is not assignable to type 'ProceduralActDefaultArgs<DefaultArgs>'.
    The types of 'include.registeredByLawyer' are incompatible between these types.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
        Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
          Types of property 'select' are incompatible.
            Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(48,9): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(55,30): error TS2345: Argument of type '(row: { proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }) => ProceduralActView' is not assignable to parameter of type '(value: { caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }, index: number, array: { ...; }[]) => ProceduralActView'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
      Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(63,7): error TS2322: Type '{ proceduralState: { select: { name: true; }; }; registeredByLawyer: { select: { lastName: boolean; firstName: boolean; }; }; }' is not assignable to type 'ProceduralActInclude<DefaultArgs>'.
  Types of property 'registeredByLawyer' are incompatible.
    Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'boolean | LawyerDefaultArgs<DefaultArgs> | undefined'.
      Type '{ select: { lastName: boolean; firstName: boolean; }; }' is not assignable to type 'LawyerDefaultArgs<DefaultArgs>'.
        Types of property 'select' are incompatible.
          Type '{ lastName: boolean; firstName: boolean; }' has no properties in common with type 'LawyerSelect<DefaultArgs>'.
src/subsystems/cases/infrastructure/persistence/procedural-act-query-prisma.adapter.ts(65,25): error TS2345: Argument of type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is not assignable to parameter of type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; } & { caseId: number; proceduralStateId: number | null; customState: string | null; ... 11 more ...; deadlineManualDueDate: Date | null; }'.
  Type '{ caseId: number; proceduralStateId: number | null; customState: string | null; actDate: Date; notificationDate: Date | null; notes: string | null; id: number; registeredByUserId: number; ... 6 more ...; deadlineManualDueDate: Date | null; }' is missing the following properties from type '{ proceduralState: { name: string; } | null; registeredByLawyer: { lastName: never; firstName: never; }; }': proceduralState, registeredByLawyer
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(108,7): error TS2322: Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type '((Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput) | (Without<...> & LawyerCreateInput)) & object'.
  Type '{ lastName: string; firstName: string; registrationNumber: string; }' is not assignable to type 'Without<LawyerUncheckedCreateInput, LawyerCreateInput> & LawyerCreateInput & object'.
    Property 'fullName' is missing in type '{ lastName: string; firstName: string; registrationNumber: string; }' but required in type 'LawyerCreateInput'.
src/subsystems/identity/infrastructure/bootstrap/dev-seed.service.ts(119,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(33,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(41,44): error TS2345: Argument of type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is not assignable to parameter of type 'UserRow'.
  Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(55,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserUpdateInput, UserUncheckedUpdateInput> & UserUncheckedUpdateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(108,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<UserCreateInput, UserUncheckedCreateInput> & UserUncheckedCreateInput & object'.
src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts(177,30): error TS2345: Argument of type '(row: UserRow) => User' is not assignable to parameter of type '(value: { roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }, index: number, array: ({ ...; } & { ...; ...'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ roles: { userId: number; roleId: number; }[]; } & { lawyerId: number | null; id: number; active: boolean; createdAt: Date; updatedAt: Date; email: string; fullName: string; username: string; passwordHash: string; lastLoginAt: Date | null; deletedAt: Date | null; }' is missing the following properties from type 'UserRow': lastName, firstName
src/subsystems/legal-parameters/infrastructure/persistence/proc-state.mapper.ts(21,25): error TS2339: Property 'isPrescribed' does not exist on type 'ProceduralStateRow'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(37,9): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'Without<LawyerCreateInput, LawyerUncheckedCreateInput> & LawyerUncheckedCreateInput & object'.
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(47,46): error TS2345: Argument of type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is not assignable to parameter of type 'LawyerRow'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(54,21): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/people/infrastructure/persistence/prisma/prisma-lawyer.repository.ts(112,30): error TS2345: Argument of type '(row: LawyerRow) => Lawyer' is not assignable to parameter of type '(value: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }, index: number, array: { id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }[]) => Lawyer'.
  Types of parameters 'row' and 'value' are incompatible.
    Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'LawyerRow': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(34,5): error TS2322: Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; } | null' is not assignable to type 'DashboardLawyerRef | null'.
  Type '{ id: number; active: boolean; createdAt: Date; updatedAt: Date; registrationNumber: string; fullName: string; }' is missing the following properties from type 'DashboardLawyerRef': lastName, firstName
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(36,27): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(59,50): error TS2353: Object literal may only specify known properties, and 'lastName' does not exist in type 'LawyerSelect<DefaultArgs>'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(68,25): error TS2551: Property 'jurisdiction' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'jurisdictionId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(71,55): error TS2551: Property 'currentState' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentStateId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(73,20): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,16): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(74,66): error TS2551: Property 'currentProceduralAct' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'currentProceduralActId'?
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(76,34): error TS2339: Property 'proceduralActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(77,36): error TS2339: Property 'interruptiveActs' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,21): error TS2339: Property 'offenses' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(78,35): error TS7006: Parameter 'offense' implicitly has an 'any' type.
src/subsystems/reporting/infrastructure/persistence/lawyer-dashboard-prisma.query.ts(84,30): error TS2551: Property 'responsibleLawyer' does not exist on type '{ id: number; jurisdictionId: number; currentStateId: number | null; createdByUserId: number; sacNumber: string | null; caption: string; court: string | null; instructorName: string | null; ... 12 more ...; updatedAt: Date; }'. Did you mean 'responsibleLawyerId'?
```

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 20:20:32

### Cambios respecto de HEAD

```
M	.claude/rules/notificaciones.md
M	docker/.env.example
M	docs/Backend-Architecture/ADR-004_EMAIL_GMAIL_API.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .claude/audit/2026-10-18.md
?? .claude/audit/verificacion-2026-10-18.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---
