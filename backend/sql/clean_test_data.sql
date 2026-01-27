
-- Script de Limpieza Mejorado (Gustavo Lira)
SET NOCOUNT ON;

DECLARE @idUsuario INT = 23; -- Gustavo Lira
DECLARE @pattern NVARCHAR(100) = 'TEST%';

PRINT 'Iniciando limpieza profunda...';

-- 1. CheckinTareas (Detalle de checkins asociados a tareas a borrar)
DELETE ct
FROM p_CheckinTareas ct
INNER JOIN p_Tareas t ON ct.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 2. Asignaciones
DELETE ta
FROM p_TareaAsignados ta
INNER JOIN p_Tareas t ON ta.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 3. Focos (Si existe tabla p_Foco)
-- DELETE f FROM p_Foco f INNER JOIN p_Tareas t ON f.idTarea = t.idTarea WHERE ...

-- 4. Bloqueos
DELETE b
FROM p_Bloqueos b
INNER JOIN p_Tareas t ON b.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 5. Solicitudes Cambio
DELETE s
FROM p_SolicitudesCambio s
INNER JOIN p_Tareas t ON s.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 5.4 TareaInstancia (Hija de Recurrencia)
DELETE ti
FROM p_TareaInstancia ti
INNER JOIN p_TareaRecurrencia r ON ti.idRecurrencia = r.id
INNER JOIN p_Tareas t ON r.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 5.5 Recurrencia
DELETE r
FROM p_TareaRecurrencia r
INNER JOIN p_Tareas t ON r.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 5.6 TareaAvanceMensual
DELETE tam
FROM p_TareaAvanceMensual tam
INNER JOIN p_Tareas t ON tam.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario OR t.nombre LIKE @pattern;

-- 6. Tareas Hijas
DELETE h
FROM p_Tareas h
INNER JOIN p_Tareas p ON h.idTareaPadre = p.idTarea
WHERE (p.idCreador = @idUsuario OR p.nombre LIKE @pattern);

-- 7. Tareas Padres (o sueltas)
DELETE FROM p_Tareas 
WHERE idCreador = @idUsuario OR nombre LIKE @pattern;

PRINT 'Limpieza completada.';
GO
