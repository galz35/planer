IF OBJECT_ID('[dbo].[p_PlanesTrabajo]', 'U') IS NOT NULL DROP TABLE [dbo].[p_PlanesTrabajo]
GO
CREATE TABLE [dbo].[p_PlanesTrabajo] (
    [idPlan] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [mes] int NOT NULL,
    [anio] int NOT NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Borrador'),
    [fechaCreacion] datetime NULL DEFAULT (getdate()),
    [fechaAprobacion] datetime NULL,
    [idAprobador] int NULL,
    [observaciones] nvarchar(max) NULL,
    [fechaActualizacion] datetime NULL,
    [comentarios] nvarchar(max) NULL,
    [carnet] nvarchar(50) NULL,
    [objetivos] nvarchar(max) NULL,
    CONSTRAINT [PK__p_Planes__3213E83F2970402F] PRIMARY KEY ([idPlan])
);
GO
ALTER TABLE [dbo].[p_PlanesTrabajo] ADD CONSTRAINT [FK__p_PlanesT__idUsu__5E55CAA0] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_PlanesTrabajo] ADD CONSTRAINT [FK__p_PlanesT__idApr__5F49EED9] FOREIGN KEY ([idAprobador]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
