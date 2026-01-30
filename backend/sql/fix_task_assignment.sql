USE [Bdplaner];
GO

-- 1. Asegurar columnas de carnet en p_TareaAsignados
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_TareaAsignados') AND name = 'carnet')
BEGIN
    ALTER TABLE p_TareaAsignados ADD carnet NVARCHAR(50);
END
GO

-- Sincronizar carnets faltantes
UPDATE ta
SET ta.carnet = u.carnet
FROM p_TareaAsignados ta
JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
WHERE ta.carnet IS NULL OR ta.carnet = '';
GO

-- 2. Actualizar sp_Tarea_CrearCompleta_v2
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_CrearCompleta_v2
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL,
    @semana INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;
        
        -- Resolve Responsable Carnet
        DECLARE @responsableCarnet NVARCHAR(50) = NULL;
        IF @idResponsable IS NOT NULL
            SELECT @responsableCarnet = carnet FROM dbo.p_Usuarios WHERE idUsuario = @idResponsable;

        -- Resolve Creator Carnet
        DECLARE @creadorCarnet NVARCHAR(50) = NULL;
        SELECT @creadorCarnet = carnet FROM dbo.p_Usuarios WHERE idUsuario = @idUsuario;

        -- Defaults
        IF @fechaObjetivo IS NULL SET @fechaObjetivo = GETDATE();
        
        -- Validación %
        IF @porcentaje < 0 OR @porcentaje > 100
             THROW 50020, 'El porcentaje debe estar entre 0 y 100.', 1;

        -- Normalización Hecha
        IF @estado = 'Hecha' SET @porcentaje = 100;

        -- Validaciones de Padre
        IF @idTareaPadre IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND activo = 1)
                THROW 50021, 'La tarea padre no existe o no está activa.', 1;
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, creadorCarnet, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo, semana,
            idAsignado, asignadoCarnet
        )
        VALUES (
            @nombre, @idUsuario, @creadorCarnet, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1, @semana,
            @idResponsable, @responsableCarnet
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        -- Asignación Responsable (ALWAYS insert if provided, to ensure visibility in joined views)
        IF @idResponsable IS NOT NULL
        BEGIN
            -- Avoid duplicate assignment if some trigger or other logic already did it
            IF NOT EXISTS (SELECT 1 FROM dbo.p_TareaAsignados WHERE idTarea = @idTarea AND idUsuario = @idResponsable AND tipo = 'Responsable')
            BEGIN
                INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
                VALUES (@idTarea, @idResponsable, @responsableCarnet, 'Responsable', GETDATE());
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

-- 3. Actualizar la versión legacy por si acaso
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_CrearCompleta
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
    -- Llamar a la v2 para centralizar lógica
    EXEC dbo.sp_Tarea_CrearCompleta_v2 
        @nombre, @idUsuario, @idProyecto, @descripcion, @idTareaPadre, @idResponsable,
        @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo,
        @porcentaje, @orden, @comportamiento, @requiereEvidencia, @idEntregable;
END
GO
