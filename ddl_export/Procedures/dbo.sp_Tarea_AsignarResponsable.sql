-- 2. SP para Asignar Responsable (Usa Carnet)
CREATE   PROCEDURE [dbo].[sp_Tarea_AsignarResponsable]
    @idTarea INT,
    @carnetUsuario NVARCHAR(50),
    @tipo NVARCHAR(20) = 'Responsable',
    @esReasignacion BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Necesitamos el ID para mantener integridad FK si la columna idUsuario es NOT NULL
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnetUsuario;
    
    IF @idUsuario IS NULL RETURN;

    IF @esReasignacion = 1
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
    END

    IF NOT EXISTS (SELECT 1 FROM p_TareaAsignados WHERE idTarea = @idTarea AND carnet = @carnetUsuario)
    BEGIN
        -- Insertamos TANTO el ID como el CARNET para mantener consistencia
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
        VALUES (@idTarea, @idUsuario, @carnetUsuario, @tipo, GETDATE());
    END
END
GO