IF OBJECT_ID('[dbo].[p_OrganizacionNodos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_OrganizacionNodos]
GO
CREATE TABLE [dbo].[p_OrganizacionNodos] (
    [id] int IDENTITY(1,1) NOT NULL,
    [nombre] nvarchar(200) NOT NULL,
    [tipo] nvarchar(50) NULL,
    [idPadre] int NULL,
    [orden] int NULL DEFAULT ((0)),
    [activo] bit NULL DEFAULT ((1)),
    CONSTRAINT [PK__p_Organi__3213E83F2ABCD4F7] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_OrganizacionNodos] ADD CONSTRAINT [FK__p_Organiz__idPad__458A1CD6] FOREIGN KEY ([idPadre]) REFERENCES [dbo].[p_OrganizacionNodos] ([id]);
GO
