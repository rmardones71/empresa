/*
  CRM OPORTUNIDADES - Opportunities / Pipeline module schema (SQL Server)
  Database: oportunidades (EXISTING)
*/

USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.OpportunityAttachments', 'U') IS NOT NULL DROP TABLE dbo.OpportunityAttachments;
IF OBJECT_ID('dbo.OpportunityNotes', 'U') IS NOT NULL DROP TABLE dbo.OpportunityNotes;
IF OBJECT_ID('dbo.OpportunityActivities', 'U') IS NOT NULL DROP TABLE dbo.OpportunityActivities;
IF OBJECT_ID('dbo.Opportunities', 'U') IS NOT NULL DROP TABLE dbo.Opportunities;
IF OBJECT_ID('dbo.OpportunityStages', 'U') IS NOT NULL DROP TABLE dbo.OpportunityStages;
IF OBJECT_ID('dbo.OpportunityLossReasons', 'U') IS NOT NULL DROP TABLE dbo.OpportunityLossReasons;
IF OBJECT_ID('dbo.LeadSources', 'U') IS NOT NULL DROP TABLE dbo.LeadSources;
GO

CREATE TABLE dbo.OpportunityStages (
  StageId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpportunityStages PRIMARY KEY,
  StageName NVARCHAR(80) NOT NULL CONSTRAINT UQ_OpportunityStages_StageName UNIQUE,
  StageOrder INT NOT NULL CONSTRAINT UQ_OpportunityStages_StageOrder UNIQUE,
  ColorHex NVARCHAR(10) NULL,
  IsClosedWon BIT NOT NULL CONSTRAINT DF_OpportunityStages_IsClosedWon DEFAULT (0),
  IsClosedLost BIT NOT NULL CONSTRAINT DF_OpportunityStages_IsClosedLost DEFAULT (0),
  IsActive BIT NOT NULL CONSTRAINT DF_OpportunityStages_IsActive DEFAULT (1),
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityStages_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityStages_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.LeadSources (
  LeadSourceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LeadSources PRIMARY KEY,
  LeadSourceName NVARCHAR(80) NOT NULL CONSTRAINT UQ_LeadSources_Name UNIQUE,
  IsActive BIT NOT NULL CONSTRAINT DF_LeadSources_IsActive DEFAULT (1),
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LeadSources_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_LeadSources_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.OpportunityLossReasons (
  LossReasonId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpportunityLossReasons PRIMARY KEY,
  LossReasonName NVARCHAR(120) NOT NULL CONSTRAINT UQ_OpportunityLossReasons_Name UNIQUE,
  IsActive BIT NOT NULL CONSTRAINT DF_OpportunityLossReasons_IsActive DEFAULT (1),
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityLossReasons_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityLossReasons_UpdatedAt DEFAULT (SYSUTCDATETIME())
);
GO

CREATE TABLE dbo.Opportunities (
  OpportunityId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Opportunities PRIMARY KEY,
  OpportunityCode NVARCHAR(30) NOT NULL CONSTRAINT UQ_Opportunities_Code UNIQUE,
  Title NVARCHAR(200) NOT NULL,
  CustomerId BIGINT NULL,
  ContactName NVARCHAR(120) NULL,
  ContactEmail NVARCHAR(254) NULL,
  ContactPhone NVARCHAR(30) NULL,
  CompanyName NVARCHAR(200) NULL,
  EstimatedValue DECIMAL(18,2) NULL,
  ProbabilityPercent INT NULL,
  CurrentStageId INT NOT NULL,
  AssignedUserId INT NULL,
  ExpectedCloseDate DATE NULL,
  LeadSourceId INT NULL,
  Priority NVARCHAR(20) NULL,
  [Status] NVARCHAR(20) NOT NULL CONSTRAINT DF_Opportunities_Status DEFAULT (N'OPEN'),
  LossReasonId INT NULL,
  Competitor NVARCHAR(120) NULL,
  Notes NVARCHAR(MAX) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Opportunities_CreatedAt DEFAULT (SYSUTCDATETIME()),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Opportunities_UpdatedAt DEFAULT (SYSUTCDATETIME()),
  CreatedBy INT NULL,
  UpdatedBy INT NULL,
  IsDeleted BIT NOT NULL CONSTRAINT DF_Opportunities_IsDeleted DEFAULT (0),
  CONSTRAINT FK_Opportunities_Stage FOREIGN KEY (CurrentStageId) REFERENCES dbo.OpportunityStages(StageId),
  CONSTRAINT FK_Opportunities_AssignedUser FOREIGN KEY (AssignedUserId) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_Opportunities_LeadSource FOREIGN KEY (LeadSourceId) REFERENCES dbo.LeadSources(LeadSourceId),
  CONSTRAINT FK_Opportunities_LossReason FOREIGN KEY (LossReasonId) REFERENCES dbo.OpportunityLossReasons(LossReasonId),
  CONSTRAINT FK_Opportunities_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_Opportunities_UpdatedBy FOREIGN KEY (UpdatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_Opportunities_IsDeleted ON dbo.Opportunities(IsDeleted);
CREATE INDEX IX_Opportunities_CurrentStageId ON dbo.Opportunities(CurrentStageId);
CREATE INDEX IX_Opportunities_AssignedUserId ON dbo.Opportunities(AssignedUserId);
GO

CREATE TABLE dbo.OpportunityActivities (
  ActivityId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpportunityActivities PRIMARY KEY,
  OpportunityId BIGINT NOT NULL,
  ActivityType NVARCHAR(30) NOT NULL, -- call/email/meeting/task
  [Subject] NVARCHAR(200) NULL,
  [Description] NVARCHAR(2000) NULL,
  DueDate DATETIME2 NULL,
  CompletedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityActivities_CreatedAt DEFAULT (SYSUTCDATETIME()),
  CreatedBy INT NULL,
  IsDeleted BIT NOT NULL CONSTRAINT DF_OpportunityActivities_IsDeleted DEFAULT (0),
  CONSTRAINT FK_OpportunityActivities_Opportunity FOREIGN KEY (OpportunityId) REFERENCES dbo.Opportunities(OpportunityId),
  CONSTRAINT FK_OpportunityActivities_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_OpportunityActivities_OpportunityId ON dbo.OpportunityActivities(OpportunityId);
CREATE INDEX IX_OpportunityActivities_IsDeleted ON dbo.OpportunityActivities(IsDeleted);
GO

CREATE TABLE dbo.OpportunityNotes (
  NoteId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpportunityNotes PRIMARY KEY,
  OpportunityId BIGINT NOT NULL,
  NoteText NVARCHAR(4000) NOT NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityNotes_CreatedAt DEFAULT (SYSUTCDATETIME()),
  CreatedBy INT NULL,
  IsDeleted BIT NOT NULL CONSTRAINT DF_OpportunityNotes_IsDeleted DEFAULT (0),
  CONSTRAINT FK_OpportunityNotes_Opportunity FOREIGN KEY (OpportunityId) REFERENCES dbo.Opportunities(OpportunityId),
  CONSTRAINT FK_OpportunityNotes_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_OpportunityNotes_OpportunityId ON dbo.OpportunityNotes(OpportunityId);
GO

CREATE TABLE dbo.OpportunityAttachments (
  AttachmentId BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_OpportunityAttachments PRIMARY KEY,
  OpportunityId BIGINT NOT NULL,
  FileName NVARCHAR(255) NOT NULL,
  ContentType NVARCHAR(100) NULL,
  FileSizeBytes BIGINT NULL,
  StoragePath NVARCHAR(500) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_OpportunityAttachments_CreatedAt DEFAULT (SYSUTCDATETIME()),
  CreatedBy INT NULL,
  IsDeleted BIT NOT NULL CONSTRAINT DF_OpportunityAttachments_IsDeleted DEFAULT (0),
  CONSTRAINT FK_OpportunityAttachments_Opportunity FOREIGN KEY (OpportunityId) REFERENCES dbo.Opportunities(OpportunityId),
  CONSTRAINT FK_OpportunityAttachments_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId)
);
GO

CREATE INDEX IX_OpportunityAttachments_OpportunityId ON dbo.OpportunityAttachments(OpportunityId);
GO

CREATE OR ALTER TRIGGER dbo.trg_OpportunityStages_UpdatedAt
ON dbo.OpportunityStages
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE s SET UpdatedAt = SYSUTCDATETIME()
  FROM dbo.OpportunityStages s
  INNER JOIN inserted i ON i.StageId = s.StageId;
END
GO

CREATE OR ALTER TRIGGER dbo.trg_Opportunities_UpdatedAt
ON dbo.Opportunities
AFTER UPDATE
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE o SET UpdatedAt = SYSUTCDATETIME()
  FROM dbo.Opportunities o
  INNER JOIN inserted i ON i.OpportunityId = o.OpportunityId;
END
GO

