IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuditLogs (
    AuditId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
    UserId INT NULL,
    ActionType NVARCHAR(50) NOT NULL,
    [Description] NVARCHAR(1000) NULL,
    IPAddress NVARCHAR(64) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_AuditLogs_UserId'
    AND object_id = OBJECT_ID('dbo.AuditLogs')
)
BEGIN
  CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs(UserId);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_AuditLogs_ActionType'
    AND object_id = OBJECT_ID('dbo.AuditLogs')
)
BEGIN
  CREATE INDEX IX_AuditLogs_ActionType ON dbo.AuditLogs(ActionType);
END
