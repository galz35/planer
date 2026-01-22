# 🔍 LISTADO DE CONSULTAS SQL PARA OPTIMIZACIÓN - CHATGPT 5.2

Este documento contiene todas las consultas SQL directas implementadas durante la migración de TypeORM a MSSQL. El objetivo es que ChatGPT 5.2 revise, optimice y mejore estas consultas para asegurar el máximo rendimiento, seguridad y legibilidad.

---

## 🔐 MÓDULO: AUTH (`auth.repo.ts`)

### 1. Obtener Usuario por Identificador (Login)
*   **Función:** `obtenerUsuarioPorIdentificador`
*   **Contexto:** Se usa en el login para buscar al usuario por correo o carnet, junto con su rol.
```sql
SELECT 
    u.*,
    r.nombre as rolNombre,
    r.descripcion as rolDescripcion,
    r.esSistema,
    r.reglas,
    r.defaultMenu
FROM p_Usuarios u
LEFT JOIN p_Roles r ON u.idRol = r.idRol
WHERE (u.correo = @identificador OR u.carnet = @identificador)
  AND u.activo = 1
```

### 2. Obtener Credenciales
*   **Función:** `obtenerCredenciales`
*   **Contexto:** Obtiene el hash de la contraseña para validación.
```sql
SELECT * FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario
```

### 3. Actualizar Último Login
*   **Función:** `actualizarUltimoLogin`
```sql
UPDATE p_UsuariosCredenciales 
SET ultimoLogin = GETDATE() 
WHERE idUsuario = @idUsuario
```

### 4. Actualizar Refresh Token
*   **Función:** `actualizarRefreshToken`
```sql
UPDATE p_UsuariosCredenciales 
SET refreshTokenHash = @refreshTokenHash 
WHERE idUsuario = @idUsuario
```

### 5. Contar Subordinados
*   **Función:** `contarSubordinados`
```sql
SELECT COUNT(*) as cnt FROM p_Usuarios 
WHERE jefeCarnet = @carnetJefe AND activo = 1
```

---

## 📅 MÓDULO: PLANNING (`planning.repo.ts`)

### 1. Obtener Proyectos por Usuario
*   **Función:** `obtenerProyectosPorUsuario`
*   **Contexto:** Proyectos donde el usuario tiene al menos una tarea asignada.
```sql
SELECT DISTINCT p.* 
FROM p_Proyectos p
INNER JOIN p_Tareas t ON p.idProyecto = t.idProyecto
INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
WHERE ta.idUsuario = @idUsuario
ORDER BY p.fechaCreacion DESC
```

### 2. Obtener Detalles de Tarea (con Joins)
*   **Función:** `obtenerTareaPorId`
```sql
SELECT 
    t.*, 
    p.tipo as proyectoTipo, 
    p.requiereAprobacion as proyectoRequiereAprobacion,
    pl.estado as planEstado,
    pl.idUsuario as planIdUsuario,
    pl.idCreador as planIdCreador
FROM p_Tareas t
LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
LEFT JOIN p_PlanesTrabajo pl ON t.idPlan = pl.idPlan
WHERE t.idTarea = @idTarea
```

### 3. Obtener Solicitudes Pendientes
*   **Función:** `obtenerSolicitudesPendientes`
```sql
SELECT s.*, t.nombre as tareaNombre, p.nombre as proyectoNombre, u.nombre as solicitanteNombre 
FROM p_SolicitudCambios s
JOIN p_Tareas t ON s.idTarea = t.idTarea
LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
LEFT JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
WHERE s.estado = 'Pendiente'
ORDER BY s.fechaSolicitud DESC
```

### 4. Jerarquía Organizacional (Hijos de Nodos)
*   **Función:** `obtenerHijosDeNodos`
*   **Nota:** Se usa `IN` con una lista construida en JS. ¿Se puede optimizar con STRING_SPLIT o Table Value Parameters?
```sql
SELECT idNodo FROM p_OrganizacionNodos WHERE idPadre IN (${idsStr})
```

---

## ✨ MÓDULO: CLARITY (`clarity.repo.ts`)

### 1. Crear Tarea Rápida
*   **Función:** `crearTarea`
```sql
INSERT INTO p_Tareas 
(nombre, descripcion, idCreador, idProyecto, estado, esfuerzo, prioridad, tipo, 
 fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, fechaCreacion)
OUTPUT INSERTED.idTarea
VALUES 
(@nombre, @descripcion, @idCreador, @idProyecto, @estado, @esfuerzo, @prioridad, @tipo,
 @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, GETDATE())
```

### 2. Obtener Mis Tareas (Agenda)
*   **Función:** `obtenerMisTareas`
```sql
SELECT t.*, p.nombre as proyectoNombre 
FROM p_Tareas t
LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
WHERE ta.idUsuario = @idUsuario AND ta.tipo = 'Responsable'
ORDER BY t.fechaObjetivo ASC, t.prioridad DESC
```

### 3. Upsert Check-in Diario
*   **Función:** `upsertCheckin` (Lectura de verificación)
```sql
SELECT * FROM p_Checkins 
WHERE idUsuario = @idUsuario 
  AND CAST(fecha as DATE) = CAST(@fecha as DATE)
```

---

## 🛠️ MÓDULO: ADMIN (`admin.repo.ts`)

### 1. Info de Seguridad y Subordinados (Masivo)
*   **Función:** `obtenerUsuariosAccessInfo`
*   **Contexto:** Carga todos los usuarios con su conteo de subordinados y configuración de menú.
```sql
SELECT 
    u.*,
    (SELECT COUNT(*) FROM p_Usuarios s WHERE s.jefeCarnet = u.carnet AND s.activo = 1) as subordinateCount,
    c.menuPersonalizado
FROM p_Usuarios u
LEFT JOIN p_UsuariosConfig c ON u.idUsuario = c.idUsuario
WHERE u.activo = 1
ORDER BY u.nombre ASC
```

### 2. Listado Paginado de Usuarios
*   **Función:** `listarUsuarios`
```sql
SELECT u.*, r.nombre as rolNombre
FROM p_Usuarios u
LEFT JOIN p_Roles r ON u.idRol = r.idRol
ORDER BY u.nombre ASC
OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
```

---

## 👁️ MÓDULO: ACCESO (`acceso.repo.ts`)

### 1. CÁLCULO DE VISIBILIDAD (RECURSIVO) - MUY IMPORTANTE
*   **Función:** `calcularCarnetsVisibles`
*   **Contexto:** Esta es la query más compleja del sistema. Calcula qué carnets puede ver un usuario basándose en jerarquía, delegaciones, permisos de área y permisos puntuales.
```sql
WITH Actores AS (
    SELECT @carnet AS carnet
    UNION ALL
    SELECT d.carnet_delegante
    FROM p_delegacion_visibilidad d
    WHERE d.carnet_delegado = @carnet
    AND d.activo = 1
    AND (d.fecha_fin IS NULL OR d.fecha_fin >= CAST(GETDATE() AS DATE))
),
IsAdmin AS (
    SELECT 1 as x FROM p_Usuarios u
    JOIN Actores a ON u.carnet = a.carnet
    WHERE u.activo = 1 
    AND UPPER(LTRIM(RTRIM(u.rolGlobal))) IN ('ADMIN', 'SUPERADMIN', 'ADMINISTRADOR')
),
Subordinados AS (
    SELECT u.carnet
    FROM p_Usuarios u
    JOIN Actores a ON u.jefeCarnet = a.carnet
    WHERE u.activo = 1
    UNION ALL
    SELECT u.carnet
    FROM p_Usuarios u
    JOIN Subordinados s ON u.jefeCarnet = s.carnet
    WHERE u.activo = 1
),
VisiblesPuntual AS (
    SELECT pe.carnet_objetivo AS carnet
    FROM p_permiso_empleado pe
    JOIN Actores a ON a.carnet = pe.carnet_recibe
    WHERE pe.activo = 1
    AND (pe.fecha_fin IS NULL OR pe.fecha_fin >= CAST(GETDATE() AS DATE))
    AND (pe.tipo_acceso IS NULL OR pe.tipo_acceso = 'ALLOW')
),
NodosPermitidos AS (
    SELECT CAST(pa.idorg_raiz AS NVARCHAR(50)) as idorg
    FROM p_permiso_area pa
    JOIN Actores a ON a.carnet = pa.carnet_recibe
    WHERE pa.activo = 1 
    AND (pa.fecha_fin IS NULL OR pa.fecha_fin >= CAST(GETDATE() AS DATE))
    UNION ALL
    SELECT CAST(n.idorg AS NVARCHAR(50))
    FROM p_organizacion_nodos n
    JOIN NodosPermitidos np ON CAST(n.padre AS NVARCHAR(50)) = np.idorg
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
))
OPTION (MAXRECURSION 0)
```

### 2. Detalles de Usuarios (vía STRING_SPLIT)
*   **Función:** `obtenerDetallesUsuarios`
*   **Contexto:** Recibe una lista de carnets separados por coma para cargar detalles masivos.
```sql
SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.departamento,
       u.orgDepartamento, u.orgGerencia, u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
       u.gerencia, u.subgerencia, u.idRol, u.rolGlobal
FROM p_Usuarios u
WHERE u.carnet IN (SELECT value FROM STRING_SPLIT(@csv, ','))
ORDER BY u.nombreCompleto
```

### 3. Vista de Árbol Sub-nodos (Recursivo)
*   **Función:** `previewEmpleadosSubarbol`
```sql
WITH NodosSub AS (
    SELECT CAST(idorg AS NVARCHAR(50)) as idorg FROM p_organizacion_nodos WHERE CAST(idorg AS NVARCHAR(50)) = @id
    UNION ALL
    SELECT CAST(n.idorg AS NVARCHAR(50)) FROM p_organizacion_nodos n
    JOIN NodosSub ns ON CAST(n.padre AS NVARCHAR(50)) = ns.idorg
)
SELECT TOP (@limite) u.idUsuario, u.nombre, u.nombreCompleto, u.cargo, u.departamento, u.correo
FROM p_Usuarios u
JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
WHERE u.activo = 1
```

---

## 📝 MÓDULO: AUDIT (`audit.repo.ts`)

### 1. Listado Paginado de Auditoría
*   **Función:** `listarAuditLogs`
```sql
SELECT * FROM p_Auditoria
WHERE ${whereClause}
ORDER BY fecha DESC
OFFSET @offset ROWS FETCH NEXT @limite ROWS ONLY
```

---

**Instrucción para ChatGPT 5.2:**
1.  **Optimización de Índices:** Sugerir qué índices faltan basados en los filtros `WHERE` y `JOIN` utilizados.
2.  **Rendimiento de CTEs:** Evaluar si las queries recursivas (`CALCULO DE VISIBILIDAD`) pueden simplificarse o usar tablas temporales para mejorar el tiempo de respuesta.
3.  **Seguridad:** Validar que no haya riesgo de inyección o fugas de datos.
4.  **Estándares MSSQL:** Asegurar que estamos usando las mejores prácticas de T-SQL modernos (OFFSET/FETCH, STRING_SPLIT, etc.).
