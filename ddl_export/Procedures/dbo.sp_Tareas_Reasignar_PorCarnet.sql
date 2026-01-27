-- 4. SP: Reasignar Tareas masivamente
CREATE   PROCEDURE [dbo].[sp_Tareas_Reasignar_PorCarnet]
    @taskIdsCsv NVARCHAR(MAX),
    @toCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idDestino INT;
    SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @toCarnet;

    IF @idDestino IS NULL RETURN;

    -- Eliminar asignaciones previas de tipo 'Responsable'
    DELETE FROM p_TareaAsignados 
    WHERE idTarea IN (SELECT value FROM STRING_SPLIT(@taskIdsCsv, ','))
      AND tipo = 'Responsable';

    -- Insertar nuevas asignaciones
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT CAST(value AS INT), @idDestino, @toCarnet, 'Responsable', GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',');
END;
GO