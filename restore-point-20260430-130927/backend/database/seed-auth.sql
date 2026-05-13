/*
  Seeds initial roles + initial admin user (bcrypt hash must be provided by backend seed script).
  Database: oportunidades (EXISTING)
*/

USE [oportunidades];
GO

SET NOCOUNT ON;
GO

MERGE dbo.Roles AS target
USING (VALUES
  (N'Super Admin', N'Acceso absoluto al sistema', 1),
  (N'Admin', N'Administración operativa', 1),
  (N'User', N'Usuario estándar', 1)
) AS source (RoleName, [Description], IsActive)
ON target.RoleName = source.RoleName
WHEN MATCHED THEN
  UPDATE SET
    target.[Description] = source.[Description],
    target.IsActive = source.IsActive
WHEN NOT MATCHED THEN
  INSERT (RoleName, [Description], IsActive)
  VALUES (source.RoleName, source.[Description], source.IsActive);
GO

/*
  Initial user: admin / 123456 / rmardones@ucmchile.com / Super Admin
  PasswordHash is intentionally left as a placeholder to be set by backend seed script (bcrypt).
*/

DECLARE @SuperAdminRoleId INT = (SELECT TOP 1 RoleId FROM dbo.Roles WHERE RoleName = N'Super Admin');

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username = N'admin')
BEGIN
  INSERT INTO dbo.Users (
    Username, Email, PasswordHash, FirstName, LastName, Phone, RoleId,
    IsActive, TwoFactorEnabled, TempPassword
  )
  VALUES (
    N'admin',
    N'rmardones@ucmchile.com',
    N'__BCRYPT_HASH_TO_SET__',
    NULL, NULL, NULL,
    @SuperAdminRoleId,
    1, 0, 1
  );
END
GO

