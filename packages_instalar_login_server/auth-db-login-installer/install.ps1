param(
  [string]$TargetPath = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Installer = Join-Path $ScriptDir "install.js"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js no esta instalado o no esta disponible en PATH."
  exit 1
}

if ($TargetPath) {
  node $Installer $TargetPath
} else {
  node $Installer
}
