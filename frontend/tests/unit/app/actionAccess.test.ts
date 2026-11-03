import { describe, expect, it } from 'vitest'
import { can } from '@/app/access/access'

/**
 * Los permisos por acción: lo que `ROUTE_ACCESS` no puede expresar, porque la
 * pantalla la ven todos y sólo un perfil puede operarla. Salen de la tabla de
 * permisos por perfil del contrato (V3 §4).
 */
describe('can', () => {
    /* Registrar, modificar y dar de baja abogados es sólo del Administrador;
       consultarlos, de los tres perfiles (V3 §4, matriz del 11/10/2026). */
    it('registrar un abogado es sólo del Administrador', () => {
        expect(can(['ADMINISTRATOR'], 'lawyers.create')).toBe(true)
        expect(can(['SECRETARY'], 'lawyers.create')).toBe(false)
        expect(can(['LAWYER'], 'lawyers.create')).toBe(false)
    })

    /* Modificar un abogado es sólo del Administrador (CA-14.6). */
    it('modificar un abogado es sólo del Administrador', () => {
        expect(can(['ADMINISTRATOR'], 'lawyers.update')).toBe(true)
        expect(can(['SECRETARY'], 'lawyers.update')).toBe(false)
        expect(can(['LAWYER'], 'lawyers.update')).toBe(false)
    })

    /* Marcar prescripta una causa penal es del Administrador y de cualquier
       abogado, aunque no sea el responsable; la Secretaría no (CA-33.1,
       CA-33.2, V4 §4). */
    it('marcar una causa como prescripta es del Administrador y del Abogado', () => {
        expect(can(['ADMINISTRATOR'], 'cases.declarePrescription')).toBe(true)
        expect(can(['LAWYER'], 'cases.declarePrescription')).toBe(true)
        expect(can(['SECRETARY'], 'cases.declarePrescription')).toBe(false)
    })

    /* Descargar un documento de la causa que no es un expediente es del
       Abogado y de la Secretaría: el Administrador no tiene acceso a la
       carpeta en Drive (CA-38.7, V5 §3.12, D-103, D-83). El expediente lo
       descarga cualquiera, y eso no es un permiso por rol. */
    it('descargar un documento de la causa es del Abogado y de la Secretaría', () => {
        expect(can(['LAWYER'], 'cases.downloadDocument')).toBe(true)
        expect(can(['SECRETARY'], 'cases.downloadDocument')).toBe(true)
        expect(can(['ADMINISTRATOR'], 'cases.downloadDocument')).toBe(false)
        expect(can(['ADMINISTRATOR', 'LAWYER'], 'cases.downloadDocument')).toBe(true)
    })
})
