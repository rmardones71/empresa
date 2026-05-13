USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NOT NULL
BEGIN
  MERGE dbo.SystemModules AS target
  USING (
    SELECT
      N'commercial.contratos_empresa' AS ModuleKey,
      N'Contratos Empresa' AS ModuleName,
      N'Gestion comercial' AS ModuleGroup,
      N'/commercial/contratos-empresa' AS MenuPath,
      125 AS SortOrder
  ) AS source
  ON target.ModuleKey = source.ModuleKey
  WHEN MATCHED THEN
    UPDATE SET
      ModuleName = source.ModuleName,
      ModuleGroup = source.ModuleGroup,
      MenuPath = source.MenuPath,
      SortOrder = source.SortOrder,
      IsActive = 1,
      UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder, IsActive)
    VALUES (source.ModuleKey, source.ModuleName, source.ModuleGroup, source.MenuPath, source.SortOrder, 1);
END
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete)
  SELECT r.RoleId, N'commercial.contratos_empresa', 1, 1, 1, 1
  FROM dbo.Roles r
  WHERE r.RoleName IN (N'Super Admin', N'Admin')
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolePermissions rp
      WHERE rp.RoleId = r.RoleId AND rp.ModuleKey = N'commercial.contratos_empresa'
    );
END
GO
