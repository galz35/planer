# PLAN MAESTRO DE IMPLEMENTACIÓN: CLARITY v2.1 (Jerarquía y Estabilidad)

Este documento detalla el plan de ejecución paso a paso para completar la estabilización de Clarity, mitigando los riesgos detectados y asegurando una arquitectura robusta.

---

## 📅 FASE 1: Cimientos y Blindaje (Backend & DB)
**Objetivo:** Asegurar que la base de datos sea la única fuente de verdad y evitar corrupción de datos por código legado.

### 1.1 Hardening de Base de Datos (✅ COMPLETADO)
- [x] Crear constraints `CK_NoSelfParent` y `FK_Padre` (Anti-cíclicos y Anti-huérfanos).
- [x] Crear índices `IX_Jerarquia` optimizados para lectura recursiva.
- [x] Implementar SP `sp_Tarea_CrearCompleta_v2` (Creación atómica con validaciones).
- [x] Implementar SP `sp_Tarea_RecalcularJerarquia_v2` (Motor de Roll-up inteligente).

### 1.2 Neutralización de Código Legado (🚧 EN PROCESO)
**Riesgo CR-01:** Evitar escritura dual insegura.
- [ ] **Auditoría de Referencias:** Buscar todos los usos de `planningRepo.crearTarea` y `planningRepo.actualizarTarea` en el proyecto.
- [ ] **Refactorización de Escritura:** Reemplazar llamadas legadas por `tasksRepo.crearTarea` y `tasksRepo.actualizarTarea`.
- [ ] **Deprecation:** Marcar métodos viejos en `planning.repo.ts` como `@deprecated` o eliminarlos para prevenir uso futuro.

### 1.3 Endurecimiento de Visibilidad
**Riesgo AL-02:** Optimizar chequeos de permisos.
- [ ] Implementar método `bulkCheckPermissions` en `VisibilidadService`.
- [ ] Refactorizar `crearTareaMasiva` para usar la validación en bloque (batch).

---

## 🚀 FASE 2: Conexión y Reactividad (API & Frontend)
**Objetivo:** Que el usuario perciba la inteligencia del sistema en tiempo real sin recargar la página.

### 2.1 API Enrichment (Backend)
**Riesgo CR-02:** Stale Data en UI.
- [ ] Modificar `tasks.service.ts` -> `tareaActualizar` para que retorne el objeto `rollup` con los ancestros afectados.
- [ ] Actualizar DTOs de respuesta en Swagger/Controller.

### 2.2 Reactividad en UI (Frontend)
- [ ] **`useTaskController.ts`:** Actualizar la función `toggleSubtaskCompletion`.
    - [ ] Al recibir respuesta del backend, leer el campo `rollup`.
    - [ ] Actualizar el estado local (React Query Cache o Context) de la Tarea Padre si esta cambió de % o Estado.
- [ ] **`TaskSubtasks.tsx`:** Verificar que la lista de subtareas se refresque correctamente al añadir/eliminar items.

---

## 🧪 FASE 3: Validación y QA (Pruebas)
**Objetivo:** Confirmar que el sistema resiste estrés y casos borde.

### 3.1 Pruebas de Integridad (Automáticas/Manuales)
- [ ] **Ciclos:** Intentar asignar A -> B -> A y verificar que el backend devuelve error controlado (400).
- [ ] **Huérfanos:** Intentar borrar un Padre con hijos activos y verificar que el backend lo impide (409 Conflict).
- [ ] **Límites:** Crear una jerarquía de 12 niveles y verificar que el sistema detiene la recursividad en el nivel 10 sin explotar.

### 3.2 Pruebas de Usuario (UX)
- [ ] **Flujo Agenda:** Crear tarea rápida en "Mi Día" -> Verificar que se crea sin padre (NULL) y funciona fluido.
- [ ] **Flujo Proyecto:** Crear Hito -> Agregar 3 subtareas -> Marcar todas como hechas -> Verificar que el Hito se marca como "Hecha" automáticamente.

---

## 📦 FASE 4: Despliegue y Monitoreo
**Objetivo:** Puesta en producción segura.

### 4.1 Preparación
- [ ] Ejecutar script de migración SQL en entorno de `Pre-Producción`.
- [ ] Verificar logs de SQL Server buscando "Deadlocks" durante carga masiva de prueba.

### 4.2 Go-Live
- [ ] Desplegar Backend.
- [ ] Desplegar Frontend.
- [ ] Monitoreo de logs de `AuditService` durante las primeras 24h.

---

## 📝 Bitácora de Ejecución

| Fecha | Tarea | Estado | Responsable | Notas |
|:---|:---|:---|:---|:---|
| 26-Ene | Migración SQL (Schema + SPs v2.1) | ✅ Hecho | Antigravity | Script `migration_jerarquia_v2_smart.sql` aplicado. |
| 26-Ene | Refactor TasksService | ✅ Hecho | Antigravity | Lógica movida a BD. |
| ... | Neutralizar `planningRepo` legacy | ⏳ Pendiente | ... | Siguiente paso crítico. |

