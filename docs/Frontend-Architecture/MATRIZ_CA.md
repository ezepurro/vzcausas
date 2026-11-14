# Matriz de criterios de aceptación → tests (frontend)

> Archivo generado con `npm run ca-matrix`. No se edita a mano.

Cada criterio (`CA-x.y`) figura con los tests donde está citado. **Backend** es un criterio
que corresponde al servidor: el frontend muestra lo que recibe y no lo prueba.

## HU-8

| Criterio | Dónde se cubre |
| --- | --- |
| CA-8.1 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-8.2 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-8.3 | `components/clients/ClientsPage.test.tsx` (componentes)<br>`unit/clients/client.schema.test.ts` (unit) |
| CA-8.4 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-8.5 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-8.6 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-8.9 | `components/cases/RegisterCasePage.test.tsx` (componentes) |

## HU-9

| Criterio | Dónde se cubre |
| --- | --- |
| CA-9.1 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.2 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.3 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.4 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.5 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.6 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.8 | `components/clients/ClientsPage.test.tsx` (componentes) |
| CA-9.10 | `unit/app/access.test.ts` (unit)<br>Backend |
| CA-9.11 | Backend |

## HU-10

| Criterio | Dónde se cubre |
| --- | --- |
| CA-10.1 | `components/clients/ClientsPage.edit.test.tsx` (componentes)<br>`unit/clients/buildClientPatch.test.ts` (unit)<br>Backend |
| CA-10.2 | `components/clients/clientMutations.cache.test.tsx` (componentes)<br>Backend |
| CA-10.3 | `components/clients/ClientsPage.edit.test.tsx` (componentes)<br>`unit/clients/buildClientPatch.test.ts` (unit) |
| CA-10.4 | `components/clients/ClientsPage.edit.test.tsx` (componentes) |
| CA-10.5 | Backend |
| CA-10.6 | `components/clients/ClientsPage.edit.test.tsx` (componentes) |
| CA-10.7 | `components/clients/ClientsPage.edit.test.tsx` (componentes)<br>`unit/clients/buildClientPatch.test.ts` (unit) |
| CA-10.8 | `unit/clients/buildClientPatch.test.ts` (unit)<br>Backend |
| CA-10.9 | `components/clients/clientMutations.cache.test.tsx` (componentes)<br>Backend |
| CA-10.10 | Backend |
| CA-10.11 | `components/clients/ClientsPage.edit.test.tsx` (componentes) |

## HU-11

| Criterio | Dónde se cubre |
| --- | --- |
| CA-11.1 | `components/clients/ClientsPage.delete.test.tsx` (componentes) |
| CA-11.2 | `components/clients/ClientsPage.delete.test.tsx` (componentes)<br>`unit/cases/activeCases.test.ts` (unit) |
| CA-11.3 | `components/clients/clientMutations.cache.test.tsx` (componentes)<br>Backend |
| CA-11.4 | Backend |
| CA-11.5 | `components/clients/ClientsPage.delete.test.tsx` (componentes)<br>Backend |
| CA-11.6 | `components/clients/ClientsPage.edit.test.tsx` (componentes) |
| CA-11.7 | `components/clients/ClientsPage.delete.test.tsx` (componentes)<br>Backend |
| CA-11.8 | Backend |
| CA-11.9 | `components/clients/ClientsPage.delete.test.tsx` (componentes) |

## HU-14

| Criterio | Dónde se cubre |
| --- | --- |
| CA-14.1 | `components/lawyers/LawyersPage.edit.test.tsx` (componentes)<br>`unit/lawyers/buildLawyerPatch.test.ts` (unit) |
| CA-14.2 | Backend |
| CA-14.3 | `components/lawyers/LawyersPage.edit.test.tsx` (componentes) |
| CA-14.4 | `components/lawyers/LawyersPage.edit.test.tsx` (componentes) |
| CA-14.5 | Backend |
| CA-14.6 | `components/lawyers/LawyersPage.edit.test.tsx` (componentes)<br>`unit/app/actionAccess.test.ts` (unit) |
| CA-14.7 | `unit/lawyers/buildLawyerPatch.test.ts` (unit) |
| CA-14.10 | `unit/lawyers/buildLawyerPatch.test.ts` (unit) |

## HU-18

| Criterio | Dónde se cubre |
| --- | --- |
| CA-18.1 | `components/cases/RegisterCasePage.test.tsx` (componentes)<br>`e2e/cases.spec.ts` (e2e) |
| CA-18.2 | `components/cases/RegisterCasePage.test.tsx` (componentes)<br>`unit/cases/case.schema.test.ts` (unit)<br>`unit/cases/caseForm.test.ts` (unit) |
| CA-18.3 | `unit/cases/case.schema.test.ts` (unit)<br>`unit/cases/caseForm.test.ts` (unit) |
| CA-18.4 | `components/cases/RegisterCasePage.test.tsx` (componentes)<br>`unit/cases/case.schema.test.ts` (unit)<br>`unit/cases/caseForm.test.ts` (unit) |
| CA-18.5 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.test.tsx` (componentes)<br>`unit/cases/case.schema.test.ts` (unit) |
| CA-18.6 | `unit/cases/prescription.test.ts` (unit) |
| CA-18.7 | `components/cases/CaseDetailPage.test.tsx` (componentes) |
| CA-18.8 | `components/cases/RegisterCasePage.test.tsx` (componentes) |
| CA-18.10 | `components/cases/RegisterCasePage.draft.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.test.tsx` (componentes) |
| CA-18.11 | `components/cases/RegisterCasePage.test.tsx` (componentes)<br>`unit/cases/suggestedCaption.test.ts` (unit) |

## HU-19

| Criterio | Dónde se cubre |
| --- | --- |
| CA-19.1 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes) |
| CA-19.2 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes)<br>`unit/cases/buildCasePatch.test.ts` (unit) |
| CA-19.3 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes) |
| CA-19.4 | Backend |
| CA-19.5 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes) |
| CA-19.6 | `unit/cases/buildCasePatch.test.ts` (unit)<br>`unit/cases/caseForm.test.ts` (unit)<br>Backend |
| CA-19.7 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes)<br>`unit/cases/buildCasePatch.test.ts` (unit) |
| CA-19.8 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes) |
| CA-19.9 | Backend |
| CA-19.10 | Backend |
| CA-19.11 | Backend |
| CA-19.12 | Backend |
| CA-19.13 | `unit/cases/buildCasePatch.test.ts` (unit)<br>Backend |
| CA-19.14 | Backend |
| CA-19.15 | Backend |
| CA-19.16 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes)<br>`components/cases/GenerateCaseFilePage.test.tsx` (componentes) |

## HU-20

| Criterio | Dónde se cubre |
| --- | --- |
| CA-20.1 | `components/cases/CasesPage.test.tsx` (componentes)<br>`e2e/cases.spec.ts` (e2e) |
| CA-20.2 | `components/cases/CasesPage.test.tsx` (componentes) |
| CA-20.3 | `components/cases/CasesPage.test.tsx` (componentes) |
| CA-20.4 | `components/cases/CasesPage.test.tsx` (componentes)<br>`unit/cases/stateFilter.test.ts` (unit) |
| CA-20.5 | `unit/cases/deadlineStatus.test.ts` (unit) |
| CA-20.6 | `components/cases/CasesPage.test.tsx` (componentes)<br>`components/shared/listFooter.test.tsx` (componentes) |
| CA-20.7 | `e2e/cases.spec.ts` (e2e)<br>`unit/app/access.test.ts` (unit) |
| CA-20.8 | `e2e/cases.spec.ts` (e2e) |

## HU-21

| Criterio | Dónde se cubre |
| --- | --- |
| CA-21.1 | `components/cases/CaseDetailPage.delete.test.tsx` (componentes) |
| CA-21.2 | `components/cases/CaseDetailPage.delete.test.tsx` (componentes)<br>`unit/cases/caseDeletion.schema.test.ts` (unit) |
| CA-21.3 | Backend |
| CA-21.4 | Backend |
| CA-21.5 | Backend |
| CA-21.6 | Backend |
| CA-21.7 | Backend |
| CA-21.8 | Backend |
| CA-21.9 | Backend |
| CA-21.10 | Backend |
| CA-21.11 | `components/cases/CaseDetailPage.delete.test.tsx` (componentes) |

## HU-22

| Criterio | Dónde se cubre |
| --- | --- |
| CA-22.1 | `components/cases/CaseDetailPage.test.tsx` (componentes) |
| CA-22.2 | `components/cases/CaseDetailPage.test.tsx` (componentes) |
| CA-22.3 | `components/cases/CaseDetailPage.test.tsx` (componentes) |
| CA-22.4 | `components/cases/CaseDetailPage.test.tsx` (componentes)<br>`e2e/cases.spec.ts` (e2e) |
| CA-22.5 | `components/proceedings/RegisterProceduralActPage.test.tsx` (componentes) |
| CA-22.6 | `components/cases/CaseDetailPage.test.tsx` (componentes) |

## HU-24

| Criterio | Dónde se cubre |
| --- | --- |
| CA-24.1 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes) |
| CA-24.2 | Backend |
| CA-24.3 | Backend |
| CA-24.4 | Backend |
| CA-24.5 | Backend |
| CA-24.6 | Backend |
| CA-24.7 | Backend |
| CA-24.8 | Backend |
| CA-24.9 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes) |
| CA-24.10 | Backend |
| CA-24.11 | Backend |

## HU-25

| Criterio | Dónde se cubre |
| --- | --- |
| CA-25.1 | `components/cases/CaseDetailPage.caseFile.test.tsx` (componentes)<br>`components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.test.ts` (unit) |
| CA-25.2 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.schema.test.ts` (unit) |
| CA-25.3 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.test.ts` (unit) |
| CA-25.4 | Backend |
| CA-25.5 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.schema.test.ts` (unit)<br>`unit/cases/caseFile.test.ts` (unit) |
| CA-25.6 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.test.ts` (unit) |
| CA-25.7 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes) |
| CA-25.8 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes) |
| CA-25.9 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes)<br>`unit/cases/caseFile.test.ts` (unit) |
| CA-25.10 | `components/cases/GenerateCaseFilePage.test.tsx` (componentes) |
| CA-25.11 | Backend |
| CA-25.12 | Backend |

## HU-26

| Criterio | Dónde se cubre |
| --- | --- |
| CA-26.5 | `components/proceedings/RegisterProceduralActPage.test.tsx` (componentes) |

## HU-27

| Criterio | Dónde se cubre |
| --- | --- |
| CA-27.1 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.2 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.3 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.4 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.5 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.6 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.8 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.11 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.12 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-27.14 | `components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |

## HU-28

| Criterio | Dónde se cubre |
| --- | --- |
| CA-28.1 | `components/proceedings/RegisterProceduralActPage.edit.test.tsx` (componentes)<br>`unit/proceedings/buildProceduralActPatch.test.ts` (unit) |
| CA-28.2 | `components/proceedings/RegisterProceduralActPage.edit.test.tsx` (componentes) |
| CA-28.3 | `unit/proceedings/buildProceduralActPatch.test.ts` (unit) |
| CA-28.4 | `unit/proceedings/buildProceduralActPatch.test.ts` (unit)<br>Backend |
| CA-28.5 | `unit/proceedings/buildProceduralActPatch.test.ts` (unit)<br>Backend |
| CA-28.6 | `unit/proceedings/buildProceduralActPatch.test.ts` (unit)<br>Backend |
| CA-28.7 | Backend |
| CA-28.8 | Backend |
| CA-28.9 | Backend |
| CA-28.10 | `components/proceedings/RegisterProceduralActPage.edit.test.tsx` (componentes) |
| CA-28.11 | Backend |

## HU-31

| Criterio | Dónde se cubre |
| --- | --- |
| CA-31.1 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |
| CA-31.2 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |
| CA-31.6 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |
| CA-31.8 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes)<br>`unit/cases/interruptiveAct.schema.test.ts` (unit) |
| CA-31.9 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |
| CA-31.10 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |
| CA-31.11 | `components/cases/CaseDetailPage.interruptiveAct.test.tsx` (componentes) |

## HU-32

| Criterio | Dónde se cubre |
| --- | --- |
| CA-32.9 | `components/dashboard/HomePage.administrator.test.tsx` (componentes)<br>`components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-32.12 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-32.13 | `components/cases/CaseDetailPage.test.tsx` (componentes)<br>`unit/cases/prescription.test.ts` (unit) |

## HU-33

| Criterio | Dónde se cubre |
| --- | --- |
| CA-33.1 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes)<br>`unit/app/actionAccess.test.ts` (unit) |
| CA-33.2 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes)<br>`unit/app/actionAccess.test.ts` (unit) |
| CA-33.3 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes)<br>`unit/cases/prescriptionDeclaration.schema.test.ts` (unit) |
| CA-33.4 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes) |
| CA-33.5 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes) |
| CA-33.9 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes) |
| CA-33.16 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes)<br>`components/cases/CaseDetailPage.timeline.test.tsx` (componentes) |
| CA-33.18 | `components/cases/CaseDetailPage.edit.test.tsx` (componentes) |
| CA-33.19 | `components/cases/CaseDetailPage.prescription.test.tsx` (componentes) |

## HU-34

| Criterio | Dónde se cubre |
| --- | --- |
| CA-34.1 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.2 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.3 | `unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-34.4 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes)<br>`unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-34.5 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.6 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.7 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.8 | `unit/app/access.test.ts` (unit) |
| CA-34.9 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-34.10 | `unit/documents/documentTemplate.schema.test.ts` (unit) |

## HU-35

| Criterio | Dónde se cubre |
| --- | --- |
| CA-35.2 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.3 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.4 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.5 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.6 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.8 | `components/app/AppLayout.test.tsx` (componentes)<br>`components/documents/DocumentTemplatesPage.test.tsx` (componentes)<br>`unit/app/access.test.ts` (unit) |
| CA-35.10 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |
| CA-35.11 | `components/documents/DocumentTemplatesPage.test.tsx` (componentes) |

## HU-36

| Criterio | Dónde se cubre |
| --- | --- |
| CA-36.1 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>`unit/documents/buildDocumentTemplatePatch.test.ts` (unit)<br>Backend |
| CA-36.2 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>`unit/documents/buildDocumentTemplatePatch.test.ts` (unit)<br>`unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-36.3 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>`unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-36.4 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>`unit/documents/buildDocumentTemplatePatch.test.ts` (unit)<br>`unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-36.5 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>`unit/documents/documentTemplate.schema.test.ts` (unit) |
| CA-36.6 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes)<br>Backend |
| CA-36.7 | `components/documents/templateMutations.cache.test.tsx` (componentes)<br>Backend |
| CA-36.8 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes) |
| CA-36.9 | Backend |
| CA-36.10 | `components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes) |

## HU-37

| Criterio | Dónde se cubre |
| --- | --- |
| CA-37.1 | `components/documents/DocumentTemplatesPage.delete.test.tsx` (componentes) |
| CA-37.2 | `components/documents/DocumentTemplatesPage.delete.test.tsx` (componentes) |
| CA-37.3 | `components/documents/templateMutations.cache.test.tsx` (componentes) |
| CA-37.4 | Backend |
| CA-37.5 | `components/documents/DocumentTemplatesPage.delete.test.tsx` (componentes)<br>`components/documents/DocumentTemplatesPage.edit.test.tsx` (componentes) |
| CA-37.6 | Backend |
| CA-37.7 | `components/documents/DocumentTemplatesPage.delete.test.tsx` (componentes) |

## HU-38

| Criterio | Dónde se cubre |
| --- | --- |
| CA-38.1 | `components/cases/CaseDetailPage.documents.test.tsx` (componentes) |
| CA-38.2 | Backend |
| CA-38.3 | Backend |
| CA-38.4 | `components/cases/CaseDetailPage.documents.test.tsx` (componentes)<br>`unit/cases/caseDocument.test.ts` (unit) |
| CA-38.5 | `components/cases/CaseDetailPage.documents.test.tsx` (componentes) |
| CA-38.6 | `components/cases/CaseDetailPage.documents.test.tsx` (componentes) |
| CA-38.7 | `components/cases/CaseDetailPage.documents.test.tsx` (componentes)<br>`unit/app/actionAccess.test.ts` (unit)<br>`unit/cases/caseDocument.test.ts` (unit)<br>Backend |
| CA-38.8 | Backend |
| CA-38.9 | Backend |

## HU-39

| Criterio | Dónde se cubre |
| --- | --- |
| CA-39.1 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.test.tsx` (componentes) |
| CA-39.2 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-39.3 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-39.4 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-39.5 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes) |
| CA-39.7 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes) |
| CA-39.8 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-39.14 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes) |

## HU-40

| Criterio | Dónde se cubre |
| --- | --- |
| CA-40.1 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-40.2 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes)<br>`components/cases/RegisterCasePage.test.tsx` (componentes) |
| CA-40.3 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-40.4 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |
| CA-40.7 | `components/cases/CaseDetailPage.folder.test.tsx` (componentes) |
| CA-40.10 | `components/cases/RegisterCasePage.folder.test.tsx` (componentes) |

## HU-41

| Criterio | Dónde se cubre |
| --- | --- |
| CA-41.1 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.2 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.3 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.4 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.5 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.7 | `components/dashboard/HomePage.administrator.test.tsx` (componentes)<br>`components/dashboard/HomePage.lawyer.test.tsx` (componentes)<br>`components/dashboard/HomePage.roles.test.tsx` (componentes) |
| CA-41.8 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.10 | `unit/app/access.test.ts` (unit) |
| CA-41.12 | `components/dashboard/HomePage.lawyer.test.tsx` (componentes) |
| CA-41.13 | `components/app/AppLayout.test.tsx` (componentes)<br>`components/app/RedirectIfSession.test.tsx` (componentes)<br>`unit/app/access.test.ts` (unit) |

## HU-42

| Criterio | Dónde se cubre |
| --- | --- |
| CA-42.1 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.2 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.3 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.4 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.5 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.6 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.7 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |
| CA-42.9 | `unit/app/access.test.ts` (unit) |
| CA-42.10 | `components/dashboard/HomePage.administrator.test.tsx` (componentes) |

## HU-48

| Criterio | Dónde se cubre |
| --- | --- |
| CA-48.8 | `components/cases/RegisterCasePage.test.tsx` (componentes) |

---

237 criterios citados · 45 sólo del backend.
