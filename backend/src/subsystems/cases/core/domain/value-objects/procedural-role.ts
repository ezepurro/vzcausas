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
