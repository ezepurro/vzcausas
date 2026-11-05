/**
 * `true` si el error es la descarga fallida de un archivo de la app: un
 * `import()` de `pages.ts` que no llegó o la hoja de estilos que Vite precarga
 * con él. Cada navegador lo dice distinto, y no hay un tipo de error propio
 * para esto. Lo usa `RouteErrorPage`.
 */
export function isChunkLoadError(error: unknown): boolean {
    return (
        error instanceof Error &&
        /dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(error.message)
    )
}
