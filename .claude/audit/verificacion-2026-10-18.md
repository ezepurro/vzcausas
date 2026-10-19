
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

## Turno cerrado 18/10/2026 20:22:48

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 18/10/2026 20:29:25

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.ts
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

## Turno cerrado 18/10/2026 20:33:19

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.ts
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

## Turno cerrado 18/10/2026 20:35:22

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/external/gmail-api-email.adapter.ts
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

## Turno cerrado 18/10/2026 20:57:15

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.spec.ts
?? backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
?? backend/src/subsystems/deadlines/core/application/use-cases/test-support/deadlines-fakes.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **FALLARON**

```
System.Management.Automation.RemoteException
<--- Last few GCs --->
System.Management.Automation.RemoteException
[12244:00000236C9714000]    58734 ms: Scavenge 32.6 (35.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.75 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
[12244:00000236C9714000]    73840 ms: Scavenge 32.6 (34.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.32 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
System.Management.Automation.RemoteException
FATAL ERROR: Zone Allocation failed - process out of memory
----- Native stack trace -----
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
<--- Last few GCs --->
System.Management.Automation.RemoteException
[12244:00000236C9714000]    58734 ms: Scavenge 32.6 (35.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.75 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
[12244:00000236C9714000]    73840 ms: Scavenge 32.6 (34.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.32 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
System.Management.Automation.RemoteException
FATAL ERROR: Zone Allocation failed - process out of memory
----- Native stack trace -----
System.Management.Automation.RemoteException
System.Management.Automation.RemoteException
<--- Last few GCs --->
System.Management.Automation.RemoteException
[12244:00000236C9714000]    58734 ms: Scavenge 32.6 (35.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.75 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
[12244:00000236C9714000]    73840 ms: Scavenge 32.6 (34.5) -> 31.7 (34.5) MB, pooled: 1 MB, 0.32 / 0.00 ms  (average mu = 0.999, current mu = 0.998) task; 
System.Management.Automation.RemoteException
FATAL ERROR: Zone Allocation failed - process out of memory
----- Native stack trace -----
System.Management.Automation.RemoteException
 1: 00007FF69A5EC44F 
 1: 00007FF69A5EC44F 
 2: 00007FF69B236217 
 2: 00007FF69B236217 
 3: 00007FF69ABAFC46 
 3: 00007FF69ABAFC46 
 4: 00007FF69A9DE41E 
 4: 00007FF69BBD4FF0 
 5: 00007FF69AA87B43 
 5: 00007FF69B9EEAC9 
 6: 00007FF69AA85A4A 
 6: 00007FF69AAA7E06 
 7: 00007FF69B1A9ECF 
 7: 00007FF69AA856FF 
 8: 00007FF69AA8752B 
 8: 00007FF69B1B2553 
 9: 00007FF69BA1684F 
 9: 00007FF69B1B462A 
10: 00007FF69A53CD8E 
10: 00007FF69AC36631 
11: 00007FF69B28B1A6 
11: 00007FF69AC3472F 
12: 00007FF69C4EB0B3 
12: 000002369FE775FA 
13: 00007FFB4C5FE957 
14: 00007FFB4D4E7C1C 
```

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:06:31

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.spec.ts
?? backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
?? backend/src/subsystems/deadlines/core/application/use-cases/test-support/deadlines-fakes.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **FALLARON**

```
System.Management.Automation.RemoteException
FATAL ERROR: Zone Allocation failed - process out of memory
----- Native stack trace -----
System.Management.Automation.RemoteException
FATAL ERROR: Zone Allocation failed - process out of memory
----- Native stack trace -----
System.Management.Automation.RemoteException
 1: 00007FF7F7F6C44F 
 2: 00007FF7F8BB6217 
 3: 00007FF7F852FC46 
 4: 00007FF7F83CD35C 
 5: 00007FF7F835E031 
 6: 00007FF7F8407B43 
 7: 00007FF7F8405A4A 
 8: 00007FF7F8B29ECF 
 9: 00007FF7F840752B 
10: 00007FF7F939684F 
11: 00007FF7F7EBCD8E 
12: 00007FF7F8C0B1A6 
13: 00007FF7F9E6B0B3 
14: 00007FFB4C5FE957 
15: 00007FFB4D4E7C1C 
 1: 00007FF7F7F6C44F 
 2: 00007FF7F8BB6217 
 3: 00007FF7F852FC46 
 4: 00007FF7F8359E0B 
 5: 00007FF7F8359B41 
 6: 00007FF7F8354034 
 7: 00007FF7F835C0EE 
 8: 00007FF7F8390993 
 9: 00007FF7F8392955 
10: 00007FF7F8391DFE 
11: 00007FF7F83A5361 
12: 00007FF7F837A1C5 
13: 00007FF7F83958F2 
14: 00007FF7F83A6FB6 
15: 00007FF7F83A7DB7 
16: 00007FF7F83BC18A 
17: 00007FF7F8390DCB 
18: 00007FF7F83909A2 
19: 00007FF7F8392955 
20: 00007FF7F8391DFE 
21: 00007FF7F83A5361 
22: 00007FF7F837A1C5 
23: 00007FF7F83958F2 
24: 00007FF7F83A6FB6 
25: 00007FF7F83A7DB7 
26: 00007FF7F83BC18A 
27: 00007FF7F8390DCB 
28: 00007FF7F8408F36 
29: 00007FF7F8407C50 
30: 00007FF7F8405A4A 
31: 00007FF7F8B29ECF 
32: 00007FF7F840752B 
33: 00007FF7F939684F 
34: 00007FF7F7EBCD8E 
35: 00007FF7F8C0B1A6 
36: 00007FF7F9E6B0B3 
37: 00007FFB4C5FE957 
38: 00007FFB4D4E7C1C 
```

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:20:52

Sin cambios en el working tree respecto de HEAD.

## Turno cerrado 18/10/2026 21:24:48

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/package.json
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:28:44

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/tsconfig.json
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:32:46

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/tsconfig.json
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/persistence/prisma-sent-notification.repository.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       865 passed, 865 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:34:13

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/tsconfig.json
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/persistence/prisma-sent-notification.repository.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       865 passed, 865 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:39:30

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.spec.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/test-support/deadlines-fakes.ts
M	backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
M	backend/tsconfig.json
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/persistence/prisma-sent-notification.repository.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       866 passed, 866 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:46:16

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.spec.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/test-support/deadlines-fakes.ts
M	backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
M	backend/src/subsystems/identity/core/application/use-cases/authenticate-user.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/change-password.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/refresh-session.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/test-support/identity-fakes.ts
M	backend/src/subsystems/identity/core/domain/ports/user.repository.ts
M	backend/src/subsystems/identity/infrastructure/acl/access-token-verifier.adapter.spec.ts
M	backend/src/subsystems/identity/infrastructure/persistence/in-memory/in-memory-user.repository.ts
M	backend/src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts
M	backend/tsconfig.json
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/persistence/prisma-sent-notification.repository.ts
?? backend/src/subsystems/identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       866 passed, 866 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:48:40

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.spec.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
M	backend/src/subsystems/deadlines/core/application/use-cases/test-support/deadlines-fakes.ts
M	backend/src/subsystems/deadlines/core/domain/ports/sent-notification.repository.ts
M	backend/src/subsystems/identity/core/application/use-cases/authenticate-user.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/change-password.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/refresh-session.use-case.spec.ts
M	backend/src/subsystems/identity/core/application/use-cases/test-support/identity-fakes.ts
M	backend/src/subsystems/identity/core/domain/ports/user.repository.ts
M	backend/src/subsystems/identity/infrastructure/acl/access-token-verifier.adapter.spec.ts
M	backend/src/subsystems/identity/infrastructure/persistence/in-memory/in-memory-user.repository.ts
M	backend/src/subsystems/identity/infrastructure/persistence/prisma/prisma-user.repository.ts
M	backend/tsconfig.json
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/infrastructure/persistence/prisma-sent-notification.repository.ts
?? backend/src/subsystems/identity/infrastructure/acl/deadlines-lawyer-contact-lookup.adapter.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       866 passed, 866 total

### NO verificado — revisar a mano

- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 21:53:26

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
```

### Verificado automáticamente

- Compilación: **omitida**, no se tocó `backend/src/`.

### NO verificado — revisar a mano

- Tests unitarios: **no se corrieron** en este hook. Correlos con `npm test` en `backend/`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 22:03:05

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/.env.example
M	docker/.env.example
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .github/workflows/deadlines-daily-run.yml
?? backend/src/subsystems/deadlines/core/domain/ports/deadline-detection.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/prescription-detection.port.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       872 passed, 872 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 22:05:19

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/.env.example
M	docker/.env.example
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .github/workflows/deadlines-daily-run.yml
?? backend/src/subsystems/deadlines/core/domain/ports/deadline-detection.port.ts
?? backend/src/subsystems/deadlines/core/domain/ports/prescription-detection.port.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.spec.ts
?? backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       872 passed, 872 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 22:06:01

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/.env.example
A	backend/src/subsystems/deadlines/core/domain/ports/deadline-detection.port.ts
A	backend/src/subsystems/deadlines/core/domain/ports/prescription-detection.port.ts
A	backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.spec.ts
A	backend/src/subsystems/deadlines/infrastructure/http/internal/daily-run.controller.ts
A	backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.spec.ts
A	backend/src/subsystems/deadlines/infrastructure/http/internal/internal-trigger.guard.ts
M	docker/.env.example
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? .github/workflows/deadlines-daily-run.yml
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       872 passed, 872 total

### NO verificado — revisar a mano

- **Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra `API_CONTRACT_V3.md`. Eso lo cubren los tests de integración: `npm run test:int`.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---

## Turno cerrado 18/10/2026 22:12:08

### Cambios respecto de HEAD

```
M	.claude/audit/2026-10-18.md
M	.claude/audit/verificacion-2026-10-18.md
M	backend/src/subsystems/deadlines/core/application/use-cases/send-daily-notification-digest.use-case.ts
M	backend/src/subsystems/identity/identity.module.ts
M	docs/Backend-Architecture/IMPLEMENTACION_NOTIFICACIONES.md
?? backend/src/subsystems/deadlines/core/domain/ports/daily-digest-config.port.ts
?? backend/src/subsystems/deadlines/deadlines.module.ts
```

### Verificado automáticamente

- Compilación (`tsc --noEmit`): **OK**
- Tests unitarios (`npm test`): **OK** — Tests:       872 passed, 872 total

### NO verificado — revisar a mano

- Se tocó un caso de uso y **ningún** `.spec.ts`. Un caso de uso sin su spec al lado está incompleto.
- Tests de integración: no se corrieron. `npm run test:int` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).
- Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo `git diff HEAD`.

---
