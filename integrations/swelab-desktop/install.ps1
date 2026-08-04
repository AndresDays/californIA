param(
    [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$dataDir = Join-Path $env:ProgramData "CalifornIA\swelab-agent"
$configPath = Join-Path $dataDir "config.json"

if (-not (Test-Path -LiteralPath $InstallerPath)) {
    throw "No se encontró el instalador: $InstallerPath"
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
Start-Process -FilePath $InstallerPath -Wait

if (-not (Test-Path -LiteralPath $configPath)) {
    Copy-Item (Join-Path $PSScriptRoot "config.example.json") $configPath
}

Write-Host "Instalación lista. Edita $configPath con SWELAB_IMPORT_SECRET y abre CalifornIA Swelab una vez."
