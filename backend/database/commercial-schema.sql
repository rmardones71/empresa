/*
  Commercial / Contracts module schema for SQL Server.
  Safe to run multiple times: creates missing tables and seeds master data.
*/

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.categoria', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.categoria (
    id_categoria INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_categoria PRIMARY KEY,
    categoria NVARCHAR(120) NOT NULL CONSTRAINT UQ_categoria_categoria UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.tipo_contacto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tipo_contacto (
    id_tipo_contacto INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tipo_contacto PRIMARY KEY,
    tipo NVARCHAR(120) NOT NULL CONSTRAINT UQ_tipo_contacto_tipo UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.estado_contacto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.estado_contacto (
    id_estado_contacto INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_estado_contacto PRIMARY KEY,
    estado_contacto NVARCHAR(120) NOT NULL CONSTRAINT UQ_estado_contacto_estado UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.estado_vital', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.estado_vital (
    id_estado_vital INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_estado_vital PRIMARY KEY,
    estado_vital NVARCHAR(120) NOT NULL CONSTRAINT UQ_estado_vital_estado UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.tipo_servicio', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tipo_servicio (
    id_tipo_servicio INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tipo_servicio PRIMARY KEY,
    tipo_servicio NVARCHAR(160) NOT NULL CONSTRAINT UQ_tipo_servicio_tipo UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.tipo_tarifa', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tipo_tarifa (
    id_tipo_tarifa INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tipo_tarifa PRIMARY KEY,
    tipo_tarifa NVARCHAR(120) NOT NULL CONSTRAINT UQ_tipo_tarifa_tipo UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.frecuencia_facturacion', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.frecuencia_facturacion (
    id_frecuencia INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_frecuencia_facturacion PRIMARY KEY,
    frecuencia NVARCHAR(120) NOT NULL CONSTRAINT UQ_frecuencia_facturacion_frecuencia UNIQUE
  );
END
GO

IF OBJECT_ID('dbo.empresa', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.empresa (
    rut NVARCHAR(15) NOT NULL CONSTRAINT PK_empresa PRIMARY KEY,
    razon_social NVARCHAR(200) NOT NULL,
    nombre_fantasia NVARCHAR(200) NULL,
    giro NVARCHAR(200) NULL,
    rubro NVARCHAR(160) NULL,
    direccion NVARCHAR(240) NULL,
    comuna NVARCHAR(120) NULL,
    region NVARCHAR(120) NULL,
    sitio_web NVARCHAR(240) NULL,
    id_categoria INT NOT NULL,
    CONSTRAINT FK_empresa_categoria FOREIGN KEY (id_categoria) REFERENCES dbo.categoria(id_categoria)
  );
END
GO

IF OBJECT_ID('dbo.contacto', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contacto (
    id_contacto INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contacto PRIMARY KEY,
    rut_empresa NVARCHAR(15) NOT NULL,
    id_tipo_contacto INT NOT NULL,
    id_estado_contacto INT NOT NULL,
    rut NVARCHAR(15) NULL,
    nombre NVARCHAR(200) NOT NULL,
    cargo NVARCHAR(160) NULL,
    area NVARCHAR(160) NULL,
    email NVARCHAR(254) NULL,
    telefono NVARCHAR(60) NULL,
    rol NVARCHAR(120) NULL,
    autoriza_comunicaciones BIT NOT NULL CONSTRAINT DF_contacto_autoriza DEFAULT (0),
    estado NVARCHAR(80) NULL,
    CONSTRAINT FK_contacto_empresa FOREIGN KEY (rut_empresa) REFERENCES dbo.empresa(rut),
    CONSTRAINT FK_contacto_tipo FOREIGN KEY (id_tipo_contacto) REFERENCES dbo.tipo_contacto(id_tipo_contacto),
    CONSTRAINT FK_contacto_estado FOREIGN KEY (id_estado_contacto) REFERENCES dbo.estado_contacto(id_estado_contacto)
  );
END
GO

IF OBJECT_ID('dbo.contrato', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contrato (
    id_contrato INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_contrato PRIMARY KEY,
    rut_empresa NVARCHAR(15) NOT NULL,
    id_estado_vital INT NOT NULL,
    titulo NVARCHAR(240) NOT NULL,
    fecha_firma DATE NULL,
    fecha_inicio DATE NULL,
    fecha_termino DATE NULL,
    estado NVARCHAR(80) NULL,
    fecha_facturacion DATE NULL,
    medio_pago NVARCHAR(120) NULL,
    reajustable BIT NOT NULL CONSTRAINT DF_contrato_reajustable DEFAULT (0),
    multa DECIMAL(18,4) NULL,
    requiere_oc BIT NOT NULL CONSTRAINT DF_contrato_requiere_oc DEFAULT (0),
    CONSTRAINT FK_contrato_empresa FOREIGN KEY (rut_empresa) REFERENCES dbo.empresa(rut),
    CONSTRAINT FK_contrato_estado_vital FOREIGN KEY (id_estado_vital) REFERENCES dbo.estado_vital(id_estado_vital)
  );
END
GO

IF OBJECT_ID('dbo.linea', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.linea (
    id_linea INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_linea PRIMARY KEY,
    id_contrato INT NOT NULL,
    id_tipo_servicio INT NOT NULL,
    id_tipo_tarifa INT NOT NULL,
    id_frecuencia INT NOT NULL,
    titulo NVARCHAR(240) NOT NULL,
    fecha_inicio DATE NULL,
    fecha_inicio_ciclo_facturacion DATE NULL,
    tarifa_fija DECIMAL(18,4) NULL,
    tarifa_variable DECIMAL(18,4) NULL,
    moneda_fijo NVARCHAR(12) NULL,
    moneda_variable NVARCHAR(12) NULL,
    unidad_variable NVARCHAR(80) NULL,
    iva BIT NOT NULL CONSTRAINT DF_linea_iva DEFAULT (1),
    CONSTRAINT FK_linea_contrato FOREIGN KEY (id_contrato) REFERENCES dbo.contrato(id_contrato),
    CONSTRAINT FK_linea_tipo_servicio FOREIGN KEY (id_tipo_servicio) REFERENCES dbo.tipo_servicio(id_tipo_servicio),
    CONSTRAINT FK_linea_tipo_tarifa FOREIGN KEY (id_tipo_tarifa) REFERENCES dbo.tipo_tarifa(id_tipo_tarifa),
    CONSTRAINT FK_linea_frecuencia FOREIGN KEY (id_frecuencia) REFERENCES dbo.frecuencia_facturacion(id_frecuencia)
  );
END
GO

IF OBJECT_ID('dbo.caso', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.caso (
    id_caso INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_caso PRIMARY KEY,
    id_contacto INT NOT NULL,
    id_contrato INT NOT NULL,
    titulo NVARCHAR(240) NOT NULL,
    texto NVARCHAR(MAX) NULL,
    adjuntos NVARCHAR(MAX) NULL,
    relato NVARCHAR(MAX) NULL,
    CONSTRAINT FK_caso_contacto FOREIGN KEY (id_contacto) REFERENCES dbo.contacto(id_contacto),
    CONSTRAINT FK_caso_contrato FOREIGN KEY (id_contrato) REFERENCES dbo.contrato(id_contrato)
  );
END
GO

IF OBJECT_ID('dbo.documentos', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.documentos (
    id_documento INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_documentos PRIMARY KEY,
    id_contrato INT NOT NULL,
    tipo_documento NVARCHAR(120) NULL,
    nombre NVARCHAR(240) NOT NULL,
    descripcion NVARCHAR(1000) NULL,
    version NVARCHAR(40) NULL,
    responsable NVARCHAR(160) NULL,
    archivo NVARCHAR(MAX) NULL,
    estado NVARCHAR(80) NULL,
    fecha_carga DATETIME2 NOT NULL CONSTRAINT DF_documentos_fecha_carga DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_documentos_contrato FOREIGN KEY (id_contrato) REFERENCES dbo.contrato(id_contrato)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_empresa_id_categoria' AND object_id = OBJECT_ID('dbo.empresa'))
  CREATE INDEX IX_empresa_id_categoria ON dbo.empresa(id_categoria);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contacto_rut_empresa' AND object_id = OBJECT_ID('dbo.contacto'))
  CREATE INDEX IX_contacto_rut_empresa ON dbo.contacto(rut_empresa);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contacto_tipo' AND object_id = OBJECT_ID('dbo.contacto'))
  CREATE INDEX IX_contacto_tipo ON dbo.contacto(id_tipo_contacto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contacto_estado' AND object_id = OBJECT_ID('dbo.contacto'))
  CREATE INDEX IX_contacto_estado ON dbo.contacto(id_estado_contacto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_rut_empresa' AND object_id = OBJECT_ID('dbo.contrato'))
  CREATE INDEX IX_contrato_rut_empresa ON dbo.contrato(rut_empresa);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_contrato_estado_vital' AND object_id = OBJECT_ID('dbo.contrato'))
  CREATE INDEX IX_contrato_estado_vital ON dbo.contrato(id_estado_vital);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_linea_contrato' AND object_id = OBJECT_ID('dbo.linea'))
  CREATE INDEX IX_linea_contrato ON dbo.linea(id_contrato);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_linea_tipo_servicio' AND object_id = OBJECT_ID('dbo.linea'))
  CREATE INDEX IX_linea_tipo_servicio ON dbo.linea(id_tipo_servicio);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_linea_tipo_tarifa' AND object_id = OBJECT_ID('dbo.linea'))
  CREATE INDEX IX_linea_tipo_tarifa ON dbo.linea(id_tipo_tarifa);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_linea_frecuencia' AND object_id = OBJECT_ID('dbo.linea'))
  CREATE INDEX IX_linea_frecuencia ON dbo.linea(id_frecuencia);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_caso_contacto' AND object_id = OBJECT_ID('dbo.caso'))
  CREATE INDEX IX_caso_contacto ON dbo.caso(id_contacto);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_caso_contrato' AND object_id = OBJECT_ID('dbo.caso'))
  CREATE INDEX IX_caso_contrato ON dbo.caso(id_contrato);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documentos_contrato' AND object_id = OBJECT_ID('dbo.documentos'))
  CREATE INDEX IX_documentos_contrato ON dbo.documentos(id_contrato);
GO

MERGE dbo.categoria AS target
USING (VALUES
  (N'Cliente'),
  (N'Proveedor'),
  (N'Partner'),
  (N'Prospecto')
) AS source (categoria)
ON target.categoria = source.categoria
WHEN NOT MATCHED THEN INSERT (categoria) VALUES (source.categoria);
GO

MERGE dbo.tipo_contacto AS target
USING (VALUES
  (N'Comercial'),
  (N'Tecnico'),
  (N'Finanzas'),
  (N'Legal')
) AS source (tipo)
ON target.tipo = source.tipo
WHEN NOT MATCHED THEN INSERT (tipo) VALUES (source.tipo);
GO

MERGE dbo.estado_contacto AS target
USING (VALUES
  (N'Activo'),
  (N'Inactivo'),
  (N'No contactar'),
  (N'Pendiente')
) AS source (estado_contacto)
ON target.estado_contacto = source.estado_contacto
WHEN NOT MATCHED THEN INSERT (estado_contacto) VALUES (source.estado_contacto);
GO

MERGE dbo.estado_vital AS target
USING (VALUES
  (N'Borrador'),
  (N'Vigente'),
  (N'Por vencer'),
  (N'Vencido'),
  (N'Cerrado')
) AS source (estado_vital)
ON target.estado_vital = source.estado_vital
WHEN NOT MATCHED THEN INSERT (estado_vital) VALUES (source.estado_vital);
GO

MERGE dbo.tipo_servicio AS target
USING (VALUES
  (N'Servicio recurrente'),
  (N'Servicio puntual'),
  (N'Soporte'),
  (N'Licencia'),
  (N'Implementacion')
) AS source (tipo_servicio)
ON target.tipo_servicio = source.tipo_servicio
WHEN NOT MATCHED THEN INSERT (tipo_servicio) VALUES (source.tipo_servicio);
GO

MERGE dbo.tipo_tarifa AS target
USING (VALUES
  (N'Fija'),
  (N'Variable'),
  (N'Mixta'),
  (N'Por consumo')
) AS source (tipo_tarifa)
ON target.tipo_tarifa = source.tipo_tarifa
WHEN NOT MATCHED THEN INSERT (tipo_tarifa) VALUES (source.tipo_tarifa);
GO

MERGE dbo.frecuencia_facturacion AS target
USING (VALUES
  (N'Mensual'),
  (N'Bimestral'),
  (N'Trimestral'),
  (N'Semestral'),
  (N'Anual'),
  (N'Unica')
) AS source (frecuencia)
ON target.frecuencia = source.frecuencia
WHEN NOT MATCHED THEN INSERT (frecuencia) VALUES (source.frecuencia);
GO
