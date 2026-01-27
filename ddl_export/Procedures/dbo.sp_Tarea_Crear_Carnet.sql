-- 3.2 sp_Tarea_Crear_Carnet
CREATE   PROCEDURE dbo.sp_Tarea_Crear_Carnet
(
    @creadorCarnet NVARCHAR(50),
    @titulo NVARCHAR(255),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @fechaObjetivo DATETIME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @creadorCarnet;

    IF @idUsuario IS NULL THROW 50001, 'Creador no encontrado.', 1;

    INSERT INTO dbo.p_Tareas(
        nombre, descripcion, idProyecto, 
        idCreador, creadorCarnet, 
        prioridad, fechaObjetivo, 
        estado, fechaCreacion, activo
    )
    VALUES(
        @titulo, @descripcion, @idProyecto,
        @idUsuario, @creadorCarnet,
        @prioridad, ISNULL(@fechaObjetivo, GETDATE()),
        'Pendiente', GETDATE(), 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END
GO