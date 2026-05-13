USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SystemModules (
    ModuleKey NVARCHAR(80) NOT NULL CONSTRAINT PK_SystemModules PRIMARY KEY,
    ModuleName NVARCHAR(120) NOT NULL,
    ModuleGroup NVARCHAR(80) NOT NULL,
    MenuPath NVARCHAR(200) NULL,
    SortOrder INT NOT NULL CONSTRAINT DF_SystemModules_SortOrder DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_SystemModules_IsActive DEFAULT (1),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SystemModules_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SystemModules_UpdatedAt DEFAULT (SYSUTCDATETIME())
  );
END
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.RolePermissions (
    RoleId INT NOT NULL,
    ModuleKey NVARCHAR(80) NOT NULL,
    CanCreate BIT NOT NULL CONSTRAINT DF_RolePermissions_CanCreate DEFAULT (0),
    CanRead BIT NOT NULL CONSTRAINT DF_RolePermissions_CanRead DEFAULT (0),
    CanWrite BIT NOT NULL CONSTRAINT DF_RolePermissions_CanWrite DEFAULT (0),
    CanDelete BIT NOT NULL CONSTRAINT DF_RolePermissions_CanDelete DEFAULT (0),
    UpdatedBy INT NULL,
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_RolePermissions_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId, ModuleKey),
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId),
    CONSTRAINT FK_RolePermissions_SystemModules FOREIGN KEY (ModuleKey) REFERENCES dbo.SystemModules(ModuleKey),
    CONSTRAINT FK_RolePermissions_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
  );
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_RolePermissions_UpdatedBy'
    AND parent_object_id = OBJECT_ID('dbo.RolePermissions')
    AND delete_referential_action_desc <> 'SET_NULL'
)
BEGIN
  ALTER TABLE dbo.RolePermissions DROP CONSTRAINT FK_RolePermissions_UpdatedBy;
  ALTER TABLE dbo.RolePermissions
    ADD CONSTRAINT FK_RolePermissions_UpdatedBy
    FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SystemModules_Group' AND object_id = OBJECT_ID('dbo.SystemModules'))
BEGIN
  CREATE INDEX IX_SystemModules_Group ON dbo.SystemModules(ModuleGroup, SortOrder);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_RolePermissions_ModuleKey' AND object_id = OBJECT_ID('dbo.RolePermissions'))
BEGIN
  CREATE INDEX IX_RolePermissions_ModuleKey ON dbo.RolePermissions(ModuleKey);
END
GO

MERGE dbo.SystemModules AS target
USING (VALUES
  (N'dashboard.main', N'Dashboard', N'General', N'/dashboard', 10),
  (N'commercial.empresas', N'Empresas', N'Gestion comercial', N'/commercial/empresas', 100),
  (N'commercial.contactos', N'Contactos', N'Gestion comercial', N'/commercial/contactos', 110),
  (N'commercial.contratos', N'Contratos', N'Gestion comercial', N'/commercial/contratos', 120),
  (N'commercial.contratos_empresa', N'Contrato Empresa', N'Gestion comercial', N'/commercial/contratos-empresa', 125),
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
