USE Bdplaner;
GO

-- ============================================================
-- ACTUALIZACIÓN ESQUEMA CLARITY (TAREAS, CHECKINS)
-- ============================================================

-- 1. Actualizar p_Tareas
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'fechaInicioPlanificada' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    ALTER TABLE p_Tareas ADD fechaInicioPlanificada DATETIME NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'tipo' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    ALTER TABLE p_Tareas ADD tipo NVARCHAR(50) DEFAULT 'Administrativa';
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'esfuerzo' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    ALTER TABLE p_Tareas ADD esfuerzo NVARCHAR(20) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'idCreador' AND Object_ID = Object_ID(N'p_Tareas'))
BEGIN
    ALTER TABLE p_Tareas ADD idCreador INT NULL;
END

-- 2. Actualizar p_Checkins 
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'entregableTexto' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD entregableTexto NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'nota' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD nota NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'linkEvidencia' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD linkEvidencia NVARCHAR(MAX) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'estadoAnimo' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD estadoAnimo NVARCHAR(50) NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'idNodo' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD idNodo INT NULL;
END

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'fechaCreacion' AND Object_ID = Object_ID(N'p_Checkins'))
BEGIN
    ALTER TABLE p_Checkins ADD fechaCreacion DATETIME DEFAULT GETDATE();
END

-- 3. Actualizar p_TareaAsignados
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'tipo' AND Object_ID = Object_ID(N'p_TareaAsignados'))
BEGIN
    ALTER TABLE p_TareaAsignados ADD tipo NVARCHAR(50) DEFAULT 'Responsable';
END

PRINT '✅ Actualización de esquema Clarity completada.';
GO
