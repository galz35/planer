-- =============================================
-- Funciones PostgreSQL (PL/pgSQL)
-- Equivalentes a los Stored Procedures originales
-- =============================================

-- 1. Visibilidad (Recursiva)
CREATE OR REPLACE FUNCTION public.sp_Clarity_UsuariosVisibles(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
  "IdUsuario" INT,
  "IdNodo" INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE NodosGestion AS (
      SELECT DISTINCT uo."IdNodo"
      FROM public.p_UsuariosOrganizacion uo
      WHERE uo."IdUsuario" = p_IdUsuario
        AND uo."RolEnNodo" IN ('Lider','Gerente','Admin')
        AND uo."FechaInicio" <= p_Fecha
        AND (uo."FechaFin" IS NULL OR uo."FechaFin" >= p_Fecha)
  ),
  Subarbol AS (
      SELECT n."IdNodo", n."IdPadre", 0 AS "Nivel"
      FROM public.p_OrganizacionNodos n
      INNER JOIN NodosGestion g ON g."IdNodo" = n."IdNodo"

      UNION ALL
      SELECT h."IdNodo", h."IdPadre", s."Nivel" + 1
      FROM public.p_OrganizacionNodos h
      INNER JOIN Subarbol s ON s."IdNodo" = h."IdPadre"
      WHERE h."Activo" = TRUE
  )
  SELECT DISTINCT uo."IdUsuario", uo."IdNodo"
  FROM public.p_UsuariosOrganizacion uo
  INNER JOIN Subarbol s ON s."IdNodo" = uo."IdNodo"
  WHERE uo."FechaInicio" <= p_Fecha
    AND (uo."FechaFin" IS NULL OR uo."FechaFin" >= p_Fecha);
END;
$$ LANGUAGE plpgsql;


-- 2. Auth: Login Get
CREATE OR REPLACE FUNCTION public.sp_Clarity_Auth_LoginGet(
  p_Correo VARCHAR
)
RETURNS TABLE (
  "IdUsuario" INT,
  "Nombre" VARCHAR,
  "Correo" VARCHAR,
  "PasswordHash" VARCHAR,
  "Roles" TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      u."IdUsuario",
      u."Nombre",
      u."Correo",
      uc."PasswordHash",
      (
        SELECT STRING_AGG(r."Nombre", ',')
        FROM public.p_UsuariosRoles ur
        INNER JOIN public.p_Roles r ON r."IdRol" = ur."IdRol"
        WHERE ur."IdUsuario" = u."IdUsuario"
      ) AS "Roles"
  FROM public.p_Usuarios u
  INNER JOIN public.p_UsuariosCredenciales uc ON uc."IdUsuario" = u."IdUsuario"
  WHERE u."Correo" = p_Correo AND u."Activo" = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2.1 Auth: Marcar Login
CREATE OR REPLACE FUNCTION public.sp_Clarity_Auth_MarcarLogin(
  p_IdUsuario INT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.p_UsuariosCredenciales
  SET "UltimoLogin" = NOW()
  WHERE "IdUsuario" = p_IdUsuario;
END;
$$ LANGUAGE plpgsql;


-- 3. Mi Dia Get
-- NOTA: PostgreSQL no soporta devolver múltiples ResultSets en una sola función fácilmente.
-- En NestJS haremos llamadas paralelas o reestructuraremos. 
-- Aquí definiremos funciones separadas para cada sección.

-- 3.1 Get Checkin Hoy
CREATE OR REPLACE FUNCTION public.sp_Clarity_MiDia_CheckinHoy(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdCheckin" BIGINT,
    "Fecha" DATE,
    "EntregableTexto" VARCHAR,
    "Nota" VARCHAR,
    "FechaCreacion" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT c."IdCheckin", c."Fecha", c."EntregableTexto", c."Nota", c."FechaCreacion"
  FROM public.p_Checkins c
  WHERE c."IdUsuario" = p_IdUsuario AND c."Fecha" = p_Fecha
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Get Arrastrados
CREATE OR REPLACE FUNCTION public.sp_Clarity_MiDia_Arrastrados(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdTarea" BIGINT,
    "Titulo" VARCHAR,
    "Estado" VARCHAR,
    "Prioridad" VARCHAR,
    "Esfuerzo" VARCHAR,
    "FechaUltActualizacion" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  WITH CheckinAyer AS (
      SELECT c."IdCheckin"
      FROM public.p_Checkins c
      WHERE c."IdUsuario" = p_IdUsuario AND c."Fecha" = (p_Fecha - INTERVAL '1 day')::date
  ),
  TareasAyer AS (
      SELECT DISTINCT ct."IdTarea"
      FROM public.p_CheckinTareas ct
      INNER JOIN CheckinAyer ca ON ca."IdCheckin" = ct."IdCheckin"
  )
  SELECT
      t."IdTarea", t."Titulo", t."Estado", t."Prioridad", t."Esfuerzo", t."FechaUltActualizacion"
  FROM public.p_Tareas t
  INNER JOIN TareasAyer ta ON ta."IdTarea" = t."IdTarea"
  WHERE t."Estado" NOT IN ('Hecha','Descartada')
  ORDER BY
      CASE t."Prioridad" WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t."FechaUltActualizacion" ASC;
END;
$$ LANGUAGE plpgsql;

-- 3.3 Get Bloqueos Activos
CREATE OR REPLACE FUNCTION public.sp_Clarity_MiDia_BloqueosActivos(
  p_IdUsuario INT
)
RETURNS TABLE (
    "IdBloqueo" BIGINT,
    "IdTarea" BIGINT,
    "Tarea" VARCHAR,
    "Motivo" VARCHAR,
    "EsperandoA" VARCHAR,
    "FechaCreacion" TIMESTAMP,
    "HorasBloqueado" DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
      b."IdBloqueo",
      b."IdTarea",
      t."Titulo" AS "Tarea",
      b."Motivo",
      COALESCE(u."Nombre", b."DestinoTexto") AS "EsperandoA",
      b."FechaCreacion",
      EXTRACT(EPOCH FROM (NOW() - b."FechaCreacion"))/3600 AS "HorasBloqueado"
  FROM public.p_Bloqueos b
  LEFT JOIN public.p_Usuarios u ON u."IdUsuario" = b."IdDestinoUsuario"
  LEFT JOIN public.p_Tareas t ON t."IdTarea" = b."IdTarea"
  WHERE b."IdOrigenUsuario" = p_IdUsuario AND b."Estado" = 'Activo'
  ORDER BY b."FechaCreacion" ASC;
END;
$$ LANGUAGE plpgsql;

-- 3.4 selector Tareas
CREATE OR REPLACE FUNCTION public.sp_Clarity_MiDia_TareasDisponibles(
    p_IdUsuario INT
)
RETURNS TABLE (
    "IdTarea" BIGINT, 
    "Titulo" VARCHAR, 
    "Estado" VARCHAR, 
    "Prioridad" VARCHAR, 
    "Esfuerzo" VARCHAR,
    "Proyecto" VARCHAR, 
    "FechaObjetivo" DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t."IdTarea", t."Titulo", t."Estado", t."Prioridad", t."Esfuerzo",
        p."Nombre" AS "Proyecto", t."FechaObjetivo"
    FROM public.p_Tareas t
    INNER JOIN public.p_TareaAsignados ta ON ta."IdTarea" = t."IdTarea"
    INNER JOIN public.p_Proyectos p ON p."IdProyecto" = t."IdProyecto"
    WHERE ta."IdUsuario" = p_IdUsuario
      AND t."Estado" IN ('Pendiente','EnCurso','Bloqueada','Revision')
    ORDER BY
        CASE t."Estado" WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
        CASE t."Prioridad" WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
        COALESCE(t."FechaObjetivo", '2099-12-31');
END;
$$ LANGUAGE plpgsql;


-- 4. Checkin Upsert
-- Recibe arrays de IDs (jsonb)
CREATE OR REPLACE FUNCTION public.sp_Clarity_Checkin_Upsert(
  p_IdUsuario INT,
  p_Fecha DATE,
  p_EntregableTexto VARCHAR,
  p_Nota VARCHAR,
  p_IdNodo INT,
  p_EntregoIds JSONB, -- Array de BigInts [1, 2]
  p_AvanzoIds JSONB
)
RETURNS BIGINT AS $$
DECLARE
    v_IdCheckin BIGINT;
    v_TareaId BIGINT;
BEGIN
    SELECT "IdCheckin" INTO v_IdCheckin
    FROM public.p_Checkins
    WHERE "IdUsuario" = p_IdUsuario AND "Fecha" = p_Fecha;

    IF v_IdCheckin IS NULL THEN
        INSERT INTO public.p_Checkins("Fecha", "IdUsuario", "IdNodo", "EntregableTexto", "Nota")
        VALUES(p_Fecha, p_IdUsuario, p_IdNodo, p_EntregableTexto, p_Nota)
        RETURNING "IdCheckin" INTO v_IdCheckin;
    ELSE
        UPDATE public.p_Checkins
        SET "EntregableTexto" = p_EntregableTexto,
            "Nota" = p_Nota,
            "IdNodo" = COALESCE(p_IdNodo, "IdNodo")
        WHERE "IdCheckin" = v_IdCheckin;
    END IF;

    -- Limpiar tareas asociadas previas
    DELETE FROM public.p_CheckinTareas WHERE "IdCheckin" = v_IdCheckin;

    -- Insertar Entrego
    FOR v_TareaId IN SELECT * FROM jsonb_array_elements_text(p_EntregoIds)
    LOOP
        INSERT INTO public.p_CheckinTareas("IdCheckin", "IdTarea", "Tipo")
        VALUES (v_IdCheckin, v_TareaId, 'Entrego');
    END LOOP;

    -- Insertar Avanzo
    FOR v_TareaId IN SELECT * FROM jsonb_array_elements_text(p_AvanzoIds)
    LOOP
        INSERT INTO public.p_CheckinTareas("IdCheckin", "IdTarea", "Tipo")
        VALUES (v_IdCheckin, v_TareaId, 'Avanzo');
    END LOOP;

    RETURN v_IdCheckin;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear Tarea Rapida
CREATE OR REPLACE FUNCTION public.sp_Clarity_Tarea_CrearRapida(
  p_IdUsuario INT,
  p_IdProyecto INT,
  p_Titulo VARCHAR,
  p_Prioridad VARCHAR DEFAULT 'Media',
  p_Esfuerzo VARCHAR DEFAULT 'M',
  p_IdResponsable INT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_IdTarea BIGINT;
    v_FinalResponsable INT;
BEGIN
    v_FinalResponsable := COALESCE(p_IdResponsable, p_IdUsuario);

    INSERT INTO public.p_Tareas("IdProyecto", "Titulo", "Prioridad", "Esfuerzo", "IdCreador")
    VALUES(p_IdProyecto, p_Titulo, p_Prioridad, p_Esfuerzo, p_IdUsuario)
    RETURNING "IdTarea" INTO v_IdTarea;

    INSERT INTO public.p_TareaAsignados("IdTarea", "IdUsuario", "Tipo")
    VALUES(v_IdTarea, v_FinalResponsable, 'Responsable');

    RETURN v_IdTarea;
END;
$$ LANGUAGE plpgsql;

-- 6. Bloqueo Crear
CREATE OR REPLACE FUNCTION public.sp_Clarity_Bloqueo_Crear(
  p_IdOrigenUsuario INT,
  p_IdTarea BIGINT,
  p_IdDestinoUsuario INT,
  p_DestinoTexto VARCHAR,
  p_Motivo VARCHAR
)
RETURNS BIGINT AS $$
DECLARE
    v_IdBloqueo BIGINT;
BEGIN
    INSERT INTO public.p_Bloqueos("IdTarea", "IdOrigenUsuario", "IdDestinoUsuario", "DestinoTexto", "Motivo")
    VALUES(p_IdTarea, p_IdOrigenUsuario, p_IdDestinoUsuario, p_DestinoTexto, p_Motivo)
    RETURNING "IdBloqueo" INTO v_IdBloqueo;

    RETURN v_IdBloqueo;
END;
$$ LANGUAGE plpgsql;

-- 7. Equipo Hoy
CREATE OR REPLACE FUNCTION public.sp_Clarity_EquipoHoy(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdUsuario" INT,
    "Nombre" VARCHAR,
    "Correo" VARCHAR,
    "Reporto" INT,
    "TieneBloqueos" INT,
    "EntregableHoy" VARCHAR,
    "HoraReporte" TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    WITH Visible AS (
        SELECT * FROM public.sp_Clarity_UsuariosVisibles(p_IdUsuario, p_Fecha)
    ),
    BloqueosActivos AS (
        SELECT b."IdOrigenUsuario", COUNT(1) AS Cantidad
        FROM public.p_Bloqueos b
        WHERE b."Estado" = 'Activo'
        GROUP BY b."IdOrigenUsuario"
    )
    SELECT
        u."IdUsuario",
        u."Nombre",
        u."Correo",
        CASE WHEN c."IdCheckin" IS NULL THEN 0 ELSE 1 END AS "Reporto",
        CASE WHEN COALESCE(ba.Cantidad,0) > 0 THEN 1 ELSE 0 END AS "TieneBloqueos",
        c."EntregableTexto" AS "EntregableHoy",
        c."FechaCreacion" AS "HoraReporte"
    FROM Visible v
    INNER JOIN public.p_Usuarios u ON u."IdUsuario" = v."IdUsuario"
    LEFT JOIN public.p_Checkins c ON c."IdUsuario" = v."IdUsuario" AND c."Fecha" = p_Fecha
    LEFT JOIN BloqueosActivos ba ON ba."IdOrigenUsuario" = v."IdUsuario"
    WHERE u."Activo" = TRUE
    ORDER BY "TieneBloqueos" DESC, "Reporto" ASC, u."Nombre" ASC;
END;
$$ LANGUAGE plpgsql;

-- 8. Tareas - Mis Tareas
CREATE OR REPLACE FUNCTION public.sp_Clarity_Tareas_MisTareas(
  p_IdUsuario INT,
  p_Estado VARCHAR DEFAULT NULL,
  p_IdProyecto INT DEFAULT NULL
)
RETURNS TABLE (
    "IdTarea" BIGINT,
    "Titulo" VARCHAR,
    "Estado" VARCHAR,
    "Prioridad" VARCHAR,
    "Esfuerzo" VARCHAR,
    "Proyecto" VARCHAR,
    "FechaObjetivo" DATE,
    "FechaUltActualizacion" TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
      t."IdTarea", t."Titulo", t."Estado", t."Prioridad", t."Esfuerzo",
      p."Nombre" AS "Proyecto", t."FechaObjetivo", t."FechaUltActualizacion"
  FROM public.p_Tareas t
  INNER JOIN public.p_TareaAsignados ta ON ta."IdTarea" = t."IdTarea"
  INNER JOIN public.p_Proyectos p ON p."IdProyecto" = t."IdProyecto"
  WHERE ta."IdUsuario" = p_IdUsuario
    AND (p_Estado IS NULL OR t."Estado" = p_Estado)
    AND (p_IdProyecto IS NULL OR t."IdProyecto" = p_IdProyecto)
  ORDER BY
      CASE t."Estado" WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
      CASE t."Prioridad" WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t."FechaUltActualizacion" ASC;
END;
$$ LANGUAGE plpgsql;

-- 9. Tarea - Actualizar
CREATE OR REPLACE FUNCTION public.sp_Clarity_Tarea_Actualizar(
  p_IdTarea BIGINT,
  p_Estado VARCHAR DEFAULT NULL,
  p_Prioridad VARCHAR DEFAULT NULL,
  p_Esfuerzo VARCHAR DEFAULT NULL,
  p_FechaObjetivo DATE DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.p_Tareas
  SET "Estado" = COALESCE(p_Estado, "Estado"),
      "Prioridad" = COALESCE(p_Prioridad, "Prioridad"),
      "Esfuerzo" = COALESCE(p_Esfuerzo, "Esfuerzo"),
      "FechaObjetivo" = COALESCE(p_FechaObjetivo, "FechaObjetivo"),
      "FechaEnCurso" = CASE WHEN p_Estado = 'EnCurso' AND "FechaEnCurso" IS NULL THEN NOW() ELSE "FechaEnCurso" END,
      "FechaHecha"  = CASE WHEN p_Estado = 'Hecha'  AND "FechaHecha"  IS NULL THEN NOW() ELSE "FechaHecha"  END,
      "FechaUltActualizacion" = NOW()
  WHERE "IdTarea" = p_IdTarea;
END;
$$ LANGUAGE plpgsql;

-- 10. Tarea - Revalidar
CREATE OR REPLACE FUNCTION public.sp_Clarity_Tarea_Revalidar(
  p_IdUsuario INT,
  p_IdTarea BIGINT,
  p_Accion VARCHAR,
  p_IdUsuarioOtro INT DEFAULT NULL,
  p_Razon VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_Accion = 'Sigue' THEN
      UPDATE public.p_Tareas
      SET "FechaUltActualizacion" = NOW()
      WHERE "IdTarea" = p_IdTarea;

  ELSIF p_Accion = 'HechaPorOtro' THEN
      UPDATE public.p_Tareas
      SET "Estado" = 'Hecha',
          "FechaHecha" = NOW(),
          "FechaUltActualizacion" = NOW()
      WHERE "IdTarea" = p_IdTarea;

      INSERT INTO public.p_Comentarios("TipoEntidad", "IdEntidad", "IdUsuario", "Texto")
      VALUES('TAREA', p_IdTarea, p_IdUsuario,
             CONCAT('Marcada como hecha por: ', COALESCE(CAST(p_IdUsuarioOtro AS VARCHAR),'(sin usuario)'), '. ', COALESCE(p_Razon,'')));

  ELSIF p_Accion = 'NoAplica' THEN
      UPDATE public.p_Tareas
      SET "Estado" = 'Descartada',
          "FechaUltActualizacion" = NOW()
      WHERE "IdTarea" = p_IdTarea;

      INSERT INTO public.p_Comentarios("TipoEntidad", "IdEntidad", "IdUsuario", "Texto")
      VALUES('TAREA', p_IdTarea, p_IdUsuario, CONCAT('Descartada: ', COALESCE(p_Razon,'(sin razón)')));

  ELSIF p_Accion = 'Reasignar' THEN
      DELETE FROM public.p_TareaAsignados WHERE "IdTarea" = p_IdTarea AND "Tipo" = 'Responsable';

      INSERT INTO public.p_TareaAsignados("IdTarea", "IdUsuario", "Tipo")
      VALUES(p_IdTarea, p_IdUsuarioOtro, 'Responsable');

      UPDATE public.p_Tareas
      SET "FechaUltActualizacion" = NOW()
      WHERE "IdTarea" = p_IdTarea;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. Bloqueo - Resolver
CREATE OR REPLACE FUNCTION public.sp_Clarity_Bloqueo_Resolver(
  p_IdBloqueo BIGINT,
  p_IdUsuario INT,
  p_Comentario VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.p_Bloqueos
  SET "Estado" = 'Resuelto',
      "FechaResolucion" = NOW()
  WHERE "IdBloqueo" = p_IdBloqueo;

  IF p_Comentario IS NOT NULL THEN
    INSERT INTO public.p_Comentarios("TipoEntidad", "IdEntidad", "IdUsuario", "Texto")
    VALUES('BLOQUEO', p_IdBloqueo, p_IdUsuario, p_Comentario);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. Equipo - Bloqueos
CREATE OR REPLACE FUNCTION public.sp_Clarity_Equipo_Bloqueos(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdBloqueo" BIGINT,
    "Origen" VARCHAR,
    "EsperandoA" VARCHAR,
    "Motivo" VARCHAR,
    "FechaCreacion" TIMESTAMP,
    "HorasBloqueado" DOUBLE PRECISION,
    "IdTarea" BIGINT,
    "Tarea" VARCHAR,
    "Proyecto" VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH Visible AS (
        SELECT * FROM public.sp_Clarity_UsuariosVisibles(p_IdUsuario, p_Fecha)
  )
  SELECT
      b."IdBloqueo",
      uo."Nombre" AS "Origen",
      COALESCE(ud."Nombre", b."DestinoTexto") AS "EsperandoA",
      b."Motivo",
      b."FechaCreacion",
      EXTRACT(EPOCH FROM (NOW() - b."FechaCreacion"))/3600 AS "HorasBloqueado",
      t."IdTarea",
      t."Titulo" AS "Tarea",
      p."Nombre" AS "Proyecto"
  FROM public.p_Bloqueos b
  INNER JOIN Visible v ON v."IdUsuario" = b."IdOrigenUsuario"
  INNER JOIN public.p_Usuarios uo ON uo."IdUsuario" = b."IdOrigenUsuario"
  LEFT JOIN public.p_Usuarios ud ON ud."IdUsuario" = b."IdDestinoUsuario"
  LEFT JOIN public.p_Tareas t ON t."IdTarea" = b."IdTarea"
  LEFT JOIN public.p_Proyectos p ON p."IdProyecto" = t."IdProyecto"
  WHERE b."Estado" = 'Activo'
  ORDER BY b."FechaCreacion" ASC;
END;
$$ LANGUAGE plpgsql;

-- 13. Equipo - Backlog
CREATE OR REPLACE FUNCTION public.sp_Clarity_Equipo_Backlog(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdTarea" BIGINT,
    "Titulo" VARCHAR,
    "Estado" VARCHAR,
    "Prioridad" VARCHAR,
    "Esfuerzo" VARCHAR,
    "Proyecto" VARCHAR,
    "FechaObjetivo" DATE,
    "FechaUltActualizacion" TIMESTAMP,
    "Asignados" TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH Visible AS (
        SELECT * FROM public.sp_Clarity_UsuariosVisibles(p_IdUsuario, p_Fecha)
  ),
  TareasEquipo AS (
      SELECT DISTINCT t."IdTarea"
      FROM public.p_TareaAsignados ta
      INNER JOIN Visible v ON v."IdUsuario" = ta."IdUsuario"
      INNER JOIN public.p_Tareas t ON t."IdTarea" = ta."IdTarea"
  )
  SELECT
      t."IdTarea",
      t."Titulo",
      t."Estado",
      t."Prioridad",
      t."Esfuerzo",
      p."Nombre" AS "Proyecto",
      t."FechaObjetivo",
      t."FechaUltActualizacion",
      STRING_AGG(u."Nombre", ', ' ORDER BY u."Nombre") AS "Asignados"
  FROM TareasEquipo te
  INNER JOIN public.p_Tareas t ON t."IdTarea" = te."IdTarea"
  INNER JOIN public.p_Proyectos p ON p."IdProyecto" = t."IdProyecto"
  INNER JOIN public.p_TareaAsignados ta ON ta."IdTarea" = t."IdTarea"
  INNER JOIN public.p_Usuarios u ON u."IdUsuario" = ta."IdUsuario"
  WHERE t."Estado" IN ('Pendiente','EnCurso','Bloqueada','Revision')
  GROUP BY
      t."IdTarea", t."Titulo", t."Estado", t."Prioridad", t."Esfuerzo", p."Nombre",
      t."FechaObjetivo", t."FechaUltActualizacion"
  ORDER BY
      CASE t."Estado" WHEN 'Bloqueada' THEN 1 WHEN 'EnCurso' THEN 2 WHEN 'Revision' THEN 3 ELSE 4 END,
      CASE t."Prioridad" WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      t."FechaUltActualizacion" ASC;
END;
$$ LANGUAGE plpgsql;

-- 14. Gerencia Resumen (Requiere funciones separadas por múltiples result sets)

-- 14.1 Resumen Nodos
CREATE OR REPLACE FUNCTION public.sp_Clarity_Gerencia_Resumen_Nodos(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdNodo" INT,
    "Nombre" VARCHAR,
    "Tipo" VARCHAR,
    "TotalUsuarios" BIGINT,
    "Reportaron" BIGINT,
    "PorcentajeParticipacion" DECIMAL(5,2),
    "BloqueosActivos" BIGINT,
    "WIP" BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH Visible AS (
      SELECT * FROM public.sp_Clarity_UsuariosVisibles(p_IdUsuario, p_Fecha)
  ),
  Participacion AS (
      SELECT v."IdNodo",
             COUNT(1) AS TotalUsuarios,
             SUM(CASE WHEN c."IdCheckin" IS NULL THEN 0 ELSE 1 END) AS Reportaron
      FROM Visible v
      LEFT JOIN public.p_Checkins c ON c."IdUsuario" = v."IdUsuario" AND c."Fecha" = p_Fecha
      GROUP BY v."IdNodo"
  ),
  BloqueosNodo AS (
      SELECT v."IdNodo", COUNT(1) AS BloqueosActivos
      FROM public.p_Bloqueos b
      INNER JOIN Visible v ON v."IdUsuario" = b."IdOrigenUsuario"
      WHERE b."Estado" = 'Activo'
      GROUP BY v."IdNodo"
  ),
  WipNodo AS (
      SELECT v."IdNodo", COUNT(DISTINCT t."IdTarea") AS WIP
      FROM public.p_TareaAsignados ta
      INNER JOIN Visible v ON v."IdUsuario" = ta."IdUsuario"
      INNER JOIN public.p_Tareas t ON t."IdTarea" = ta."IdTarea"
      WHERE t."Estado" IN ('EnCurso','Bloqueada','Revision')
      GROUP BY v."IdNodo"
  )
  SELECT
      n."IdNodo",
      n."Nombre",
      n."Tipo",
      p.TotalUsuarios,
      p.Reportaron,
      CAST(100.0 * p.Reportaron / NULLIF(p.TotalUsuarios,0) AS DECIMAL(5,2)) AS PorcentajeParticipacion,
      COALESCE(bn.BloqueosActivos,0),
      COALESCE(wn.WIP,0)
  FROM (SELECT DISTINCT "IdNodo" FROM Visible) x
  INNER JOIN public.p_OrganizacionNodos n ON n."IdNodo" = x."IdNodo"
  LEFT JOIN Participacion p ON p."IdNodo" = x."IdNodo"
  LEFT JOIN BloqueosNodo bn ON bn."IdNodo" = x."IdNodo"
  LEFT JOIN WipNodo wn ON wn."IdNodo" = x."IdNodo"
  ORDER BY n."Tipo", n."Nombre";
END;
$$ LANGUAGE plpgsql;

-- 14.2 Resumen Proyectos
CREATE OR REPLACE FUNCTION public.sp_Clarity_Gerencia_Resumen_Proyectos(
  p_IdUsuario INT,
  p_Fecha DATE
)
RETURNS TABLE (
    "IdProyecto" INT,
    "Proyecto" VARCHAR,
    "WIP" BIGINT,
    "HechasHoy" BIGINT,
    "Bloqueadas" BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH Visible AS (
      SELECT * FROM public.sp_Clarity_UsuariosVisibles(p_IdUsuario, p_Fecha)
  ),
  TareasVisibles AS (
      SELECT DISTINCT t."IdTarea"
      FROM public.p_Tareas t
      INNER JOIN public.p_TareaAsignados ta ON ta."IdTarea" = t."IdTarea"
      INNER JOIN Visible v ON v."IdUsuario" = ta."IdUsuario"
  )
  SELECT
      p."IdProyecto",
      p."Nombre" AS "Proyecto",
      SUM(CASE WHEN t."Estado" IN ('EnCurso','Bloqueada','Revision') THEN 1 ELSE 0 END) AS WIP,
      SUM(CASE WHEN t."Estado" = 'Hecha' AND CAST(t."FechaHecha" AS DATE) = p_Fecha THEN 1 ELSE 0 END) AS HechasHoy,
      SUM(CASE WHEN t."Estado" = 'Bloqueada' THEN 1 ELSE 0 END) AS Bloqueadas
  FROM TareasVisibles tv
  INNER JOIN public.p_Tareas t ON t."IdTarea" = tv."IdTarea"
  INNER JOIN public.p_Proyectos p ON p."IdProyecto" = t."IdProyecto"
  GROUP BY p."IdProyecto", p."Nombre"
  ORDER BY Bloqueadas DESC, WIP DESC, HechasHoy DESC;
END;
$$ LANGUAGE plpgsql;
