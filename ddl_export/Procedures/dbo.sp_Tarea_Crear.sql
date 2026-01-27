-- 2. SP: Crear Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Crear]
    @nombre NVARCHAR(500),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @idUsuario INT = 0, -- Legacy / Fallback
    @carnet NVARCHAR(50) = NULL, -- Creador Carnet
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(20) = 'SIMPLE',
    @idTareaPadre INT = NULL,
    @idPlan INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idCreadorFinal INT = @idUsuario;
    DECLARE @carnetFinal NVARCHAR(50) = @carnet;

    -- Resolver ID si no viene
    IF @idCreadorFinal = 0 AND @carnetFinal IS NOT NULL
        SELECT @idCreadorFinal = idUsuario FROM p_Usuarios WHERE carnet = @carnetFinal;
    
    -- Resolver Carnet si no viene
    IF @carnetFinal IS NULL AND @idCreadorFinal <> 0
        SELECT @carnetFinal = carnet FROM p_Usuarios WHERE idUsuario = @idCreadorFinal;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, idTareaPadre, idPlan, orden, activo
    )
    VALUES (
        @nombre, @descripcion, @idProyecto, 'Pendiente', @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @idCreadorFinal, @carnetFinal,
        GETDATE(), @porcentaje, @comportamiento, @idTareaPadre, @idPlan, @orden, 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END;
GO