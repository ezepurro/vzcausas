import { describe, expect, it } from 'vitest'
import { controlA11y, fieldIds } from '@/shared/components/forms'

/**
 * Lo que une un campo con su error y su nota (H-35 de
 * `docs/auditoria-front`), para los formularios que arman sus campos a mano.
 */
describe('fieldA11y', () => {
    it('los ids del error y de la nota salen del id del control', () => {
        expect(fieldIds('case-sac')).toEqual({ errorId: 'case-sac-error', noteId: 'case-sac-note' })
    })

    it('sin error, sin nota y opcional, el control no lleva nada', () => {
        expect(controlA11y('case-court', undefined)).toEqual({
            'aria-invalid': undefined,
            'aria-describedby': undefined,
            'aria-required': undefined,
        })
    })

    it('con error, el control es inválido y lo describe el mensaje, no la nota', () => {
        expect(controlA11y('case-sac', 'El SAC tiene 8 dígitos.', { note: true })).toMatchObject({
            'aria-invalid': true,
            'aria-describedby': 'case-sac-error',
        })
    })

    it('sin error, lo describe la nota si la hay', () => {
        expect(controlA11y('case-sac', undefined, { note: true })['aria-describedby']).toBe('case-sac-note')
        expect(controlA11y('case-sac', '', { note: true })['aria-describedby']).toBe('case-sac-note')
    })

    it('lo obligatorio lo anuncia el control', () => {
        expect(controlA11y('case-caption', undefined, { required: true })['aria-required']).toBe(true)
    })
})
