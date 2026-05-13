USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'FK_contacto_empresa'
    AND parent_object_id = OBJECT_ID(N'dbo.contacto')
)
BEGIN
  ALTER TABLE dbo.contacto DROP CONSTRAINT FK_contacto_empresa;
END
GO

IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_contacto_rut_empresa'
    AND object_id = OBJECT_ID(N'dbo.contacto')
)
BEGIN
  DROP INDEX IX_contacto_rut_empresa ON dbo.contacto;
END
GO

IF COL_LENGTH(N'dbo.contacto', N'rut_empresa') IS NOT NULL
BEGIN
  ALTER TABLE dbo.contacto DROP COLUMN rut_empresa;
END
GO
