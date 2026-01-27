IF OBJECT_ID('[dbo].[p_SlowQueries]', 'U') IS NOT NULL DROP TABLE [dbo].[p_SlowQueries]
GO
CREATE TABLE [dbo].[p_SlowQueries] (
    [id] int IDENTITY(1,1) NOT NULL,
    [fecha] datetime NULL DEFAULT (getdate()),
    [duracionMS] int NOT NULL,
    [sqlText] nvarchar(max) NOT NULL,
    [parametros] nvarchar(max) NULL,
    [tipo] nvarchar(50) NULL,
    [origen] nvarchar(200) NULL,
    CONSTRAINT [PK__p_SlowQu__3213E83F6D9FC0DF] PRIMARY KEY ([id])
);
GO
CREATE NONCLUSTERED INDEX [IX_SlowQueries_Fecha] ON [dbo].[p_SlowQueries] (fecha);
GO
