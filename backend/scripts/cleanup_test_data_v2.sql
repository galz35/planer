-- =========================================================================================
-- SCRIPT DE IDENTIFICACIÓN Y LIMPIEZA DE DATOS DE PRUEBA
-- =========================================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta primero la SECCIÓN 1 (SELECT) para ver qué se borrará.
-- 2. Si estás de acuerdo con los resultados, ejecuta la SECCIÓN 2 (DELETE).
--    Puedes ejecutar todo el bloque dentro de una transacción para mayor seguridad.
-- =========================================================================================

USE [Bdplaner];
GO

PRINT '>>> INICIANDO VERIFICACIÓN DE DATOS DE PRUEBA...';

-- =========================================================================================
-- SECCIÓN 1: IDENTIFICACIÓN (SOLO LECTURA)
-- Ejecuta esto para ver qué registros cumplen con el criterio de "basura/test".
-- =========================================================================================

PRINT '-----------------------------------------------------------------------------------';
PRINT 'CANDIDATOS A ELIMINAR EN PROYECTOS:';
PRINT '-----------------------------------------------------------------------------------';

SELECT 
    idProyecto, 
    nombre, 
    descripcion, 
    fechaCreacion, 
    creadorCarnet 
FROM p_Proyectos
WHERE 
       nombre LIKE '%test%' 
    OR nombre LIKE '%prueba%' 
    OR nombre LIKE '%demo%'
    OR nombre LIKE '%borrar%'
    OR nombre LIKE '%dummy%'
    OR nombre LIKE '%temp%'
    OR nombre LIKE '%asd%'    -- Teclazo común
    OR nombre LIKE '%qwe%'    -- Teclazo común
    OR descripcion LIKE '%test%' -- A veces la descripción lo delata
    OR descripcion LIKE '%prueba%';

PRINT '-----------------------------------------------------------------------------------';
PRINT 'CANDIDATOS A ELIMINAR EN TAREAS:';
PRINT '-----------------------------------------------------------------------------------';

SELECT 
    idTarea, 
    idProyecto, 
    nombre, 
    descripcion, 
    fechaCreacion 
FROM p_Tareas
WHERE 
       nombre LIKE '%test%' 
    OR nombre LIKE '%prueba%' 
    OR nombre LIKE '%demo%'
    OR nombre LIKE '%borrar%'
    OR nombre LIKE '%dummy%'
    OR nombre LIKE '%temp%'
    OR nombre LIKE '%asd%'
    OR nombre LIKE '%qwe%'
    OR descripcion LIKE '%test%'
    OR descripcion LIKE '%prueba%';

GO

-- =========================================================================================
-- SECCIÓN 2: ELIMINACIÓN (PELIGRO - DESCOMENTAR PARA EJECUTAR)
-- =========================================================================================

/* 
-- DESCOMENTA DESDE AQUÍ HACIA ABAJO PARA BORRAR

BEGIN TRANSACTION; -- Inicia transacción por seguridad

BEGIN TRY
    -- 1. Eliminar Tareas de Prueba (y sus dependencias si no hay ON DELETE CASCADE)
    -- Primero borramos asignaciones, checkins asociados, etc.
    
    -- Identificar IDs de tareas a borrar
    DECLARE @TareasBorrar TABLE (id INT);
    INSERT INTO @TareasBorrar (id)
    SELECT idTarea FROM p_Tareas
    WHERE 
           nombre LIKE '%test%' 
        OR nombre LIKE '%prueba%' 
        OR nombre LIKE '%demo%'
        OR nombre LIKE '%borrar%'
        OR nombre LIKE '%dummy%'
        OR nombre LIKE '%temp%'
        OR nombre LIKE '%asd%'
        OR nombre LIKE '%qwe%';

    PRINT 'Eliminando dependencias de Tareas...';
    DELETE FROM p_TareaAsignados WHERE idTarea IN (SELECT id FROM @TareasBorrar);
    DELETE FROM p_CheckinTareas WHERE idTarea IN (SELECT id FROM @TareasBorrar);
    -- Agrega aquí otras tablas dependientes si existen (ej. Comentarios, Historial)

    PRINT 'Eliminando Tareas...';
    DELETE FROM p_Tareas WHERE idTarea IN (SELECT id FROM @TareasBorrar);


    -- 2. Eliminar Proyectos de Prueba
    -- Identificar IDs de proyectos a borrar
    DECLARE @ProyectosBorrar TABLE (id INT);
    INSERT INTO @ProyectosBorrar (id)
    SELECT idProyecto FROM p_Proyectos
    WHERE 
           nombre LIKE '%test%' 
        OR nombre LIKE '%prueba%' 
        OR nombre LIKE '%demo%'
        OR nombre LIKE '%borrar%'
        OR nombre LIKE '%dummy%'
        OR nombre LIKE '%temp%'
        OR nombre LIKE '%asd%'
        OR nombre LIKE '%qwe%';

    -- Borrar tareas asociadas a estos proyectos (si quedaron algunas que no se llamaban "test")
    -- Si borras un proyecto de "Prueba", sus tareas (aunque se llamen "Realizar Informe") deberían irse.
    PRINT 'Eliminando Tareas huerfanas de los Proyectos a borrar...';
    DELETE FROM p_TareaAsignados WHERE idTarea IN (SELECT idTarea FROM p_Tareas WHERE idProyecto IN (SELECT id FROM @ProyectosBorrar));
    DELETE FROM p_CheckinTareas WHERE idTarea IN (SELECT idTarea FROM p_Tareas WHERE idProyecto IN (SELECT id FROM @ProyectosBorrar));
    DELETE FROM p_Tareas WHERE idProyecto IN (SELECT id FROM @ProyectosBorrar);

    PRINT 'Eliminando Proyectos...';
    DELETE FROM p_Proyectos WHERE idProyecto IN (SELECT id FROM @ProyectosBorrar);

    COMMIT TRANSACTION;
    PRINT '>>> ELIMINACIÓN EXITOSA Y CONFIRMADA.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '>>> ERROR: SE HA CANCELADO LA OPERACIÓN. NADA FUE BORRADO.';
    PRINT ERROR_MESSAGE();
END CATCH

*/
