IF COL_LENGTH('dbo.contacto', 'rut_empresa') IS NOT NULL
BEGIN
  ALTER TABLE dbo.contacto ALTER COLUMN rut_empresa NVARCHAR(15) NULL;
END
GO
