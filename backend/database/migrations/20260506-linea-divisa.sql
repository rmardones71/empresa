IF COL_LENGTH('dbo.linea', 'divisa') IS NULL
BEGIN
  ALTER TABLE dbo.linea
  ADD divisa NVARCHAR(12) NOT NULL
      CONSTRAINT DF_linea_divisa DEFAULT (N'Peso')
      WITH VALUES;
END
GO

UPDATE dbo.linea
SET divisa = N'Peso'
WHERE divisa IS NULL OR LTRIM(RTRIM(divisa)) = N'';
GO
