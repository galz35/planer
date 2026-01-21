# 🔍 Análisis de Problemas en Dashboard Equipo

## Fecha: 2026-01-20
## URL: `/app/equipo`

---

## 📊 Problemas Identificados

### 1. Pestaña "Resumen" vacía - No muestra proyectos ni calcula valores
**Ubicación:** `ManagerDashboard.tsx` línea 106 (renderSummary)

**Causa Raíz:**
- El backend `AnalyticsService.getDashboardStats` (línea 156-159) consulta TODOS los proyectos con `estado: 'Activo'`
- NO filtra por la jerarquía del usuario que solicita (comentario en línea 23-24: "En una implementación real, filtraríamos por la jerarquía del managerId. Por ahora, asumimos Global (Admin).")
- El `hierarchyBreakdown` viene vacío si no hay tareas que calcular

**Impacto:** Todos ven lo mismo (o nada) independientemente de su rol

---

### 2. Usuario Admin `juan.ortuno@claro.com.ni` no ve proyectos/tareas
**Posible Causa:**
- El `AnalyticsService.getDashboardStats` recibe `managerId` pero NO lo usa para filtrar
- Sin embargo, la pestaña "Proyectos" usa `projectsStats` que viene del mismo endpoint
- Si no hay proyectos con `estado: 'Activo'`, la lista está vacía
- juan.ortuno podría no tener tareas/proyectos asignados en el período seleccionado

**Verificación Necesaria:**
1. Consultar en BD: `SELECT * FROM "p_Proyectos" WHERE estado = 'Activo'`
2. Verificar que las tareas tengan `fechaObjetivo` en el mes/año del filtro
3. Confirmar el carnet y jefeCarnet de juan.ortuno

---

### 3. Falta apartado de "Entregas del día" y "Tareas Atrasadas del Equipo"
**Ubicación:** No existe en el código actual

**Requisito:**
- Listado de tareas que `fechaObjetivo = HOY` para el equipo
- Listado de tareas que `fechaObjetivo < HOY` y `estado != 'Hecha'`

---

### 4. Pestaña "Proyectos" muestra todos los proyectos (sin filtrar por visibilidad)
**Ubicación:** `AnalyticsService.getDashboardStats` línea 156-159

**Problema:**
```typescript
const activeProjects = await this.proyectoRepo.find({
    where: { estado: 'Activo' },  // ← Sin filtro de visibilidad
    relations: ['tareas']
});
```

**Comparación con `/app/planning/proyectos`:**
- Esa página sí filtra correctamente - usaría `VisibilidadService`
- El dashboard no implementa el mismo filtro

---

## 🛠️ Soluciones Propuestas

### Solución 1: Habilitar filtro por jerarquía en Analytics
Modificar `AnalyticsService.getDashboardStats` para:
1. Obtener IDs visibles del usuario usando `VisibilidadService`
2. Filtrar planes, tareas y proyectos solo de esos usuarios

### Solución 2: Agregar sección "Entregas Hoy" y "Atrasados"
Crear en el frontend dos cards/tabs con:
- Lista de tareas con deadline HOY del equipo
- Lista de tareas ATRASADAS del equipo ordenadas por días de atraso

### Solución 3: Rediseñar la pestaña Proyectos
Opciones:
- A) Reutilizar el componente de `/app/planning/proyectos` (DRY)
- B) Aplicar el mismo filtro de visibilidad en el analytics

---

## ✅ Checklist de Implementación

### Fase 1: Diagnóstico de Datos (ANTES de codificar)
- [ ] Consultar BD: Proyectos activos existentes
- [ ] Consultar BD: Tareas con fechaObjetivo en enero 2026
- [ ] Verificar datos de usuario juan.ortuno (carnet, jefeCarnet, rolGlobal)
- [ ] Verificar que `equipoHoy` sí funciona para juan.ortuno

### Fase 2: Backend - Corrección de Analytics
- [ ] Inyectar `VisibilidadService` en `AnalyticsService`
- [ ] Modificar `getDashboardStats` para filtrar por IDs visibles
- [ ] Agregar endpoint `getDashboardEntregasHoy` (tareas con deadline hoy)
- [ ] Agregar endpoint `getDashboardAtrasados` (tareas atrasadas del equipo)

### Fase 3: Frontend - Nuevas Secciones
- [ ] Agregar card "Entregas Hoy" en pestaña Resumen
- [ ] Agregar card "Atrasados Críticos" con lista y días de atraso
- [ ] Conectar con nuevos endpoints

### Fase 4: Frontend - Pestaña Proyectos
- [ ] Evaluar si reusar `ProyectosPage` como componente
- [ ] Si no, aplicar filtro de visibilidad en datos de `projectsStats`
- [ ] Agregar indicador de "Proyectos que lidero" vs "Proyectos de mi equipo"

### Fase 5: Testing
- [ ] Login como gustavo.lira (Admin) - debe ver todo
- [ ] Login como juan.ortuno (Admin) - debe ver todo
- [ ] Login como nelson.perez - debe ver solo su jerarquía
- [ ] Login como empleado sin cargo - debe ver solo lo suyo

---

## 🔄 Dependencias

| Tarea | Depende de |
|-------|-----------|
| Backend Analytics | VisibilidadService debe estar correctamente configurado |
| Frontend Entregas | Nuevo endpoint debe existir |
| Rediseño Proyectos | Decisión arquitectónica (reusar vs duplicar) |

---

## ⚠️ Riesgos

1. **Romper lo que funciona:** La lista de equipo (`equipoHoy`) funciona correctamente, no tocarla.
2. **Performance:** Agregar filtros de visibilidad puede hacer más lenta la consulta si hay muchos usuarios.
3. **Estado de Proyecto:** El sistema usa `estado: 'Activo'` pero podrían usarse otros estados.

---

## 📝 Recomendación

**Empezar por Fase 1 (Diagnóstico)** antes de hacer cambios de código.
Validar si el problema de juan.ortuno es de datos (no tiene proyectos asignados) o de lógica (filtro mal implementado).

---

**Estado:** Pendiente de aprobación  
**Prioridad:** Alta (UX crítico para líderes)
