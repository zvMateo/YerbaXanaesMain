# scripts/kill-ports.ps1
# Mata cualquier proceso que esté ocupando los puertos del monorepo.
# Ejecutar desde PowerShell nativo (no Git Bash) si bun dev falla con EADDRINUSE.

$ports = @(3000, 3001, 3002)

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique
        foreach ($pid in $pids) {
            try {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) {
                    Stop-Process -Id $pid -Force
                    Write-Host "✓ Puerto $port liberado (PID $pid — $($proc.ProcessName))" -ForegroundColor Green
                }
            } catch {
                Write-Host "✗ No se pudo matar PID $pid en puerto $port" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "○ Puerto $port ya libre" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Listo. Ahora podés ejecutar: bun dev" -ForegroundColor Cyan
