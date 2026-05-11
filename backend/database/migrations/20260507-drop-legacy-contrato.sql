USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.contrato', 'U') IS NOT NULL
BEGIN
  DECLARE @sql NVARCHAR(MAX) = N'';

  SELECT @sql = @sql + N'ALTER TABLE '
    + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.'
    + QUOTENAME(OBJECT_NAME(parent_object_id))
    + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
  FROM sys.foreign_keys
  WHERE referenced_object_id = OBJECT_ID('dbo.contrato')
     OR parent_object_id = OBJECT_ID('dbo.contrato');

  IF @sql <> N''
    EXEC sp_executesql @sql;
END
GO

DECLARE @dropLegacyIndexesSql NVARCHAR(MAX) = N'';

SELECT @dropLegacyIndexesSql = @dropLegacyIndexesSql + N'DROP INDEX '
  + QUOTENAME(i.name) + N' ON '
  + QUOTENAME(OBJECT_SCHEMA_NAME(i.object_id)) + N'.'
  + QUOTENAME(OBJECT_NAME(i.object_id)) + N';' + CHAR(13)
FROM sys.indexes i
INNER JOIN sys.index_columns ic
  ON ic.object_id = i.object_id
 AND ic.index_id = i.index_id
INNER JOIN sys.columns c
  ON c.object_id = ic.object_id
 AND c.column_id = ic.column_id
WHERE c.name = N'id_contrato'
  AND i.is_primary_key = 0
  AND i.is_unique_constraint = 0
  AND i.name IS NOT NULL
  AND i.object_id IN (OBJECT_ID('dbo.linea'), OBJECT_ID('dbo.caso'), OBJECT_ID('dbo.documentos'));

IF @dropLegacyIndexesSql <> N''
  EXEC sp_executesql @dropLegacyIndexesSql;
GO

IF COL_LENGTH('dbo.linea', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.linea DROP COLUMN id_contrato;
GO

IF COL_LENGTH('dbo.caso', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.caso DROP COLUMN id_contrato;
GO

IF COL_LENGTH('dbo.documentos', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.documentos DROP COLUMN id_contrato;
GO

IF OBJECT_ID('dbo.contrato', 'U') IS NOT NULL
  DROP TABLE dbo.contrato;
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NOT NULL
BEGIN
  UPDATE dbo.SystemModules
  SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
  WHERE ModuleKey = N'commercial.contratos';
END
GO
