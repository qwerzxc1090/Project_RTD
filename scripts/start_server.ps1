param([int]$Port = 3000)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Output "Port $Port is already listening; no duplicate server started."
    exit 0
}

# On-demand only: no scheduled task or login startup registration.
# The supervisor keeps logs and restarts Node after an unexpected exit.
$supervisor = Join-Path $PSScriptRoot 'server_supervisor.ps1'
$shellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
Start-Process -FilePath $shellPath -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $supervisor + '"'), '-Port', $Port) | Out-Null

$deadline = (Get-Date).AddSeconds(15)
do {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/healthz" -TimeoutSec 2
        if ($health.ok) {
            Write-Output "Game server ready: http://localhost:$Port/ (supervised, on-demand)"
            exit 0
        }
    } catch {}
    Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
throw 'Server did not become ready. Check logs/server-lifecycle.log and the latest server log.'
