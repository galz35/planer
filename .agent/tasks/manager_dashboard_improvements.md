# 📊 Plan de Mejoras: Manager Dashboard (/app/equipo)

## Fecha: 2026-01-20
## Estado: 🚧 EN PROGRESO

---

## 🔍 Diagnóstico Actual

### Problema 1: Pestaña "Resumen" sin datos
**Causa Raíz:**
- El servicio `getDashboardStats()` busca planes de trabajo del mes/año seleccionado
- Si no hay planes de trabajo para enero 2026, `hierarchyBreakdown` retorna vacío
- Las tareas se filtran por `fechaObjetivo` DENTRO del rango del mes seleccionado
- Si las tareas tienen `fechaObjetivo` en otros meses, no aparecen

**Evidencia:**
```typescript
// analytics.service.ts línea 75-78
tasks = await this.tareaRepo.find({
    where: [
        { plan: { mes: month, anio: year, idUsuario: In(visibleUserIds) } },
        { fechaObjetivo: Between(startStr, endStr) }  // Solo tareas del mes
    ],
    ...
});
```

### Problema 2: Pestaña "Equipo" sin indicador de entregas HOY
**Causa Raíz:**
- La tabla de equipo (`renderTeam()`) muestra: Estado de Ánimo, Retrasos, Bloqueos
- NO muestra: Tareas que deben completarse HOY
- Falta columna "Entregas Hoy" o similar

### Problema 3: Pestaña "Proyectos" sin % Esperado
**Causa Raíz:**
- Solo muestra `progress` = tareas hechas / total tareas
- NO calcula el "progreso esperado" basado en cronograma
- Fórmula necesaria: `expectedProgress = (hoy - fechaInicio) / (fechaFin - fechaInicio) * 100`

---

## ✅ Plan de Trabajo (Checklist)

### Fase 1: Arreglar "Resumen" - Datos vacíos ✅ COMPLETADA
- [x] **1.1** Backend: Modificar `AnalyticsService.getDashboardStats()` con fallback
  - Si no hay tareas en el mes seleccionado, busca TODAS las tareas activas de usuarios visibles
  - También incluye tareas completadas recientemente (últimos 30 días)
- [x] **1.2** Backend: `hierarchyBreakdown` ahora se llena con tareas activas como fallback
- [x] **1.3** Frontend: Mensaje útil si `hierarchyData` está vacío con botón a Proyectos
- [x] **1.4** KPIs se recalculan con las tareas obtenidas del fallback

### Fase 2: Mejorar "Equipo" - Entregas de HOY ✅ COMPLETADA
- [x] **2.1** Backend: Agregar campo `tareasHoy` al endpoint de equipo
  - Consulta TypeORM: Tareas con `fechaObjetivo = HOY` y estado != 'Hecha'
- [x] **2.2** Backend: Agregar campo `tareasEnCurso` (estado = 'EnCurso')
- [x] **2.3** Frontend: Agregar columna "Hoy" en la tabla de equipo
  - Badge animado púrpura si hay tareas pendientes hoy
  - Checkmark verde si no hay pendientes
- [x] **2.4** Frontend: Agregar columna "En Curso" (celeste)

### Fase 3: "Proyectos" - Columna % Esperado ✅ COMPLETADA
- [x] **3.1** Backend: Calcular `expectedProgress` en `getMyProjects()` y `getDashboardStats()`
  - Implementado con fallback: usa fechas del proyecto, si no existen usa fechas de tareas
  - También calcula `deviation = progress - expectedProgress`
- [x] **3.2** Frontend: Agregar columna "% Esperado" en tabla de proyectos
- [x] **3.3** Frontend: Mostrar indicador visual de desviación
  - 🟢 Verde: deviation >= 0 (adelantado o a tiempo)
  - 🟡 Amarillo: deviation >= -10% (leve atraso)
  - 🔴 Rojo: deviation < -10% (atraso crítico)
- [x] **3.4** Ordenar proyectos por mayor desviación negativa primero

---

## 📐 Especificaciones Técnicas

### Para Fase 1 (Resumen):
**Cambio en `getDashboardStats()`:**
- Remover filtro `Between(startStr, endStr)` para tareas
- Buscar TODAS las tareas activas de usuarios visibles
- O crear endpoint nuevo: `GET /api/planning/team-overview`

### Para Fase 2 (Equipo - Entregas Hoy):
**Nuevo campo en respuesta de equipo:**
```typescript
interface TeamMemberStatus {
    usuario: Usuario;
    tareasHoy: number;      // NUEVO
    tareasEnCursoHoy: number; // NUEVO
    tareasVencidas: number;
    bloqueosActivos: number;
    checkin?: CheckIn;
}
```

### Para Fase 3 (% Esperado):
**Nuevo campo en respuesta de proyecto:**
```typescript
interface ProjectStats {
    id: number;
    nombre: string;
    progress: number;
    expectedProgress: number;   // NUEVO
    deviation: number;          // NUEVO (progress - expectedProgress)
    // ...otros campos
}
```

---

## 🎯 Prioridad de Implementación

| Fase | Prioridad | Impacto | Esfuerzo |
|------|-----------|---------|----------|
| Fase 3 (% Esperado) | 🔴 Alta | Visibilidad de atrasos | Bajo |
| Fase 2 (Entregas Hoy) | 🟡 Media | Gestión diaria | Medio |
| Fase 1 (Resumen) | 🟡 Media | KPIs globales | Alto |

**Orden de ejecución recomendado:** 3 → 2 → 1

---

## 📝 Notas Adicionales

- El mes Enero 2026 parece no tener planes de trabajo registrados
- Los 4 proyectos activos SÍ tienen tareas (22 en total)
- Las tareas SÍ tienen fechas (`fechaInicio`, `fechaObjetivo`)
- El cálculo de % esperado requiere que los proyectos tengan `fechaInicio` y `fechaFin` definidos

---

**Próximo paso:** ¿Confirmas el orden de ejecución (3 → 2 → 1)?
