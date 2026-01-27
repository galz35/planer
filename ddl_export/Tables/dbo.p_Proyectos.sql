IF OBJECT_ID('[dbo].[p_Proyectos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_Proyectos]
GO
CREATE TABLE [dbo].[p_Proyectos] (
    [idProyecto] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(300) NOT NULL,
    [descripcion] nvarchar(max) NULL,
    [idNodoDuenio] int NULL,
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [pais] nvarchar(10) NULL DEFAULT ('NI'),
    [tipo] nvarchar(50) NULL DEFAULT ('Operativo'),
    [estado] nvarchar(50) NULL DEFAULT ('Borrador'),
    [requiereAprobacion] bit NULL DEFAULT ((0)),
    [enllavado] bit NULL DEFAULT ((0)),
    [fechaInicio] datetime NULL,
    [fechaFin] datetime NULL,
    [area] nvarchar(200) NULL,
    [subgerencia] nvarchar(200) NULL,
    [gerencia] nvarchar(200) NULL,
    [idCreador] int NULL,
    [idResponsable] int NULL,
    [prioridad] nvarchar(20) NULL DEFAULT ('Media'),
    [fechaActualizacion] datetime NULL,
    [creadorCarnet] nvarchar(50) NULL,
    [responsableCarnet] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Proyec__D0AF4CB45AF8B027] PRIMARY KEY ([idProyecto])
);
GO
CREATE NONCLUSTERED INDEX [IX_p_Proyectos_FechaCreacion] ON [dbo].[p_Proyectos] (nombre, descripcion, estado, fechaCreacion) INCLUDE (nombre, descripcion, estado);
GO
CREATE NONCLUSTERED INDEX [IX_p_Proyectos_Filtros_Composite] ON [dbo].[p_Proyectos] (nombre, fechaCreacion, responsableCarnet, creadorCarnet, estado, gerencia, subgerencia, area, tipo) INCLUDE (nombre, fechaCreacion, responsableCarnet, creadorCarnet);
GO
