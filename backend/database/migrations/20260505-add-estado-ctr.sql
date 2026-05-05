USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.estado_ctr', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.estado_ctr (
    id_estado_ctr INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_estado_ctr PRIMARY KEY,
    estado_ctr NVARCHAR(120) NOT NULL CONSTRAINT UQ_estado_ctr_estado UNIQUE,
    fecha_creacion DATETIME2 NOT NULL CONSTRAINT DF_estado_ctr_fecha_creacion DEFAULT (SYSUTCDATETIME()),
    fecha_actualizacion DATETIME2 NOT NULL CONSTRAINT DF_estado_ctr_fecha_actualizacion DEFAULT (SYSUTCDATETIME()),
    usuario_creacion_id INT NULL
  );
END
GO

MERGE dbo.estado_ctr AS target
USING (VALUES
  (N'Activo'),
  (N'Borrador'),
  (N'Nulo'),
  (N'Cancelado')
) AS source (estado_ctr)
ON target.estado_ctr = source.estado_ctr
WHEN NOT MATCHED THEN INSERT (estado_ctr) VALUES (source.estado_ctr);
GO

IF COL_LENGTH('dbo.estado_ctr', 'fecha_creacion') IS NULL
BEGIN
  ALTER TABLE dbo.estado_ctr ADD fecha_creacion DATETIME2 NOT NULL CONSTRAINT DF_estado_ctr_fecha_creacion DEFAULT (SYSUTCDATETIME());
END
GO

IF COL_LENGTH('dbo.estado_ctr', 'fecha_actualizacion') IS NULL
BEGIN
  ALTER TABLE dbo.estado_ctr ADD fecha_actualizacion DATETIME2 NOT NULL CONSTRAINT DF_estado_ctr_fecha_actualizacion DEFAULT (SYSUTCDATETIME());
END
GO

IF COL_LENGTH('dbo.estado_ctr', 'usuario_creacion_id') IS NULL
BEGIN
  ALTER TABLE dbo.estado_ctr ADD usuario_creacion_id INT NULL;
END
GO

IF COL_LENGTH('dbo.contrato', 'id_estado_ctr') IS NULL
BEGIN
  ALTER TABLE dbo.contrato ADD id_estado_ctr INT NULL;
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = 'FK_contrato_estado_ctr'
    AND parent_object_id = OBJECT_ID('dbo.contrato')
)
BEGIN
  ALTER TABLE dbo.contrato WITH CHECK ADD CONSTRAINT FK_contrato_estado_ctr
    FOREIGN KEY (id_estado_ctr) REFERENCES dbo.estado_ctr(id_estado_ctr);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_estado_ctr' AND object_id = OBJECT_ID('dbo.contrato'))
BEGIN
  CREATE INDEX IX_contrato_estado_ctr ON dbo.contrato(id_estado_ctr);
END
GO

UPDATE c
SET id_estado_ctr = ec.id_estado_ctr
FROM dbo.contrato c
INNER JOIN dbo.estado_ctr ec
  ON UPPER(LTRIM(RTRIM(ec.estado_ctr))) = UPPER(LTRIM(RTRIM(c.estado)))
WHERE c.id_estado_ctr IS NULL
  AND c.estado IS NOT NULL;
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NOT NULL
BEGIN
  MERGE dbo.SystemModules AS target
  USING (VALUES
    (N'commercial.estados_ctr', N'Estados de contrato', N'Tablas maestras comerciales', N'/commercial/estados_ctr', 235)
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
END
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete)
  SELECT r.RoleId, N'commercial.estados_ctr', 1, 1, 1, 1
  FROM dbo.Roles r
  WHERE r.RoleName IN (N'Super Admin', N'Admin')
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolePermissions rp
      WHERE rp.RoleId = r.RoleId AND rp.ModuleKey = N'commercial.estados_ctr'
    );
END
GO
