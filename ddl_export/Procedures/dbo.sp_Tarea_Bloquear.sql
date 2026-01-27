-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 2 (CORREGIDO V2 - CAMPOS CARNET NATIVOS)
-- Fecha: 2026-01-25
-- =============================================

-- 4. SP para Bloquear Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Bloquear]
    @idTarea INT,
    @carnetOrigen NVARCHAR(50),
    @carnetDestino NVARCHAR(50) = NULL,
    @motivo NVARCHAR(255),
    @destinoTexto NVARCHAR(255) = NULL,
    @accionMitigacion NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idOrigen INT, @idDestino INT;
    SELECT @idOrigen = idUsuario FROM p_Usuarios WHERE carnet = @carnetOrigen;
    
    IF @carnetDestino IS NOT NULL
        SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @carnetDestino;

    IF @idOrigen IS NULL RETURN; 

    IF EXISTS (SELECT 1 FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto')
    BEGIN
        SELECT idBloqueo, 1 as yaExistia FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto';
        RETURN;
    END

    -- Insert
    INSERT INTO p_Bloqueos(idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
    VALUES(@idTarea, @idOrigen, @idDestino, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

    UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @idTarea;
    SELECT SCOPE_IDENTITY() as idBloqueo, 0 as yaExistia;
END
GO