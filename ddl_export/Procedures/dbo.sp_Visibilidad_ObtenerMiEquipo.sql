/*==============================================================
  sp_Visibilidad_ObtenerMiEquipo  (Carnet-first)  FAST + SAFE
  FIX: evita "Error converting data type nvarchar to bigint"
       usando TRY_CONVERT(BIGINT, ...) y filtros.

  PERF:
  - Materializa usuarios activos en #UsuariosActivos (1 sola lectura)
  - Jerarquía sin OR (4 ramas UNION ALL) para mejor plan/index
==============================================================*/
CREATE   PROCEDURE dbo.sp_Visibilidad_ObtenerMiEquipo
(
    @idUsuario INT = NULL,
    @carnet    VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    /*--------------------------------------------
      1) Resolver carnet solicitante
    --------------------------------------------*/
    DECLARE @carnetSolicitante VARCHAR(20);
    SET @carnetSolicitante = NULLIF(LTRIM(RTRIM(@carnet)), '');

    IF @carnetSolicitante IS NULL AND @idUsuario IS NOT NULL
    BEGIN
        SELECT TOP (1)
            @carnetSolicitante = NULLIF(LTRIM(RTRIM(u.carnet)), '')
        FROM dbo.p_Usuarios u
        WHERE u.idUsuario = @idUsuario;
    END

    IF @carnetSolicitante IS NULL
    BEGIN
        SELECT
            CAST(NULL AS INT)           AS idUsuario,
            CAST(NULL AS VARCHAR(20))   AS carnet,
            CAST(NULL AS NVARCHAR(200)) AS nombreCompleto,
            CAST(NULL AS NVARCHAR(200)) AS correo,
            CAST(NULL AS NVARCHAR(200)) AS cargo,
            CAST(NULL AS NVARCHAR(200)) AS gerencia,
            CAST(NULL AS NVARCHAR(200)) AS orgGerencia,
            CAST(NULL AS NVARCHAR(200)) AS subgerencia,
            CAST(NULL AS NVARCHAR(200)) AS orgDepartamento,
            CAST(NULL AS NVARCHAR(200)) AS departamento,
            CAST(NULL AS BIGINT)        AS idOrg,
            CAST(NULL AS VARCHAR(20))   AS jefeCarnet,
            CAST(NULL AS INT)           AS nivel,
            CAST(NULL AS VARCHAR(30))   AS fuente
        WHERE 1 = 0;
        RETURN;
    END

    /*--------------------------------------------
      2) Cache de usuarios activos (1 lectura)
         - idOrgBigInt seguro con TRY_CONVERT
         - trims una sola vez (jefes/carnet)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#UsuariosActivos') IS NOT NULL DROP TABLE #UsuariosActivos;
    CREATE TABLE #UsuariosActivos
    (
        idUsuario        INT           NOT NULL,
        carnet           VARCHAR(20)   NOT NULL,
        nombreCompleto   NVARCHAR(200) NULL,
        correo           NVARCHAR(200) NULL,
        cargo            NVARCHAR(200) NULL,
        gerencia         NVARCHAR(200) NULL,
        orgGerencia      NVARCHAR(200) NULL,
        ogerencia        NVARCHAR(200) NULL,
        subgerencia      NVARCHAR(200) NULL,
        orgDepartamento  NVARCHAR(200) NULL,
        departamento     NVARCHAR(200) NULL,
        area             NVARCHAR(200) NULL,
        idOrgBigInt      BIGINT        NULL,
        jefeCarnet       VARCHAR(20)   NULL,
        carnet_jefe2     VARCHAR(20)   NULL,
        carnet_jefe3     VARCHAR(20)   NULL,
        carnet_jefe4     VARCHAR(20)   NULL,
        rolGlobal        NVARCHAR(200) NULL,
        PRIMARY KEY CLUSTERED (carnet)
    );

    INSERT INTO #UsuariosActivos
    (
        idUsuario, carnet, nombreCompleto, correo, cargo, gerencia,
        orgGerencia, ogerencia, subgerencia, orgDepartamento, departamento, area,
        idOrgBigInt, jefeCarnet, carnet_jefe2, carnet_jefe3, carnet_jefe4, rolGlobal
    )
    SELECT
        u.idUsuario,
        NULLIF(LTRIM(RTRIM(u.carnet)), '')                                           AS carnet,
        u.nombreCompleto,
        u.correo,
        u.cargo,
        u.gerencia,
        u.orgGerencia,
        u.ogerencia,
        u.subgerencia,
        u.orgDepartamento,
        u.departamento,
        u.area,
        TRY_CONVERT(BIGINT, u.idOrg)                                                 AS idOrgBigInt, -- FIX
        NULLIF(LTRIM(RTRIM(u.jefeCarnet)), '')                                       AS jefeCarnet,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe2)), '')                                     AS carnet_jefe2,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe3)), '')                                     AS carnet_jefe3,
        NULLIF(LTRIM(RTRIM(u.carnet_jefe4)), '')                                     AS carnet_jefe4,
        u.rolGlobal
    FROM dbo.p_Usuarios u
    WHERE u.activo = 1
      AND NULLIF(LTRIM(RTRIM(u.carnet)), '') IS NOT NULL;

    -- Índices para jerarquía (mejor que OR)
    CREATE NONCLUSTERED INDEX IX_UA_Jefe1 ON #UsuariosActivos (jefeCarnet)   INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe2 ON #UsuariosActivos (carnet_jefe2) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe3 ON #UsuariosActivos (carnet_jefe3) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_Jefe4 ON #UsuariosActivos (carnet_jefe4) INCLUDE (carnet);
    CREATE NONCLUSTERED INDEX IX_UA_IdOrg ON #UsuariosActivos (idOrgBigInt)  INCLUDE (carnet);

    /*--------------------------------------------
      3) Admin => devolver todos (activos)
    --------------------------------------------*/
    IF EXISTS (
        SELECT 1
        FROM #UsuariosActivos u
        WHERE u.carnet = @carnetSolicitante
          AND (u.rolGlobal = 'Admin' OR u.rolGlobal LIKE '%Admin%')
    )
    BEGIN
        SELECT
            u.idUsuario,
            u.carnet,
            u.nombreCompleto,
            u.correo,
            u.cargo,
            u.gerencia,
            COALESCE(u.orgGerencia, u.ogerencia, u.gerencia)                         AS orgGerencia,
            u.subgerencia,
            COALESCE(u.orgDepartamento, u.subgerencia, u.departamento)               AS orgDepartamento,
            COALESCE(u.area, u.departamento)                                         AS departamento,
            u.idOrgBigInt                                                           AS idOrg,       -- SAFE
            u.jefeCarnet,
            1                                                                        AS nivel,
            'ADMIN'                                                                  AS fuente
        FROM #UsuariosActivos u
        WHERE u.carnet <> @carnetSolicitante
        ORDER BY u.nombreCompleto;
        RETURN;
    END

    /*--------------------------------------------
      4) Raíces de visibilidad (solicitante + delegantes)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Raices') IS NOT NULL DROP TABLE #Raices;
    CREATE TABLE #Raices
    (
        carnetRaiz VARCHAR(20) NOT NULL PRIMARY KEY,
        fuente     VARCHAR(30) NOT NULL
    );

    INSERT INTO #Raices(carnetRaiz, fuente)
    VALUES (@carnetSolicitante, 'SOLICITANTE');

    INSERT INTO #Raices(carnetRaiz, fuente)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '') AS carnetRaiz,
        'DELEGACION'                                   AS fuente
    FROM dbo.p_delegacion_visibilidad dv
    WHERE dv.activo = 1
      AND NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(dv.carnet_delegado)), '')  = @carnetSolicitante
      AND NOT EXISTS (
          SELECT 1
          FROM #Raices r
          WHERE r.carnetRaiz = NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), '')
      );

    /*--------------------------------------------
      5) Acumulador carnets visibles
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Carnets') IS NOT NULL DROP TABLE #Carnets;
    CREATE TABLE #Carnets
    (
        carnet VARCHAR(20) NOT NULL,
        nivel  INT         NULL,
        fuente VARCHAR(30) NOT NULL,
        CONSTRAINT PK_#Carnets PRIMARY KEY (carnet, fuente)
    );

    /*--------------------------------------------
      6) A) Jerarquía SIN OR (4 ramas) => más rápido
    --------------------------------------------*/
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT x.carnet, MIN(x.nivel) AS nivel, 'JERARQUIA' AS fuente
    FROM
    (
        SELECT u.carnet, 1 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.jefeCarnet = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 2 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe2 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 3 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe3 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante

        UNION ALL
        SELECT u.carnet, 4 AS nivel
        FROM #UsuariosActivos u
        INNER JOIN #Raices r ON u.carnet_jefe4 = r.carnetRaiz
        WHERE u.carnet <> @carnetSolicitante
    ) x
    GROUP BY x.carnet;

    /*--------------------------------------------
      7) B) Permisos por empleado (ALLOW)
    --------------------------------------------*/
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') AS carnet,
        1                                          AS nivel,
        'PERMISO_EMPLEADO'                         AS fuente
    FROM dbo.p_permiso_empleado pe
    INNER JOIN #Raices r
        ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1
      AND ISNULL(pe.tipo_acceso, 'ALLOW') = 'ALLOW'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') IS NOT NULL
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') <> @carnetSolicitante;

    /*--------------------------------------------
      8) C) Permisos por área (SUBARBOL / SOLO)
         FIX: idorg_raiz seguro con TRY_CONVERT
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#OrgPermitidos') IS NOT NULL DROP TABLE #OrgPermitidos;
    CREATE TABLE #OrgPermitidos
    (
        idorg BIGINT NOT NULL PRIMARY KEY
    );

    ;WITH Permisos AS
    (
        SELECT
            TRY_CONVERT(BIGINT, pa.idorg_raiz)                  AS idorg_raiz, -- FIX
            UPPER(ISNULL(pa.alcance, 'SUBARBOL'))               AS alcance
        FROM dbo.p_permiso_area pa
        INNER JOIN #Raices r
            ON NULLIF(LTRIM(RTRIM(pa.carnet_recibe)), '') = r.carnetRaiz
        WHERE pa.activo = 1
          AND pa.idorg_raiz IS NOT NULL
          AND TRY_CONVERT(BIGINT, pa.idorg_raiz) IS NOT NULL    -- FIX
    ),
    Subarbol AS
    (
        -- SOLO: solo el nodo raíz
        SELECT p.idorg_raiz AS idorg
        FROM Permisos p
        WHERE p.alcance = 'SOLO'

        UNION ALL

        -- SUBARBOL: raíz (y luego descendientes)
        SELECT p.idorg_raiz AS idorg
        FROM Permisos p
        WHERE p.alcance <> 'SOLO'

        UNION ALL

        -- Descendientes
        SELECT n.idorg
        FROM dbo.p_organizacion_nodos n
        INNER JOIN Subarbol s ON n.padre = s.idorg
    )
    INSERT INTO #OrgPermitidos(idorg)
    SELECT DISTINCT s.idorg
    FROM Subarbol s
    OPTION (MAXRECURSION 200);

    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT
        u.carnet,
        1             AS nivel,
        'PERMISO_AREA' AS fuente
    FROM #UsuariosActivos u
    INNER JOIN #OrgPermitidos op
        ON u.idOrgBigInt = op.idorg           -- SAFE (ya es BIGINT)
    WHERE u.idOrgBigInt IS NOT NULL
      AND u.carnet <> @carnetSolicitante;

    /*--------------------------------------------
      9) DENY por empleado (quita de todo)
    --------------------------------------------*/
    IF OBJECT_ID('tempdb..#Denegados') IS NOT NULL DROP TABLE #Denegados;
    CREATE TABLE #Denegados
    (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Denegados(carnet)
    SELECT DISTINCT
        NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '')
    FROM dbo.p_permiso_empleado pe
    INNER JOIN #Raices r
        ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1
      AND pe.tipo_acceso = 'DENY'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_otorga)), '') IS NOT NULL;

    DELETE c
    FROM #Carnets c
    INNER JOIN #Denegados d
        ON d.carnet = c.carnet;

    /*--------------------------------------------
      10) Unificar 1 fila por carnet (prioridad)
          JERARQUIA > PERMISO_EMPLEADO > PERMISO_AREA
    --------------------------------------------*/
    ;WITH Unicos AS
    (
        SELECT
            c.carnet,
            c.nivel,
            c.fuente,
            ROW_NUMBER() OVER
            (
                PARTITION BY c.carnet
                ORDER BY
                    CASE c.fuente
                        WHEN 'JERARQUIA'        THEN 1
                        WHEN 'PERMISO_EMPLEADO' THEN 2
                        WHEN 'PERMISO_AREA'     THEN 3
                        ELSE 9
                    END,
                    ISNULL(c.nivel, 999)
            ) AS rn
        FROM #Carnets c
    )
    SELECT
        u.idUsuario,
        u.carnet,
        u.nombreCompleto,
        u.correo,
        u.cargo,
        u.gerencia,
        COALESCE(u.orgGerencia, u.ogerencia, u.gerencia)                   AS orgGerencia,
        u.subgerencia,
               u.area as Area,
        COALESCE(u.orgDepartamento, u.subgerencia, u.departamento)         AS orgDepartamento,
        u.departamento                                AS departamento,
 
        u.idOrgBigInt                                                      AS idOrg,   -- SAFE
        u.jefeCarnet,
        x.nivel,
        x.fuente
    FROM Unicos x
    INNER JOIN #UsuariosActivos u
        ON u.carnet = x.carnet
    WHERE x.rn = 1
    ORDER BY u.nombreCompleto;
END
GO