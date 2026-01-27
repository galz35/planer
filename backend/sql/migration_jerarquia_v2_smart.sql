/*
    MIGRACIÓN: SOPORTE DE JERARQUÍA INTELIGENTE v2.1 (Clarity)
    Objetivo: Implementar subtareas con integridad referencial, cálculo automático de progreso (Roll-up)
              y protección contra ciclos y concurrencia.
    
    Orden de Compilación:
    1. Schema Hardening (Tablas, Índices, Constraints)
    2. SPs de Validación y Creación
    3. SP de Inteligencia (Recálculo Recursivo)
*/

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

USE [Bdplaner];
GO

-- ==============================================================================
-- 1. SCHEMA HARDENING (Integridad + Performance)
-- ==============================================================================

-- 1.1 Asegurar columnas base en p_Tareas
IF COL_LENGTH('dbo.p_Tareas', 'idTareaPadre') IS NULL
    ALTER TABLE dbo.p_Tareas ADD idTareaPadre INT NULL;

IF COL_LENGTH('dbo.p_Tareas', 'semana') IS NULL
    ALTER TABLE dbo.p_Tareas ADD semana INT NULL;
GO

-- 1.2 Constraint Anti-Auto-Referencia (Nivel 1 de protección)
-- Evita errores triviales donde una tarea es su propio padre
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_p_Tareas_NoSelfParent')
BEGIN
    ALTER TABLE dbo.p_Tareas ADD CONSTRAINT CK_p_Tareas_NoSelfParent
    CHECK (idTareaPadre IS NULL OR idTareaPadre <> idTarea);
END
GO

-- 1.3 Foreign Key con Protección de Huérfanos
-- ON DELETE NO ACTION: Impide borrar una tarea si tiene subtareas activas asignadas.
-- Obliga al usuario a reasignar o borrar los hijos primero.
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_p_Tareas_Padre')
BEGIN
    ALTER TABLE dbo.p_Tareas WITH CHECK ADD CONSTRAINT FK_p_Tareas_Padre
    FOREIGN KEY (idTareaPadre) REFERENCES dbo.p_Tareas(idTarea)
    ON DELETE NO ACTION;
END
GO

-- 1.4 Índice Optimizado para Roll-up y Listados
-- Cubre todas las columnas necesarias para el cálculo de promedios sin ir al Heap.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_p_Tareas_Jerarquia')
BEGIN
    CREATE INDEX IX_p_Tareas_Jerarquia
    ON dbo.p_Tareas (idTareaPadre, activo)
    INCLUDE (idTarea, estado, porcentaje, idProyecto, orden)
    WHERE (idTareaPadre IS NOT NULL AND activo = 1); -- Índice filtrado para máxima velocidad
END
GO

-- ==============================================================================
-- 2. PROCEDIMIENTOS DE VALIDACIÓN E INSERCIÓN
-- ==============================================================================

-- 2.1 Validación Anti-Ciclos (Profunda)
-- Detecta si al asignar un nuevo padre se crearía un ciclo indirecto (A->B->A)
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_ValidarNoCiclo
(
    @idTarea INT,
    @idNuevoPadre INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Caso trivial
    IF @idTarea = @idNuevoPadre
        THROW 50010, 'Ciclo detectado: una tarea no puede ser su propio padre.', 1;

    DECLARE @found BIT = 0;

    -- CTE Recursivo para verificar si @idNuevoPadre es descendiente de @idTarea
    ;WITH SubArbol AS (
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.idTarea = @idTarea

        UNION ALL

        SELECT h.idTarea
        FROM dbo.p_Tareas h
        INNER JOIN SubArbol s ON h.idTareaPadre = s.idTarea
        WHERE h.activo = 1
    )
    SELECT TOP 1 @found = 1 FROM SubArbol WHERE idTarea = @idNuevoPadre;

    IF @found = 1
        THROW 50011, 'Ciclo detectado: el nuevo padre es descendiente de la tarea actual.', 1;
END
GO

-- 2.2 Creación Robusta (Atómica)
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
            -- Existencia
            IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND activo = 1)
                THROW 50021, 'La tarea padre no existe o no está activa.', 1;

            -- Consistencia Proyecto (Opcional según regla de negocio, aquí estricta)
            IF @idProyecto IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND idProyecto = @idProyecto)
                    THROW 50022, 'La tarea padre debe pertenecer al mismo proyecto.', 1;
            END
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo, semana
        )
        VALUES (
            @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1, @semana
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        -- Asignación Responsable (Si difiere de creador)
        IF @idResponsable IS NOT NULL AND @idResponsable <> @idUsuario
        BEGIN
            INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion)
            VALUES (@idTarea, @idResponsable, 'Responsable', GETDATE());
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


-- ==============================================================================
-- 3. MOTOR DE INTELIGENCIA (Roll-up Recurrente)
-- ==============================================================================

-- Recalcula recursivamente el estado y progreso de los ancestros.
-- Utiliza mecanismo Set-Based y Locks para concurrencia segura.
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_v2
(
    @idTareaInicio INT = NULL, -- Opcional: Si se da, buscamos su padre
    @idPadreDirecto INT = NULL, -- Opcional: Si se da, empezamos desde aquí (para viejos padres)
    @maxDepth INT = 10
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idActual INT;
    DECLARE @nivel INT = 0;
    
    IF @idPadreDirecto IS NOT NULL
        SET @idActual = @idPadreDirecto;
    ELSE
        SELECT @idActual = idTareaPadre FROM dbo.p_Tareas WHERE idTarea = @idTareaInicio;

    BEGIN TRY
        BEGIN TRAN;

        WHILE @idActual IS NOT NULL AND @nivel < @maxDepth
        BEGIN
            -- 1. Bloquear fila del Padre para evitar condiciones de carrera (Lost Update)
            DECLARE @idPadreDeActual INT;
            DECLARE @estadoActual NVARCHAR(50);
            DECLARE @porcentajeActual INT;

            SELECT 
                @idPadreDeActual = idTareaPadre,
                @estadoActual = estado,
                @porcentajeActual = porcentaje
            FROM dbo.p_Tareas WITH (UPDLOCK, HOLDLOCK) -- LOCK EXCLUSIVO DE ACTUALIZACIÓN
            WHERE idTarea = @idActual;

            -- 2. Calcular nuevas métricas basadas en TODOS los hijos activos
            DECLARE @total INT = 0;
            DECLARE @sumNorm INT = 0;
            DECLARE @totalHechas INT = 0;

            ;WITH Hijos AS (
                SELECT 
                    estado,
                    -- Regla de Negocio: Si está Hecha, cuenta como 100% aunque el campo diga menos
                    CASE 
                        WHEN estado = 'Hecha' THEN 100
                        ELSE ISNULL(porcentaje, 0)
                    END AS porcNorm
                FROM dbo.p_Tareas WITH (READCOMMITTED) -- Lectura consistente
                WHERE idTareaPadre = @idActual
                  AND activo = 1 
                  AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada') -- Excluir basura
            )
            SELECT 
                @total = COUNT(1),
                @sumNorm = ISNULL(SUM(porcNorm), 0),
                @totalHechas = SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END)
            FROM Hijos;

            -- Caso Borde: Padre sin hijos válidos -> Modo Manual (No se toca)
            IF @total = 0 
            BEGIN
                -- Rompemos recursividad pero seguimos subiendo por si acaso (aunque raro)
                SET @idActual = @idPadreDeActual;
                SET @nivel += 1;
                CONTINUE; 
            END

            -- 3. Determinar Nuevos Valores
            DECLARE @nuevoPromedio INT = ROUND(CAST(@sumNorm AS FLOAT) / @total, 0);
            IF @nuevoPromedio > 100 SET @nuevoPromedio = 100;

            DECLARE @nuevoEstado NVARCHAR(50) = 'Pendiente';
            
            IF @totalHechas = @total 
                SET @nuevoEstado = 'Hecha';
            ELSE IF @sumNorm > 0 OR EXISTS(SELECT 1 FROM dbo.p_Tareas WHERE idTareaPadre = @idActual AND estado = 'EnCurso')
                SET @nuevoEstado = 'EnCurso';
            
            -- Mantener estado 'Bloqueada' si ya lo estaba (Regla opcional conservadora)
            -- IF @estadoActual = 'Bloqueada' SET @nuevoEstado = 'Bloqueada';

            -- 4. Update Idempotente (Solo si cambió algo real)
            IF @porcentajeActual <> @nuevoPromedio OR @estadoActual <> @nuevoEstado
            BEGIN
                UPDATE dbo.p_Tareas
                SET porcentaje = @nuevoPromedio,
                    estado = @nuevoEstado,
                    -- fechaActualizacion = GETDATE() -- Si tienes esta columna
                    fechaActualizacion = GETDATE() -- Nombre común en schemas legacy
                WHERE idTarea = @idActual;
            END

            -- 5. Subir al siguiente nivel (Recursividad)
            SET @idActual = @idPadreDeActual;
            SET @nivel += 1;
        END
        
        IF @nivel >= @maxDepth
        BEGIN
            -- Log warning (opcional) o error silencioso
            PRINT 'Warning: Max recursion depth reached in sp_Tarea_RecalcularJerarquia_v2';
        END

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO
