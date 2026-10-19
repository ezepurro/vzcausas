import type { CSSProperties } from 'react'
import type { Tool } from '@/features/tools/types/tool'

/** El color de marca entra como variable: la hoja de estilos decide dónde va. */
export function brandStyle(tool: Tool): CSSProperties | undefined {
    return tool.brand ? ({ '--vz-tool-brand': tool.brand } as CSSProperties) : undefined
}
