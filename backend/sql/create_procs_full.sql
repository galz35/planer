USE Bdplaner;
GO

-- ============================================================
-- PAQUETE DE PROCEDIMIENTOS ALMACENADOS - MIGRACIÓN FINAL
-- ============================================================

PRINT 'Creando SP: sp_Tarea_Crear...';
GO
CREATE OR ALTER PROCEDURE sp_Tarea_Crear
    @nombre NVARCHAR(200),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO p_Tareas (
        nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, fechaCreacion, fechaActualizacion
    )
    VALUES (
        @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, GETDATE(), GETDATE()
    );

    SELECT SCOPE_IDENTITY() AS idTarea;
END
GO

PRINT 'Creando SP: sp_Checkin_Crear...';
GO
CREATE OR ALTER PROCEDURE sp_Checkin_Crear
    @idUsuario INT,
    @fecha DATE,
    @entregableTexto NVARCHAR(MAX),
    @nota NVARCHAR(MAX) = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @estadoAnimo NVARCHAR(50) = NULL,
    @idNodo INT = NULL,
    @energia INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Upsert simple: Si ya existe checkin para ese usuario/fecha, actualizar. Si no, insertar.
    MERGE p_Checkins AS target
    USING (SELECT @idUsuario, @fecha) AS source (idUsuario, fecha)
    ON (target.idUsuario = source.idUsuario AND target.fecha = source.fecha)
    WHEN MATCHED THEN
        UPDATE SET 
            entregableTexto = @entregableTexto,
            nota = @nota,
            linkEvidencia = @linkEvidencia,
            estadoAnimo = @estadoAnimo,
            idNodo = @idNodo,
            energia = @energia,
            fechaCreacion = GETDATE() -- o fechaActualizacion si existiera
    WHEN NOT MATCHED THEN
        INSERT (idUsuario, fecha, entregableTexto, nota, linkEvidencia, estadoAnimo, idNodo, energia, fechaCreacion)
        VALUES (@idUsuario, @fecha, @entregableTexto, @nota, @linkEvidencia, @estadoAnimo, @idNodo, @energia, GETDATE());
    
    -- Devolver ID (si insertó) o buscarlo
    SELECT idCheckin FROM p_Checkins WHERE idUsuario = @idUsuario AND fecha = @fecha;
END
GO

PRINT 'Creando SP: sp_Organizacion_ObtenerArbol...';
GO
CREATE OR ALTER PROCEDURE sp_Organizacion_ObtenerArbol
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id as idorg, nombre, tipo, idPadre as padre, orden, activo 
    FROM p_OrganizacionNodos 
    WHERE activo = 1;
END
GO

PRINT 'Creando SP: sp_Visibilidad_ObtenerCarnets (Complex Logic)...';
GO
CREATE OR ALTER PROCEDURE sp_Visibilidad_ObtenerCarnets
    @carnetSolicitante NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Logic portada de acceso.repo.ts -> CTE Recursiva
    WITH IsAdmin AS (
        SELECT 1 AS EsAdmin 
        FROM p_Usuarios 
        WHERE carnet = @carnetSolicitante 
          AND (rolGlobal IN ('ADMIN', 'ROOT') OR idRol = 1)
    ),
    Actores AS (
        SELECT carnet, idUsuario, idOrg 
        FROM p_Usuarios 
        WHERE carnet = @carnetSolicitante
    ),
    Subordinados AS (
        SELECT carnet
        FROM p_Usuarios
        WHERE jefeCarnet = @carnetSolicitante AND activo = 1
    ),
    VisiblesPuntual AS (
        SELECT carnet_delegante AS carnet
        FROM p_delegacion_visibilidad
        WHERE carnet_delegado = @carnetSolicitante AND activo = 1
        AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
        AND (fecha_fin IS NULL OR fecha_fin >= GETDATE())
        UNION ALL
        SELECT carnet_objetivo AS carnet
        FROM p_permiso_empleado
        WHERE carnet_recibe = @carnetSolicitante AND activo = 1 
        AND tipo_acceso = 'ALLOW'
    ),
    NodosPermitidos AS (
        -- Permisos por Area (Recursivo Nodos)
        SELECT CAST(pa.idorg_raiz AS NVARCHAR(50)) as idorg
        FROM p_permiso_area pa
        JOIN Actores a ON a.carnet = pa.carnet_recibe
        WHERE pa.activo = 1 
        AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
        
        UNION ALL
        
        -- Recursión Hijos
        SELECT CAST(n.id AS NVARCHAR(50))
        FROM p_OrganizacionNodos n
        JOIN NodosPermitidos np ON CAST(n.idPadre AS NVARCHAR(50)) = np.idorg
        WHERE n.activo = 1
    ),
    VisiblesArea AS (
        SELECT u.carnet
        FROM p_Usuarios u
        JOIN NodosPermitidos np ON CAST(u.idOrg AS NVARCHAR(50)) = np.idorg
        WHERE u.activo = 1
    ),
    Excluidos AS (
        SELECT pe.carnet_objetivo AS carnet
        FROM p_permiso_empleado pe
        JOIN Actores a ON a.carnet = pe.carnet_recibe
        WHERE pe.activo = 1
        AND pe.tipo_acceso = 'DENY'
    ),
    TodoVisible AS (
        SELECT carnet FROM Actores
        UNION ALL
        SELECT carnet FROM Subordinados
        UNION ALL
        SELECT carnet FROM VisiblesPuntual
        UNION ALL
        SELECT carnet FROM VisiblesArea
        UNION ALL
        SELECT carnet FROM p_Usuarios WHERE activo = 1 AND EXISTS (SELECT 1 FROM IsAdmin)
    )
    SELECT DISTINCT tv.carnet
    FROM TodoVisible tv
    WHERE tv.carnet IS NOT NULL AND tv.carnet <> ''
    AND (EXISTS (SELECT 1 FROM IsAdmin) OR NOT EXISTS (
        SELECT 1 FROM Excluidos e WHERE e.carnet = tv.carnet
    ));
END
GO

PRINT '✅ Todos los SPs creados exitosamente.';
GO
