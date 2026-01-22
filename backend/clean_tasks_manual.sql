-- ⚠️ ADVERTENCIA: ESTO BORRARÁ TODAS LAS TAREAS Y DATOS RELACIONADOS ⚠️
-- Ejecutar en SQL Server Management Studio o Azure Data Studio

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Deshabilitar todas las restricciones (Foreign Keys) para permitir el borrado en cualquier orden
    PRINT 'Deshabilitando constraints...';
    EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all";

    -- 2. Limpiar tablas (Usamos DELETE para evitar restricciones de TRUNCATE con FKs, y luego RESEED)
    -- Orden sugerido (aunque con constraints desactivados no importa tanto)
    
    PRINT 'Limpiando p_TareaAsignacionLog...';
    DELETE FROM p_TareaAsignacionLog;
    DBCC CHECKIDENT ('p_TareaAsignacionLog', RESEED, 0);

    PRINT 'Limpiando p_CheckinTarea...';
    DELETE FROM p_CheckinTarea;
    DBCC CHECKIDENT ('p_CheckinTarea', RESEED, 0);

    PRINT 'Limpiando p_Checkin...';
    DELETE FROM p_Checkin;
    DBCC CHECKIDENT ('p_Checkin', RESEED, 0);

    PRINT 'Limpiando p_Bloqueo...';
    DELETE FROM p_Bloqueo;
    DBCC CHECKIDENT ('p_Bloqueo', RESEED, 0);

    PRINT 'Limpiando p_FocoDiario...';
    DELETE FROM p_FocoDiario;
    DBCC CHECKIDENT ('p_FocoDiario', RESEED, 0);

    PRINT 'Limpiando p_TareaAvanceMensual...';
    DELETE FROM p_TareaAvanceMensual;
    DBCC CHECKIDENT ('p_TareaAvanceMensual', RESEED, 0);

    -- Tablas principales
    PRINT 'Limpiando p_Nota...';
    DELETE FROM p_Nota;
    DBCC CHECKIDENT ('p_Nota', RESEED, 0);

    PRINT 'Limpiando p_Tarea...';
    DELETE FROM p_Tarea;
    DBCC CHECKIDENT ('p_Tarea', RESEED, 0);

    -- Logs (Opcional, comentar si se quieren mantener)
    PRINT 'Limpiando p_AuditLog...';
    DELETE FROM p_AuditLog;
    DBCC CHECKIDENT ('p_AuditLog', RESEED, 0);

    PRINT 'Limpiando p_LogSistema...';
    DELETE FROM p_LogSistema;
    DBCC CHECKIDENT ('p_LogSistema', RESEED, 0);

    -- 3. Reactivar las restricciones
    PRINT 'Reactivando constraints...';
    EXEC sp_msforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all";

    COMMIT TRANSACTION;
    PRINT '✅ Limpieza completada exitosamente.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ Error durante la limpieza: ' + ERROR_MESSAGE();
END CATCH;
