import { useQuery } from '@tanstack/react-query'
import { getCaseDocuments } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Los documentos de la carpeta de la causa (HU38), para la tarjeta
 * "Documentación".
 *
 * - Sólo se piden con la carpeta creada: sin ella no hay nada que leer
 *   (CA-38.5), y la tarjeta lo dice sin preguntarle al servidor. Cuando la
 *   carpeta termina de crearse, el detalle se vuelve a pedir solo (`useCase`)
 *   y esta consulta sale en ese momento.
 * - `staleTime: 0`: la lista "se lee de ahí cada vez que abrís el detalle",
 *   como dice el prototipo (D-100).
 * - Sin reintentos: si Drive no responde (`502`), el mensaje del servidor pide
 *   volver a intentar "en unos minutos", y reintentar enseguida sólo demora
 *   el aviso.
 */
export function useCaseDocuments(caseId: number, folderCreated: boolean) {
    return useQuery({
        queryKey: casesKeys.documents(caseId),
        queryFn: () => getCaseDocuments(caseId),
        enabled: folderCreated,
        staleTime: 0,
        retry: false,
    })
}