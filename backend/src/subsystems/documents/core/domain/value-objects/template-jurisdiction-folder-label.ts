import { TemplateJurisdiction } from '../entities/document-template.entity';

/**
 * How a jurisdiction (fuero) is named in the cloud storage below "Modelos
 * formales": `Modelos formales/{fuero}`, where the template files live.
 *
 * It repeats the labels `cases` uses for `Causas/{abogado}/{fuero}`
 * (`JURISDICTION_FOLDER_LABEL`): `documents` cannot import from `cases`, so the
 * two maps are kept in step by hand. If a label changes, change both.
 */
export const TEMPLATE_JURISDICTION_FOLDER_LABEL: Readonly<Record<TemplateJurisdiction, string>> = {
  CRIMINAL: 'Penal',
  ADMINISTRATIVE: 'Administrativo',
  AMPARO: 'Amparo',
};
