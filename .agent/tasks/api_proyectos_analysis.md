# 📊 Análisis: APIs de Equipo y Proyectos

## Fecha: 2026-01-20

---

## 🔍 APIs Identificadas

### 1. API de Mi Equipo (MiEquipoPage)
**Endpoint:** `GET /api/planning/team`  
**Servicio:** `PlanningService.getMyTeam()`  
**Archivo:** `backend/src/planning/planning.service.ts` (línea 502-541)

**Lógica:**
```typescript
if (isAdmin) {
    // Admin ve TODOS los usuarios activos
    empleadosVisibles = await this.usuarioRepo.find({ where: { activo: true } });
} else {
    // Líder ve según VisibilidadService
    empleadosVisibles = await this.visibilidadService.obtenerEmpleadosVisibles(carnet);
}
```

**Resultado para Juan Ortuño (Admin):**
- Ve TODOS los usuarios activos del sistema (no solo sus 8 subordinados directos)
- Esto es por diseño: Admin ve todo

---

### 2. API de Dashboard Stats (Pestaña Proyectos en /app/equipo)
**Endpoint:** `GET /api/planning/analytics/dashboard?mes=1&anio=2026`  
**Servicio:** `AnalyticsService.getDashboardStats()`  
**Archivo:** `backend/src/planning/analytics.service.ts`

**Lógica Actual (ya corregida):**
- Usa `VisibilidadService` para filtrar
- Muestra proyectos solo donde hay tareas de usuarios visibles
- **PROBLEMA:** Si no hay tareas asignadas a nadie, el proyecto no aparece

---

### 3. API de Gestión Proyectos (/app/planning/proyectos)
**Endpoint:** `GET /api/proyectos` o similar  
**Servicio:** Probablemente `ClarityService` o `PlanningService`

---

## 🎯 Problema Principal

**Juan Ortuño ve:**
- En `/app/equipo/mi-equipo`: ~35 empleados (todos los activos porque es Admin)
- En `/app/equipo` → Proyectos: 0 (porque el filtro busca tareas asignadas)

**Causa:**
Los 4 proyectos activos existen, pero las tareas no tienen `asignados` registrados en `p_TareasAsignados`.

---

## 💡 Solución Propuesta

### Opción A: Fallback por Proyecto
Si la consulta de proyectos por `asignados` da 0, usar fallback:
```sql
SELECT DISTINCT p.*
FROM p_Proyectos p
WHERE p.estado = 'Activo'
AND (p.gerencia LIKE '%RECURSOS HUMANOS%' OR p.subgerencia LIKE '%COMPENSACIONES%')
```

### Opción B: Cruce Proyecto ↔ Usuario por Jerarquía (MÁS ROBUSTO)
Mostrar proyectos donde:
1. El usuario que solicita tiene empleados visibles
2. El proyecto pertenece a la misma gerencia/subgerencia de esos empleados

Consulta SQL sugerida:
```sql
SELECT DISTINCT p.*
FROM "p_Proyectos" p
WHERE p.estado = 'Activo'
AND (
    -- Proyectos con tareas de mi equipo
    EXISTS (
        SELECT 1 FROM "p_Tareas" t
        JOIN "p_TareasAsignados" ta ON ta."idTarea" = t."idTarea"
        WHERE t."idProyecto" = p."idProyecto"
        AND ta."idUsuario" IN (:visibleUserIds)
    )
    OR
    -- Fallback: Proyectos de mi gerencia (RECURSOS HUMANOS)
    p.gerencia IN (
        SELECT DISTINCT u.departamento 
        FROM "p_Usuarios" u 
        WHERE u."idUsuario" IN (:visibleUserIds)
    )
)
```

### Opción C: Nueva API dedicada (MÁS LIMPIA)
Crear endpoint: `GET /api/planning/my-projects`

---

## ✅ Plan de Trabajo

### Fase 1: Crear nueva API de proyectos por visibilidad ✅ COMPLETADA
- [x] Crear método `getProjectsByVisibility(userId)` en `PlanningService` → Creado como `getMyProjects()`
- [x] Implementar lógica:
  1. Obtener IDs visibles del usuario via `VisibilidadService`
  2. Buscar proyectos con tareas asignadas a esos usuarios
  3. Si 0 proyectos, usar fallback por gerencia/subgerencia
- [x] Exponer como `GET /api/planning/my-projects`

### Fase 2: Probar API con curl/Postman ✅ COMPLETADA
- [x] Login como juan.ortuno@claro.com.ni
- [x] Llamar `GET /api/planning/my-projects`
- [x] Verificar que retorna los 4 proyectos activos → **ÉXITO: 4 proyectos devueltos**

### Fase 3: Integrar en Frontend ✅ COMPLETADA
- [x] Modificar `ManagerDashboard.tsx` para usar nuevo endpoint como fallback
- [x] Modificar `ProyectosPage.tsx` con la misma lógica de respaldo
- [x] Agregar `getMyProjects()` a `planning.service.ts` del frontend

---

## 📋 Consulta de Diagnóstico Adicional

Verificar si hay asignaciones de tareas:
```sql
SELECT COUNT(*) as total_asignaciones
FROM "p_TareasAsignados";

SELECT t."idTarea", t.titulo, ta."idUsuario", u.nombre
FROM "p_Tareas" t
JOIN "p_TareasAsignados" ta ON ta."idTarea" = t."idTarea"
JOIN "p_Usuarios" u ON u."idUsuario" = ta."idUsuario"
LIMIT 20;
```

---

**Estado:** ✅ COMPLETADO  
**Fecha de Cierre:** 2026-01-20  
**Resultado:** Juan Ortuño ahora ve los 4 proyectos en `/app/equipo` → Proyectos

