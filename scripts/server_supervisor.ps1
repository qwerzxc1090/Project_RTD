param(
    [int]$Port = 3000,
    [int]$RestartDelaySeconds = 2,
    [int]$MaxLogSizeMB = 20,
    [switch]$Production
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectRoot 'logs'
$lifecycleLog = Join-Path $logDirectory 'server-lifecycle.log'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$mutexName = 'Local\ProjectRTDServerSupervisor-' + $Port
$mutex = New-Object System.Threading.Mutex($false, $mutexName)

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Rotate-LogIfNeeded([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $maxBytes = [Math]::Max(1, $MaxLogSizeMB) * 1MB
    if ((Get-Item -LiteralPath $Path).Length -lt $maxBytes) {
        return
    }

    $archivePath = $Path + '.previous'
    Move-Item -LiteralPath $Path -Destination $archivePath -Force
}

function Write-LifecycleLog([string]$Message) {
    Rotate-LogIfNeeded $lifecycleLog
    $line = '[' + (Get-Date).ToString('o') + '] ' + $Message
    Add-Content -LiteralPath $lifecycleLog -Value $line -Encoding utf8
}

if (-not $mutex.WaitOne(0, $false)) {
    Write-LifecycleLog "Supervisor already running. port=$Port duplicatePid=$PID; exiting."
    exit 0
}

try {
    $env:PORT = [string]$Port
    if ($Production) {
        $env:NODE_ENV = 'production'
        $env:ENABLE_DEV_API = '0'
        $env:ENABLE_DEV_TOOLS = '0'
    }
    $mode = if ($Production) { 'production' } else { 'development' }
    Write-LifecycleLog "Supervisor started. port=$Port mode=$mode node=$nodePath pid=$PID"

    while ($true) {
        $serverLog = Join-Path $logDirectory ('server-' + (Get-Date).ToString('yyyy-MM-dd') + '.log')
        Rotate-LogIfNeeded $serverLog
        $startedAt = Get-Date
        Write-LifecycleLog "Starting server. port=$Port"

        Push-Location $projectRoot
        try {
            & $nodePath server.js *>> $serverLog
            $exitCode = $LASTEXITCODE
        } catch {
            $exitCode = 1
            Add-Content -LiteralPath $serverLog -Value ('[' + (Get-Date).ToString('o') + '] Supervisor launch error: ' + $_.Exception) -Encoding utf8
        } finally {
            Pop-Location
        }

        $uptimeSeconds = [Math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
        Write-LifecycleLog "Server exited. code=$exitCode uptimeSeconds=$uptimeSeconds; restart in $RestartDelaySeconds second(s)."
        Start-Sleep -Seconds ([Math]::Max(1, $RestartDelaySeconds))
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
