$ErrorActionPreference = 'Stop'

param(
  [string]$Mode = 'test',
  [string]$OutputPath = 'C:\aplicativos\oportunidades\backend\scripts\system-sql-grant-output.txt'
)

function Write-Log {
  param([string]$Message)
  Add-Content -LiteralPath $OutputPath -Value $Message
}

New-Item -ItemType Directory -Force -Path ([System.IO.Path]::GetDirectoryName($OutputPath)) | Out-Null
Set-Content -LiteralPath $OutputPath -Value "Mode=$Mode`nStarted=$(Get-Date -Format o)"

$connectionStrings = @(
  'Data Source=np:\\.\pipe\sql\query;Initial Catalog=oportunidades;Integrated Security=True;Encrypt=False;TrustServerCertificate=True',
  'Data Source=.;Initial Catalog=oportunidades;Integrated Security=True;Encrypt=False;TrustServerCertificate=True',
  'Data Source=(local);Initial Catalog=oportunidades;Integrated Security=True;Encrypt=False;TrustServerCertificate=True',
  'Data Source=127.0.0.1,1433;Initial Catalog=oportunidades;Integrated Security=True;Encrypt=False;TrustServerCertificate=True'
)

$grantSql = @"
BEGIN TRY ALTER ROLE [db_denydatareader] DROP MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_denydatawriter] DROP MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_datareader] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_datawriter] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_ddladmin] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY GRANT EXECUTE TO [app_user]; END TRY BEGIN CATCH END CATCH;
SELECT
  SUSER_SNAME() AS login_name,
  USER_NAME() AS db_user,
  IS_SRVROLEMEMBER('sysadmin') AS is_sysadmin;
"@

Add-Type -AssemblyName System.Data

foreach ($connectionString in $connectionStrings) {
  Write-Log "Trying=$connectionString"
  $connection = $null
  try {
    $connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
    $connection.Open()
    $command = $connection.CreateCommand()
    if ($Mode -eq 'grant') {
      $command.CommandText = $grantSql
    } else {
      $command.CommandText = "SELECT SUSER_SNAME() AS login_name, USER_NAME() AS db_user, IS_SRVROLEMEMBER('sysadmin') AS is_sysadmin;"
    }

    $reader = $command.ExecuteReader()
    $table = New-Object System.Data.DataTable
    $table.Load($reader)
    Write-Log ($table | ConvertTo-Json -Compress)
    Write-Log 'SUCCESS'
    $connection.Close()
    exit 0
  } catch {
    Write-Log ("ERROR=" + $_.Exception.Message)
    if ($connection) {
      try { $connection.Close() } catch {}
    }
  }
}

Write-Log 'FAILED_ALL_CONNECTIONS'
exit 1
