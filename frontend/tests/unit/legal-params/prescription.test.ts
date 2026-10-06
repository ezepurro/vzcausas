import { describe, expect, it } from 'vitest'
import {
    formatPrescription,
    MONTH_OPTIONS,
    shortQualificationName,
    splitPrescription,
    toPrescriptionMonths,
} from '@/features/legal-params/utils/prescription'

describe('formatPrescription', () => {
    it('redacta años y meses como los lee el estudio', () => {
        expect(formatPrescription(78)).toBe('6 años y 6 meses')
        expect(formatPrescription(24)).toBe('2 años')
        expect(formatPrescription(12)).toBe('1 año')
        expect(formatPrescription(8)).toBe('8 meses')
        expect(formatPrescription(1)).toBe('1 mes')
        expect(formatPrescription(13)).toBe('1 año y 1 mes')
    })
})

describe('toPrescriptionMonths', () => {
    it('suma los años y los meses del formulario', () => {
        expect(toPrescriptionMonths('6', '6')).toBe(78)
        expect(toPrescriptionMonths(' 2 ', '')).toBe(24)
    })

    it('si alguno no es un entero, null', () => {
        expect(toPrescriptionMonths('', '0')).toBeNull()
        expect(toPrescriptionMonths('6.5', '0')).toBeNull()
        expect(toPrescriptionMonths('6', 'x')).toBeNull()
    })
})

describe('splitPrescription', () => {
    it('vuelve de meses a años y meses', () => {
        expect(splitPrescription(78)).toEqual({ years: '6', months: '6' })
        expect(splitPrescription(8)).toEqual({ years: '0', months: '8' })
    })
})

describe('MONTH_OPTIONS', () => {
    it('ofrece de 0 a 11', () => {
        expect(MONTH_OPTIONS).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
    })
})

describe('shortQualificationName', () => {
    it('se queda con la parte de adelante del artículo', () => {
        expect(shortQualificationName('Hurto simple — art. 162 CP')).toBe('Hurto simple')
        expect(shortQualificationName('Sin artículo')).toBe('Sin artículo')
    })
})
