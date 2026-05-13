USE [oportunidades];
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.contratos_empresa', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contratos_empresa (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contratos_empresa PRIMARY KEY,
    rut_empresa NVARCHAR(15) NOT NULL,
    id_categoria INT NOT NULL,
    id_tipo_servicio INT NOT NULL,
    id_estado_vital INT NOT NULL,
    id_estado_ctr INT NOT NULL,
    titulo NVARCHAR(240) NOT NULL,
    fecha_firma DATE NULL,
    fecha_inicio DATE NULL,
    fecha_termino DATE NULL,
    fecha_facturacion DATE NULL,
    medio_pago NVARCHAR(120) NULL,
    reajustable BIT NOT NULL CONSTRAINT DF_contratos_empresa_reajustable DEFAULT (0),
    multa DECIMAL(18,4) NULL,
    requiere_orden_compra BIT NOT NULL CONSTRAINT DF_contratos_empresa_requiere_oc DEFAULT (0),
    id_frecuencia INT NOT NULL,
    id_tipo_tarifa INT NOT NULL,
    id_contacto INT NOT NULL,
    id_tipo_contacto INT NOT NULL,
    id_estado_contacto INT NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_contratos_empresa_activo DEFAULT (1),
    created_at DATETIME2 NOT NULL CONSTRAINT DF_contratos_empresa_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_contratos_empresa_updated_at DEFAULT (SYSUTCDATETIME()),
    created_by INT NULL,
    updated_by INT NULL,
    CONSTRAINT FK_contratos_empresa_empresa FOREIGN KEY (rut_empresa) REFERENCES dbo.empresa(rut) ON UPDATE CASCADE,
    CONSTRAINT FK_contratos_empresa_categoria FOREIGN KEY (id_categoria) REFERENCES dbo.categoria(id_categoria),
    CONSTRAINT FK_contratos_empresa_tipo_servicio FOREIGN KEY (id_tipo_servicio) REFERENCES dbo.tipo_servicio(id_tipo_servicio),
    CONSTRAINT FK_contratos_empresa_estado_vital FOREIGN KEY (id_estado_vital) REFERENCES dbo.estado_vital(id_estado_vital),
    CONSTRAINT FK_contratos_empresa_estado_ctr FOREIGN KEY (id_estado_ctr) REFERENCES dbo.estado_ctr(id_estado_ctr),
    CONSTRAINT FK_contratos_empresa_frecuencia FOREIGN KEY (id_frecuencia) REFERENCES dbo.frecuencia_facturacion(id_frecuencia),
    CONSTRAINT FK_contratos_empresa_tipo_tarifa FOREIGN KEY (id_tipo_tarifa) REFERENCES dbo.tipo_tarifa(id_tipo_tarifa),
    CONSTRAINT FK_contratos_empresa_contacto FOREIGN KEY (id_contacto) REFERENCES dbo.contacto(id_contacto),
    CONSTRAINT FK_contratos_empresa_tipo_contacto FOREIGN KEY (id_tipo_contacto) REFERENCES dbo.tipo_contacto(id_tipo_contacto),
    CONSTRAINT FK_contratos_empresa_estado_contacto FOREIGN KEY (id_estado_contacto) REFERENCES dbo.estado_contacto(id_estado_contacto),
    CONSTRAINT FK_contratos_empresa_created_by FOREIGN KEY (created_by) REFERENCES dbo.Users(UserId) ON DELETE SET NULL,
    CONSTRAINT FK_contratos_empresa_updated_by FOREIGN KEY (updated_by) REFERENCES dbo.Users(UserId)
  );
END
GO

IF OBJECT_ID('dbo.contrato_empresa_lineas', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contrato_empresa_lineas (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato_empresa_lineas PRIMARY KEY,
    contrato_empresa_id INT NOT NULL,
    linea_id INT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_lineas_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_lineas_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_contrato_empresa_lineas_contrato_empresa FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id),
    CONSTRAINT FK_contrato_empresa_lineas_linea FOREIGN KEY (linea_id) REFERENCES dbo.linea(id_linea),
    CONSTRAINT UQ_contrato_empresa_lineas UNIQUE (contrato_empresa_id, linea_id)
  );
END
GO

IF OBJECT_ID('dbo.contrato_empresa_casos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contrato_empresa_casos (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato_empresa_casos PRIMARY KEY,
    contrato_empresa_id INT NOT NULL,
    caso_id INT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_casos_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_casos_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_contrato_empresa_casos_contrato_empresa FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id),
    CONSTRAINT FK_contrato_empresa_casos_caso FOREIGN KEY (caso_id) REFERENCES dbo.caso(id_caso),
    CONSTRAINT UQ_contrato_empresa_casos UNIQUE (contrato_empresa_id, caso_id)
  );
END
GO

IF OBJECT_ID('dbo.contrato_empresa_documentos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contrato_empresa_documentos (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato_empresa_documentos PRIMARY KEY,
    contrato_empresa_id INT NOT NULL,
    documento_id INT NOT NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_documentos_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_contrato_empresa_documentos_updated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_contrato_empresa_documentos_contrato_empresa FOREIGN KEY (contrato_empresa_id) REFERENCES dbo.contratos_empresa(id),
    CONSTRAINT FK_contrato_empresa_documentos_documento FOREIGN KEY (documento_id) REFERENCES dbo.documentos(id_documento),
    CONSTRAINT UQ_contrato_empresa_documentos UNIQUE (contrato_empresa_id, documento_id)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contratos_empresa_rut_empresa' AND object_id = OBJECT_ID('dbo.contratos_empresa'))
  CREATE INDEX IX_contratos_empresa_rut_empresa ON dbo.contratos_empresa(rut_empresa);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contratos_empresa_activo' AND object_id = OBJECT_ID('dbo.contratos_empresa'))
  CREATE INDEX IX_contratos_empresa_activo ON dbo.contratos_empresa(activo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_empresa_lineas_parent' AND object_id = OBJECT_ID('dbo.contrato_empresa_lineas'))
  CREATE INDEX IX_contrato_empresa_lineas_parent ON dbo.contrato_empresa_lineas(contrato_empresa_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_empresa_casos_parent' AND object_id = OBJECT_ID('dbo.contrato_empresa_casos'))
  CREATE INDEX IX_contrato_empresa_casos_parent ON dbo.contrato_empresa_casos(contrato_empresa_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_empresa_documentos_parent' AND object_id = OBJECT_ID('dbo.contrato_empresa_documentos'))
  CREATE INDEX IX_contrato_empresa_documentos_parent ON dbo.contrato_empresa_documentos(contrato_empresa_id);
GO

IF OBJECT_ID('dbo.SystemModules', 'U') IS NOT NULL
BEGIN
  MERGE dbo.SystemModules AS target
  USING (VALUES
    (N'commercial.contratos_empresa', N'Contrato Empresa', N'Gestion comercial', N'/commercial/contratos-empresa', 125)
  ) AS source (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder)
  ON target.ModuleKey = source.ModuleKey
  WHEN MATCHED THEN
    UPDATE SET
      target.ModuleName = source.ModuleName,
      target.ModuleGroup = source.ModuleGroup,
      target.MenuPath = source.MenuPath,
      target.SortOrder = source.SortOrder,
      target.IsActive = 1,
      target.UpdatedAt = SYSUTCDATETIME()
  WHEN NOT MATCHED THEN
    INSERT (ModuleKey, ModuleName, ModuleGroup, MenuPath, SortOrder, IsActive)
    VALUES (source.ModuleKey, source.ModuleName, source.ModuleGroup, source.MenuPath, source.SortOrder, 1);
END
GO

IF OBJECT_ID('dbo.RolePermissions', 'U') IS NOT NULL
BEGIN
  INSERT INTO dbo.RolePermissions (RoleId, ModuleKey, CanCreate, CanRead, CanWrite, CanDelete)
  SELECT r.RoleId, N'commercial.contratos_empresa', 1, 1, 1, 1
  FROM dbo.Roles r
  WHERE r.RoleName IN (N'Super Admin', N'Admin')
    AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolePermissions rp
      WHERE rp.RoleId = r.RoleId AND rp.ModuleKey = N'commercial.contratos_empresa'
    );
END
GO
