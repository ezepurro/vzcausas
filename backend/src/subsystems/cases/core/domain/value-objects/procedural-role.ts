import { JurisdictionCode } from './jurisdiction-code';

/**
 * Procedural role of the client in the case. Values match the
 * `procedural_role` enum in `schema.prisma`. Which roles belong to which
 * jurisdiction is a domain rule (not yet implemented):
 *   CRIMINAL:       DEFENSA, QUERELLANTE_PARTICULAR
 *   ADMINISTRATIVE: DEFENSA, RECURRENTE
 *   AMPARO:         ACTORA, DEMANDADA
 */
export enum ProceduralRole {
  DEFENSA = 'DEFENSA',
  QUERELLANTE_PARTICULAR = 'QUERELLANTE_PARTICULAR',
  RECURRENTE = 'RECURRENTE',
  ACTORA = 'ACTORA',
  DEMANDADA = 'DEMANDADA',
}

const JURISDICTIONS_BY_ROLE: Record<ProceduralRole, JurisdictionCode[]> = {
  [ProceduralRole.DEFENSA]: [JurisdictionCode.CRIMINAL, JurisdictionCode.ADMINISTRATIVE],
  [ProceduralRole.QUERELLANTE_PARTICULAR]: [JurisdictionCode.CRIMINAL],
  [ProceduralRole.RECURRENTE]: [JurisdictionCode.ADMINISTRATIVE],
  [ProceduralRole.ACTORA]: [JurisdictionCode.AMPARO],
  [ProceduralRole.DEMANDADA]: [JurisdictionCode.AMPARO],
};

/** `true` if the role can be held in a case of the given jurisdiction. */
export function isRoleAllowedIn(role: ProceduralRole, jurisdiction: JurisdictionCode): boolean {
  return JURISDICTIONS_BY_ROLE[role].includes(jurisdiction);
}
