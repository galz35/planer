-- 3. SP: Clonar Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Clonar]
    @idTareaFuente INT,
    @ejecutorCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @NewId INT;
    DECLARE @idEjecutor INT;
    SELECT @idEjecutor = idUsuario FROM p_Usuarios WHERE carnet = @ejecutorCarnet;

    INSERT INTO p_Tareas (
        nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
        fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo, idPlan
    )
    SELECT 
        nombre + ' (Copia)', descripcion, idProyecto, 'Pendiente', prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, @idEjecutor, @ejecutorCarnet,
        GETDATE(), 0, comportamiento, linkEvidencia, 1, idPlan
    FROM p_Tareas
    WHERE idTarea = @idTareaFuente;

    SET @NewId = SCOPE_IDENTITY();

    -- Clonar asignados
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT @NewId, idUsuario, carnet, tipo, GETDATE()
    FROM p_TareaAsignados
    WHERE idTarea = @idTareaFuente;

    SELECT @NewId as idTarea;
END;
GO