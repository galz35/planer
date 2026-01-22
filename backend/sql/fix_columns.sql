    -- ============================================================
    -- SCRIPT DE FIX PARA COLUMNAS FALTANTES EN SQL SERVER
    -- Ejecutar ANTES del migrate_data.sql
    -- ============================================================

    USE Bdplaner;
    GO

    -- ============================================================
    -- FIX TABLA p_Roles
    -- ============================================================
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'esSistema')
        ALTER TABLE p_Roles ADD esSistema BIT DEFAULT 0;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'reglas')
        ALTER TABLE p_Roles ADD reglas NVARCHAR(MAX) DEFAULT '[]';
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Roles') AND name = 'defaultMenu')
        ALTER TABLE p_Roles ADD defaultMenu NVARCHAR(MAX) NULL;
    GO

    -- ============================================================
    -- FIX TABLA p_Usuarios (columnas adicionales)
    -- ============================================================
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'telefono')
        ALTER TABLE p_Usuarios ADD telefono NVARCHAR(50) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'fechaCreacion')
        ALTER TABLE p_Usuarios ADD fechaCreacion DATETIME DEFAULT GETDATE();
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'username')
        ALTER TABLE p_Usuarios ADD username NVARCHAR(100) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'cedula')
        ALTER TABLE p_Usuarios ADD cedula NVARCHAR(50) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'area')
        ALTER TABLE p_Usuarios ADD area NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'direccion')
        ALTER TABLE p_Usuarios ADD direccion NVARCHAR(MAX) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'empresa')
        ALTER TABLE p_Usuarios ADD empresa NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'ubicacion')
        ALTER TABLE p_Usuarios ADD ubicacion NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tipo_empleado')
        ALTER TABLE p_Usuarios ADD tipo_empleado NVARCHAR(100) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tipo_contrato')
        ALTER TABLE p_Usuarios ADD tipo_contrato NVARCHAR(100) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'fuente_datos')
        ALTER TABLE p_Usuarios ADD fuente_datos NVARCHAR(50) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'segundo_nivel')
        ALTER TABLE p_Usuarios ADD segundo_nivel NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'tercer_nivel')
        ALTER TABLE p_Usuarios ADD tercer_nivel NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'cuarto_nivel')
        ALTER TABLE p_Usuarios ADD cuarto_nivel NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'quinto_nivel')
        ALTER TABLE p_Usuarios ADD quinto_nivel NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'sexto_nivel')
        ALTER TABLE p_Usuarios ADD sexto_nivel NVARCHAR(200) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe2')
        ALTER TABLE p_Usuarios ADD carnet_jefe2 NVARCHAR(50) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe3')
        ALTER TABLE p_Usuarios ADD carnet_jefe3 NVARCHAR(50) NULL;
    GO

    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('p_Usuarios') AND name = 'carnet_jefe4')
        ALTER TABLE p_Usuarios ADD carnet_jefe4 NVARCHAR(50) NULL;
    GO

    PRINT '✅ Fix de columnas completado';
    GO
