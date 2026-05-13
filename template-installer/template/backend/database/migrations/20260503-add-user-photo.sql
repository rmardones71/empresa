USE [oportunidades];
GO

IF COL_LENGTH('dbo.Users', 'PhotoDataUrl') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD PhotoDataUrl NVARCHAR(MAX) NULL;
END
GO
