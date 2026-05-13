/*
  CRM OPORTUNIDADES - Auth/Security/User Management schema (SQL Server)
  Database: oportunidades (EXISTING)
*/

USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.RefreshTokens', 'U') IS NOT NULL DROP TABLE dbo.RefreshTokens;
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NOT NULL DROP TABLE dbo.AuditLogs;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

CREATE TABLE dbo.Roles (
  RoleId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
  RoleName NVARCHAR(50) NOT NULL CONSTRAINT UQ_Roles_RoleName UNIQUE,
  [Description] NVARCHAR(255) NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Roles_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.Users (
  UserId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
  Username NVARCHAR(50) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
  Email NVARCHAR(254) NOT NULL CONSTRAINT UQ_Users_Email UNIQUE,
  PasswordHash NVARCHAR(255) NOT NULL,
  FirstName NVARCHAR(100) NULL,
  LastName NVARCHAR(100) NULL,
  Phone NVARCHAR(30) NULL,
  RoleId INT NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
  TwoFactorEnabled BIT NOT NULL CONSTRAINT DF_Users_TwoFactorEnabled DEFAULT (0),
  TwoFactorCode NVARCHAR(10) NULL,
  TwoFactorExpires DATETIME2 NULL,
  TempPassword BIT NOT NULL CONSTRAINT DF_Users_TempPassword DEFAULT (0),
  PasswordResetToken NVARCHAR(255) NULL,
  PasswordResetExpires DATETIME2 NULL,
  FailedAttempts INT NOT NULL CONSTRAINT DF_Users_FailedAttempts DEFAULT (0),
  LockoutUntil DATETIME2 NULL,
  LastLogin DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId)
);
GO

CREATE TABLE dbo.AuditLogs (
  AuditId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY,
  UserId INT NULL,
  ActionType NVARCHAR(50) NOT NULL,
  [Description] NVARCHAR(1000) NULL,
  IPAddress NVARCHAR(64) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE TABLE dbo.RefreshTokens (
  RefreshTokenId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_RefreshTokens PRIMARY KEY,
  UserId INT NOT NULL,
  TokenHash NVARCHAR(255) NOT NULL,
  ExpiresAt DATETIME2 NOT NULL,
  RevokedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_Users_RoleId ON dbo.Users(RoleId);
CREATE INDEX IX_Users_IsActive ON dbo.Users(IsActive);
CREATE INDEX IX_AuditLogs_UserId ON dbo.AuditLogs(UserId);
CREATE INDEX IX_AuditLogs_ActionType ON dbo.AuditLogs(ActionType);
CREATE INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens(UserId);
CREATE INDEX IX_RefreshTokens_ExpiresAt ON dbo.RefreshTokens(ExpiresAt);
GO

CREATE OR ALTER TRIGGER dbo.trg_Roles_UpdatedAt
ON dbo.Roles
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE r SET UpdatedAt = SYSUTCDATETIME()
  FROM dbo.Roles r
  INNER JOIN inserted i ON i.RoleId = r.RoleId;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_Users_UpdatedAt
ON dbo.Users
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE u SET UpdatedAt = SYSUTCDATETIME()
  FROM dbo.Users u
  INNER JOIN inserted i ON i.UserId = u.UserId;
END
GO
