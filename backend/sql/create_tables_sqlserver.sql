    -- ============================================================
    -- SCRIPT COMPLETO PARA SQL SERVER (AWS RDS)
    -- Base de datos: Bdplaner
    -- Incluye TODAS las tablas de las entidades TypeORM
    -- ============================================================

    USE Bdplaner;
    GO

    -- ============================================================
    -- TABLAS DE AUTENTICACIÓN
    -- ============================================================

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Roles')
    CREATE TABLE p_Roles (
        idRol INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        descripcion NVARCHAR(500) NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Usuarios')
    CREATE TABLE p_Usuarios (
        idUsuario INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(200) NULL,
        nombreCompleto NVARCHAR(300) NULL,
        correo NVARCHAR(200) NOT NULL UNIQUE,
        telefono NVARCHAR(50) NULL,
        activo BIT DEFAULT 1,
        rolGlobal NVARCHAR(50) DEFAULT 'Empleado',
        idRol INT NULL,
        carnet NVARCHAR(50) NULL,
        cargo NVARCHAR(200) NULL,
        departamento NVARCHAR(200) NULL,
        orgDepartamento NVARCHAR(200) NULL,
        orgGerencia NVARCHAR(200) NULL,
        idOrg NVARCHAR(50) NULL,
        jefeCarnet NVARCHAR(50) NULL,
        jefeNombre NVARCHAR(200) NULL,
        jefeCorreo NVARCHAR(200) NULL,
        fechaIngreso DATETIME NULL,
        fechaCreacion DATETIME DEFAULT GETDATE(),
        genero NVARCHAR(20) NULL,
        username NVARCHAR(100) NULL,
        cedula NVARCHAR(50) NULL,
        area NVARCHAR(200) NULL,
        gerencia NVARCHAR(200) NULL,
        direccion NVARCHAR(MAX) NULL,
        empresa NVARCHAR(200) NULL,
        ubicacion NVARCHAR(200) NULL,
        tipo_empleado NVARCHAR(100) NULL,
        tipo_contrato NVARCHAR(100) NULL,
        fuente_datos NVARCHAR(50) NULL,
        primer_nivel NVARCHAR(200) NULL,
        segundo_nivel NVARCHAR(200) NULL,
        tercer_nivel NVARCHAR(200) NULL,
        cuarto_nivel NVARCHAR(200) NULL,
        quinto_nivel NVARCHAR(200) NULL,
        sexto_nivel NVARCHAR(200) NULL,
        carnet_jefe2 NVARCHAR(50) NULL,
        carnet_jefe3 NVARCHAR(50) NULL,
        carnet_jefe4 NVARCHAR(50) NULL,
        pais NVARCHAR(10) DEFAULT 'NI',
        subgerencia NVARCHAR(200) NULL,
        ogerencia NVARCHAR(200) NULL,
        FOREIGN KEY (idRol) REFERENCES p_Roles(idRol)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_UsuariosCredenciales')
    CREATE TABLE p_UsuariosCredenciales (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL UNIQUE,
        passwordHash NVARCHAR(500) NOT NULL,
        ultimoCambio DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_UsuariosConfig')
    CREATE TABLE p_UsuariosConfig (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL UNIQUE,
        menuPersonalizado NVARCHAR(MAX) NULL,
        temasPreferidos NVARCHAR(500) NULL,
        notificaciones BIT DEFAULT 1,
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_OrganizacionNodos')
    CREATE TABLE p_OrganizacionNodos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(200) NOT NULL,
        tipo NVARCHAR(50) NULL,
        idPadre INT NULL,
        orden INT DEFAULT 0,
        activo BIT DEFAULT 1,
        FOREIGN KEY (idPadre) REFERENCES p_OrganizacionNodos(id)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_UsuariosOrganizacion')
    CREATE TABLE p_UsuariosOrganizacion (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        idNodo INT NOT NULL,
        esResponsable BIT DEFAULT 0,
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idNodo) REFERENCES p_OrganizacionNodos(id)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_SeguridadPerfiles')
    CREATE TABLE p_SeguridadPerfiles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(100) NOT NULL,
        permisos NVARCHAR(MAX) NULL,
        activo BIT DEFAULT 1
    );

    -- ============================================================
    -- TABLAS DE PROYECTOS Y TAREAS
    -- ============================================================

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Proyectos')
    CREATE TABLE p_Proyectos (
        idProyecto INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(300) NOT NULL,
        descripcion NVARCHAR(MAX) NULL,
        idNodoDuenio INT NULL,
        fechaCreacion DATETIME DEFAULT GETDATE(),
        pais NVARCHAR(10) DEFAULT 'NI',
        tipo NVARCHAR(50) DEFAULT 'Operativo',
        estado NVARCHAR(50) DEFAULT 'Borrador',
        requiereAprobacion BIT DEFAULT 0,
        enllavado BIT DEFAULT 0,
        fechaInicio DATETIME NULL,
        fechaFin DATETIME NULL,
        area NVARCHAR(200) NULL,
        subgerencia NVARCHAR(200) NULL,
        gerencia NVARCHAR(200) NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Tareas')
    CREATE TABLE p_Tareas (
        idTarea INT IDENTITY(1,1) PRIMARY KEY,
        idProyecto INT NOT NULL,
        nombre NVARCHAR(500) NOT NULL,
        descripcion NVARCHAR(MAX) NULL,
        estado NVARCHAR(50) DEFAULT 'Pendiente',
        prioridad NVARCHAR(20) DEFAULT 'Media',
        fechaCreacion DATETIME DEFAULT GETDATE(),
        fechaObjetivo DATETIME NULL,
        fechaCompletado DATETIME NULL,
        porcentaje INT DEFAULT 0,
        idPadre INT NULL,
        orden INT DEFAULT 0,
        esHito BIT DEFAULT 0,
        idAsignado INT NULL,
        FOREIGN KEY (idProyecto) REFERENCES p_Proyectos(idProyecto),
        FOREIGN KEY (idPadre) REFERENCES p_Tareas(idTarea),
        FOREIGN KEY (idAsignado) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaAsignados')
    CREATE TABLE p_TareaAsignados (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idTarea INT NOT NULL,
        idUsuario INT NOT NULL,
        esResponsable BIT DEFAULT 0,
        fechaAsignacion DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaAsignacionLog')
    CREATE TABLE p_TareaAsignacionLog (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idTarea INT NOT NULL,
        idUsuarioAnterior INT NULL,
        idUsuarioNuevo INT NULL,
        idEjecutor INT NOT NULL,
        tipoAccion NVARCHAR(50) NOT NULL,
        motivo NVARCHAR(500) NULL,
        fecha_inicio DATETIME DEFAULT GETDATE(),
        fecha_fin DATETIME NULL,
        activo BIT DEFAULT 1,
        FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
        FOREIGN KEY (idUsuarioAnterior) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idUsuarioNuevo) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idEjecutor) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaAvances')
    CREATE TABLE p_TareaAvances (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idTarea INT NOT NULL,
        idUsuario INT NOT NULL,
        porcentajeAnterior INT NULL,
        porcentajeNuevo INT NOT NULL,
        comentario NVARCHAR(MAX) NULL,
        fecha DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_PlanesTrabajo')
    CREATE TABLE p_PlanesTrabajo (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        mes INT NOT NULL,
        anio INT NOT NULL,
        estado NVARCHAR(50) DEFAULT 'Borrador',
        fechaCreacion DATETIME DEFAULT GETDATE(),
        fechaAprobacion DATETIME NULL,
        idAprobador INT NULL,
        observaciones NVARCHAR(MAX) NULL,
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idAprobador) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_SolicitudCambios')
    CREATE TABLE p_SolicitudCambios (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idTarea INT NOT NULL,
        idSolicitante INT NOT NULL,
        tipo NVARCHAR(50) NOT NULL,
        descripcion NVARCHAR(MAX) NULL,
        estado NVARCHAR(50) DEFAULT 'Pendiente',
        fechaSolicitud DATETIME DEFAULT GETDATE(),
        fechaRespuesta DATETIME NULL,
        idResponsable INT NULL,
        respuesta NVARCHAR(MAX) NULL,
        FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
        FOREIGN KEY (idSolicitante) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idResponsable) REFERENCES p_Usuarios(idUsuario)
    );

    -- ============================================================
    -- TABLAS DE CLARITY (CHECK-IN, BLOQUEOS)
    -- ============================================================

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Checkins')
    CREATE TABLE p_Checkins (
        idCheckin INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        fecha DATE NOT NULL,
        prioridad1 NVARCHAR(500) NULL,
        prioridad2 NVARCHAR(500) NULL,
        prioridad3 NVARCHAR(500) NULL,
        estado NVARCHAR(50) DEFAULT 'pendiente',
        energia INT DEFAULT 3,
        creadoEn DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_CheckinTareas')
    CREATE TABLE p_CheckinTareas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idCheckin INT NOT NULL,
        idTarea INT NULL,
        descripcion NVARCHAR(500) NULL,
        completado BIT DEFAULT 0,
        orden INT DEFAULT 0,
        FOREIGN KEY (idCheckin) REFERENCES p_Checkins(idCheckin),
        FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_FocoDiario')
    CREATE TABLE p_FocoDiario (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        fecha DATE NOT NULL,
        foco NVARCHAR(500) NOT NULL,
        completado BIT DEFAULT 0,
        creadoEn DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Bloqueos')
    CREATE TABLE p_Bloqueos (
        idBloqueo INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        descripcion NVARCHAR(MAX) NOT NULL,
        fechaCreacion DATETIME DEFAULT GETDATE(),
        fechaResolucion DATETIME NULL,
        estado NVARCHAR(50) DEFAULT 'Activo',
        resolucion NVARCHAR(MAX) NULL,
        idResueltoPor INT NULL,
        prioridad NVARCHAR(20) DEFAULT 'Media',
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario),
        FOREIGN KEY (idResueltoPor) REFERENCES p_Usuarios(idUsuario)
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Notas')
    CREATE TABLE p_Notas (
        idNota INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NOT NULL,
        titulo NVARCHAR(300) NULL,
        contenido NVARCHAR(MAX) NULL,
        fechaCreacion DATETIME DEFAULT GETDATE(),
        fechaModificacion DATETIME NULL,
        tipo NVARCHAR(50) DEFAULT 'nota',
        FOREIGN KEY (idUsuario) REFERENCES p_Usuarios(idUsuario)
    );

    -- ============================================================
    -- TABLAS DE PERMISOS Y VISIBILIDAD
    -- ============================================================

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_organizacion_nodos')
    CREATE TABLE p_organizacion_nodos (
        idorg BIGINT PRIMARY KEY,
        padre BIGINT NULL,
        descripcion NVARCHAR(100) NULL,
        tipo NVARCHAR(50) NULL,
        estado NVARCHAR(50) NULL,
        nivel NVARCHAR(200) NULL,
        updated_at DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_permiso_area')
    CREATE TABLE p_permiso_area (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        carnet_otorga NVARCHAR(100) NULL,
        carnet_recibe NVARCHAR(100) NOT NULL,
        idorg_raiz BIGINT NOT NULL,
        alcance NVARCHAR(20) DEFAULT 'SUBARBOL',
        activo BIT DEFAULT 1,
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        motivo NVARCHAR(300) NULL,
        creado_en DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_permiso_empleado')
    CREATE TABLE p_permiso_empleado (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        carnet_otorga NVARCHAR(100) NULL,
        carnet_recibe NVARCHAR(100) NOT NULL,
        carnet_objetivo NVARCHAR(100) NOT NULL,
        activo BIT DEFAULT 1,
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        motivo NVARCHAR(300) NULL,
        creado_en DATETIME DEFAULT GETDATE(),
        tipo_acceso NVARCHAR(20) DEFAULT 'ALLOW'
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_delegacion_visibilidad')
    CREATE TABLE p_delegacion_visibilidad (
        id BIGINT IDENTITY(1,1) PRIMARY KEY,
        carnet_delegante NVARCHAR(100) NOT NULL,
        carnet_delegado NVARCHAR(100) NOT NULL,
        activo BIT DEFAULT 1,
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        motivo NVARCHAR(300) NULL,
        creado_en DATETIME DEFAULT GETDATE()
    );

    -- ============================================================
    -- TABLAS DE AUDITORÍA
    -- ============================================================

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Logs')
    CREATE TABLE p_Logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NULL,
        accion NVARCHAR(100) NOT NULL,
        entidad NVARCHAR(100) NULL,
        entidadId NVARCHAR(50) NULL,
        datos NVARCHAR(MAX) NULL,
        ip NVARCHAR(50) NULL,
        fecha DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Auditoria')
    CREATE TABLE p_Auditoria (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idUsuario INT NULL,
        accion NVARCHAR(100) NOT NULL,
        entidad NVARCHAR(100) NULL,
        entidadId NVARCHAR(50) NULL,
        datosAnteriores NVARCHAR(MAX) NULL,
        datosNuevos NVARCHAR(MAX) NULL,
        fecha DATETIME DEFAULT GETDATE()
    );

    -- ============================================================
    -- ÍNDICES
    -- ============================================================

    -- Solo crear si no existen
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_correo')
        CREATE INDEX IX_Usuarios_correo ON p_Usuarios(correo);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Usuarios_carnet')
        CREATE INDEX IX_Usuarios_carnet ON p_Usuarios(carnet);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tareas_idProyecto')
        CREATE INDEX IX_Tareas_idProyecto ON p_Tareas(idProyecto);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tareas_idAsignado')
        CREATE INDEX IX_Tareas_idAsignado ON p_Tareas(idAsignado);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Checkins_idUsuario_fecha')
        CREATE INDEX IX_Checkins_idUsuario_fecha ON p_Checkins(idUsuario, fecha);

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_permiso_area_carnet')
        CREATE INDEX IX_permiso_area_carnet ON p_permiso_area(carnet_recibe, activo);

    PRINT '✅ Script SQL Server completado - Todas las tablas creadas';
    GO
