/* ========================================================================
   REFACTORIZACIÓN DE AUDITORÍA: CARNET-FIRST
   Objetivo: Eliminar dependencia de idUsuario en auditoría y usar Carnet.
   ======================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* ------------------------------------------------------------------------
   1. Agregar columna 'carnet' a p_Auditoria (si no existe)
   ------------------------------------------------------------------------ */
IF COL_LENGTH('dbo.p_Auditoria', 'carnet') IS NULL
BEGIN
    PRINT 'Agregando columna carnet a p_Auditoria...';
    ALTER TABLE dbo.p_Auditoria ADD carnet NVARCHAR(50) NULL;
END
GO

/* ------------------------------------------------------------------------
   2. Backfill: Llenar 'carnet' basado en 'idUsuario' existente
   ------------------------------------------------------------------------ */
PRINT 'Actualizando carnets históricos en auditoría...';
UPDATE a
SET a.carnet = u.carnet
FROM dbo.p_Auditoria a
INNER JOIN dbo.p_Usuarios u ON a.idUsuario = u.idUsuario
WHERE a.carnet IS NULL;
GO

/* ------------------------------------------------------------------------
   3. SP: sp_Auditoria_Crear (Nuevo, Carnet-First)
   ------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Crear
    @carnet NVARCHAR(50),
    @accion NVARCHAR(255),
    @entidad NVARCHAR(100),
    @entidadId NVARCHAR(100),
    @datosAnteriores NVARCHAR(MAX) = NULL,
    @datosNuevos NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @idUsuario INT;
    
    -- Intentar resolver ID solo para compatibilidad (Foreign Key si existe), pero el driver principal es Carnet
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    INSERT INTO dbo.p_Auditoria (
        idUsuario, 
        carnet, 
        accion, 
        entidad, 
        entidadId, 
        datosAnteriores, 
        datosNuevos, 
        fecha
    )
    VALUES (
        @idUsuario,     -- Puede ser NULL si el usuario físico ya no existe, pero carnet queda
        @carnet, 
        @accion, 
        @entidad, 
        @entidadId, 
        @datosAnteriores, 
        @datosNuevos, 
        GETDATE()
    );
END
GO

/* ------------------------------------------------------------------------
   4. SP: sp_Auditoria_Equipo_PorCarnet (Lectura Carnet-First)
   ------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet
(
    @carnetSolicitante VARCHAR(20),
    @searchTerm        NVARCHAR(100) = NULL,
    @page              INT = 1,
    @pageSize          INT = 50
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Normalizar inputs
    SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));

    -- 1. Obtener "bolsa" de carnets visibles (Equipo + Permisos)
    DECLARE @Equipo TABLE (carnet VARCHAR(20) PRIMARY KEY);
        
    -- Usamos el SP de visibilidad existente para llenar la tabla temporal
    INSERT INTO @Equipo (carnet)
    EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

    -- Si no hay equipo, pero soy yo mismo, al menos me incluyo a mí (seguridad)
    IF NOT EXISTS (SELECT 1 FROM @Equipo)
    BEGIN
        INSERT INTO @Equipo VALUES (@carnetSolicitante);
    END

    -- 2. Query Principal: Join con p_Usuarios por CARNET, no por ID
    SELECT 
        a.id as idAuditLog, -- o el nombre de tu PK
        a.carnet,
        u.nombreCompleto as usuario, -- Nombre legible
        u.correo as correoUsuario,
        a.accion,
        a.entidad as recurso,
        a.entidadId as recursoId,
        a.datosAnteriores,
        a.datosNuevos,
        a.fecha,
        'Auditoria' as tipo
    FROM dbo.p_Auditoria a
    LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet -- JOIN ESTABLE POR CARNET
    WHERE a.carnet IN (SELECT carnet FROM @Equipo)
      AND (
          @searchTerm IS NULL 
          OR @searchTerm = ''
          OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
          OR a.accion LIKE '%' + @searchTerm + '%'
          OR a.entidadId LIKE '%' + @searchTerm + '%'
          OR a.carnet LIKE '%' + @searchTerm + '%'
      )
    ORDER BY a.fecha DESC
    OFFSET (@page - 1) * @pageSize ROWS FETCH NEXT @pageSize ROWS ONLY;
END
GO

/* ------------------------------------------------------------------------
   5. SP Auxiliar: Contar para paginación
   ------------------------------------------------------------------------ */
CREATE OR ALTER PROCEDURE dbo.sp_Auditoria_Equipo_PorCarnet_Contar
(
    @carnetSolicitante VARCHAR(20),
    @searchTerm        NVARCHAR(100) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));

    DECLARE @Equipo TABLE (carnet VARCHAR(20) PRIMARY KEY);
    INSERT INTO @Equipo (carnet)
    EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

    IF NOT EXISTS (SELECT 1 FROM @Equipo) INSERT INTO @Equipo VALUES (@carnetSolicitante);

    SELECT COUNT(*) as total
    FROM dbo.p_Auditoria a
    LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet
    WHERE a.carnet IN (SELECT carnet FROM @Equipo)
      AND (
          @searchTerm IS NULL 
          OR @searchTerm = ''
          OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
          OR a.accion LIKE '%' + @searchTerm + '%'
          OR a.entidadId LIKE '%' + @searchTerm + '%'
          OR a.carnet LIKE '%' + @searchTerm + '%'
      );
END
GO
