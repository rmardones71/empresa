Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot

Push-Location (Join-Path $root 'template\backend')
npm install
Pop-Location

Push-Location (Join-Path $root 'template\Frontend')
npm install
npm run build
Pop-Location

Write-Host 'Build de plantilla completado.'
