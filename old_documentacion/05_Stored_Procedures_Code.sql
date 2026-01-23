-- =============================================
-- 1. Visibilidad (Seguridad Row-Level)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_UsuariosVisibles
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  ;WITH NodosGestion AS (
      SELECT DISTINCT uo.IdNodo
      FROM dbo.p_UsuariosOrganizacion uo
      WHERE uo.IdUsuario = @IdUsuario
        AND uo.RolEnNodo IN ('Lider','Gerente','Admin')
        AND uo.FechaInicio <= @Fecha
        AND (uo.FechaFin IS NULL OR uo.FechaFin >= @Fecha)
  ),
  Subarbol AS (
      SELECT n.IdNodo, n.IdPadre, 0 AS Nivel
      FROM dbo.p_OrganizacionNodos n
      INNER JOIN NodosGestion g ON g.IdNodo = n.IdNodo

      UNION ALL
      SELECT h.IdNodo, h.IdPadre, s.Nivel + 1
      FROM dbo.p_OrganizacionNodos h
      INNER JOIN Subarbol s ON s.IdNodo = h.IdPadre
      WHERE h.Activo = 1
  )
  SELECT DISTINCT uo.IdUsuario, uo.IdNodo
  FROM dbo.p_UsuariosOrganizacion uo
  INNER JOIN Subarbol s ON s.IdNodo = uo.IdNodo
  WHERE uo.FechaInicio <= @Fecha
    AND (uo.FechaFin IS NULL OR uo.FechaFin >= @Fecha)
  OPTION (MAXRECURSION 200);
END
GO

-- =============================================
-- 2. Mi Día
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_MiDia_Get
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Ayer DATE = DATEADD(DAY, -1, @Fecha);

  -- 1) Check-in hoy
  SELECT TOP 1
      c.IdCheckin, c.Fecha, c.EntregableTexto, c.Nota, c.FechaCreacion
  FROM dbo.p_Checkins c
  WHERE c.IdUsuario = @IdUsuario AND c.Fecha = @Fecha;

  -- 2) Arrastrados
  ;WITH CheckinAyer AS (
      SELECT c.IdCheckin
      FROM dbo.p_Checkins c
      WHERE c.IdUsuario = @IdUsuario AND c.Fecha = @Ayer
  ),
  TareasAyer AS (
      SELECT DISTINCT ct.IdTarea
      FROM dbo.p_CheckinTareas ct
      INNER JOIN CheckinAyer ca ON ca.IdCheckin = ct.IdCheckin
  )
  SELECT
      t.IdTarea, t.Titulo, t.Estado, t.Prioridad, t.Esfuerzo, t.FechaUltActualizacion
  FROM dbo.p_Tareas t
  INNER JOIN TareasAyer ta ON ta.IdTarea = t.IdTarea
  WHERE t.Estado NOT IN ('Hecha','Descartada')
  ORDER BY
      CASE t.Prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t.FechaUltActualizacion ASC;

  -- 3) Mis bloqueos activos
  SELECT
      b.IdBloqueo,
      b.IdTarea,
      t.Titulo AS Tarea,
      b.Motivo,
      COALESCE(u.Nombre, b.DestinoTexto) AS EsperandoA,
      b.FechaCreacion,
      DATEDIFF(HOUR, b.FechaCreacion, SYSUTCDATETIME()) AS HorasBloqueado
  FROM dbo.p_Bloqueos b
  LEFT JOIN dbo.p_Usuarios u ON u.IdUsuario = b.IdDestinoUsuario
  LEFT JOIN dbo.p_Tareas t ON t.IdTarea = b.IdTarea
  WHERE b.IdOrigenUsuario = @IdUsuario AND b.Estado = 'Activo'
  ORDER BY b.FechaCreacion ASC;

  -- 4) Selector de tareas
  SELECT
      t.IdTarea, t.Titulo, t.Estado, t.Prioridad, t.Esfuerzo,
      p.Nombre AS Proyecto, t.FechaObjetivo
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_TareaAsignados ta ON ta.IdTarea = t.IdTarea
  INNER JOIN dbo.p_Proyectos p ON p.IdProyecto = t.IdProyecto
  WHERE ta.IdUsuario = @IdUsuario
    AND t.Estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
  ORDER BY
      CASE t.Estado WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
      CASE t.Prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      ISNULL(t.FechaObjetivo, '99991231');
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Checkin_Upsert
(
  @IdUsuario INT,
  @Fecha DATE,
  @EntregableTexto NVARCHAR(240),
  @Nota NVARCHAR(600) = NULL,
  @IdNodo INT = NULL,
  @JsonEntrego NVARCHAR(MAX),
  @JsonAvanzo  NVARCHAR(MAX)
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @IdCheckin BIGINT;

  SELECT @IdCheckin = c.IdCheckin
  FROM dbo.p_Checkins c
  WHERE c.IdUsuario = @IdUsuario AND c.Fecha = @Fecha;

  IF @IdCheckin IS NULL
  BEGIN
      INSERT INTO dbo.p_Checkins(Fecha, IdUsuario, IdNodo, EntregableTexto, Nota)
      VALUES(@Fecha, @IdUsuario, @IdNodo, @EntregableTexto, @Nota);

      SET @IdCheckin = SCOPE_IDENTITY();
  END
  ELSE
  BEGIN
      UPDATE dbo.p_Checkins
      SET EntregableTexto = @EntregableTexto,
          Nota = @Nota,
          IdNodo = COALESCE(@IdNodo, IdNodo)
      WHERE IdCheckin = @IdCheckin;
  END

  DELETE FROM dbo.p_CheckinTareas WHERE IdCheckin = @IdCheckin;

  INSERT INTO dbo.p_CheckinTareas(IdCheckin, IdTarea, Tipo)
  SELECT @IdCheckin, CAST([value] AS BIGINT), 'Entrego'
  FROM OPENJSON(@JsonEntrego);

  INSERT INTO dbo.p_CheckinTareas(IdCheckin, IdTarea, Tipo)
  SELECT @IdCheckin, CAST([value] AS BIGINT), 'Avanzo'
  FROM OPENJSON(@JsonAvanzo);

  SELECT @IdCheckin AS IdCheckinGuardado;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Tarea_Revalidar
(
  @IdUsuario INT,
  @IdTarea BIGINT,
  @Accion NVARCHAR(20),
  @IdUsuarioOtro INT = NULL,
  @Razon NVARCHAR(200) = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  IF @Accion = 'Sigue'
  BEGIN
      UPDATE dbo.p_Tareas
      SET FechaUltActualizacion = SYSUTCDATETIME()
      WHERE IdTarea = @IdTarea;
  END
  ELSE IF @Accion = 'HechaPorOtro'
  BEGIN
      UPDATE dbo.p_Tareas
      SET Estado = 'Hecha',
          FechaHecha = SYSUTCDATETIME(),
          FechaUltActualizacion = SYSUTCDATETIME()
      WHERE IdTarea = @IdTarea;

      INSERT INTO dbo.p_Comentarios(TipoEntidad, IdEntidad, IdUsuario, Texto)
      VALUES('TAREA', @IdTarea, @IdUsuario,
             CONCAT('Marcada como hecha por: ', ISNULL(CAST(@IdUsuarioOtro AS NVARCHAR(20)),'(sin usuario)'), '. ', ISNULL(@Razon,'')));
  END
  ELSE IF @Accion = 'NoAplica'
  BEGIN
      UPDATE dbo.p_Tareas
      SET Estado = 'Descartada',
          FechaUltActualizacion = SYSUTCDATETIME()
      WHERE IdTarea = @IdTarea;

      INSERT INTO dbo.p_Comentarios(TipoEntidad, IdEntidad, IdUsuario, Texto)
      VALUES('TAREA', @IdTarea, @IdUsuario, CONCAT('Descartada: ', ISNULL(@Razon,'(sin razón)')));
  END
  ELSE IF @Accion = 'Reasignar'
  BEGIN
      DELETE FROM dbo.p_TareaAsignados WHERE IdTarea = @IdTarea AND Tipo = 'Responsable';

      INSERT INTO dbo.p_TareaAsignados(IdTarea, IdUsuario, Tipo)
      VALUES(@IdTarea, @IdUsuarioOtro, 'Responsable');

      UPDATE dbo.p_Tareas
      SET FechaUltActualizacion = SYSUTCDATETIME()
      WHERE IdTarea = @IdTarea;
  END
END
GO

-- =============================================
-- 3. Gestión Tareas
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Tarea_CrearRapida
(
  @IdUsuario INT,
  @IdProyecto INT,
  @Titulo NVARCHAR(220),
  @Prioridad NVARCHAR(10) = 'Media',
  @Esfuerzo NVARCHAR(5) = 'M',
  @IdResponsable INT = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  IF @IdResponsable IS NULL SET @IdResponsable = @IdUsuario;

  INSERT INTO dbo.p_Tareas(IdProyecto, Titulo, Prioridad, Esfuerzo, IdCreador)
  VALUES(@IdProyecto, @Titulo, @Prioridad, @Esfuerzo, @IdUsuario);

  DECLARE @IdTarea BIGINT = SCOPE_IDENTITY();

  INSERT INTO dbo.p_TareaAsignados(IdTarea, IdUsuario, Tipo)
  VALUES(@IdTarea, @IdResponsable, 'Responsable');

  SELECT @IdTarea AS IdTareaCreada;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Tareas_MisTareas
(
  @IdUsuario INT,
  @Estado NVARCHAR(20) = NULL,
  @IdProyecto INT = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
      t.IdTarea, t.Titulo, t.Estado, t.Prioridad, t.Esfuerzo,
      p.Nombre AS Proyecto, t.FechaObjetivo, t.FechaUltActualizacion
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_TareaAsignados ta ON ta.IdTarea = t.IdTarea
  INNER JOIN dbo.p_Proyectos p ON p.IdProyecto = t.IdProyecto
  WHERE ta.IdUsuario = @IdUsuario
    AND (@Estado IS NULL OR t.Estado = @Estado)
    AND (@IdProyecto IS NULL OR t.IdProyecto = @IdProyecto)
  ORDER BY
      CASE t.Estado WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
      CASE t.Prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t.FechaUltActualizacion ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Tarea_Actualizar
(
  @IdTarea BIGINT,
  @Estado NVARCHAR(20) = NULL,
  @Prioridad NVARCHAR(10) = NULL,
  @Esfuerzo NVARCHAR(5) = NULL,
  @FechaObjetivo DATE = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.p_Tareas
  SET Estado = COALESCE(@Estado, Estado),
      Prioridad = COALESCE(@Prioridad, Prioridad),
      Esfuerzo = COALESCE(@Esfuerzo, Esfuerzo),
      FechaObjetivo = COALESCE(@FechaObjetivo, FechaObjetivo),
      FechaEnCurso = CASE WHEN @Estado = 'EnCurso' AND FechaEnCurso IS NULL THEN SYSUTCDATETIME() ELSE FechaEnCurso END,
      FechaHecha  = CASE WHEN @Estado = 'Hecha'  AND FechaHecha  IS NULL THEN SYSUTCDATETIME() ELSE FechaHecha  END,
      FechaUltActualizacion = SYSUTCDATETIME()
  WHERE IdTarea = @IdTarea;
END
GO

-- =============================================
-- 4. Bloqueos
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Bloqueo_Crear
(
  @IdOrigenUsuario INT,
  @IdTarea BIGINT = NULL,
  @IdDestinoUsuario INT = NULL,
  @DestinoTexto NVARCHAR(120) = NULL,
  @Motivo NVARCHAR(400)
)
AS
BEGIN
  SET NOCOUNT ON;

  INSERT INTO dbo.p_Bloqueos(IdTarea, IdOrigenUsuario, IdDestinoUsuario, DestinoTexto, Motivo)
  VALUES(@IdTarea, @IdOrigenUsuario, @IdDestinoUsuario, @DestinoTexto, @Motivo);

  SELECT SCOPE_IDENTITY() AS IdBloqueoCreado;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Bloqueo_Resolver
(
  @IdBloqueo BIGINT,
  @IdUsuario INT,
  @Comentario NVARCHAR(300) = NULL
)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.p_Bloqueos
  SET Estado = 'Resuelto',
      FechaResolucion = SYSUTCDATETIME()
  WHERE IdBloqueo = @IdBloqueo;

  IF @Comentario IS NOT NULL
  BEGIN
    INSERT INTO dbo.p_Comentarios(TipoEntidad, IdEntidad, IdUsuario, Texto)
    VALUES('BLOQUEO', @IdBloqueo, @IdUsuario, @Comentario);
  END
END
GO

-- =============================================
-- 5. Dashboards Jefe
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_EquipoHoy
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Visible TABLE (IdUsuario INT, IdNodo INT);
  INSERT INTO @Visible
  EXEC dbo.sp_Clarity_UsuariosVisibles @IdUsuario, @Fecha;

  ;WITH BloqueosActivos AS (
      SELECT b.IdOrigenUsuario, COUNT(1) AS Cantidad
      FROM dbo.p_Bloqueos b
      WHERE b.Estado = 'Activo'
      GROUP BY b.IdOrigenUsuario
  )
  SELECT
      u.IdUsuario,
      u.Nombre,
      u.Correo,
      CASE WHEN c.IdCheckin IS NULL THEN 0 ELSE 1 END AS Reporto,
      CASE WHEN ISNULL(ba.Cantidad,0) > 0 THEN 1 ELSE 0 END AS TieneBloqueos,
      c.EntregableTexto AS EntregableHoy,
      c.FechaCreacion AS HoraReporte
  FROM @Visible v
  INNER JOIN dbo.p_Usuarios u ON u.IdUsuario = v.IdUsuario
  LEFT JOIN dbo.p_Checkins c ON c.IdUsuario = v.IdUsuario AND c.Fecha = @Fecha
  LEFT JOIN BloqueosActivos ba ON ba.IdOrigenUsuario = v.IdUsuario
  WHERE u.Activo = 1
  ORDER BY TieneBloqueos DESC, Reporto ASC, u.Nombre ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Equipo_Bloqueos
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Visible TABLE (IdUsuario INT, IdNodo INT);
  INSERT INTO @Visible
  EXEC dbo.sp_Clarity_UsuariosVisibles @IdUsuario, @Fecha;

  SELECT
      b.IdBloqueo,
      uo.Nombre AS Origen,
      COALESCE(ud.Nombre, b.DestinoTexto) AS EsperandoA,
      b.Motivo,
      b.FechaCreacion,
      DATEDIFF(HOUR, b.FechaCreacion, SYSUTCDATETIME()) AS HorasBloqueado,
      t.IdTarea,
      t.Titulo AS Tarea,
      p.Nombre AS Proyecto
  FROM dbo.p_Bloqueos b
  INNER JOIN @Visible v ON v.IdUsuario = b.IdOrigenUsuario
  INNER JOIN dbo.p_Usuarios uo ON uo.IdUsuario = b.IdOrigenUsuario
  LEFT JOIN dbo.p_Usuarios ud ON ud.IdUsuario = b.IdDestinoUsuario
  LEFT JOIN dbo.p_Tareas t ON t.IdTarea = b.IdTarea
  LEFT JOIN dbo.p_Proyectos p ON p.IdProyecto = t.IdProyecto
  WHERE b.Estado = 'Activo'
  ORDER BY b.FechaCreacion ASC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Equipo_Backlog
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Visible TABLE (IdUsuario INT, IdNodo INT);
  INSERT INTO @Visible
  EXEC dbo.sp_Clarity_UsuariosVisibles @IdUsuario, @Fecha;

  ;WITH TareasEquipo AS (
      SELECT DISTINCT t.IdTarea
      FROM dbo.p_TareaAsignados ta
      INNER JOIN @Visible v ON v.IdUsuario = ta.IdUsuario
      INNER JOIN dbo.p_Tareas t ON t.IdTarea = ta.IdTarea
  )
  SELECT
      t.IdTarea,
      t.Titulo,
      t.Estado,
      t.Prioridad,
      t.Esfuerzo,
      p.Nombre AS Proyecto,
      t.FechaObjetivo,
      t.FechaUltActualizacion,
      STRING_AGG(u.Nombre, ', ') WITHIN GROUP (ORDER BY u.Nombre) AS Asignados
  FROM TareasEquipo te
  INNER JOIN dbo.p_Tareas t ON t.IdTarea = te.IdTarea
  INNER JOIN dbo.p_Proyectos p ON p.IdProyecto = t.IdProyecto
  INNER JOIN dbo.p_TareaAsignados ta ON ta.IdTarea = t.IdTarea
  INNER JOIN dbo.p_Usuarios u ON u.IdUsuario = ta.IdUsuario
  WHERE t.Estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
  GROUP BY
      t.IdTarea, t.Titulo, t.Estado, t.Prioridad, t.Esfuerzo, p.Nombre,
      t.FechaObjetivo, t.FechaUltActualizacion
  ORDER BY
      CASE t.Estado WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
      CASE t.Prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t.FechaUltActualizacion ASC;
END
GO

-- =============================================
-- 6. Dashboards Gerencia (Rollup)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Gerencia_Resumen
(
  @IdUsuario INT,
  @Fecha DATE
)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Visible TABLE (IdUsuario INT, IdNodo INT);
  INSERT INTO @Visible
  EXEC dbo.sp_Clarity_UsuariosVisibles @IdUsuario, @Fecha;

  ;WITH Participacion AS (
      SELECT v.IdNodo,
             COUNT(1) AS TotalUsuarios,
             SUM(CASE WHEN c.IdCheckin IS NULL THEN 0 ELSE 1 END) AS Reportaron
      FROM @Visible v
      LEFT JOIN dbo.p_Checkins c ON c.IdUsuario = v.IdUsuario AND c.Fecha = @Fecha
      GROUP BY v.IdNodo
  ),
  BloqueosNodo AS (
      SELECT v.IdNodo, COUNT(1) AS BloqueosActivos
      FROM dbo.p_Bloqueos b
      INNER JOIN @Visible v ON v.IdUsuario = b.IdOrigenUsuario
      WHERE b.Estado = 'Activo'
      GROUP BY v.IdNodo
  ),
  WipNodo AS (
      SELECT v.IdNodo, COUNT(DISTINCT t.IdTarea) AS WIP
      FROM dbo.p_TareaAsignados ta
      INNER JOIN @Visible v ON v.IdUsuario = ta.IdUsuario
      INNER JOIN dbo.p_Tareas t ON t.IdTarea = ta.IdTarea
      WHERE t.Estado IN ('EnCurso','Bloqueada','Revision')
      GROUP BY v.IdNodo
  )
  SELECT
      n.IdNodo,
      n.Nombre,
      n.Tipo,
      p.TotalUsuarios,
      p.Reportaron,
      CAST(100.0 * p.Reportaron / NULLIF(p.TotalUsuarios,0) AS DECIMAL(5,2)) AS PorcentajeParticipacion,
      ISNULL(bn.BloqueosActivos,0) AS BloqueosActivos,
      ISNULL(wn.WIP,0) AS WIP
  FROM (SELECT DISTINCT IdNodo FROM @Visible) x
  INNER JOIN dbo.p_OrganizacionNodos n ON n.IdNodo = x.IdNodo
  LEFT JOIN Participacion p ON p.IdNodo = x.IdNodo
  LEFT JOIN BloqueosNodo bn ON bn.IdNodo = x.IdNodo
  LEFT JOIN WipNodo wn ON wn.IdNodo = x.IdNodo
  ORDER BY n.Tipo, n.Nombre;

  -- Resumen por proyecto
  ;WITH TareasVisibles AS (
      SELECT DISTINCT t.IdTarea
      FROM dbo.p_Tareas t
      INNER JOIN dbo.p_TareaAsignados ta ON ta.IdTarea = t.IdTarea
      INNER JOIN @Visible v ON v.IdUsuario = ta.IdUsuario
  )
  SELECT
      p.IdProyecto,
      p.Nombre AS Proyecto,
      SUM(CASE WHEN t.Estado IN ('EnCurso','Bloqueada','Revision') THEN 1 ELSE 0 END) AS WIP,
      SUM(CASE WHEN t.Estado = 'Hecha' AND CAST(t.FechaHecha AS DATE) = @Fecha THEN 1 ELSE 0 END) AS HechasHoy,
      SUM(CASE WHEN t.Estado = 'Bloqueada' THEN 1 ELSE 0 END) AS Bloqueadas
  FROM TareasVisibles tv
  INNER JOIN dbo.p_Tareas t ON t.IdTarea = tv.IdTarea
  INNER JOIN dbo.p_Proyectos p ON p.IdProyecto = t.IdProyecto
  GROUP BY p.IdProyecto, p.Nombre
  ORDER BY Bloqueadas DESC, WIP DESC, HechasHoy DESC;
END
GO

-- =============================================
-- 7. Autenticación
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Auth_LoginGet
(
  @Correo NVARCHAR(180)
)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
      u.IdUsuario,
      u.Nombre,
      u.Correo,
      uc.PasswordHash,
      STUFF((
        SELECT ',' + r.Nombre
        FROM dbo.p_UsuariosRoles ur
        INNER JOIN dbo.p_Roles r ON r.IdRol = ur.IdRol
        WHERE ur.IdUsuario = u.IdUsuario
        FOR XML PATH(''), TYPE).value('.','nvarchar(max)')
      ,1,1,'') AS Roles
  FROM dbo.p_Usuarios u
  INNER JOIN dbo.p_UsuariosCredenciales uc ON uc.IdUsuario = u.IdUsuario
  WHERE u.Correo = @Correo AND u.Activo = 1;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Clarity_Auth_MarcarLogin
(
  @IdUsuario INT
)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_UsuariosCredenciales
  SET UltimoLogin = SYSUTCDATETIME()
  WHERE IdUsuario = @IdUsuario;
END
GO
