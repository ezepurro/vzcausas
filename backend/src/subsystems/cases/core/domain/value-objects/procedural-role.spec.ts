import { JurisdictionCode } from './jurisdiction-code';
import { isRoleAllowedIn, ProceduralRole } from './procedural-role';

const { CRIMINAL, ADMINISTRATIVE, AMPARO } = JurisdictionCode;

describe('isRoleAllowedIn (CA-18.3)', () => {
  // Rol procesal x fuero: true donde el rol corresponde al fuero.
  const matrix: [ProceduralRole, JurisdictionCode, boolean][] = [
    [ProceduralRole.DEFENSA, CRIMINAL, true],
    [ProceduralRole.DEFENSA, ADMINISTRATIVE, true],
    [ProceduralRole.DEFENSA, AMPARO, false],
    [ProceduralRole.QUERELLANTE_PARTICULAR, CRIMINAL, true],
    [ProceduralRole.QUERELLANTE_PARTICULAR, ADMINISTRATIVE, false],
    [ProceduralRole.QUERELLANTE_PARTICULAR, AMPARO, false],
    [ProceduralRole.RECURRENTE, CRIMINAL, false],
    [ProceduralRole.RECURRENTE, ADMINISTRATIVE, true],
    [ProceduralRole.RECURRENTE, AMPARO, false],
    [ProceduralRole.ACTORA, CRIMINAL, false],
    [ProceduralRole.ACTORA, ADMINISTRATIVE, false],
    [ProceduralRole.ACTORA, AMPARO, true],
    [ProceduralRole.DEMANDADA, CRIMINAL, false],
    [ProceduralRole.DEMANDADA, ADMINISTRATIVE, false],
    [ProceduralRole.DEMANDADA, AMPARO, true],
  ];

  it.each(matrix)('%s en el fuero %s: %s', (role, jurisdiction, allowed) => {
    expect(isRoleAllowedIn(role, jurisdiction)).toBe(allowed);
  });
});
