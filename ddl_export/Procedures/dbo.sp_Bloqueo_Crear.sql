/* =========================================================
   3) SP Mejorado: sp_Bloqueo_Crear
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Bloqueo_Crear
(
    @idTarea          INT,
    @idOrigenUsuario  INT,
    @idDestinoUsuario INT = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigenUsuario, @idDestinoUsuario, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END

        SELECT @idBloqueo AS idBloqueo;
        
        -- Actualizar estado tarea (fuera del INSERT para asegurar que se ejecute incluso si devolvimos bloqueo existente, aunque la regla de negocio podria variar)
        -- En este caso, aseguramos que la tarea se marque bloqueada.
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada'
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO