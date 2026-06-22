# scripts/kill-ports.ps1
# Mata cualquier proceso que esté ocupando los puertos del monorepo.
# Ejecutar desde PowerShell nativo (no Git Bash) si bun dev falla con EADDRINUSE.

$ports = @(3000, 3001, 3002)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $procIds = $connections | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique
        foreach ($procId in $procIds) {
            try {
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $procId -Force
                    Write-Host "[OK] Puerto $port liberado (PID $procId - $($proc.ProcessName))" -ForegroundColor Green
                }
            } catch {
                Write-Host "[X] No se pudo matar PID $procId en puerto $port" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[-] Puerto $port ya libre" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Listo. Ahora podes ejecutar: bun dev" -ForegroundColor Cyan
