IF OBJECT_ID('[dbo].[p_organizacion_nodos]', 'U') IS NOT NULL DROP TABLE [dbo].[p_organizacion_nodos]
GO
CREATE TABLE [dbo].[p_organizacion_nodos] (
    [idorg] bigint NOT NULL,
    [padre] bigint NULL,
    [descripcion] nvarchar(100) NULL,
    [tipo] nvarchar(50) NULL,
    [estado] nvarchar(50) NULL,
    [nivel] nvarchar(200) NULL,
    [updated_at] datetime NULL DEFAULT (getdate()),
    CONSTRAINT [PK__p_organi__04F659101A69F2E7] PRIMARY KEY ([idorg])
);
GO
