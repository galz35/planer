-- 3. SP para Eliminar Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Eliminar]
    @idTarea INT,
    @carnetSolicitante NVARCHAR(50),
    @motivo NVARCHAR(255) = 'Eliminación manual'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetCreador NVARCHAR(50);
    DECLARE @fechaCreacion DATETIME;
    DECLARE @idSolicitante INT; 

    -- Obtener usando JOIN a usuarios para estar seguros del creador
    SELECT @carnetCreador = u.carnet, @fechaCreacion = t.fechaCreacion 
    FROM p_Tareas t
    JOIN p_Usuarios u ON t.idCreador = u.idUsuario
    WHERE t.idTarea = @idTarea;
    
    -- Resolver ID sol (para logs de auditoria si piden ID)
    SELECT @idSolicitante = idUsuario FROM p_Usuarios WHERE carnet = @carnetSolicitante;

    IF @carnetCreador IS NULL RETURN; 

    -- SIEMPRE Soft Delete (Inactivación)
    -- Se elimina lógica de borrado físico para preservar historial y auditoría.
    
    UPDATE p_Tareas 
    SET activo = 0,
        deshabilitadoPor = @idSolicitante, -- Mantener ID aqui si la columna es FK int
        fechaDeshabilitacion = GETDATE(),
        motivoDeshabilitacion = @motivo
    WHERE idTarea = @idTarea;
END
GO