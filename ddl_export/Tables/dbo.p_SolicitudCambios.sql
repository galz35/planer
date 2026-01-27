IF OBJECT_ID('[dbo].[p_SolicitudCambios]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SolicitudCambios]
GO
CREATE TABLE [dbo].[p_SolicitudCambios] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idTarea] int NOT NULL,
    [idSolicitante] int NOT NULL,
    [tipo] nvarchar(50) NOT NULL,
    [descripcion] nvarchar(max) NULL,
    [estado] nvarchar(50) NULL DEFAULT ('Pendiente'),
    [fechaSolicitud] datetime NULL DEFAULT (getdate()),
    [fechaRespuesta] datetime NULL,
    [idResponsable] int NULL,
    [respuesta] nvarchar(max) NULL,
    [carnetSolicitante] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Solici__3213E83F768D2389] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idRes__65F6EC68] FOREIGN KEY ([idResponsable]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idSol__6502C82F] FOREIGN KEY ([idSolicitante]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_SolicitudCambios] ADD CONSTRAINT [FK__p_Solicit__idTar__640EA3F6] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
