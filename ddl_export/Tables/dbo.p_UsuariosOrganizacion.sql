IF OBJECT_ID('[dbo].[p_UsuariosOrganizacion]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuariosOrganizacion]
GO
CREATE TABLE [dbo].[p_UsuariosOrganizacion] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [idNodo] int NOT NULL,
    [esResponsable] bit NULL DEFAULT ((0)),
    CONSTRAINT [PK__p_Usuari__3213E83F1D2EB007] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuariosOrganizacion] ADD CONSTRAINT [FK__p_Usuario__idUsu__495AADBA] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
ALTER TABLE [dbo].[p_UsuariosOrganizacion] ADD CONSTRAINT [FK__p_Usuario__idNod__4A4ED1F3] FOREIGN KEY ([idNodo]) REFERENCES [dbo].[p_OrganizacionNodos] ([id]);
GO
