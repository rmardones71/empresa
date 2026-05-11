USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('dbo.linea', 'contrato_empresa_id') IS NULL
  ALTER TABLE dbo.linea ADD contrato_empresa_id INT NULL;
GO

IF COL_LENGTH('dbo.caso', 'contrato_empresa_id') IS NULL
  ALTER TABLE dbo.caso ADD contrato_empresa_id INT NULL;
GO

IF COL_LENGTH('dbo.documentos', 'contrato_empresa_id') IS NULL
  ALTER TABLE dbo.documentos ADD contrato_empresa_id INT NULL;
GO

IF COL_LENGTH('dbo.contratos_empresa', 'id_contrato') IS NOT NULL
BEGIN
  EXEC(N'
    UPDATE l
    SET contrato_empresa_id = ce.id
    FROM dbo.linea l
    INNER JOIN dbo.contratos_empresa ce ON ce.id_contrato = l.id_contrato
    WHERE l.contrato_empresa_id IS NULL;
  ');
END
GO

IF COL_LENGTH('dbo.contratos_empresa', 'id_contrato') IS NOT NULL
BEGIN
  EXEC(N'
    UPDATE c
    SET contrato_empresa_id = ce.id
    FROM dbo.caso c
    INNER JOIN dbo.contratos_empresa ce ON ce.id_contrato = c.id_contrato
    WHERE c.contrato_empresa_id IS NULL;
  ');
END
GO

IF COL_LENGTH('dbo.contratos_empresa', 'id_contrato') IS NOT NULL
BEGIN
  EXEC(N'
    UPDATE d
    SET contrato_empresa_id = ce.id
    FROM dbo.documentos d
    INNER JOIN dbo.contratos_empresa ce ON ce.id_contrato = d.id_contrato
    WHERE d.contrato_empresa_id IS NULL;
  ');
END
GO

IF COL_LENGTH('dbo.linea', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.linea ALTER COLUMN id_contrato INT NULL;
GO

IF COL_LENGTH('dbo.caso', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.caso ALTER COLUMN id_contrato INT NULL;
GO

IF COL_LENGTH('dbo.documentos', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.documentos ALTER COLUMN id_contrato INT NULL;
GO

IF EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_contratos_empresa_contrato'
    AND parent_object_id = OBJECT_ID('dbo.contratos_empresa')
)
BEGIN
  ALTER TABLE dbo.contratos_empresa DROP CONSTRAINT FK_contratos_empresa_contrato;
END
GO

IF COL_LENGTH('dbo.contratos_empresa', 'id_contrato') IS NOT NULL
  ALTER TABLE dbo.contratos_empresa DROP COLUMN id_contrato;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_linea_contratos_empresa'
    AND parent_object_id = OBJECT_ID('dbo.linea')
)
BEGIN
  ALTER TABLE dbo.linea WITH CHECK ADD CONSTRAINT FK_linea_contratos_empresa
    FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_caso_contratos_empresa'
    AND parent_object_id = OBJECT_ID('dbo.caso')
)
BEGIN
  ALTER TABLE dbo.caso WITH CHECK ADD CONSTRAINT FK_caso_contratos_empresa
    FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys
  WHERE name = 'FK_documentos_contratos_empresa'
    AND parent_object_id = OBJECT_ID('dbo.documentos')
)
BEGIN
  ALTER TABLE dbo.documentos WITH CHECK ADD CONSTRAINT FK_documentos_contratos_empresa
    FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id);
END
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NOT NULL
BEGIN
  UPDATE dbo.SystemModules
  SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
  WHERE ModuleKey = N'commercial.contratos';
END
GO
