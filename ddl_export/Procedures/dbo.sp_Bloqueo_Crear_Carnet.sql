CREATE   PROCEDURE dbo.sp_Bloqueo_Crear_Carnet
(
    @idTarea          INT,
    @origenCarnet     NVARCHAR(50),
    @destinoCarnet    NVARCHAR(50) = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Resolver IDs
    DECLARE @idOrigen INT;
    DECLARE @idDestino INT = NULL;

    SELECT @idOrigen = idUsuario FROM dbo.p_Usuarios WHERE carnet = @origenCarnet;
    
    IF @idOrigen IS NULL 
    BEGIN
        THROW 50001, 'Usuario Origen no encontrado por carnet.', 1;
    END

    IF @destinoCarnet IS NOT NULL
    BEGIN
        SELECT @idDestino = idUsuario FROM dbo.p_Usuarios WHERE carnet = @destinoCarnet;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        -- Evitar duplicados activos
        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, origenCarnet, destinoCarnet, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigen, @idDestino, @origenCarnet, @destinoCarnet, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END
        
        -- Actualizar Tarea a 'Bloqueada'
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada', fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
        SELECT @idBloqueo AS idBloqueo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO