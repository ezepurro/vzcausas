import { describe, expect, it } from 'vitest'
import {
    filterStateOptions,
    findStateByName,
    stateOptions,
    termText,
} from '@/features/proceedings/utils/stateOptions'
import { STATES } from './states'

describe('stateOptions', () => {
    it('ofrece sólo los vigentes y no terminales, en el orden del ciclo', () => {
        expect(stateOptions(STATES).map((o) => o.label)).toEqual([
            'Cédula de notificación',
            'Requerimiento de elevación a juicio',
            'Oposición al requerimiento',
            'Recurso de apelación',
        ])
    })

    it('cada opción lleva el id como texto y el plazo en el segundo renglón', () => {
        expect(stateOptions(STATES)[0]).toEqual({
            value: '2',
            label: 'Cédula de notificación',
            description: '3 días hábiles',
        })
    })
})

describe('filterStateOptions', () => {
    const options = stateOptions(STATES)

    it('con el campo vacío devuelve todas', () => {
        expect(filterStateOptions(options, '  ')).toHaveLength(4)
    })

    it('filtra sin distinguir mayúsculas ni tildes', () => {
        expect(filterStateOptions(options, 'CEDULA').map((o) => o.value)).toEqual(['2'])
        expect(filterStateOptions(options, 'requerimiento').map((o) => o.value)).toEqual(['3', '12'])
    })
})

describe('findStateByName', () => {
    const options = stateOptions(STATES)

    it('encuentra el estado cuyo nombre es exactamente lo escrito', () => {
        expect(findStateByName(options, '  oposicion al REQUERIMIENTO ')?.value).toBe('12')
    })

    it('no encuentra coincidencias parciales ni con el campo vacío', () => {
        expect(findStateByName(options, 'Oposición')).toBeNull()
        expect(findStateByName(options, '')).toBeNull()
    })

    it('no encuentra los terminales, que no se ofrecen', () => {
        expect(findStateByName(options, 'Archivada')).toBeNull()
    })
})

describe('termText', () => {
    it('redacta el plazo', () => {
        expect(termText({ timeLimitDays: 5, dayType: 'BUSINESS' })).toBe('5 días hábiles')
        expect(termText({ timeLimitDays: 1, dayType: 'CONSECUTIVE' })).toBe('1 día corridos')
        expect(termText({ timeLimitDays: 0, dayType: 'NONE' })).toBe('Sin plazo')
    })
})
