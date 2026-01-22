# DISEÑO FINAL V2: TIPOS DE TAREAS

## DECISIONES TOMADAS

| Comportamiento | Implementar | Solución |
|----------------|-------------|----------|
| A) Recurrente Semanal | ✅ Sí | `p_TareaRecurrencia` + `p_TareaInstancia` |
| B) Tarea Larga (meses) | ✅ Sí | `p_TareaAvanceMensual` (acumulado calculado) |
| C) Subtareas/Hijos | ❌ No | Usar `idGrupo` para agrupar fases |

---

## MODELO DE DATOS FINAL V2

### Modificación a `p_Tareas`

```sql
-- Discriminador de comportamiento
ALTER TABLE p_Tareas ADD comportamiento NVARCHAR(20) DEFAULT 'SIMPLE';
-- Valores: 'SIMPLE', 'RECURRENTE', 'LARGA'

-- Agrupación de fases (reemplaza subtareas)
ALTER TABLE p_Tareas ADD idGrupo INT NULL;
ALTER TABLE p_Tareas ADD numeroParte INT DEFAULT 1;

-- Constraints
ALTER TABLE p_Tareas ADD CONSTRAINT CK_Tareas_numeroParte CHECK (numeroParte >= 1);

-- Índices
CREATE INDEX IX_Tareas_comportamiento ON p_Tareas(comportamiento);
CREATE INDEX IX_Tareas_idGrupo ON p_Tareas(idGrupo);
```

### Tabla: `p_TareaRecurrencia`

```sql
CREATE TABLE p_TareaRecurrencia (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idTarea INT NOT NULL,
    tipoRecurrencia NVARCHAR(20) NOT NULL,  -- 'SEMANAL', 'MENSUAL'
    diasSemana NVARCHAR(20) NULL,           -- '1,2,3,4,5' (lun-vie, ISO)
    diaMes INT NULL,                        -- 15 (día del mes)
    fechaInicioVigencia DATE NOT NULL,
    fechaFinVigencia DATE NULL,
    activo BIT DEFAULT 1,
    fechaCreacion DATETIME DEFAULT GETDATE(),
    idCreador INT NOT NULL,
    
    FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
    FOREIGN KEY (idCreador) REFERENCES p_Usuarios(idUsuario)
);

CREATE INDEX IX_TareaRecurrencia_vigencia ON p_TareaRecurrencia(fechaInicioVigencia, fechaFinVigencia, activo);
```

### Tabla: `p_TareaInstancia`

```sql
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
    FOREIGN KEY (idUsuarioEjecutor) REFERENCES p_Usuarios(idUsuario),
    
    -- CRÍTICO: Evita duplicados por día
    CONSTRAINT UQ_TareaInstancia UNIQUE (idTarea, fechaProgramada),
    
    -- Valida estados permitidos
    CONSTRAINT CK_TareaInstancia_estado 
        CHECK (estadoInstancia IN ('PENDIENTE','HECHA','OMITIDA','REPROGRAMADA'))
);

CREATE INDEX IX_TareaInstancia_fecha ON p_TareaInstancia(fechaProgramada, estadoInstancia);
CREATE INDEX IX_TareaInstancia_idTarea ON p_TareaInstancia(idTarea);
```

### Tabla: `p_TareaAvanceMensual` (V2 - Sin acumulado persistido)

```sql
CREATE TABLE p_TareaAvanceMensual (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idTarea INT NOT NULL,
    mes INT NOT NULL,
    anio INT NOT NULL,
    
    -- DECIMAL para permitir 8.5%, 33.33%, etc.
    porcentajeMes DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- SIN porcentajeAcumulado - se calcula con SUM()
    
    comentario NVARCHAR(MAX) NULL,
    idUsuarioActualizador INT NOT NULL,
    fechaActualizacion DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
    FOREIGN KEY (idUsuarioActualizador) REFERENCES p_Usuarios(idUsuario),
    
    CONSTRAINT UQ_TareaAvanceMensual UNIQUE (idTarea, mes, anio),
    CONSTRAINT CK_AvanceMes_Rango CHECK (porcentajeMes >= 0 AND porcentajeMes <= 100)
);

CREATE INDEX IX_TareaAvanceMensual_periodo ON p_TareaAvanceMensual(anio, mes);
```

---

## STORED PROCEDURES

### SP: Upsert Avance Mensual (con auto-completar si >= 100%)

```sql
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

    IF (@acum >= 100)
        UPDATE p_Tareas SET estado = 'Hecha', fechaCompletado = GETDATE() 
        WHERE idTarea = @idTarea;

    COMMIT;
END
```

### SP: Crear Grupo Inicial

```sql
CREATE OR ALTER PROCEDURE sp_CrearGrupoInicial
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Primera fase se auto-referencia como grupo
    UPDATE p_Tareas
    SET idGrupo = @idTarea,
        numeroParte = 1
    WHERE idTarea = @idTarea
      AND (idGrupo IS NULL OR idGrupo = 0);
END
```

### SP: Agregar Fase a Grupo

```sql
CREATE OR ALTER PROCEDURE sp_AgregarFaseGrupo
    @idGrupo INT,
    @idTareaNueva INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT;

    SELECT @n = ISNULL(MAX(numeroParte), 0) + 1
    FROM p_Tareas
    WHERE idGrupo = @idGrupo;

    UPDATE p_Tareas
    SET idGrupo = @idGrupo,
        numeroParte = @n
    WHERE idTarea = @idTareaNueva;
END
```

---

## QUERIES CLAVE

### Query: Historial Mensual con Acumulado Calculado

```sql
DECLARE @idTarea INT = @p0;

SELECT
    anio, 
    mes, 
    porcentajeMes,
    SUM(porcentajeMes) OVER (
        PARTITION BY idTarea 
        ORDER BY anio, mes
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS porcentajeAcumulado,
    comentario,
    idUsuarioActualizador,
    fechaActualizacion
FROM p_TareaAvanceMensual
WHERE idTarea = @idTarea
ORDER BY anio, mes;
```

### Query: Agenda Diaria (Instancias + Recurrencias Pendientes Virtuales)

```sql
-- IMPORTANTE: Definir lunes=1 para Nicaragua
SET DATEFIRST 1;

DECLARE @fecha DATE = @p0;
DECLARE @idUsuario INT = @p1;

-- 1) Instancias reales registradas ese día
WITH Inst AS (
    SELECT
        i.idTarea,
        i.fechaProgramada AS fecha,
        i.estadoInstancia,
        i.fechaEjecucion,
        i.fechaReprogramada,
        i.comentario,
        CAST(1 AS BIT) AS esInstanciaReal
    FROM p_TareaInstancia i
    WHERE i.fechaProgramada = @fecha
),

-- 2) Recurrencias activas que aplican hoy
RecAplica AS (
    SELECT r.idTarea
    FROM p_TareaRecurrencia r
    WHERE r.activo = 1
      AND @fecha >= r.fechaInicioVigencia
      AND (@fecha <= r.fechaFinVigencia OR r.fechaFinVigencia IS NULL)
      AND (
          (r.tipoRecurrencia = 'SEMANAL'
           AND CHARINDEX(',' + CAST(DATEPART(WEEKDAY, @fecha) AS VARCHAR(2)) + ',', 
                         ',' + r.diasSemana + ',') > 0)
          OR
          (r.tipoRecurrencia = 'MENSUAL' AND DAY(@fecha) = r.diaMes)
      )
)

SELECT
    t.idTarea,
    t.nombre AS titulo,
    t.comportamiento,
    @fecha AS fecha,
    COALESCE(inst.estadoInstancia, 'PENDIENTE') AS estadoInstancia,
    inst.fechaEjecucion,
    inst.fechaReprogramada,
    inst.comentario,
    COALESCE(inst.esInstanciaReal, CAST(0 AS BIT)) AS esInstanciaReal
FROM p_Tareas t
LEFT JOIN Inst inst ON inst.idTarea = t.idTarea
WHERE t.idCreador = @idUsuario
  AND t.comportamiento = 'RECURRENTE'
  AND (
      inst.idTarea IS NOT NULL           -- Tiene instancia registrada
      OR t.idTarea IN (SELECT idTarea FROM RecAplica)  -- O aplica hoy
  )
ORDER BY
    CASE COALESCE(inst.estadoInstancia, 'PENDIENTE')
        WHEN 'PENDIENTE' THEN 1
        WHEN 'REPROGRAMADA' THEN 2
        WHEN 'HECHA' THEN 3
        WHEN 'OMITIDA' THEN 4
        ELSE 9
    END;
```

---

## RETROCOMPATIBILIDAD

| Elemento | Estado |
|----------|--------|
| Tareas existentes | comportamiento='SIMPLE', idGrupo=NULL |
| Queries existentes | Sin cambios |
| Frontend existente | Sin cambios (campos nuevos ignorados) |
| p_TareaAvances | Sigue funcionando para avances puntuales |
| p_CheckinTareas | Sigue funcionando para plan diario |

---

## NOTAS TÉCNICAS

### DATEFIRST en SQL Server

```sql
-- Nicaragua: Lunes = día 1
SET DATEFIRST 1;

-- Verificar configuración actual
SELECT @@DATEFIRST;

-- diasSemana en p_TareaRecurrencia:
-- '1' = Lunes, '2' = Martes, ... '7' = Domingo
```

### Por qué calcular acumulado en vez de guardarlo

1. **Sincronización**: Si editas un mes anterior, el acumulado de todos los posteriores se desincroniza
2. **SUM() es rápido**: Para <100 registros por tarea, es instantáneo
3. **Window function**: `SUM() OVER (ORDER BY...)` calcula running total eficientemente

---

## NO IMPLEMENTAR

| Feature | Razón |
|---------|-------|
| idPadre activo | Agrega fricción, complejidad |
| Generación automática de instancias | Explota base de datos |
| porcentajeAcumulado persistido | Se desincroniza |
| Tabla p_GrupoTarea separada | idGrupo inline es suficiente por ahora |
