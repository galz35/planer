IF OBJECT_ID('[dbo].[p_CheckinTareas]', 'U') IS NOT NULL DROP TABLE [dbo].[p_CheckinTareas]
GO
CREATE TABLE [dbo].[p_CheckinTareas] (
    [id] int IDENTITY(1,1) NOT NULL,
    [idCheckin] int NOT NULL,
    [idTarea] int NULL,
    [descripcion] nvarchar(500) NULL,
    [completado] bit NULL DEFAULT ((0)),
    [orden] int NULL DEFAULT ((0)),
    [tipo] nvarchar(50) NULL,
    CONSTRAINT [PK__p_Checki__3213E83FC0973B57] PRIMARY KEY ([id])
);
GO
ALTER TABLE [dbo].[p_CheckinTareas] ADD CONSTRAINT [FK__p_Checkin__idTar__6BAFC5BE] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea]);
GO
ALTER TABLE [dbo].[p_CheckinTareas] ADD CONSTRAINT [FK__p_Checkin__idChe__6ABBA185] FOREIGN KEY ([idCheckin]) REFERENCES [dbo].[p_Checkins] ([idCheckin]);
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_p_CheckinTareas_Checkin_Tarea_Tipo] ON [dbo].[p_CheckinTareas] (idCheckin, idTarea, tipo);
GO
