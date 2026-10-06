import { describe, expect, it } from 'vitest'
import { dueDateDetail, dueDateTone } from '@/features/proceedings/utils/dueDateText'

describe('dueDateDetail', () => {
    // 22/09/2026 es martes.
    it('dice el día de la semana y cuánto falta', () => {
        expect(dueDateDetail('2026-09-22', 5)).toBe('martes · faltan 5 días hábiles')
        expect(dueDateDetail('2026-09-22', 1)).toBe('martes · faltan 1 día hábil')
    })

    it('hoy y ya vencido', () => {
        expect(dueDateDetail('2026-09-22', 0)).toBe('martes · es hoy')
        expect(dueDateDetail('2026-09-22', -2)).toBe('martes · hace 2 días hábiles')
    })

    it('sin días, sólo el día de la semana', () => {
        expect(dueDateDetail('2026-09-22', null)).toBe('martes')
    })

    it('con una fecha inválida, sólo los días', () => {
        expect(dueDateDetail('2026-02-31', 3)).toBe('faltan 3 días hábiles')
    })
})

describe('dueDateTone', () => {
    it('usa los mismos cortes que el listado', () => {
        expect(dueDateTone(null)).toBe('neutral')
        expect(dueDateTone(-1)).toBe('danger')
        expect(dueDateTone(0)).toBe('danger')
        expect(dueDateTone(5)).toBe('warn')
        expect(dueDateTone(6)).toBe('ok')
    })
})
