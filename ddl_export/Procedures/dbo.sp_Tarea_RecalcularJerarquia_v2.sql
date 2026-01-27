-- =============================================
-- 1. sp_Tarea_RecalcularJerarquia_v2
-- =============================================
CREATE   PROCEDURE dbo.sp_Tarea_RecalcularJerarquia_v2
(
    @idTareaInicio INT = NULL,
    @idPadreDirecto INT = NULL,
    @maxDepth INT = 10
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- El indice filtrado requiere estas opciones seteadas
    -- SET QUOTED_IDENTIFIER ON (Ya seteado al crear)
    -- SET ANSI_NULLS ON (Ya seteado al crear)
    
    DECLARE @idActual INT;
    DECLARE @nivel INT = 0;
    
    IF @idPadreDirecto IS NOT NULL
        SET @idActual = @idPadreDirecto;
    ELSE
        SELECT @idActual = idTareaPadre FROM dbo.p_Tareas WHERE idTarea = @idTareaInicio;

    -- Si no tiene padre, salir rapido
    IF @idActual IS NULL RETURN;

    -- BEGIN TRY -- Simplificado para debug, reactivar manejo errores completo en prod si se desea, 
    -- pero el core logic es el mismo. Mantenemos estructura original.
    BEGIN TRY
        -- Usar transaccion explicita solo si no hay una activa, o gestionarla con cuidado
        DECLARE @localTran BIT = 0;
        IF @@TRANCOUNT = 0 
        BEGIN
            BEGIN TRAN;
            SET @localTran = 1;
        END

        WHILE @idActual IS NOT NULL AND @nivel < @maxDepth
        BEGIN
             -- 1. Bloquear padre
            DECLARE @idPadreDeActual INT;
            DECLARE @estadoActual NVARCHAR(50);
            DECLARE @porcentajeActual INT;

            SELECT 
                @idPadreDeActual = idTareaPadre,
                @estadoActual = estado,
                @porcentajeActual = porcentaje
            FROM dbo.p_Tareas WITH (UPDLOCK, HOLDLOCK)
            WHERE idTarea = @idActual;

            If @@ROWCOUNT = 0 BREAK; -- Padre borrado o inexistente

            -- 2. Calcular hijos
            DECLARE @total INT = 0;
            DECLARE @sumNorm FLOAT = 0; -- Float para precision
            DECLARE @totalHechas INT = 0;

            -- CTE o Consulta directa
            SELECT 
                @total = COUNT(1),
                @sumNorm = SUM(
                    CASE 
                        WHEN estado = 'Hecha' THEN 100.0
                        ELSE ISNULL(CAST(porcentaje AS FLOAT), 0)
                    END
                ),
                @totalHechas = SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END)
            FROM dbo.p_Tareas 
            WHERE idTareaPadre = @idActual
              AND activo = 1 
              AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada');

            IF @total = 0 
            BEGIN
                -- Padre sin hijos validos (hijos borrados?). No recalcular.
                SET @idActual = @idPadreDeActual;
                SET @nivel += 1;
                CONTINUE; 
            END

            -- 3. Nuevos valores
            DECLARE @nuevoPromedio INT = ROUND(@sumNorm / @total, 0);
            IF @nuevoPromedio > 100 SET @nuevoPromedio = 100;

            DECLARE @nuevoEstado NVARCHAR(50) = 'Pendiente';
            
            IF @totalHechas = @total 
                SET @nuevoEstado = 'Hecha';
            ELSE IF @sumNorm > 0 OR EXISTS(SELECT 1 FROM dbo.p_Tareas WHERE idTareaPadre = @idActual AND estado = 'EnCurso')
                SET @nuevoEstado = 'EnCurso';

            -- 4. Update
            IF @porcentajeActual <> @nuevoPromedio OR @estadoActual <> @nuevoEstado
            BEGIN
                UPDATE dbo.p_Tareas
                SET porcentaje = @nuevoPromedio,
                    estado = @nuevoEstado
                WHERE idTarea = @idActual;
            END

            -- 5. Subir
            SET @idActual = @idPadreDeActual;
            SET @nivel += 1;
        END

        IF @localTran = 1 COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 AND @localTran = 1 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO