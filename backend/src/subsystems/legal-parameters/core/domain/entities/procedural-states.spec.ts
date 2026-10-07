import { ValidationError } from '@shared/domain/domain-error';
import { ProceduralStateAlreadyExistsError, ProceduralStateDayTypeError } from '../errors/procedural-state.errors';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { DayType } from './day-types';
import { Jurisdiction } from './jurisdiction';
import { ProceduralState, ProceduralStateProps } from './procedural-states';

function aJurisdiction(code: JurisdictionCode = JurisdictionCode.CRIMINAL): Jurisdiction {
  return Jurisdiction.hydrate({ id: 1, code, dayTypeDefault: DayType.BUSINESS, isActive: true });
}

const validProps: ProceduralStateProps = {
  id: 1,
  name: 'Oposición al requerimiento de elevación',
  timeLimitDays: 5,
  dayType: DayType.BUSINESS,
  terminal: false,
  isInitial: false,
  isActive: true,
  jurisdiction: aJurisdiction(),
  createdAt: null,
};

const aState = (overrides: Partial<ProceduralStateProps> = {}) =>
  ProceduralState.create({ ...validProps, ...overrides });

const REQUIRED_MESSAGE = 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.';
const MUST_BE_NONE_MESSAGE = 'Debe ser NONE cuando el plazo es 0.';

describe('ProceduralState', () => {
  describe('create', () => {
    it('builds a state that opens a time limit', () => {
      const state = aState();

      expect(state.timeLimitDays).toBe(5);
      expect(state.dayType).toBe(DayType.BUSINESS);
      expect(state.isActive).toBe(true);
    });

    it('builds a state without a time limit (0 days, NONE)', () => {
      const state = aState({ timeLimitDays: 0, dayType: DayType.NONE });

      expect(state.timeLimitDays).toBe(0);
      expect(state.dayType).toBe(DayType.NONE);
    });

    it('stores the name trimmed', () => {
      expect(aState({ name: '  Archivada  ' }).name).toBe('Archivada');
    });

    it('does not keep a reference to the caller props', () => {
      const props = { ...validProps };
      const state = ProceduralState.create(props);

      props.name = 'Otro nombre';

      expect(state.name).toBe(validProps.name);
    });

    it.each([0, -1, 1.5])('rejects a non-positive or non-integer id (%p)', (id) => {
      expect(() => aState({ id })).toThrow(ValidationError);
    });

    it.each(['', '   '])('rejects a blank name (%p)', (name) => {
      expect(() => aState({ name })).toThrow(ValidationError);
    });

    it.each(['Iniciada', '  iniciada ', 'INICIADA'])('rejects the reserved name %p', (name) => {
      expect(() => aState({ name })).toThrow(ProceduralStateAlreadyExistsError);
    });

    it.each([-1, 2.5])('rejects timeLimitDays %p', (timeLimitDays) => {
      expect(() => aState({ timeLimitDays })).toThrow(
        expect.objectContaining({ details: { timeLimitDays: expect.any(String) } }),
      );
    });

    it('rejects a time limit with day type NONE', () => {
      expect(() => aState({ timeLimitDays: 5, dayType: DayType.NONE })).toThrow(
        expect.objectContaining({ details: { dayType: REQUIRED_MESSAGE } }),
      );
    });

    it('treats a null day type as NONE', () => {
      expect(() => aState({ timeLimitDays: 5, dayType: null })).toThrow(ProceduralStateDayTypeError);
      expect(() => aState({ timeLimitDays: 0, dayType: null })).not.toThrow();
    });

    it.each([DayType.BUSINESS, DayType.CONSECUTIVE])('rejects 0 days with day type %s', (dayType) => {
      expect(() => aState({ timeLimitDays: 0, dayType })).toThrow(
        expect.objectContaining({ details: { dayType: MUST_BE_NONE_MESSAGE } }),
      );
    });
  });

  describe('rename', () => {
    it('changes the name, trimmed', () => {
      const state = aState();

      state.rename('  Archivada  ');

      expect(state.name).toBe('Archivada');
    });

    it('rejects "Iniciada" and keeps the previous name', () => {
      const state = aState();

      expect(() => state.rename('iniciada')).toThrow(ProceduralStateAlreadyExistsError);
      expect(state.name).toBe(validProps.name);
    });

    it('rejects a blank name and keeps the previous name', () => {
      const state = aState();

      expect(() => state.rename('   ')).toThrow(ValidationError);
      expect(state.name).toBe(validProps.name);
    });
  });

  describe('changeTimeLimit', () => {
    it('changes both values together', () => {
      const state = aState();

      state.changeTimeLimit(0, DayType.NONE);

      expect(state.timeLimitDays).toBe(0);
      expect(state.dayType).toBe(DayType.NONE);
    });

    it('rejects an incoherent pair and keeps the previous values', () => {
      const state = aState();

      expect(() => state.changeTimeLimit(10, DayType.NONE)).toThrow(ProceduralStateDayTypeError);
      expect(state.timeLimitDays).toBe(5);
      expect(state.dayType).toBe(DayType.BUSINESS);
    });
  });

  describe('changeTerminal', () => {
    it('marks and unmarks the state as terminal', () => {
      const state = aState();

      state.changeTerminal(true);
      expect(state.terminal).toBe(true);

      state.changeTerminal(false);
      expect(state.terminal).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('flips the state to inactive', () => {
      const state = aState();

      state.deactivate();

      expect(state.isActive).toBe(false);
    });
  });
});
