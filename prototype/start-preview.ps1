$ErrorActionPreference = 'Stop'

$listener = Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/' -UseBasicParsing -TimeoutSec 5
    if ($response.Content -match '<title>VoxArcade') {
        return
    }
    throw 'Port 4173 is occupied by another application.'
}

$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $nodePath
$startInfo.Arguments = '"' + (Join-Path $PSScriptRoot 'serve.mjs') + '"'
$startInfo.WorkingDirectory = $PSScriptRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.EnvironmentVariables['PORT'] = '4173'
$previewProcess = [System.Diagnostics.Process]::Start($startInfo)
$previewProcess.Dispose()
