-- ============================================================
-- SCRIPT: Tipos de Tareas A/B/C
-- Versión: 2.0
-- Fecha: 2026-01-21
-- ============================================================

USE Bdplaner;
GO

-- ============================================================
-- 1. MODIFICAR TABLA p_Tareas
-- ============================================================

-- 1.1 Agregar columna comportamiento
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'comportamiento')
    ALTER TABLE p_Tareas ADD comportamiento NVARCHAR(20) DEFAULT 'SIMPLE';
GO

-- 1.2 Agregar columna idGrupo (para fases)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'idGrupo')
    ALTER TABLE p_Tareas ADD idGrupo INT NULL;
GO

-- 1.3 Agregar columna numeroParte
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'numeroParte')
    ALTER TABLE p_Tareas ADD numeroParte INT DEFAULT 1;
GO

-- 1.4 Constraint numeroParte >= 1
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_Tareas_numeroParte')
    ALTER TABLE p_Tareas ADD CONSTRAINT CK_Tareas_numeroParte CHECK (numeroParte >= 1);
GO

-- 1.5 Índices
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tareas_comportamiento')
    CREATE INDEX IX_Tareas_comportamiento ON p_Tareas(comportamiento);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Tareas_idGrupo')
    CREATE INDEX IX_Tareas_idGrupo ON p_Tareas(idGrupo);
GO

-- ============================================================
-- 2. TABLA p_TareaRecurrencia
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaRecurrencia')
CREATE TABLE p_TareaRecurrencia (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idTarea INT NOT NULL,
    tipoRecurrencia NVARCHAR(20) NOT NULL,  -- 'SEMANAL', 'MENSUAL'
    diasSemana NVARCHAR(20) NULL,           -- '1,2,3,4,5' (lun-vie ISO)
    diaMes INT NULL,                        -- 15 (día del mes)
    fechaInicioVigencia DATE NOT NULL,
    fechaFinVigencia DATE NULL,
    activo BIT DEFAULT 1,
    fechaCreacion DATETIME DEFAULT GETDATE(),
    idCreador INT NOT NULL,
    FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
    FOREIGN KEY (idCreador) REFERENCES p_Usuarios(idUsuario)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TareaRecurrencia_vigencia')
    CREATE INDEX IX_TareaRecurrencia_vigencia ON p_TareaRecurrencia(fechaInicioVigencia, fechaFinVigencia, activo);
GO

-- ============================================================
-- 3. TABLA p_TareaInstancia (Bitácora recurrencia)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaInstancia')
CREATE TABLE p_TareaInstancia (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idTarea INT NOT NULL,
    idRecurrencia INT NULL,
    fechaProgramada DATE NOT NULL,
    fechaEjecucion DATE NULL,
    estadoInstancia NVARCHAR(30) DEFAULT 'PENDIENTE',
    comentario NVARCHAR(MAX) NULL,
    idUsuarioEjecutor INT NULL,
    fechaRegistro DATETIME DEFAULT GETDATE(),
    fechaReprogramada DATE NULL,
    FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
    FOREIGN KEY (idRecurrencia) REFERENCES p_TareaRecurrencia(id),
    FOREIGN KEY (idUsuarioEjecutor) REFERENCES p_Usuarios(idUsuario)
);
GO

-- Constraint UNIQUE: evita duplicados por día
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_TareaInstancia')
    ALTER TABLE p_TareaInstancia ADD CONSTRAINT UQ_TareaInstancia UNIQUE (idTarea, fechaProgramada);
GO

-- Constraint CHECK: solo estados válidos
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_TareaInstancia_estado')
    ALTER TABLE p_TareaInstancia ADD CONSTRAINT CK_TareaInstancia_estado 
        CHECK (estadoInstancia IN ('PENDIENTE','HECHA','OMITIDA','REPROGRAMADA'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TareaInstancia_fecha')
    CREATE INDEX IX_TareaInstancia_fecha ON p_TareaInstancia(fechaProgramada, estadoInstancia);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TareaInstancia_idTarea')
    CREATE INDEX IX_TareaInstancia_idTarea ON p_TareaInstancia(idTarea);
GO

-- ============================================================
-- 4. TABLA p_TareaAvanceMensual (Solo Plan de Trabajo)
-- ============================================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'p_TareaAvanceMensual')
CREATE TABLE p_TareaAvanceMensual (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idTarea INT NOT NULL,
    mes INT NOT NULL,
    anio INT NOT NULL,
    porcentajeMes DECIMAL(5,2) NOT NULL DEFAULT 0,
    -- SIN porcentajeAcumulado - se calcula con SUM()
    comentario NVARCHAR(MAX) NULL,
    idUsuarioActualizador INT NOT NULL,
    fechaActualizacion DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
    FOREIGN KEY (idUsuarioActualizador) REFERENCES p_Usuarios(idUsuario)
);
GO

-- Constraint UNIQUE: un registro por mes/año/tarea
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_TareaAvanceMensual')
    ALTER TABLE p_TareaAvanceMensual ADD CONSTRAINT UQ_TareaAvanceMensual UNIQUE (idTarea, mes, anio);
GO

-- Constraint CHECK: rango 0-100
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_AvanceMes_Rango')
    ALTER TABLE p_TareaAvanceMensual ADD CONSTRAINT CK_AvanceMes_Rango 
        CHECK (porcentajeMes >= 0 AND porcentajeMes <= 100);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TareaAvanceMensual_periodo')
    CREATE INDEX IX_TareaAvanceMensual_periodo ON p_TareaAvanceMensual(anio, mes);
GO

-- ============================================================
-- 5. STORED PROCEDURES
-- ============================================================

-- 5.1 SP: Upsert Avance Mensual (Plan de Trabajo)
CREATE OR ALTER PROCEDURE sp_UpsertAvanceMensual
    @idTarea INT,
    @anio INT,
    @mes INT,
    @porcentajeMes DECIMAL(5,2),
    @comentario NVARCHAR(MAX) = NULL,
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;

    MERGE p_TareaAvanceMensual AS t
    USING (SELECT @idTarea idTarea, @anio anio, @mes mes) AS s
    ON (t.idTarea = s.idTarea AND t.anio = s.anio AND t.mes = s.mes)
    WHEN MATCHED THEN
        UPDATE SET porcentajeMes = @porcentajeMes,
                   comentario = @comentario,
                   idUsuarioActualizador = @idUsuario,
                   fechaActualizacion = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (idTarea, anio, mes, porcentajeMes, comentario, idUsuarioActualizador)
        VALUES (@idTarea, @anio, @mes, @porcentajeMes, @comentario, @idUsuario);

    -- Marca completada si acumulado >= 100
    DECLARE @acum DECIMAL(6,2);
    SELECT @acum = ISNULL(SUM(porcentajeMes), 0)
    FROM p_TareaAvanceMensual
    WHERE idTarea = @idTarea;

    -- Actualiza el porcentaje global en p_Tareas
    UPDATE p_Tareas 
    SET porcentaje = CASE WHEN @acum > 100 THEN 100 ELSE @acum END,
        estado = CASE WHEN @acum >= 100 THEN 'Hecha' ELSE estado END,
        fechaCompletado = CASE WHEN @acum >= 100 AND estado <> 'Hecha' THEN GETDATE() ELSE fechaCompletado END
    WHERE idTarea = @idTarea;

    COMMIT;
END
GO

-- 5.2 SP: Crear Grupo Inicial (Plan de Trabajo)
CREATE OR ALTER PROCEDURE sp_CrearGrupoInicial
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET idGrupo = @idTarea, numeroParte = 1
    WHERE idTarea = @idTarea AND (idGrupo IS NULL OR idGrupo = 0);
END
GO

-- 5.3 SP: Agregar Fase a Grupo (Plan de Trabajo)
CREATE OR ALTER PROCEDURE sp_AgregarFaseGrupo
    @idGrupo INT,
    @idTareaNueva INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT;
    SELECT @n = ISNULL(MAX(numeroParte), 0) + 1
    FROM p_Tareas WHERE idGrupo = @idGrupo;

    UPDATE p_Tareas
    SET idGrupo = @idGrupo, numeroParte = @n
    WHERE idTarea = @idTareaNueva;
END
GO

-- ============================================================
-- 6. VERIFICACIÓN
-- ============================================================

PRINT '✅ Columnas agregadas a p_Tareas: comportamiento, idGrupo, numeroParte';
PRINT '✅ Tabla creada: p_TareaRecurrencia';
PRINT '✅ Tabla creada: p_TareaInstancia (con UNIQUE y CHECK)';
PRINT '✅ Tabla creada: p_TareaAvanceMensual (con UNIQUE y CHECK)';
PRINT '✅ SP creado: sp_UpsertAvanceMensual';
PRINT '✅ SP creado: sp_CrearGrupoInicial';
PRINT '✅ SP creado: sp_AgregarFaseGrupo';
PRINT '============================================================';
PRINT 'SCRIPT COMPLETADO - Tipos de Tareas A/B/C';
GO
