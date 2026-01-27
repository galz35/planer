/* =========================================================
   4) SP Mejorado: sp_Tarea_CrearCompleta
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Tarea_CrearCompleta
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        IF @fechaObjetivo IS NULL
            SET @fechaObjetivo = GETDATE();

        IF @idTareaPadre IS NOT NULL
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM dbo.p_Tareas p
                WHERE p.idTarea = @idTareaPadre
                  AND p.activo = 1
            )
            BEGIN
                THROW 50001, 'idTareaPadre inválido o no existe.', 1;
            END
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo
        )
        VALUES (
            @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        IF @idResponsable IS NOT NULL AND @idResponsable <> @idUsuario
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM dbo.p_TareaAsignados 
                WHERE idTarea = @idTarea AND idUsuario = @idResponsable AND tipo = 'Responsable'
            )
            BEGIN
                INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
                VALUES (@idTarea, @idResponsable, 'Responsable', GETDATE());
            END
        END

        COMMIT;
        SELECT @idTarea AS idTarea;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO