import { DetailList, Icon, Panel } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { DOCUMENT_TYPE_LABELS, formatClientName, formatDocumentNumber } from '@/features/clients'
import type { CaseClient } from '@/features/cases/types/case'

export interface ClientCardProps {
    client: CaseClient
}

/**
 * La tarjeta "Cliente" del detalle de la causa (HU22): quién es y cómo
 * contactarlo. Los datos vienen embebidos en la causa, así que no pide nada.
 *
 * El nombre y el documento se muestran igual que en el listado de clientes,
 * con las funciones que publica ese módulo. El rótulo es el tipo de documento.
 */
export function ClientCard({ client }: ClientCardProps) {
    return (
        <Panel title="Cliente">
            <div className="vz-panel__body">
                <div className="vz-person-name">
                    <Icon name="clients" size={15} /> {formatClientName(client)}
                </div>
                <DetailList
                    items={[
                        {
                            label: DOCUMENT_TYPE_LABELS[client.documentType],
                            value: formatDocumentNumber(client),
                            mono: true,
                        },
                        { label: 'Dirección', value: client.address },
                        { label: 'Teléfono', value: client.phone, mono: true },
                        { label: 'Correo', value: client.email },
                        { label: 'Cliente desde', value: formatDate(client.clientSince), mono: true },
                    ]}
                />
            </div>
        </Panel>
    )
}
