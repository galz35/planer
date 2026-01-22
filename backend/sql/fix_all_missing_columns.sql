USE Bdplaner;
GO

-- ============================================================
-- SCRIPT DE REPARACIÓN DE ESQUEMA (EMERGENCIA)
-- Basado en diagnóstico real de diferencias.
-- ============================================================

PRINT 'Iniciando reparación de esquema...';

-- 1. REPARAR TABLA p_Tareas
-- Faltan columnas críticas que el backend intenta insertar
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'fechaInicioPlanificada' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    PRINT 'Agregando fechaInicioPlanificada a p_Tareas...';
    ALTER TABLE p_Tareas ADD fechaInicioPlanificada DATETIME NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'tipo' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    PRINT 'Agregando tipo a p_Tareas...';
    ALTER TABLE p_Tareas ADD tipo NVARCHAR(50) DEFAULT 'Administrativa';
    -- Si existe tipoTarea, migramos datos opcionalmente
    -- IF EXISTS(SELECT * FROM sys.columns WHERE Name = N'tipoTarea' AND Object_ID = Object_ID(N'p_Tareas'))
    --    UPDATE p_Tareas SET tipo = tipoTarea WHERE tipoTarea IS NOT NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'esfuerzo' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    PRINT 'Agregando esfuerzo a p_Tareas...';
    ALTER TABLE p_Tareas ADD esfuerzo NVARCHAR(20) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'idCreador' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    PRINT 'Agregando idCreador a p_Tareas...';
    ALTER TABLE p_Tareas ADD idCreador INT NULL;
END

-- 2. REPARAR TABLA p_Checkins
-- Faltan MUCHAS columnas. La tabla actual es legacy.
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'entregableTexto' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando entregableTexto a p_Checkins...';
    ALTER TABLE p_Checkins ADD entregableTexto NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'nota' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando nota a p_Checkins...';
    ALTER TABLE p_Checkins ADD nota NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'linkEvidencia' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando linkEvidencia a p_Checkins...';
    ALTER TABLE p_Checkins ADD linkEvidencia NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'estadoAnimo' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando estadoAnimo a p_Checkins...';
    ALTER TABLE p_Checkins ADD estadoAnimo NVARCHAR(50) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'idNodo' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando idNodo a p_Checkins...';
    ALTER TABLE p_Checkins ADD idNodo INT NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'fechaCreacion' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    PRINT 'Agregando fechaCreacion a p_Checkins...';
    -- Si existe creadoEn, lo usamos o ignoramos. Mejor crear el que espera el codigo.
    ALTER TABLE p_Checkins ADD fechaCreacion DATETIME DEFAULT GETDATE();
END

-- 3. REPARAR TABLA p_TareaAsignados
-- Verificar columna tipo ('Responsable', 'Colaborador')
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'tipo' AND Object_ID = Object_ID(N'p_TareaAsignados'))
BEGIN
    PRINT 'Agregando tipo a p_TareaAsignados...';
    ALTER TABLE p_TareaAsignados ADD tipo NVARCHAR(50) DEFAULT 'Responsable';
END

PRINT '✅ REPARACIÓN DE ESQUEMA COMPLETADA EXITOSAMENTE.';
GO
