IF COL_LENGTH('dbo.contratos_empresa', 'numero_contrato_empresa') IS NULL
BEGIN
  ALTER TABLE dbo.contratos_empresa ADD numero_contrato_empresa INT NULL;
END

IF COL_LENGTH('dbo.contratos_empresa', 'codigo_contrato_empresa') IS NULL
BEGIN
  ALTER TABLE dbo.contratos_empresa ADD codigo_contrato_empresa NVARCHAR(12) NULL;
END
GO

DECLARE @baseNumeroContratoEmpresa INT;
SELECT @baseNumeroContratoEmpresa = ISNULL(MAX(numero_contrato_empresa), 0)
FROM dbo.contratos_empresa
WHERE numero_contrato_empresa IS NOT NULL;

;WITH pendientes AS (
  SELECT id, @baseNumeroContratoEmpresa + ROW_NUMBER() OVER (ORDER BY id ASC) AS nuevo_numero
  FROM dbo.contratos_empresa
  WHERE numero_contrato_empresa IS NULL
)
UPDATE ce
SET numero_contrato_empresa = pendientes.nuevo_numero
FROM dbo.contratos_empresa ce
INNER JOIN pendientes ON pendientes.id = ce.id;

UPDATE dbo.contratos_empresa
SET codigo_contrato_empresa = CONCAT('CEMP', RIGHT(CONCAT('00000000', numero_contrato_empresa), 8))
WHERE codigo_contrato_empresa IS NULL
  AND numero_contrato_empresa IS NOT NULL;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_contratos_empresa_numero'
    AND object_id = OBJECT_ID('dbo.contratos_empresa')
)
BEGIN
  CREATE UNIQUE INDEX UX_contratos_empresa_numero
  ON dbo.contratos_empresa(numero_contrato_empresa)
  WHERE numero_contrato_empresa IS NOT NULL;
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_contratos_empresa_codigo'
    AND object_id = OBJECT_ID('dbo.contratos_empresa')
)
BEGIN
  CREATE UNIQUE INDEX UX_contratos_empresa_codigo
  ON dbo.contratos_empresa(codigo_contrato_empresa)
  WHERE codigo_contrato_empresa IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.contrato_empresa_codigo_reservas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contrato_empresa_codigo_reservas (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato_empresa_codigo_reservas PRIMARY KEY,
    numero_contrato_empresa INT NOT NULL,
    codigo_contrato_empresa NVARCHAR(12) NOT NULL,
    user_id INT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_codigo_reservas_created_at DEFAULT SYSUTCDATETIME()
  );
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_contrato_empresa_codigo_reservas_numero'
    AND object_id = OBJECT_ID('dbo.contrato_empresa_codigo_reservas')
)
BEGIN
  CREATE UNIQUE INDEX UX_contrato_empresa_codigo_reservas_numero
  ON dbo.contrato_empresa_codigo_reservas(numero_contrato_empresa);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_contrato_empresa_codigo_reservas_codigo'
    AND object_id = OBJECT_ID('dbo.contrato_empresa_codigo_reservas')
)
BEGIN
  CREATE UNIQUE INDEX UX_contrato_empresa_codigo_reservas_codigo
  ON dbo.contrato_empresa_codigo_reservas(codigo_contrato_empresa);
END
