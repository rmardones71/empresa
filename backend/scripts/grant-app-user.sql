USE [oportunidades];
GO

IF USER_ID(N'app_user') IS NULL
BEGIN
  RAISERROR(N'El usuario [app_user] no existe en la base [oportunidades].', 16, 1);
  RETURN;
END
GO

-- Quita DENY explicitos que bloquean a app_user aunque tenga GRANT/roles.
DECLARE @revokeSql NVARCHAR(MAX) = N'';

SELECT @revokeSql = @revokeSql +
  CASE dp.class_desc
    WHEN 'DATABASE' THEN
      N'REVOKE ' + dp.permission_name + N' TO [app_user];'
    WHEN 'SCHEMA' THEN
      N'REVOKE ' + dp.permission_name + N' ON SCHEMA::' + QUOTENAME(SCHEMA_NAME(dp.major_id)) + N' TO [app_user];'
    WHEN 'OBJECT_OR_COLUMN' THEN
      N'REVOKE ' + dp.permission_name + N' ON ' +
      QUOTENAME(OBJECT_SCHEMA_NAME(dp.major_id)) + N'.' + QUOTENAME(OBJECT_NAME(dp.major_id)) +
      N' TO [app_user];'
    ELSE N''
  END + CHAR(10)
FROM sys.database_permissions dp
INNER JOIN sys.database_principals pr
  ON pr.principal_id = dp.grantee_principal_id
WHERE pr.name = N'app_user'
  AND dp.state_desc = N'DENY';

IF LEN(@revokeSql) > 0
BEGIN
  PRINT N'Removiendo DENY explicitos de [app_user]...';
  EXEC sp_executesql @revokeSql;
END
GO

BEGIN TRY ALTER ROLE [db_denydatareader] DROP MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_denydatawriter] DROP MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
GO

BEGIN TRY ALTER ROLE [db_datareader] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_datawriter] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
BEGIN TRY ALTER ROLE [db_ddladmin] ADD MEMBER [app_user]; END TRY BEGIN CATCH END CATCH;
GO

GRANT EXECUTE TO [app_user];
GRANT VIEW DEFINITION TO [app_user];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[dbo] TO [app_user];
GRANT REFERENCES ON SCHEMA::[dbo] TO [app_user];
GO

PRINT N'Permisos aplicados a [app_user].';
GO

SELECT
  dp.name AS principal_name,
  rp.name AS role_name
FROM sys.database_role_members drm
INNER JOIN sys.database_principals rp
  ON rp.principal_id = drm.role_principal_id
INNER JOIN sys.database_principals dp
  ON dp.principal_id = drm.member_principal_id
WHERE dp.name = N'app_user'
ORDER BY rp.name;
GO
