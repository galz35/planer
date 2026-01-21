-- ============================================================================
-- SCRIPT COMPLETO DE FIX PARA SQL SERVER
-- Ejecutar en SSMS para agregar TODAS las columnas faltantes
-- ============================================================================

USE Bdplaner;
GO

-- ============================================================================
-- p_Roles
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'esSistema')
    ALTER TABLE p_Roles ADD esSistema BIT DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'reglas')
    ALTER TABLE p_Roles ADD reglas NVARCHAR(MAX) DEFAULT '[]';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'defaultMenu')
    ALTER TABLE p_Roles ADD defaultMenu NVARCHAR(MAX) NULL;
GO

-- ============================================================================
-- p_Usuarios
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'telefono')
    ALTER TABLE p_Usuarios ADD telefono NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'fechaCreacion')
    ALTER TABLE p_Usuarios ADD fechaCreacion DATETIME DEFAULT GETDATE();
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'username')
    ALTER TABLE p_Usuarios ADD username NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'cedula')
    ALTER TABLE p_Usuarios ADD cedula NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'area')
    ALTER TABLE p_Usuarios ADD area NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'direccion')
    ALTER TABLE p_Usuarios ADD direccion NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'empresa')
    ALTER TABLE p_Usuarios ADD empresa NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'ubicacion')
    ALTER TABLE p_Usuarios ADD ubicacion NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tipo_empleado')
    ALTER TABLE p_Usuarios ADD tipo_empleado NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tipo_contrato')
    ALTER TABLE p_Usuarios ADD tipo_contrato NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'fuente_datos')
    ALTER TABLE p_Usuarios ADD fuente_datos NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'segundo_nivel')
    ALTER TABLE p_Usuarios ADD segundo_nivel NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tercer_nivel')
    ALTER TABLE p_Usuarios ADD tercer_nivel NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'cuarto_nivel')
    ALTER TABLE p_Usuarios ADD cuarto_nivel NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'quinto_nivel')
    ALTER TABLE p_Usuarios ADD quinto_nivel NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'sexto_nivel')
    ALTER TABLE p_Usuarios ADD sexto_nivel NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe2')
    ALTER TABLE p_Usuarios ADD carnet_jefe2 NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe3')
    ALTER TABLE p_Usuarios ADD carnet_jefe3 NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe4')
    ALTER TABLE p_Usuarios ADD carnet_jefe4 NVARCHAR(50) NULL;
GO

-- ============================================================================
-- p_UsuariosCredenciales
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosCredenciales') AND name = 'ultimoLogin')
    ALTER TABLE p_UsuariosCredenciales ADD ultimoLogin DATETIME NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosCredenciales') AND name = 'refreshTokenHash')
    ALTER TABLE p_UsuariosCredenciales ADD refreshTokenHash NVARCHAR(500) NULL;
-- Renombrar id a idCredencial si es necesario
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosCredenciales') AND name = 'id')
   AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosCredenciales') AND name = 'idCredencial')
BEGIN
    EXEC sp_rename 'p_UsuariosCredenciales.id', 'idCredencial', 'COLUMN';
END
GO

-- ============================================================================
-- p_UsuariosConfig
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosConfig') AND name = 'fechaActualizacion')
    ALTER TABLE p_UsuariosConfig ADD fechaActualizacion DATETIME NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosConfig') AND name = 'idioma')
    ALTER TABLE p_UsuariosConfig ADD idioma NVARCHAR(10) DEFAULT 'es';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_UsuariosConfig') AND name = 'tema')
    ALTER TABLE p_UsuariosConfig ADD tema NVARCHAR(20) DEFAULT 'light';
GO

-- ============================================================================
-- p_SeguridadPerfiles
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_SeguridadPerfiles') AND name = 'fechaActualizacion')
    ALTER TABLE p_SeguridadPerfiles ADD fechaActualizacion DATETIME NULL;
GO

-- ============================================================================
-- p_Proyectos
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'idCreador')
    ALTER TABLE p_Proyectos ADD idCreador INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'idResponsable')
    ALTER TABLE p_Proyectos ADD idResponsable INT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'prioridad')
    ALTER TABLE p_Proyectos ADD prioridad NVARCHAR(20) DEFAULT 'Media';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'fechaActualizacion')
    ALTER TABLE p_Proyectos ADD fechaActualizacion DATETIME NULL;
GO

-- ============================================================================
-- p_Tareas
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'tipoTarea')
    ALTER TABLE p_Tareas ADD tipoTarea NVARCHAR(50) DEFAULT 'tarea';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'fechaActualizacion')
    ALTER TABLE p_Tareas ADD fechaActualizacion DATETIME NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'idCreador')
    ALTER TABLE p_Tareas ADD idCreador INT NULL;
GO

-- ============================================================================
-- p_PlanesTrabajo
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_PlanesTrabajo') AND name = 'fechaActualizacion')
    ALTER TABLE p_PlanesTrabajo ADD fechaActualizacion DATETIME NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_PlanesTrabajo') AND name = 'comentarios')
    ALTER TABLE p_PlanesTrabajo ADD comentarios NVARCHAR(MAX) NULL;
GO

-- ============================================================================
-- p_Notas
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Notas') AND name = 'fechaActualizacion')
    ALTER TABLE p_Notas ADD fechaActualizacion DATETIME NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Notas') AND name = 'etiquetas')
    ALTER TABLE p_Notas ADD etiquetas NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Notas') AND name = 'procesado')
    ALTER TABLE p_Notas ADD procesado BIT DEFAULT 0;
GO

-- ============================================================================
-- p_Checkins
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Checkins') AND name = 'comentarios')
    ALTER TABLE p_Checkins ADD comentarios NVARCHAR(MAX) NULL;
GO

-- ============================================================================
-- p_Bloqueos
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Bloqueos') AND name = 'categoria')
    ALTER TABLE p_Bloqueos ADD categoria NVARCHAR(50) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Bloqueos') AND name = 'idTarea')
    ALTER TABLE p_Bloqueos ADD idTarea INT NULL;
GO

PRINT '✅ Script de fix completado - Todas las columnas agregadas';
GO
