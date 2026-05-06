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

MERGE dbo.SystemModules AS target
USING (VALUES
  (N'dashboard.main', N'Dashboard', N'General', N'/dashboard', 10),
  (N'commercial.empresas', N'Empresas', N'Gestion comercial', N'/commercial/empresas', 100),
  (N'commercial.contactos', N'Contactos', N'Gestion comercial', N'/commercial/contactos', 110),
  (N'commercial.contratos', N'Contratos', N'Gestion comercial', N'/commercial/contratos', 120),
  (N'commercial.lineas', N'Lineas de contrato', N'Gestion comercial', N'/commercial/lineas', 130),
  (N'commercial.casos', N'Casos', N'Gestion comercial', N'/commercial/casos', 140),
  (N'commercial.documentos', N'Documentos', N'Gestion comercial', N'/commercial/documentos', 150),
  (N'commercial.categorias', N'Categorias', N'Tablas maestras comerciales', N'/commercial/categorias', 200),
  (N'commercial.tipo_contactos', N'Tipos de contacto', N'Tablas maestras comerciales', N'/commercial/tipo_contactos', 210),
  (N'commercial.estado_contactos', N'Estados de contacto', N'Tablas maestras comerciales', N'/commercial/estado_contactos', 220),
  (N'commercial.estado_vitales', N'Estados vitales', N'Tablas maestras comerciales', N'/commercial/estado_vitales', 230),
  (N'commercial.estados_ctr', N'Estados de contrato', N'Tablas maestras comerciales', N'/commercial/estados_ctr', 235),
  (N'commercial.tipo_servicios', N'Tipos de servicio', N'Tablas maestras comerciales', N'/commercial/tipo_servicios', 240),
  (N'commercial.tipo_tarifas', N'Tipos de tarifa', N'Tablas maestras comerciales', N'/commercial/tipo_tarifas', 250),
  (N'commercial.frecuencias', N'Frecuencias de facturacion', N'Tablas maestras comerciales', N'/commercial/frecuencias', 260),
  (N'admin.users', N'Gestion de usuarios', N'Usuarios y seguridad', N'/admin/users', 300),
  (N'admin.roles', N'Roles y permisos', N'Usuarios y seguridad', N'/admin/roles', 310),
  (N'admin.audit', N'Auditoria', N'Usuarios y seguridad', N'/admin/audit', 320)
) AS source (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder)
ON target.ModuleKey = source.ModuleKey
WHEN MATCHED THEN
  UPDATE SET
    target.ModuleName = source.ModuleName,
    target.ModuleGroup = source.ModuleGroup,
    target.MenuPath = source.MenuPath,
    target.SortOrder = source.SortOrder,
    target.IsActive = 1,
    target.UpdatedAt = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
  INSERT (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder, IsActive)
  VALUES (source.ModuleKey, source.ModuleName, source.ModuleGroup, source.MenuPath, source.SortOrder, 1);
GO

INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete)
SELECT r.RoleId, m.ModuleKey, 1, 1, 1, 1
FROM dbo.Roles r
CROSS JOIN dbo.SystemModules m
WHERE r.RoleName IN (N'Super Admin', N'Admin')
  AND m.IsActive = 1
  AND NOT EXISTS (
    SELECT 1
    FROM dbo.RolePermissions rp
    WHERE rp.RoleId = r.RoleId AND rp.ModuleKey = m.ModuleKey
  );
GO
