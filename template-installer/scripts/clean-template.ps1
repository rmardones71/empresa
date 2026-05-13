Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$targets = @(
  (Join-Path $root 'template\backend\node_modules'),
  (Join-Path $root 'template\Frontend\node_modules'),
  (Join-Path $root 'template\Frontend\build')
)

foreach ($target in $targets) {
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

Write-Host 'Plantilla limpiada.'
