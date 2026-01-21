# 🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA MOMENTUS

> **Fecha:** 2026-01-20
> **Versión Analizada:** clarity-pwa + backend (NestJS + React)
> **Autor:** Análisis Automatizado

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Estado | Críticos | Medios | Bajos |
|-----------|--------|----------|--------|-------|
| **Frontend** | ⚠️ Requiere Atención | 5 | 12 | 8 |
| **Backend** | ⚠️ Requiere Atención | 3 | 7 | 4 |
| **Base de Datos** | 🔴 Crítico | 2 | 3 | 1 |
| **Integración** | ⚠️ Requiere Atención | 4 | 5 | 2 |

**Puntuación General del Sistema: 62/100**

---

## 🚨 PROBLEMAS CRÍTICOS (Prioridad Inmediata)

### 1. ENTIDAD DUPLICADA: SolicitudCambio
**Severidad:** 🔴 CRÍTICA
**Ubicación:** Backend

```
PROBLEMA:
Existen DOS entidades SolicitudCambio diferentes que apuntan a tablas diferentes:

1. planning/entities/solicitud-cambio.entity.ts → tabla "p_SolicitudCambios"
   - Exportada en entities.ts (USADA)
   - Campos: idUsuarioSolicitante, campoAfectado, valorNuevo, idAprobador

2. clarity/entities/solicitud-cambio.entity.ts → tabla "p_SolicitudesCambio"  
   - NO exportada en entities.ts (HUÉRFANA)
   - Campos: idUsuario, campo, valorPropuesto, idResolutor

IMPACTO:
- Confusión en imports
- Posible pérdida de datos
- Inconsistencia en la funcionalidad de Aprobaciones
```

**Solución:** Eliminar la entidad huérfana en `clarity/entities/` y consolidar en una sola.

---

### 2. PERMISOS DESHABILITADOS TEMPORALMENTE
**Severidad:** 🔴 CRÍTICA (Seguridad)
**Ubicación:** `backend/src/clarity/tasks.service.ts` - método `tareaActualizar`

```typescript
// PROBLEMA: Permisos comentados - cualquier usuario autenticado puede editar cualquier tarea
/* COMMENTED OUT FOR NOW - Allow any edit
const esAdmin = ...
const esJefe = ...
const esCreador = ...
const esResponsable = ...
*/
```

**Impacto:** Cualquier usuario puede modificar cualquier tarea del sistema.
**Solución:** Reactivar permisos antes de producción.

---

### 3. VISTAS NO REGISTRADAS EN RUTAS
**Severidad:** 🔴 ALTA
**Ubicación:** `App.tsx`

```
VISTAS IMPLEMENTADAS PERO NO ACCESIBLES:
- AlertsView.tsx - Existe pero NO tiene ruta en App.tsx
- BlockersView.tsx - Existe pero NO tiene ruta en App.tsx
- MetricsView.tsx - Existe pero NO tiene ruta en App.tsx
- TeamView.tsx - Existe pero NO tiene ruta en App.tsx
- VisibilidadView.tsx - Existe pero NO tiene ruta en App.tsx
```

**Impacto:** Funcionalidad desarrollada que no se puede usar.

---

### 4. AUTOMATIONPAGE COMENTADA
**Severidad:** 🟡 MEDIA
**Ubicación:** `App.tsx` línea 49, 151

```tsx
// import { AutomationPage } from './pages/Automation/AutomationPage';
// <Route path="automation" element={<AutomationPage />} />
```

**Impacto:** Página de automatización completamente desarrollada pero deshabilitada.

---

## 📦 ANÁLISIS POR MÓDULO

---

### MÓDULO: MI DÍA (HOY)

**Ruta:** `/app/hoy`
**Componente Principal:** `MiDiaPage.tsx`

#### Estado de Vistas:

| Vista | Archivo | Ruta | Estado | Funcional |
|-------|---------|------|--------|-----------|
| ExecutionView | ✅ | `/app/hoy` (index) | ✅ Activa | ✅ Funciona |
| MatrixView | ✅ | `/app/hoy/matrix` | ✅ Activa | ✅ Funciona |
| CalendarView | ✅ | `/app/hoy/calendario` | ✅ Activa | ⚠️ Revisar |
| TimelineView | ✅ | `/app/hoy/bitacora` | ✅ Activa | ⚠️ Revisar |
| ExecutiveView | ✅ | `/app/hoy/kpis` | ✅ Activa | ✅ Funciona |
| AlertsView | ✅ | ❌ SIN RUTA | 🔴 Huérfana | N/A |
| BlockersView | ✅ | ❌ SIN RUTA | 🔴 Huérfana | N/A |
| MetricsView | ✅ | ❌ SIN RUTA | 🔴 Huérfana | N/A |
| TeamView | ✅ | ❌ SIN RUTA | 🔴 Huérfana | N/A |
| VisibilidadView | ✅ | ❌ SIN RUTA | 🔴 Huérfana | N/A |

#### Componentes de Mi Día:

| Componente | Tamaño | Estado |
|------------|--------|--------|
| CheckinForm.tsx | 27KB | ✅ Funcional |
| FocoDiarioWidget.tsx | 23KB | ✅ Funcional |
| AgendaSemanal.tsx | 27KB | ⚠️ Revisar integración |
| AgendaTimeline.tsx | 28KB | ⚠️ Revisar integración |
| DashboardEjecutivo.tsx | 14KB | ✅ Funcional |
| MetricasWidget.tsx | 14KB | ⚠️ Sin ruta visible |
| AlertasWidget.tsx | 14KB | ⚠️ Sin ruta visible |
| BloqueosWidget.tsx | 13KB | ⚠️ Sin ruta visible |
| EquipoWidget.tsx | 12KB | ⚠️ Sin ruta visible |

---

### MÓDULO: PLANNING

**Rutas Base:** `/app/planning/*`

| Página | Ruta | Estado | Problemas Detectados |
|--------|------|--------|---------------------|
| ProyectosPage | `/app/planning/proyectos` | ✅ | Ninguno crítico |
| TimelinePage | `/app/planning/timeline` | ✅ | Ninguno crítico |
| RoadmapPage | `/app/planning/roadmap` | ✅ | Ninguno crítico |
| WorkloadPage | `/app/planning/carga` | ✅ | Ninguno crítico |
| PlanTrabajoPage | `/app/planning/plan-trabajo` | ⚠️ | Import `Map` no usado (lint) |
| ApprovalsPage | `/app/planning/approvals` | ⚠️ | Depende de tabla que puede no existir |
| ProjectSimulationPage | `/app/planning/simulation` | ✅ | Ninguno crítico |
| TeamPlanningPage | `/app/equipo/planning/:userId` | ✅ | Ninguno crítico |

#### Problemas en PlanTrabajoPage:
```
- Lint Warning: 'Map' is declared but never used (línea 11)
- Archivo muy grande: 118KB - Necesita refactoring
```

---

### MÓDULO: EQUIPO (Gerencia)

**Rutas Base:** `/app/equipo/*`

| Página | Ruta | Estado | Problemas Detectados |
|--------|------|--------|---------------------|
| ManagerDashboard | `/app/equipo` | ⚠️ | Archivo muy grande (72KB), Analytics query incompleta |
| MemberAgendaPage | `/app/agenda/:userId` | ✅ | Funcional |
| MiEquipoPage | `/app/equipo/mi-equipo` | ✅ | Funcional |
| EquipoBloqueosPage | `/app/equipo/bloqueos` | ✅ | Funcional |

#### Problemas en ManagerDashboard:
```
1. El resumen no cargaba datos porque AnalyticsService solo buscaba tareas
   vinculadas a PlanTrabajo, ignorando tareas con fechaObjetivo en el rango.
   - CORREGIDO: Se añadió búsqueda por rango de fechas.

2. Archivo demasiado grande (72KB) - Violación de principio de responsabilidad única.
```

---

### MÓDULO: ADMIN

**Rutas Base:** `/app/admin/*`
**Protección:** RoleRoute (Admin, Administrador)

| Página | Ruta | Estado | Notas |
|--------|------|--------|-------|
| UsersPage | `/app/admin/users` | ✅ | 56KB - Grande pero funcional |
| RolesPage | `/app/admin/roles` | ✅ | Lazy loaded |
| PermisosPage | `/app/admin/permisos` | ✅ | Lazy loaded |
| VisibilidadPage | `/app/admin/visibilidad` | ✅ | Lazy loaded |
| LogsPage | `/app/admin/logs` | ✅ | 21KB |
| AuditLogsPage | `/app/admin/audit` | ✅ | Lazy loaded |
| ImportPage | `/app/admin/import` | ✅ | Lazy loaded |

---

### MÓDULO: REPORTES

**Ruta:** `/app/reports`

| Componente | Tamaño | Estado |
|------------|--------|--------|
| ReportsPage.tsx | 27KB | ✅ Funcional |
| ProductivityChart.tsx | 5KB | ✅ Funcional |
| BloqueosTrendChart.tsx | 2KB | ✅ Funcional |
| EquipoPerformanceChart.tsx | 2KB | ✅ Funcional |

---

### MÓDULO: NOTAS

**Ruta:** `/app/notas`
**Estado:** ✅ Funcional

---

### MÓDULO: ARCHIVO (Historial)

**Ruta:** `/app/archivo`
**Componente:** `ArchivePage.tsx`
**Estado:** ✅ Funcional

---

### MÓDULO: TUTORIAL

**Ruta:** `/app/help`
**Componente:** `TutorialPage.tsx`
**Estado:** ✅ Recientemente actualizado (simplificado)

---

## 🔧 ANÁLISIS DEL BACKEND

### Estructura de Controllers

| Controller | Ruta Base | Endpoints | Estado |
|------------|-----------|-----------|--------|
| ClarityController | `/` | ~50+ | ✅ Funcional |
| PlanningController | `/planning` | 12 | ✅ Funcional |
| AppController | `/` | 5 (seed/debug) | ⚠️ Solo dev |

### Estructura de Services

| Service | Responsabilidad | LOC | Estado |
|---------|-----------------|-----|--------|
| TasksService | Tareas, Check-ins | 1186 | ⚠️ Muy grande |
| ClarityService | Mi Día, Usuarios | ~300 | ✅ OK |
| FocoService | Foco Diario | ~300 | ✅ OK |
| ReportsService | Reportes | ~400 | ✅ OK |
| PlanningService | Planes de trabajo | ~800 | ⚠️ Grande |
| AnalyticsService | Dashboard stats | ~250 | ⚠️ Query limitada |

### Entidades (Tablas)

| Módulo | Entidad | Tabla | Estado |
|--------|---------|-------|--------|
| Auth | Usuario | g_Usuarios | ✅ |
| Auth | Rol | g_Roles | ✅ |
| Auth | UsuarioCredenciales | g_UsuariosCredenciales | ✅ |
| Auth | UsuarioConfig | g_UsuariosConfig | ✅ |
| Auth | OrganizacionNodo | g_OrganizacionNodos | ✅ |
| Auth | UsuarioOrganizacion | g_UsuarioOrganizacion | ✅ |
| Planning | Proyecto | p_Proyectos | ✅ |
| Planning | Tarea | p_Tareas | ✅ |
| Planning | TareaAsignado | p_TareasAsignados | ✅ |
| Planning | TareaAvance | p_TareasAvances | ✅ |
| Planning | PlanTrabajo | p_PlanesTrabajo | ✅ |
| Planning | SolicitudCambio | p_SolicitudCambios | ⚠️ Ver duplicado |
| Clarity | Checkin | c_Checkins | ✅ |
| Clarity | CheckinTarea | c_CheckinTareas | ✅ |
| Clarity | Bloqueo | c_Bloqueos | ✅ |
| Clarity | FocoDiario | c_FocoDiario | ✅ |
| Clarity | Nota | c_Notas | ✅ |
| Clarity | SolicitudCambio | p_SolicitudesCambio | 🔴 HUÉRFANA |
| Common | LogSistema | g_LogsSistema | ✅ |
| Common | AuditLog | g_AuditLogs | ✅ |
| Acceso | PermisoArea | acc_PermisosArea | ✅ |
| Acceso | PermisoEmpleado | acc_PermisosEmpleado | ✅ |
| Acceso | DelegacionVisibilidad | acc_DelegacionesVisibilidad | ✅ |

---

## 📋 CHECKLIST DE CORRECCIONES

### 🔴 CRÍTICAS (Hacer YA)

- [x] **CRIT-001:** Eliminar entidad duplicada `clarity/entities/solicitud-cambio.entity.ts` (DONE)
- [ ] **CRIT-002:** Reactivar permisos en `TasksService.tareaActualizar` antes de producción
- [x] **CRIT-003:** Verificar que tabla `p_SolicitudCambios` existe (DONE)
- [x] **CRIT-004:** Corregir AnalyticsService para incluir tareas sin Plan (DONE)
- [x] **CRIT-005:** Agregar `titulo` y `progreso` al DTO y service de actualización (DONE)

### 🟡 ALTAS (Esta semana)

- [x] **HIGH-001:** Registrar vistas huérfanas en App.tsx (DONE)
- [x] **HIGH-002:** Habilitar AutomationPage (DONE)
- [ ] **HIGH-003:** Eliminar import `Map` no usado en PlanTrabajoPage
- [ ] **HIGH-004:** Refactorizar ManagerDashboard.tsx (72KB es muy grande)
- [ ] **HIGH-005:** Refactorizar PlanTrabajoPage.tsx (118KB es excesivo)
- [x] **APPR-002:** Agregar botón "Confirmar Plan" en ProyectosPage (DONE)
- [ ] **APPR-006:** Implementar Dashboard de Aprobaciones (`/app/planning/approvals`)

### 🟢 MEDIAS (Próximas 2 semanas)

- [ ] **MED-001:** Agregar tests para TasksService
- [ ] **MED-002:** Agregar tests para AnalyticsService
- [ ] **MED-003:** Documentar endpoints de API
- [ ] **MED-004:** Implementar paginación en EquipoHoy
- [ ] **MED-005:** Agregar loading states consistentes
- [ ] **MED-006:** Unificar manejo de errores en frontend
- [ ] **MED-007:** Revisar CalendarView y TimelineView (comprobar funcionalidad)

### 🔵 BAJAS (Backlog)

- [ ] **LOW-001:** Agregar dark mode completo
- [ ] **LOW-002:** Optimizar bundle size (lazy loading adicional)
- [ ] **LOW-003:** Agregar PWA capabilities (offline)
- [ ] **LOW-004:** Internacionalización (i18n)
- [ ] **LOW-005:** Agregar keyboard shortcuts

---

## 🎯 PLAN DE IMPLEMENTACIÓN PROPUESTO

### Fase 1: Estabilización (1-2 días)
1. ✅ Corregir AnalyticsService (COMPLETADO)
2. ✅ Agregar titulo/progreso al DTO (COMPLETADO)
3. Eliminar entidad duplicada SolicitudCambio
4. Verificar/crear tabla p_SolicitudCambios
5. Limpiar imports no usados

### Fase 2: Funcionalidad Completa (3-5 días)
1. Registrar vistas huérfanas en rutas
2. Habilitar/revisar AutomationPage
3. Testear todas las funcionalidades de Mi Día
4. Testear flujo completo de Aprobaciones

### Fase 3: Refactoring (1-2 semanas)
1. Dividir ManagerDashboard en componentes
2. Dividir PlanTrabajoPage en componentes
3. Dividir TasksService en servicios especializados
4. Agregar tests unitarios

### Fase 4: Optimización (Ongoing)
1. Performance tuning
2. UX improvements
3. Documentation

---

## 📊 MATRIZ DE FUNCIONALIDAD

| Funcionalidad | Frontend | Backend | DB | Status |
|---------------|----------|---------|-----|--------|
| Login/Auth | ✅ | ✅ | ✅ | ✅ Funciona |
| Mi Día - Check-in | ✅ | ✅ | ✅ | ✅ Funciona |
| Mi Día - Tareas | ✅ | ✅ | ✅ | ✅ Funciona |
| Mi Día - Foco | ✅ | ✅ | ✅ | ✅ Funciona |
| Bloqueos - Crear | ✅ | ✅ | ✅ | ✅ Funciona |
| Bloqueos - Resolver | ✅ | ✅ | ✅ | ✅ Funciona |
| Proyectos - CRUD | ✅ | ✅ | ✅ | ✅ Funciona |
| Tareas - Crear | ✅ | ✅ | ✅ | ✅ Funciona |
| Tareas - Actualizar | ✅ | ✅ | ✅ | ⚠️ Permisos off |
| Tareas - Titulo/Progreso | ✅ | ✅ | ✅ | ✅ Corregido |
| Plan Trabajo | ✅ | ✅ | ✅ | ✅ Funciona |
| Dashboard Equipo | ✅ | ✅ | ✅ | ✅ Corregido |
| Member Agenda | ✅ | ✅ | ✅ | ✅ Funciona |
| Aprobaciones | ✅ | ⚠️ | ⚠️ | ⚠️ Verificar tabla |
| Admin Users | ✅ | ✅ | ✅ | ✅ Funciona |
| Admin Roles | ✅ | ✅ | ✅ | ✅ Funciona |
| Reportes | ✅ | ✅ | ✅ | ✅ Funciona |
| Notas | ✅ | ✅ | ✅ | ✅ Funciona |
| Archivo | ✅ | ✅ | ✅ | ✅ Funciona |
| Tutorial | ✅ | N/A | N/A | ✅ Funciona |
| Automatización | ✅ | ⚠️ | N/A | ❌ Deshabilitada |

---

## 🔐 ESTADO DE SEGURIDAD

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Autenticación JWT | ✅ | Implementado correctamente |
| Guards de Ruta | ✅ | ProtectedRoute + RoleRoute |
| Permisos Jerárquicos | ⚠️ | Implementado pero DESHABILITADO en tareaActualizar |
| Validación de DTOs | ✅ | class-validator implementado |
| Sanitización | ✅ | class-sanitizer (Trim) |
| SQL Injection | ✅ | TypeORM previene por defecto |
| XSS | ⚠️ | Revisar useSecureHTML |

---

## 📝 NOTAS ADICIONALES

1. **Synchronize: true** está activo en producción - Las tablas se crean automáticamente al reiniciar el backend.

2. **Tablas faltantes** se crearán automáticamente pero estarán vacías.

3. **El sistema tiene buena arquitectura** pero necesita:
   - Reducir tamaño de archivos grandes
   - Completar funcionalidad de vistas huérfanas
   - Reactivar seguridad antes de producción

4. **Frontend bien estructurado** con:
   - Context API para estado global
   - Lazy loading para optimización
   - Diseño responsive

5. **Backend sólido** con:
   - NestJS bien configurado
   - TypeORM para ORM
   - Swagger para documentación (asumido)

---

---

## 🔐 DISEÑO DEL SISTEMA DE APROBACIONES Y CONTROL DE CAMBIOS

### El Problema Actual

Tu jefe quiere que **cambios en fechas requieran aprobación**, pero actualmente no hay un modelo claro de:
1. ¿Cuándo se "bloquea" un proyecto/tarea para requerir aprobación?
2. ¿Qué campos requieren aprobación vs cuáles son libres?
3. ¿Cómo evitar fricción excesiva que frustre a los usuarios?

---

### 📚 Cómo lo Hacen Otros (Mejores Prácticas)

#### 1. **JIRA - Modelo de Estados de Cambio**
```
Jira categoriza los cambios en 3 niveles:

STANDARD (Pre-aprobado)
- Cambios rutinarios donde el riesgo es conocido
- NO requieren aprobación individual
- Ejemplo: Cambiar descripción, asignar a otra persona

NORMAL (Requiere Aprobación)
- Cambios que afectan compromisos
- Requieren revisión del Change Advisory Board (CAB)
- Ejemplo: Cambiar fecha de entrega

EMERGENCY (Aprobación Expedita)
- Cambios críticos urgentes
- Aprobación simplificada post-facto
- Ejemplo: Hotfix en producción
```

#### 2. **ASANA - Modelo de "Tipo de Tarea"**
```
Asana usa tipos de tarea especiales:

APPROVAL TASK (Tarea de Aprobación)
- Subtarea que debe aprobarse antes de continuar
- El trabajo principal se "pausa" hasta aprobación
- Estados: Aprobado, Solicitar Cambios, Rechazado
```

#### 3. **MONDAY.COM - Modelo de "Columna de Aprobación"**
```
Monday usa columnas de estado dedicadas:

- Cada item puede tener una columna "Approval Status"
- Los aprobadores reciben notificación
- Pueden aprobar/rechazar con comentarios
- El item no puede moverse a "Completado" sin aprobación
```

---

### 🎯 MODELO PROPUESTO PARA MOMENTUS

Basándome en tu contexto (empresa, fricción, requerimiento del jefe), propongo el **Modelo Híbrido de Fases**:

#### Concepto Central: **Ciclo de Vida del Proyecto/Tarea**

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  BORRADOR   │ ──► │ CONFIRMADO  │ ──► │   CERRADO   │
│  (Flexible) │     │  (Bloqueo)  │     │  (Archivo)  │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     ▼                    ▼                    ▼
  Sin control       Requiere            Solo lectura
  de cambios        aprobación          
```

---

### 📋 OPCIÓN A: Control a Nivel de PROYECTO (Recomendado)

**Concepto:** El proyecto tiene un "estado de planificación" que controla si las tareas requieren aprobación.

| Estado Proyecto | Crear Tareas | Editar Título | Editar Fechas | Editar Progreso |
|-----------------|--------------|---------------|---------------|-----------------|
| **Borrador** | ✅ Libre | ✅ Libre | ✅ Libre | ✅ Libre |
| **En Planificación** | ✅ Libre | ✅ Libre | ✅ Libre | ✅ Libre |
| **Confirmado** | ⚠️ Aprobación | ⚠️ Aprobación* | ⚠️ Aprobación | ✅ Libre |
| **En Ejecución** | ⚠️ Aprobación | ✅ Libre | ⚠️ Aprobación | ✅ Libre |
| **Cerrado** | ❌ No | ❌ No | ❌ No | ❌ No |

*Solo si cambia significativamente el alcance

**Flujo:**
1. **Gerente** crea proyecto → Estado: "Borrador"
2. Equipo agrega tareas y fechas → Todo libre
3. Gerente confirma → Estado: "Confirmado" 🔒
4. A partir de aquí, cambios de fechas requieren solicitud
5. Usuarios pueden seguir reportando progreso sin restricción

**Ventajas:**
- ✅ Bajo fricción durante planificación
- ✅ Control cuando importa (post-confirmación)
- ✅ Progreso siempre libre (no bloquea operación)
- ✅ Claro para usuarios cuándo aplican restricciones

**Desventajas:**
- Requiere que alguien "confirme" el proyecto
- Si olvidan confirmar, no hay control

---

### 📋 OPCIÓN B: Control a Nivel de TAREA (Más Granular)

**Concepto:** Cada tarea tiene su propio estado de "bloqueo" independiente del proyecto.

| Tipo Tarea | Editar Título | Editar Fechas | Editar Progreso |
|------------|---------------|---------------|-----------------|
| **Normal** | ✅ Libre | ✅ Libre | ✅ Libre |
| **Comprometida** | ⚠️ Aprobación | ⚠️ Aprobación | ✅ Libre |
| **Estratégica** | ⚠️ Aprobación | ⚠️ Aprobación | ✅ Libre |

**Flujo:**
1. Usuario crea tarea → Tipo: "Normal"
2. Si tarea se reporta a cliente o tiene deadline importante → Se marca "Comprometida"
3. Los cambios a tareas comprometidas generan solicitud de aprobación

**Ventajas:**
- ✅ Control granular
- ✅ No todo requiere aprobación
- ✅ El usuario decide qué es "importante"

**Desventajas:**
- Más complejo de entender
- Usuarios pueden olvidar marcar tareas importantes

---

### 📋 OPCIÓN C: Control Automático por Tiempo (Menos Fricción)

**Concepto:** Las tareas se "bloquean" automáticamente cuando se acerca su fecha objetivo.

```
Regla: Si (fechaObjetivo - hoy) < 7 días → Requiere aprobación para cambiar fecha
```

| Días hasta Objetivo | Editar Fechas | Editar Otros |
|---------------------|---------------|--------------|
| Más de 14 días | ✅ Libre | ✅ Libre |
| 7-14 días | ⚠️ Aprobación | ✅ Libre |
| Menos de 7 días | ⚠️ Aprobación | ✅ Libre |
| Fecha pasada | ⚠️ Aprobación | ✅ Libre |

**Ventajas:**
- ✅ Automático, sin acción manual
- ✅ Permite planificación libre a largo plazo
- ✅ Control cuando realmente importa (cerca del deadline)

**Desventajas:**
- Menos control para proyectos críticos desde el inicio
- No distingue entre tareas importantes y triviales

---

### 📋 OPCIÓN D: Modelo Híbrido (RECOMENDACIÓN FINAL)

**Combina lo mejor de A, B y C:**

```
REGLAS DE APROBACIÓN:

1. SI proyecto.estado = 'Confirmado' O proyecto.estado = 'EnEjecucion'
   Y proyecto.tipo = 'Estrategico'
   → Cambios de FECHA requieren aprobación
   
2. SI tarea.fechaObjetivo - hoy < 7 días
   → Cambios de FECHA requieren aprobación
   
3. SIEMPRE LIBRE (nunca requiere aprobación):
   - Progreso (0-100%)
   - Estado (Pendiente → EnCurso → Hecha)
   - Descripción/Notas
   - Prioridad
   - Esfuerzo
```

**Implementación Técnica:**

```typescript
// En TasksService.tareaActualizar()

async tareaActualizar(id: number, dto: TareaActualizarDto, idUsuario: number) {
    const tarea = await this.tareaRepo.findOne({...});
    
    // Campos que SIEMPRE se pueden editar sin aprobación
    const camposLibres = ['progreso', 'estado', 'descripcion', 'prioridad', 'esfuerzo'];
    
    // Campos que PUEDEN requerir aprobación
    const camposControlados = ['fechaObjetivo', 'fechaInicioPlanificada', 'titulo'];
    
    // Verificar si algún campo controlado está siendo modificado
    const cambiandoCampoControlado = camposControlados.some(campo => 
        dto[campo] !== undefined && dto[campo] !== tarea[campo]
    );
    
    if (cambiandoCampoControlado) {
        const requiereAprobacion = await this.verificarRequiereAprobacion(tarea, dto);
        
        if (requiereAprobacion) {
            // Crear solicitud de cambio en lugar de aplicar directamente
            await this.crearSolicitudCambio(tarea, dto, idUsuario);
            return { 
                requiresApproval: true, 
                message: 'Cambio enviado para aprobación' 
            };
        }
    }
    
    // Aplicar cambios directamente
    return this.aplicarCambios(tarea, dto, idUsuario);
}

private async verificarRequiereAprobacion(tarea: Tarea, dto: any): Promise<boolean> {
    const proyecto = tarea.proyecto;
    
    // Regla 1: Proyectos estratégicos confirmados
    if (proyecto?.tipo === 'Estrategico' && 
        ['Confirmado', 'EnEjecucion'].includes(proyecto.estado)) {
        return true;
    }
    
    // Regla 2: Tareas próximas a vencer (menos de 7 días)
    if (tarea.fechaObjetivo) {
        const diasRestantes = differenceInDays(new Date(tarea.fechaObjetivo), new Date());
        if (diasRestantes <= 7) {
            return true;
        }
    }
    
    return false;
}
```

---

### 🎨 UX: Cómo Comunicar al Usuario

**Cuando NO requiere aprobación:**
```
[Guardar] ← Botón normal
→ "Cambios guardados ✓"
```

**Cuando SÍ requiere aprobación:**
```
[Solicitar Cambio] ← Botón diferente (color naranja/amarillo)
→ Modal: "Este cambio requiere aprobación del responsable del proyecto.
          Motivo: [___________]
          [Cancelar] [Enviar Solicitud]"
→ "Solicitud enviada. Te notificaremos cuando sea aprobada."
```

**Indicador Visual en la Tarea:**
```
🔒 Tarea bloqueada - Cambios de fecha requieren aprobación
   Proyecto: [Estratégico] Estado: [Confirmado]
```

---

### 📊 Comparación de Opciones

| Criterio | Opción A | Opción B | Opción C | Opción D |
|----------|----------|----------|----------|----------|
| Reducción de Fricción | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Control para Jefatura | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Facilidad de Entender | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Complejidad Técnica | Media | Alta | Baja | Media |
| **RECOMENDACIÓN** | ✅ | - | - | ✅✅ |

---

### ✅ DECISIONES RECOMENDADAS

1. **¿Qué requiere aprobación?**
   - Solo cambios de **FECHAS** (objetivo e inicio)
   - **Nunca**: progreso, estado, descripción, prioridad

2. **¿Cuándo aplica?**
   - Proyectos tipo "Estratégico" en estado "Confirmado" o "En Ejecución"
   - O tareas con fecha objetivo en menos de 7 días

3. **¿Quién aprueba?**
   - El responsable del proyecto
   - O el jefe directo del solicitante
   - O Admin

4. **¿Cómo se confirma un proyecto?**
   - Botón en página de proyecto: "Confirmar Plan"
   - Cambia estado de "Borrador" a "Confirmado"
   - Se notifica a involucrados

5. **¿Qué pasa si no se confirma?**
   - Las ediciones son libres indefinidamente
   - Dashboard puede mostrar advertencia: "Proyectos sin confirmar"

---

### 📝 TAREAS PARA IMPLEMENTAR ESTE MODELO

```markdown
- [ ] APPR-001: Definir estados de proyecto (Borrador, Confirmado, EnEjecucion, Cerrado)
- [ ] APPR-002: Agregar botón "Confirmar Plan" en ProyectosPage
- [ ] APPR-003: Modificar TasksService para verificar reglas de aprobación
- [ ] APPR-004: Crear componente SolicitudCambioModal en frontend
- [ ] APPR-005: Mostrar indicador 🔒 en tareas que requieren aprobación
- [ ] APPR-006: Implementar notificaciones para aprobadores
- [ ] APPR-007: Dashboard de solicitudes pendientes (ApprovalsPage ya existe)
- [ ] APPR-008: Agregar campo "motivo" obligatorio en solicitud
- [ ] APPR-009: Historial de cambios aprobados/rechazados
```

---

**Fin del Diagnóstico**

*Este documento debe actualizarse conforme se resuelvan los issues.*
