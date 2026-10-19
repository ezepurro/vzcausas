import { useState } from 'react'
import type { Tool } from '@/features/tools/types/tool'

interface ToolSealProps {
    tool: Tool
}

/**
 * El sello cuadrado de una herramienta: su logo o, si no tiene o no carga,
 * las iniciales en el tono del grupo. Es decorativo: el nombre ya está al
 * lado, así que el lector de pantalla lo saltea.
 */
export function ToolSeal({ tool }: ToolSealProps) {
    const [broken, setBroken] = useState(false)
    const showLogo = tool.logo && !broken

    return (
        <span className={`vz-tool__seal ${showLogo ? 'vz-tool__seal--logo' : ''}`} aria-hidden="true">
            {showLogo
                ? <img src={tool.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
                : tool.monogram}
        </span>
    )
}
