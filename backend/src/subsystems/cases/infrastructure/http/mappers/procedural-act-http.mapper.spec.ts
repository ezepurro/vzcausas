import { ConfigService } from '@nestjs/config';
import { ValidationError } from '@shared/domain/domain-error';
import { RegisterProceduralActResult } from '../../../core/application/common/register-procedural-act.interfaces';
import { ProceduralAct } from '../../../core/domain/entities/procedural-act';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { Deadline } from '../../../core/domain/value-objects/deadline';
import { anAct, anActor, day, LAWYER, OPPOSITION, NOW } from '../../../core/test-support/case-fixtures';
import { RegisterProceduralActRequestDto } from '../dtos/register-procedural-act.request.dto';
import { ProceduralActHttpMapper } from './procedural-act-http.mapper';

describe('ProceduralActHttpMapper', () => {
  const config = { getOrThrow: () => 'America/Argentina/Cordoba' } as unknown as ConfigService;
  const mapper = new ProceduralActHttpMapper(config);

  const WITHOUT_TERM = { timeLimitDays: 0, dayType: DayType.NONE, computedDueDate: null };

  function aResult(overrides: Partial<RegisterProceduralActResult> = {}, act: ProceduralAct = anAct()) {
    return { act, becameCurrent: true, resultingStateName: OPPOSITION.name, registeredBy: LAWYER, ...overrides };
  }

  function anActWithDeadline(deadline: Partial<Parameters<typeof Deadline.hydrate>[0]>, overrides = {}) {
    const base = anAct();
    return anAct({
      deadline: Deadline.hydrate({
        timeLimitDays: base.deadline.timeLimitDays,
        dayType: base.deadline.dayType,
        countsFrom: base.deadline.countsFrom,
        computedDueDate: base.deadline.computedDueDate,
        manualDueDate: base.deadline.manualDueDate,
        ...deadline,
      }),
      ...overrides,
    });
  }

  describe('del pedido al comando', () => {
    it('copia los campos del cuerpo, la causa de la ruta y el usuario que llama', () => {
      const dto: RegisterProceduralActRequestDto = {
        proceduralStateId: 12,
        actDate: day('2026-09-12'),
        notificationDate: day('2026-09-15'),
        manualDueDate: day('2026-09-25'),
        notes: 'Con acusación.',
      };
      const actor = anActor({ userId: 41 });

      const command = mapper.toCommand(8, dto, actor);

      expect(command).toEqual({
        caseId: 8,
        actor,
        proceduralStateId: 12,
        customState: undefined,
        actDate: day('2026-09-12'),
        notificationDate: day('2026-09-15'),
        manualDueDate: day('2026-09-25'),
        notes: 'Con acusación.',
      });
    });

    it('un estado escrito a mano viaja como tal', () => {
      const dto: RegisterProceduralActRequestDto = { customState: 'Pedido de informes', actDate: day('2026-09-15') };

      const command = mapper.toCommand(8, dto, anActor());

      expect(command.customState).toBe('Pedido de informes');
      expect(command.proceduralStateId).toBeUndefined();
    });
  });

  describe('del resultado a la respuesta', () => {
    it('arma el recurso con el estado de la tabla, las fechas sin hora y el plazo (CA-26.1)', () => {
      const response = mapper.toResponse(aResult());

      expect(response).toEqual({
        id: 1,
        caseId: 1,
        resultingState: { proceduralStateId: OPPOSITION.id, name: OPPOSITION.name, custom: false },
        actDate: '2026-09-30',
        notificationDate: null,
        notes: null,
        deadline: {
          timeLimitDays: 5,
          dayType: 'BUSINESS',
          countsFrom: '2026-09-30',
          computedDueDate: '2026-10-07',
          dueDate: '2026-10-07',
          manuallyAdjusted: false,
        },
        registeredBy: { id: 5, fullName: LAWYER.fullName },
        registeredAt: '2026-10-06T12:30:00-03:00',
      });
    });

    it('la hora del registro sale con el desplazamiento del estudio, no en UTC', () => {
      const response = mapper.toResponse(aResult());

      expect(response.registeredAt).toBe('2026-10-06T12:30:00-03:00');
      expect(NOW.toISOString()).toBe('2026-10-06T15:30:00.000Z');
    });

    it('un estado escrito a mano se informa sin id de la tabla y como custom (CA-26.7)', () => {
      const act = anActWithDeadline(WITHOUT_TERM, { proceduralStateId: null, customState: 'Pedido de informes' });

      const response = mapper.toResponse(aResult({ resultingStateName: 'Pedido de informes' }, act));

      expect(response.resultingState).toEqual({ proceduralStateId: null, name: 'Pedido de informes', custom: true });
    });

    it('el vencimiento ajustado a mano es el vigente y el calculado se conserva (CA-26.5)', () => {
      const act = anActWithDeadline({ manualDueDate: day('2026-10-20') });

      const response = mapper.toResponse(aResult({}, act));

      expect(response.deadline).toMatchObject({
        computedDueDate: '2026-10-07',
        dueDate: '2026-10-20',
        manuallyAdjusted: true,
      });
    });

    it('un estado escrito a mano con vencimiento manual informa un plazo de cero días', () => {
      const act = anActWithDeadline({ ...WITHOUT_TERM, manualDueDate: day('2026-10-20') }, { proceduralStateId: null, customState: 'X' });

      const response = mapper.toResponse(aResult({}, act));

      expect(response.deadline).toEqual({
        timeLimitDays: 0,
        dayType: 'NONE',
        countsFrom: '2026-09-30',
        computedDueDate: null,
        dueDate: '2026-10-20',
        manuallyAdjusted: true,
      });
    });

    it('un acto que no abre plazo y no tiene vencimiento manual no informa plazo (CA-26.12)', () => {
      const act = anActWithDeadline(WITHOUT_TERM);

      const response = mapper.toResponse(aResult({}, act));

      expect(response.deadline).toBeNull();
    });

    it('la fecha de notificación, si hay, sale como fecha sin hora (RN6)', () => {
      const act = anAct({ notificationDate: day('2026-10-02') });

      const response = mapper.toResponse(aResult({}, act));

      expect(response.notificationDate).toBe('2026-10-02');
    });

    it('el nombre de quien registró sale de la ficha del abogado y el id es el del usuario', () => {
      const act = anAct({ registeredByUserId: 41 });

      const response = mapper.toResponse(aResult({}, act));

      expect(response.registeredBy).toEqual({ id: 41, fullName: 'Dra. Malena Ríos' });
    });
  });

  describe('de la query de la previsualización al pedido', () => {
    const actor = anActor();

    it('lee el estado como entero y las fechas sin hora', () => {
      const query = mapper.toPreviewQuery(
        8,
        { proceduralStateId: '12', actDate: '2026-09-15', notificationDate: '2026-09-16' },
        actor,
      );

      expect(query).toEqual({
        caseId: 8,
        actor,
        proceduralStateId: 12,
        actDate: day('2026-09-15'),
        notificationDate: day('2026-09-16'),
      });
    });

    it('la notificación es opcional', () => {
      const query = mapper.toPreviewQuery(8, { proceduralStateId: '12', actDate: '2026-09-15' }, actor);

      expect(query.notificationDate).toBeNull();
    });

    function detailsOf(query: Parameters<ProceduralActHttpMapper['toPreviewQuery']>[1]) {
      try {
        mapper.toPreviewQuery(8, query, actor);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('INVALID_REQUEST');
        expect((error as ValidationError).message).toBe('Parámetros de query inválidos.');
        return (error as ValidationError).details;
      }
      throw new Error('Expected a ValidationError, but nothing was thrown.');
    }

    it('el estado y la fecha del acto son obligatorios', () => {
      expect(detailsOf({})).toEqual({ proceduralStateId: 'Es obligatorio.', actDate: 'Es obligatoria.' });
    });

    it.each(['abc', '1.5', '-3', '0', ''])('rechaza %j como identificador del estado', (proceduralStateId) => {
      expect(detailsOf({ proceduralStateId, actDate: '2026-09-15' })).toEqual({
        proceduralStateId: 'Debe ser un número entero válido.',
      });
    });

    it.each(['15/09/2026', '2026-9-15', '2026-02-30', '2026-13-01', 'hoy', ''])(
      'rechaza %j como fecha',
      (value) => {
        const expected = 'Debe ser una fecha válida (AAAA-MM-DD).';

        expect(detailsOf({ proceduralStateId: '12', actDate: value })).toEqual({ actDate: expected });
        expect(detailsOf({ proceduralStateId: '12', actDate: '2026-09-15', notificationDate: value })).toEqual({
          notificationDate: expected,
        });
      },
    );

    it('informa todos los parámetros inválidos juntos', () => {
      expect(detailsOf({ proceduralStateId: 'x', actDate: 'y', notificationDate: 'z' })).toEqual({
        proceduralStateId: 'Debe ser un número entero válido.',
        actDate: 'Debe ser una fecha válida (AAAA-MM-DD).',
        notificationDate: 'Debe ser una fecha válida (AAAA-MM-DD).',
      });
    });
  });

  describe('del resultado de la previsualización a la respuesta', () => {
    it('formatea las fechas sin hora y conserva los días que restan', () => {
      const response = mapper.toPreviewResponse({
        proceduralStateId: 12,
        timeLimitDays: 5,
        dayType: DayType.BUSINESS,
        countsFrom: day('2026-09-15'),
        dueDate: day('2026-09-22'),
        businessDaysRemaining: 5,
      });

      expect(response).toEqual({
        proceduralStateId: 12,
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-15',
        dueDate: '2026-09-22',
        businessDaysRemaining: 5,
      });
    });

    it('un estado que no abre plazo sale sin vencimiento ni días que restan', () => {
      const response = mapper.toPreviewResponse({
        proceduralStateId: 23,
        timeLimitDays: 0,
        dayType: DayType.NONE,
        countsFrom: day('2026-09-15'),
        dueDate: null,
        businessDaysRemaining: null,
      });

      expect(response.dueDate).toBeNull();
      expect(response.businessDaysRemaining).toBeNull();
    });
  });
});
