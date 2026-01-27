
# ⚠️ Deuda Técnica y Optimización (BACKEND)

## Estado Actual
- **Fecha**: 26 Enero 2026
- **Problema**: Consultas lentas (1-3s) con muy poca data (<100 filas).
- **Causa Raíz**: Falta de Índices, Scans completos, CAST en WHERE, SELECT * excesivos.

---

## 1. Inventario de Procedures Críticos (Para Optimizar)

| Prioridad | Store Procedure | Tiempo Actual (aprox) | Problema Detectado | Acción Requerida |
|:---:|:---|:---:|:---|:---|
| ✅ **COMPLETADO** | `p_Checkins` (Query inline) | < 200ms | `CAST(fecha as DATE)` eliminada | Implementado `sp_Checkins_ObtenerPorEquipoFecha` |
| ✅ **COMPLETADO** | `p_Usuarios` + `p_Roles` | < 200ms | `STRING_SPLIT` sin PK en JOIN | Implementado `sp_Usuarios_ObtenerPorLista` |
| ✅ **COMPLETADO** | `p_Proyectos` (Listado) | < 300ms | `ORDER BY` sin índice + `SELECT *` | Implementado `sp_Proyectos_Listar` con Paginación + Index |
| ✅ **COMPLETADO** | `p_Proyectos` (Búsqueda) | N/A | `LIKE '%texto%'` (Full Scan) | Index Composite Agregado |
| 🟡 **MEDIA** | `sp_Equipo_ObtenerInforme` | 1-2s | Lógica compleja de conteo | Validar índices en `p_Tareas(estado, fechaObjetivo)` |
| 🟢 **BAJA** | `p_Auditoria` (Insert) | 3.9s | Índices excesivos o mal clustered | Revisar Clustered Index sea Identity Monotónico |

---

## 2. Plan de Acción (Scripts a Generar)

1.  **`d:\planificacion\backend\scripts\perf_diagnosis.sql`**: Script para leer planes de ejecución y faltantes de índices (aunque no tengamos permisos de SA, intentaremos ver lo que podamos).
2.  **`d:\planificacion\backend\migrations\optimizacion_indices_v1.sql`**: Script con los `CREATE INDEX` urgentes.
3.  **`d:\planificacion\backend\migrations\fix_sp_slow.sql`**: Re-escritura de los SPs problemáticos (sin lógica de negocio nueva, solo optimización SQL).

## 3. Tareas Pendientes (Deuda Técnica)

- [ ] Instalar **Helmet** en `main.ts` (Seguridad).
- [ ] Configurar **CORS** estricto para Producción.
- [ ] Eliminar archivos `.env` de producción del control de versiones.
- [ ] Implementar paginación real en el Backend para `getAllUsers` y `getAllProjects` (actualmente descarga todo).
- [ ] Revisar si `sp_Visibilidad_ObtenerMiEquipo` está haciendo recursividad ineficiente.

---

## 4. Próximos Pasos para el Usuario

1. Ejecutar el script de índices (`optimizacion_indices_v1.sql`).
2. Reemplazar los SPs lentos con `fix_sp_slow.sql`.
3. Medir tiempos nuevamente usando `test_equipo_api.js` o Postman.
