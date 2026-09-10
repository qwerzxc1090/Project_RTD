param([int]$Port = 3001)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Output "Deployment port $Port is already listening; no duplicate server started."
    exit 0
}

$supervisor = Join-Path $PSScriptRoot 'server_supervisor.ps1'
$shellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
Start-Process -FilePath $shellPath -WorkingDirectory $projectRoot -WindowStyle Hidden `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $supervisor + '"'),
        '-Port', $Port, '-Production') | Out-Null

$deadline = (Get-Date).AddSeconds(15)
do {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/healthz" -TimeoutSec 2
        if ($health.ok) {
            Write-Output "Deployment game server ready: http://localhost:$Port/"
            exit 0
        }
    } catch {}
    Start-Sleep -Milliseconds 250
} while ((Get-Date) -lt $deadline)
throw 'Deployment server did not become ready. Check logs/server-lifecycle.log and the latest server log.'
