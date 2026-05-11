IF COL_LENGTH('dbo.empresa', 'ciudad') IS NULL
BEGIN
  ALTER TABLE dbo.empresa ADD ciudad NVARCHAR(120) NULL;
END
GO
