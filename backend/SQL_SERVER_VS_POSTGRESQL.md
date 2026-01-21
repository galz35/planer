# Guía de Compatibilidad: SQL Server vs PostgreSQL

Este documento contiene el registro de las consultas SQL nativas que requieren versiones específicas para cada motor de base de datos, así como las mejores prácticas para mantener la portabilidad del backend.

## 1. Reglas Generales de Desarrollo
1. **Prioridad 1: TypeORM Repositories**: Siempre usar `this.repo.find()`, `save()`, etc. Es 100% compatible.
2. **Prioridad 2: QueryBuilder**: Usar `this.repo.createQueryBuilder()` para consultas con JOINs y filtros. TypeORM traducirá la mayoría de la sintaxis.
3. **Prioridad 3: Raw SQL**: Solo usar cuando sea estrictamente necesario (Recursividad, Reportes complejos). En este caso, documentar ambas versiones aquí.

---

## 2. Consultas Críticas (Módulo: Acceso / Visibilidad)

### Caso: Jerarquía de Empleados (Recursiva)
Esta consulta calcula quién puede ver a quién basado en el organigrama.

#### Versión PostgreSQL (Actual)
```sql
WITH RECURSIVE
Actores AS (
  SELECT $1::text AS carnet
  UNION ALL
  SELECT d.carnet_delegante FROM p_delegacion_visibilidad d
  WHERE d.carnet_delegado = $1 AND d.activo = true
),
Subordinados AS (
  SELECT u.carnet FROM "p_Usuarios" u
  JOIN Actores a ON u."jefeCarnet" = a.carnet
  WHERE u.activo = true
  UNION ALL
  SELECT u.carnet FROM "p_Usuarios" u
  JOIN Subordinados s ON u."jefeCarnet" = s.carnet
  WHERE u.activo = true
)
SELECT DISTINCT carnet FROM Subordinados;
```

#### Versión SQL Server (Equivalente)
```sql
WITH Actores (carnet) AS (
  SELECT CAST(@0 AS VARCHAR(50))
  UNION ALL
  SELECT d.carnet_delegante FROM p_delegacion_visibilidad d
  WHERE d.carnet_delegado = @0 AND d.activo = 1
),
Subordinados (carnet) AS (
  SELECT u.carnet FROM p_Usuarios u
  INNER JOIN Actores a ON u.jefeCarnet = a.carnet
  WHERE u.activo = 1
  UNION ALL
  SELECT u.carnet FROM p_Usuarios u
  INNER JOIN Subordinados s ON u.jefeCarnet = s.carnet
  WHERE u.activo = 1
)
SELECT DISTINCT carnet FROM Subordinados;
```

---

## 3. Diferencias de Sintaxis Críticas

| Característica | PostgreSQL | SQL Server |
| :--- | :--- | :--- |
| **Casting** | `valor::text` | `CAST(valor AS VARCHAR)` |
| **Booleanos** | `true` / `false` | `1` / `0` |
| **Identificadores** | `"p_Usuarios"` (comillas) | `[p_Usuarios]` (corchetes) |
| **Fechas** | `CURRENT_DATE`, `NOW()` | `GETDATE()` |
| **Limitar Filas** | `LIMIT 1` | `TOP 1` |
| **Recursividad** | `WITH RECURSIVE` | `WITH` |
| **Arrays** | `= ANY($1::text[])` | Requiere variables de tabla o JSON_VALUE |

---

## 4. Estado de los Archivos

| Archivo | Estado de Compatibilidad | Notas |
| :--- | :--- | :--- |
| `visibilidad.service.ts` | 🔴 Solo Postgres | Usa WITH RECURSIVE y ANY() |
| `tasks.service.ts` | 🟡 Parcial | Usa QueryBuilder en su mayoría |
| `reports.service.ts` | 🔴 Solo Postgres | Funciones de fecha nativas |
| `analytics.service.ts` | 🟡 Parcial | Agregaciones complejas |

---

## 5. Estrategia de Migración Futura
Cuando se decida cambiar a SQL Server:
1. Crear una carpeta `src/common/queries/sqlserver`.
2. Implementar los archivos de queries mapeados en este documento.
3. Actualizar el `ormconfig` para usar el driver `mssql`.
