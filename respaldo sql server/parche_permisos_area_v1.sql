/* 
   PATCH: Soporte para Permisos de Área con DENY y Visibilidad Real
   Fecha: 2026-02-06
   Objetivo: 
   1. Agregar tipo_acceso (ALLOW/DENY) a p_permiso_area.
   2. Actualizar SP de creación.
   3. Actualizar SP de cálculo de visibilidad para que realmente use los permisos de área.
*/

SET NOCOUNT ON;
GO

/* 1. Modificar tabla p_permiso_area */
IF COL_LENGTH('dbo.p_permiso_area', 'tipo_acceso') IS NULL
BEGIN
    PRINT 'Agregando columna tipo_acceso a p_permiso_area...';
    ALTER TABLE dbo.p_permiso_area ADD tipo_acceso NVARCHAR(20) DEFAULT ('ALLOW');
END
GO
-- Asegurar valores por defecto
UPDATE dbo.p_permiso_area SET tipo_acceso = 'ALLOW' WHERE tipo_acceso IS NULL;
GO

/* 2. Actualizar SP Crear Permiso Area */
IF OBJECT_ID('dbo.sp_PermisoArea_Crear', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_PermisoArea_Crear;
GO

CREATE PROCEDURE dbo.sp_PermisoArea_Crear
  @otorga  NVARCHAR(50) = NULL,
  @recibe  NVARCHAR(50),
  @idorg   BIGINT,
  @alcance NVARCHAR(50) = N'SUBARBOL',
  @motivo  NVARCHAR(500) = NULL,
  @fecha_fin NVARCHAR(50) = NULL,
  @tipo_acceso NVARCHAR(20) = 'ALLOW'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @r NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@recibe, N'')));
  IF (@r = N'')
  BEGIN
    RAISERROR('carnet_recibe requerido.', 16, 1);
    RETURN;
  END

  DECLARE @ff DATETIME = TRY_CONVERT(DATETIME, @fecha_fin);

  INSERT INTO dbo.p_permiso_area
    (carnet_otorga, carnet_recibe, idorg_raiz, alcance, motivo, activo, creado_en, fecha_fin, tipo_acceso)
  VALUES
    (NULLIF(LTRIM(RTRIM(@otorga)), N''), @r, @idorg, @alcance, @motivo, 1, GETDATE(), @ff, @tipo_acceso);

  SELECT SCOPE_IDENTITY() AS id;
END;
GO

/* 3. Actualizar SP Visibilidad Obtener Carnets (Logica Completa) */
IF OBJECT_ID('dbo.sp_Visibilidad_ObtenerCarnets', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets;
GO

CREATE PROCEDURE dbo.sp_Visibilidad_ObtenerCarnets
  @carnetSolicitante NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetSolicitante, N'')));
  IF (@c = N'')
  BEGIN
    SELECT CAST(N'' AS NVARCHAR(50)) AS carnet WHERE 1=0;
    RETURN;
  END

  /* ---------------------------------------------------------
     Paso A: Definir "ACTORES" (Solicitante + Quien le delegó)
     --------------------------------------------------------- */
  DECLARE @Actores TABLE (carnet NVARCHAR(50) PRIMARY KEY);

  INSERT INTO @Actores(carnet)
  SELECT @c
  UNION
  SELECT DISTINCT LTRIM(RTRIM(dv.carnet_delegante))
  FROM dbo.p_delegacion_visibilidad dv
  WHERE LTRIM(RTRIM(dv.carnet_delegado)) = @c
    AND dv.activo = 1
    AND (dv.fecha_inicio IS NULL OR dv.fecha_inicio <= GETDATE())
    AND (dv.fecha_fin    IS NULL OR dv.fecha_fin    >= GETDATE());

  /* ---------------------------------------------------------
     Paso B: Resolver Áreas Permitidas vs Bloqueadas
     --------------------------------------------------------- */
  -- Recolectar reglas de todos los actores
  DECLARE @AreaRules TABLE (idorg_raiz BIGINT, tipo_acceso NVARCHAR(20));
  
  INSERT INTO @AreaRules(idorg_raiz, tipo_acceso)
  SELECT DISTINCT pa.idorg_raiz, pa.tipo_acceso
  FROM dbo.p_permiso_area pa
  JOIN @Actores a ON LTRIM(RTRIM(pa.carnet_recibe)) = a.carnet
  WHERE pa.activo = 1;

  DECLARE @OrgsAllowed TABLE (idorg BIGINT PRIMARY KEY);
  DECLARE @OrgsDenied  TABLE (idorg BIGINT PRIMARY KEY);

  IF EXISTS (SELECT 1 FROM @AreaRules)
  BEGIN
      -- Expansión Recursiva de Áreas
      WITH OrgTree AS (
         -- Anchor
         SELECT o.idorg, o.padre, r.tipo_acceso
         FROM dbo.p_organizacion_nodos o
         JOIN @AreaRules r ON o.idorg = r.idorg_raiz
         
         UNION ALL
         
         -- Recursive
         SELECT c.idorg, c.padre, p.tipo_acceso
         FROM dbo.p_organizacion_nodos c
         JOIN OrgTree p ON c.padre = p.idorg
      )
      INSERT INTO @OrgsAllowed(idorg) 
      SELECT DISTINCT idorg FROM OrgTree WHERE tipo_acceso = 'ALLOW';

      -- Re-run CTE logic for Deny or filter above? 
      -- Simplest to re-run or split logic if large. For now, using separate insert for logic clarity 
      -- actually we can just select from OrgTree above if we insert into temp table or similar. 
      -- But CTE scope is single statement. Let's repeat for clarity and safety.
      
      WITH OrgTreeDeny AS (
         SELECT o.idorg, o.padre, r.tipo_acceso
         FROM dbo.p_organizacion_nodos o
         JOIN @AreaRules r ON o.idorg = r.idorg_raiz
         WHERE r.tipo_acceso = 'DENY'
         
         UNION ALL
         
         SELECT c.idorg, c.padre, p.tipo_acceso
         FROM dbo.p_organizacion_nodos c
         JOIN OrgTreeDeny p ON c.padre = p.idorg
      )
      INSERT INTO @OrgsDenied(idorg) 
      SELECT DISTINCT idorg FROM OrgTreeDeny;
  END

  /* ---------------------------------------------------------
     Paso C: Unificar Fuentes de Visibilidad
     --------------------------------------------------------- */
  
  -- 1. Jerarquía (Descendiente)
  -- Nota: Necesitamos recursividad desde CADA actor.
  ;WITH Jerarquia AS (
      SELECT u.carnet
      FROM dbo.p_Usuarios u
      JOIN @Actores a ON LTRIM(RTRIM(u.carnet)) = a.carnet
      
      UNION ALL
      
      SELECT u.carnet
      FROM dbo.p_Usuarios u
      JOIN Jerarquia j ON LTRIM(RTRIM(u.jefeCarnet)) = j.carnet
      WHERE u.activo = 1 AND u.carnet IS NOT NULL
  )
  
  SELECT DISTINCT LTRIM(RTRIM(Final.carnet)) AS carnet
  FROM (
      -- Fuente 1: Jerarquía
      SELECT carnet FROM Jerarquia
      
      UNION ALL
      
      -- Fuente 2: Permisos DIRECTOS (ALLOW)
      SELECT pe.carnet_objetivo
      FROM dbo.p_permiso_empleado pe
      JOIN @Actores a ON LTRIM(RTRIM(pe.carnet_recibe)) = a.carnet
      WHERE pe.activo = 1 
        AND (pe.tipo_acceso IS NULL OR pe.tipo_acceso = 'ALLOW')
        
      UNION ALL
      
      -- Fuente 3: Permisos AREA (ALLOW) - Usuarios que pertenecen a orgs permitidas
      SELECT u.carnet
      FROM dbo.p_Usuarios u
      JOIN @OrgsAllowed oa ON TRY_CAST(u.idOrg AS BIGINT) = oa.idorg
      WHERE u.activo = 1
  ) Final
  WHERE 
    /* EXCLUSIONES (DENY) */
    Final.carnet NOT IN (
        -- Deny directo
        SELECT pe.carnet_objetivo
        FROM dbo.p_permiso_empleado pe
        JOIN @Actores a ON LTRIM(RTRIM(pe.carnet_recibe)) = a.carnet
        WHERE pe.activo = 1 AND pe.tipo_acceso = 'DENY'
        
        UNION ALL
        
        -- Deny area (Usuarios en orgs denegadas)
        SELECT u.carnet
        FROM dbo.p_Usuarios u
        JOIN @OrgsDenied od ON TRY_CAST(u.idOrg AS BIGINT) = od.idorg
    )
    AND LTRIM(RTRIM(Final.carnet)) <> N'';

END;
GO

PRINT 'Actualizacion de permisos completada correctamente.'
