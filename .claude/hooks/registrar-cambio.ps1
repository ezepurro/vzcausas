# Registra en un archivo cada edición que hace la IA.
#
# Se dispara como hook PostToolUse sobre Edit|Write|NotebookEdit, o sea
# DESPUÉS de que el archivo ya se modificó. No bloquea nada: su único
# trabajo es dejar rastro para que vos puedas auditar después.
#
# Salida: .claude/audit/<fecha>.md
#
# Esto es el equivalente, para la IA, del AuditTrailPort del proyecto:
# registra QUE se tocó un archivo, no qué decía. El contenido ya lo tenés
# en git.

$ErrorActionPreference = 'Stop'

try {
    $raw = [Console]::In.ReadToEnd()
    if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }
    $ev = $raw | ConvertFrom-Json

    $proyecto = $env:CLAUDE_PROJECT_DIR
    if ([string]::IsNullOrWhiteSpace($proyecto)) { exit 0 }

    $dirAudit = Join-Path $proyecto '.claude\audit'
    if (-not (Test-Path $dirAudit)) {
        New-Item -ItemType Directory -Force -Path $dirAudit | Out-Null
    }

    $archivoSalida = Join-Path $dirAudit ("{0}.md" -f (Get-Date -Format 'yyyy-MM-dd'))

    if (-not (Test-Path $archivoSalida)) {
        @(
            "# Registro de cambios de la IA — $(Get-Date -Format 'dd/MM/yyyy')",
            "",
            "Generado por .claude/hooks/registrar-cambio.ps1. Una línea por edición.",
            "El contenido de cada cambio se ve con ``git diff``; esto es el índice.",
            "",
            "| Hora | Herramienta | Archivo | Sesión |",
            "|---|---|---|---|"
        ) | Set-Content -Path $archivoSalida -Encoding utf8
    }

    # La ruta del archivo tocado viene en tool_input, con nombre distinto
    # según la herramienta.
    $ruta = $ev.tool_input.file_path
    if ([string]::IsNullOrWhiteSpace($ruta)) { $ruta = $ev.tool_input.notebook_path }
    if ([string]::IsNullOrWhiteSpace($ruta)) { exit 0 }

    # Relativa al proyecto, para que la tabla se lea
    $rutaCorta = $ruta
    if ($ruta.StartsWith($proyecto, [StringComparison]::OrdinalIgnoreCase)) {
        $rutaCorta = $ruta.Substring($proyecto.Length).TrimStart('\', '/')
    }

    $sesion = if ($ev.session_id) { $ev.session_id.Substring(0, [Math]::Min(8, $ev.session_id.Length)) } else { '-' }

    $linea = "| {0} | {1} | ``{2}`` | {3} |" -f `
        (Get-Date -Format 'HH:mm:ss'), $ev.tool_name, $rutaCorta, $sesion

    Add-Content -Path $archivoSalida -Value $linea -Encoding utf8
}
catch {
    # Un hook de auditoría que rompe la sesión es peor que no tener hook.
    # Falla en silencio y seguí.
    exit 0
}

exit 0
