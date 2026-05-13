IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.RefreshTokens (
    RefreshTokenId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
    UserId INT NOT NULL,
    TokenHash NVARCHAR(255) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    RevokedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
  );
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_RefreshTokens_UserId'
    AND object_id = OBJECT_ID('dbo.RefreshTokens')
)
BEGIN
  CREATE INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens(UserId);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_RefreshTokens_ExpiresAt'
    AND object_id = OBJECT_ID('dbo.RefreshTokens')
)
BEGIN
  CREATE INDEX IX_RefreshTokens_ExpiresAt ON dbo.RefreshTokens(ExpiresAt);
END
