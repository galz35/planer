IF OBJECT_ID('[dbo].[p_UsuarioCredenciales]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuarioCredenciales]
GO
CREATE TABLE [dbo].[p_UsuarioCredenciales] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [passwordHash] nvarchar(500) NOT NULL,
    [ultimoCambio] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_Usuari__3213E83F4289905F] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuarioCredenciales] ADD CONSTRAINT [FK__p_Usuario__idUsu__498FB7E4] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__645723A7E1BB7E8A] ON [dbo].[p_UsuarioCredenciales] (idUsuario);
GO
