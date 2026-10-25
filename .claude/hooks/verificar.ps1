# Verifica el trabajo de la IA al cerrar un turno, y deja un informe que
# dice tanto lo que verificó como LO QUE NO.
#
# Se dispara como hook Stop: cuando la IA quiere dar el turno por terminado.

# Si el backend no compila, devuelve exit 2 y la IA no puede cerrar: ve el
# error y tiene que arreglarlo. Eso es la diferencia entre una regla escrita
# en prosa (sugerencia) y un hook (garantía).
#
# Salida: .claude/audit/verificacion-<fecha>.md  (se va acumulando)

$ErrorActionPreference = 'Continue'

$proyecto = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($proyecto)) { exit 0 }

$raw = [Console]::In.ReadToEnd()
$ev = $null
if (-not [string]::IsNullOrWhiteSpace($raw)) {
    try { $ev = $raw | ConvertFrom-Json } catch { }
}

# Guarda anti-bucle: si este hook ya forzó una continuación, no insistas.
if ($ev -and $ev.stop_hook_active -eq $true) { exit 0 }

$dirAudit = Join-Path $proyecto '.claude\audit'
if (-not (Test-Path $dirAudit)) {
    New-Item -ItemType Directory -Force -Path $dirAudit | Out-Null
}
$informe = Join-Path $dirAudit ("verificacion-{0}.md" -f (Get-Date -Format 'yyyy-MM-dd'))

# ---------------------------------------------------------------------------
# 1. Qué cambió en el working tree respecto del último commit.
#    Este es el "diff contra qué": contra HEAD. Si commiteás antes de darle
#    una tarea a la IA, esta lista es exactamente lo que ella tocó.
# ---------------------------------------------------------------------------
Push-Location $proyecto
$cambios = @(& git diff --name-status HEAD 2>$null)
$sinSeguimiento = @(& git ls-files --others --exclude-standard 2>$null)
Pop-Location

$tocoBackendSrc = $false
foreach ($c in $cambios) { if ($c -match 'backend/src/') { $tocoBackendSrc = $true } }
foreach ($c in $sinSeguimiento) { if ($c -match 'backend/src/') { $tocoBackendSrc = $true } }

$lineas = New-Object System.Collections.Generic.List[string]
$lineas.Add("")
$lineas.Add("## Turno cerrado $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')")
$lineas.Add("")

if ($cambios.Count -eq 0 -and $sinSeguimiento.Count -eq 0) {
    $lineas.Add("Sin cambios en el working tree respecto de HEAD.")
    $lineas | Add-Content -Path $informe -Encoding utf8
    exit 0
}

$lineas.Add("### Cambios respecto de HEAD")
$lineas.Add("")
$lineas.Add('```')
foreach ($c in $cambios)        { $lineas.Add($c) }
foreach ($c in $sinSeguimiento) { $lineas.Add("?? $c") }
$lineas.Add('```')
$lineas.Add("")

# ---------------------------------------------------------------------------
# 2. Lo que SÍ se puede verificar automáticamente: que compile.
# ---------------------------------------------------------------------------
$fallo = $false
$testsCorridos = $false
$lineas.Add("### Verificado automáticamente")
$lineas.Add("")

if (-not $tocoBackendSrc) {
    $lineas.Add("- Compilación: **omitida**, no se tocó ``backend/src/``.")
} else {
    Push-Location (Join-Path $proyecto 'backend')
    $salidaTsc = & npx tsc --noEmit -p tsconfig.json 2>&1
    $codigoTsc = $LASTEXITCODE
    Pop-Location

    if ($codigoTsc -eq 0) {
        $lineas.Add("- Compilación (``tsc --noEmit``): **OK**")
    } else {
        $lineas.Add("- Compilación (``tsc --noEmit``): **FALLÓ**")
        $lineas.Add("")
        $lineas.Add('```')
        foreach ($l in $salidaTsc) { $lineas.Add([string]$l) }
        $lineas.Add('```')
        $fallo = $true
    }

    # Tests unitarios. Solo si compila: correrlos sobre código que no
    # compila da errores que no dicen nada.
    if (-not $fallo) {
        Push-Location (Join-Path $proyecto 'backend')
        $salidaTest = & npm test --silent 2>&1
        $codigoTest = $LASTEXITCODE
        Pop-Location
        $testsCorridos = $true

        if ($codigoTest -eq 0) {
            $resumen = ($salidaTest | Select-String -Pattern 'Tests:' | Select-Object -Last 1)
            if ($resumen) {
                $lineas.Add("- Tests unitarios (``npm test``): **OK** — $($resumen.ToString().Trim())")
            } else {
                $lineas.Add("- Tests unitarios (``npm test``): **OK**")
            }
        } else {
            $lineas.Add("- Tests unitarios (``npm test``): **FALLARON**")
            $lineas.Add("")
            $lineas.Add('```')
            foreach ($l in ($salidaTest | Select-Object -Last 60)) { $lineas.Add([string]$l) }
            $lineas.Add('```')
            $fallo = $true
        }
    }
}

# ---------------------------------------------------------------------------
# 3. Lo que NO se verificó. Esta es la parte importante del informe:
#    un informe de verificación que no declara sus puntos ciegos miente.
# ---------------------------------------------------------------------------
$lineas.Add("")
$lineas.Add("### NO verificado — revisar a mano")
$lineas.Add("")

$pendientes = New-Object System.Collections.Generic.List[string]

$todo = @($cambios) + @($sinSeguimiento)

$tocoUseCase = ($todo | Where-Object { $_ -match 'use-cases/.*\.use-case\.ts' }).Count -gt 0
$tocoUseCaseIdentity = ($todo | Where-Object { $_ -match 'subsystems/identity/.*use-cases/.*\.use-case\.ts' }).Count -gt 0
$tocoSpec    = ($todo | Where-Object { $_ -match '\.spec\.ts' }).Count -gt 0
$tocoHttp    = ($todo | Where-Object { $_ -match 'infrastructure/http/' }).Count -gt 0
$tocoPrisma  = ($todo | Where-Object { $_ -match 'persistence/prisma/' }).Count -gt 0
$tocoMemoria = ($todo | Where-Object { $_ -match 'persistence/in-memory/' }).Count -gt 0
$tocoSchema  = ($todo | Where-Object { $_ -match 'schema\.prisma' }).Count -gt 0

if ($tocoUseCase -and -not $tocoSpec) {
    $pendientes.Add("Se tocó un caso de uso y **ningún** ``.spec.ts``. Un caso de uso sin su spec al lado está incompleto.")
}
if ($tocoUseCaseIdentity) { 
    $pendientes.Add("**Auditoría**: ¿este caso de uso tiene que llamar a ``AuditTrailPort.record``? Ver ``.claude/rules/auditoria.md``. El login fallido también se audita.")
    $pendientes.Add("**Metadata de auditoría**: si se agregó un ``metadata``, ¿no lleva contraseñas, tokens ni datos del caso?")
}
if ($tocoHttp) {
    $pendientes.Add("**Contrato de API**: la forma de la respuesta y el status HTTP no se verificaron contra ``API_CONTRACT_V3.md``. Eso lo cubren los tests de integración: ``npm run test:int``.")
}
if ($tocoPrisma -and -not $tocoMemoria) {
    $pendientes.Add("Se tocó ``persistence/prisma/`` y no ``persistence/in-memory/``. Si cambió el puerto, falta la otra implementación.")
}
if ($tocoSchema) {
    $pendientes.Add("**Se tocó ``schema.prisma``**: hace falta migración. Revisala vos antes de correr ``prisma migrate dev``.")
}
if (-not $testsCorridos) {
    $pendientes.Add("Tests unitarios: **no se corrieron** en este hook. Correlos con ``npm test`` en ``backend/``.")
}
$pendientes.Add("Tests de integración: no se corrieron. ``npm run test:int`` (levanta PostgreSQL en contenedor, no toca tu base de desarrollo).")
$pendientes.Add("Nada de esto verifica que la solución tenga **sentido de negocio**. Eso lo revisás vos leyendo ``git diff HEAD``.")

foreach ($p in $pendientes) { $lineas.Add("- $p") }

$lineas.Add("")
$lineas.Add("---")

$lineas | Add-Content -Path $informe -Encoding utf8

# ---------------------------------------------------------------------------
# 4. Si no compila, exit 2: la IA ve el error y no puede cerrar el turno.
# ---------------------------------------------------------------------------
if ($fallo) {
    Write-Error "El backend no compila. No cierres el turno: arreglá los errores de tipos. Informe completo en .claude/audit/$(Split-Path $informe -Leaf)"
    exit 2
}

exit 0
