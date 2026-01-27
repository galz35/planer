# Especificación Técnica: Arquitectura de Subtareas y Jerarquía Inteligente (v2.0)

Este documento define la implementación técnica definitiva para el soporte de jerarquías en Clarity, incorporando mecanismos de integridad, concurrencia y validación de reglas de negocio.

---

## 1. Modelo de Datos Mejorado (SQL Server)

### 1.1 Estructura de Tabla: `dbo.p_Tareas`
Se añaden restricciones y metadatos para soportar la integridad referencial.

```sql
-- Asegurar columnas base
IF COL_LENGTH('dbo.p_Tareas', 'idTareaPadre') IS NULL 
    ALTER TABLE dbo.p_Tareas ADD idTareaPadre INT NULL;

IF COL_LENGTH('dbo.p_Tareas', 'semana') IS NULL 
    ALTER TABLE dbo.p_Tareas ADD semana INT NULL;

-- 1.2 Restricciones de Integridad
-- Evitar auto-referencia (No puedo ser mi propio padre)
IF NOT EXISTS(SELECT * FROM sys.check_constraints WHERE name = 'CK_p_Tareas_NoSelfParent')
    ALTER TABLE dbo.p_Tareas ADD CONSTRAINT CK_p_Tareas_NoSelfParent 
    CHECK (idTareaPadre <> idTarea);

-- Foreign Key con protección de borrado
IF NOT EXISTS(SELECT * FROM sys.foreign_keys WHERE name = 'FK_p_Tareas_Padre')
    ALTER TABLE dbo.p_Tareas ADD CONSTRAINT FK_p_Tareas_Padre 
    FOREIGN KEY (idTareaPadre) REFERENCES dbo.p_Tareas(idTarea) 
    ON DELETE NO ACTION;

-- 1.3 Índices de Performance
-- Optimizado para consultas de roll-up y listado jerárquico
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Tareas_Jerarquia')
    CREATE INDEX IX_p_Tareas_Jerarquia 
    ON dbo.p_Tareas (idTareaPadre, activo) 
    INCLUDE (estado, porcentaje, idProyecto, orden);
```

---

## 2. Lógica de Persistencia (Stored Procedures)

### 2.1 SP de Creación Robusta: `sp_Tarea_CrearCompleta_v2`
Incorpora validaciones de consistencia de proyecto.

```sql
CREATE OR ALTER PROCEDURE dbo.sp_Tarea_CrearCompleta_v2
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    -- ... otros campos base
    @fechaObjetivo DATETIME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRAN;
        
        -- Validar que el padre pertenezca al mismo proyecto
        IF @idTareaPadre IS NOT NULL AND @idProyecto IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM p_Tareas WHERE idTarea = @idTareaPadre AND idProyecto = @idProyecto)
                THROW 50002, 'La tarea padre debe pertenecer al mismo proyecto.', 1;
        END

        INSERT INTO dbo.p_Tareas (...) VALUES (...);
        
        -- ... lógica de asignación
        
        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
```

---

## 3. Motor de Inteligencia (Roll-up)

### 3.1 Reglas de Negocio (Casos Borde)

| Caso | Regla de Negocio |
| :--- | :--- |
| **Padre sin hijos** | El % y Estado son manuales (editables). |
| **Hijos Anulados/Descartados** | Se **excluyen** totalmente del cálculo del promedio y estado del padre. |
| **Toggle Rápido** | Si se marca "Hecha" vía checklist, el % sube automáticamente a 100%. |
| **Límite de Profundidad** | Máximo 5 niveles recomendado (Límite técnico hard-coded en Service: 10). |
| **Consistencia de Estado** | Si un hijo está "Hecha" pero su % es 80, para el cálculo del padre se cuenta como 100. **El Estado manda sobre el %**. |

### 3.2 Implementación del Recálculo (Backend pseudo-code)
Ubicación: `TasksService.ts`

```typescript
async recalcularJerarquia(idPadre: number) {
    // 1. Obtener hijos activos (Excluyendo Descartadas)
    const hijos = await repo.getHijos(idPadre, { excluir: ['Descartada', 'Eliminada'] });
    
    if (hijos.length === 0) return; // Nada que promediar

    // 2. Calcular variables
    const totalHijos = hijos.length;
    const completados = hijos.filter(h => h.estado === 'Hecha').length;
    
    // El % de un hijo "Hecha" siempre es 100 para el promedio del padre
    const sumPorcentaje = hijos.reduce((acc, h) => {
        return acc + (h.estado === 'Hecha' ? 100 : (h.porcentaje || 0));
    }, 0);
    
    const nuevoPromedio = Math.min(100, Math.round(sumPorcentaje / totalHijos));

    // 3. Determinar Estado Resultante
    let nuevoEstado = 'Pendiente';
    if (completados === totalHijos) nuevoEstado = 'Hecha';
    else if (sumPorcentaje > 0) nuevoEstado = 'EnCurso';

    // 4. Update Idempotente (Evitar triggers innecesarios)
    const padre = await repo.getTarea(idPadre);
    if (padre.porcentaje !== nuevoPromedio || padre.estado !== nuevoEstado) {
        await repo.update(idPadre, { porcentaje: nuevoPromedio, estado: nuevoEstado });
        
        // 5. Recursividad Ascendente
        if (padre.idTareaPadre) await this.recalcularJerarquia(padre.idTareaPadre);
    }
}
```

---

## 4. Contrato de API (Frontend <-> Backend)

### PATCH `/tasks/:id`
**Payload sugerido:**
```json
{
    "estado": "Hecha",
    "progreso": 100,
    "comentario": "Terminado"
}
```
**Respuesta:**
Deberá incluir la tarea actualizada y, si hubo roll-up, los datos básicos del padre para actualizar el estado en la UI sin recargar.

---

## 5. Matriz de Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
| :--- | :--- | :--- |
| **Loops Infinitos** | Crítico (Crash DB) | CHECK Constraint en DB + Límite de 10 iteraciones en Backend. |
| **Concurrencia** | Medio (Data Stale) | Transacciones con `UPDLOCK` al leer los hijos para el promedio. |
| **Carga Masiva** | Bajo (Slowdown) | El recálculo solo se activa si `porcentaje` o `estado` cambian. |
| **Borrado de Padre** | Medio (Huérfanos) | `ON DELETE NO ACTION` obliga a borrar o reasignar hijos primero. |
