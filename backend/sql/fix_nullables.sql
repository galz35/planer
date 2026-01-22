USE Bdplaner;
GO

-- ============================================================
-- SCRIPT DE AJUSTE DE NULLABLES
-- Para permitir Tareas sin Proyecto (Inbox) y evitar error 500
-- ============================================================

PRINT 'Ajustando restricciones de nulabilidad...';

-- 1. Permitir idProyecto NULL en p_Tareas
-- Verificar si ya es nullable (IS_NULLABLE = 'YES') o forzarlo
BEGIN TRY
    ALTER TABLE p_Tareas ALTER COLUMN idProyecto INT NULL;
    PRINT '✅ p_Tareas.idProyecto ahora permite NULL (Support for Inbox tasks).';
END TRY
BEGIN CATCH
    PRINT '❌ Error alterando p_Tareas.idProyecto: ' + ERROR_MESSAGE();
    -- Puede fallar si hay índices dependientes
END CATCH

-- 2. Asegurar que idAsignado sea NULL (si no lo es)
BEGIN TRY
    ALTER TABLE p_Tareas ALTER COLUMN idAsignado INT NULL;
    PRINT '✅ p_Tareas.idAsignado asegurado como NULL.';
END TRY
BEGIN CATCH
    PRINT '⚠️ Nota sobre idAsignado: ' + ERROR_MESSAGE();
END CATCH

GO
