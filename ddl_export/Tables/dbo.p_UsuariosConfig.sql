IF OBJECT_ID('[dbo].[p_UsuariosConfig]', 'U') IS NOT NULL DROP TABLE [dbo].[p_UsuariosConfig]
GO
CREATE TABLE [dbo].[p_UsuariosConfig] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idUsuario] int NOT NULL,
    [menuPersonalizado] nvarchar(max) NULL,
    [temasPreferidos] nvarchar(500) NULL,
    [notificaciones] bit NULL DEFAULT ((1)),
    [fechaActualizacion] datetime NULL,
    [idioma] nvarchar(10) NULL DEFAULT ('es'),
    [tema] nvarchar(20) NULL DEFAULT ('light'),
    CONSTRAINT [PK__p_Usuari__3213E83F4132E030] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_UsuariosConfig] ADD CONSTRAINT [FK__p_Usuario__idUsu__40C567B9] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UQ__p_Usuari__645723A70DB90953] ON [dbo].[p_UsuariosConfig] (idUsuario);
GO
