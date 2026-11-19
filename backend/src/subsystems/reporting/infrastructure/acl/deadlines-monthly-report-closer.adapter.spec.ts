import { CloseMonthlyReport } from '../../core/application/use-cases/close-monthly-report.use-case';
import { DeadlinesMonthlyReportCloserAdapter } from './deadlines-monthly-report-closer.adapter';

/* HU43 · "Cerrar el mes": el adaptador solo traduce el puerto de `deadlines` al caso de uso de `reporting`. */
describe('DeadlinesMonthlyReportCloserAdapter', () => {
  it('devuelve los meses que fotografió el caso de uso, sin tocar nada más', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ taken: ['2026-10', '2026-11'] }) };
    const adapter = new DeadlinesMonthlyReportCloserAdapter(useCase as unknown as CloseMonthlyReport);

    await expect(adapter.closeFinishedMonths()).resolves.toEqual(['2026-10', '2026-11']);
    expect(useCase.execute).toHaveBeenCalledTimes(1);
  });

  it('con todos los meses ya fotografiados devuelve una lista vacía', async () => {
    const useCase = { execute: jest.fn().mockResolvedValue({ taken: [] }) };
    const adapter = new DeadlinesMonthlyReportCloserAdapter(useCase as unknown as CloseMonthlyReport);

    await expect(adapter.closeFinishedMonths()).resolves.toEqual([]);
  });

  it('si el caso de uso falla, el error se propaga: quien llama decide qué hacer (el proceso diario lo registra)', async () => {
    const useCase = { execute: jest.fn().mockRejectedValue(new Error('base caída')) };
    const adapter = new DeadlinesMonthlyReportCloserAdapter(useCase as unknown as CloseMonthlyReport);

    await expect(adapter.closeFinishedMonths()).rejects.toThrow('base caída');
  });
});
