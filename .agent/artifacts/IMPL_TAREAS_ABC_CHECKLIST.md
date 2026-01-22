# IMPLEMENTACIÓN V2: Tipos de Tareas A/B/C

## ESTADO: ✅ FASES 1-7 COMPLETADAS | 🔲 FASE 8-9 PENDIENTE

---

## FASE 1: BASE DE DATOS ✅ COMPLETADA
**Script:** `sql/tipos_tareas_abc.sql`

- [x] Columnas en p_Tareas: comportamiento, idGrupo, numeroParte
- [x] Tabla p_TareaRecurrencia
- [x] Tabla p_TareaInstancia (con UNIQUE y CHECK)
- [x] Tabla p_TareaAvanceMensual (DECIMAL, sin acumulado persistido)
- [x] SP sp_UpsertAvanceMensual
- [x] SP sp_CrearGrupoInicial
- [x] SP sp_AgregarFaseGrupo

---

## FASE 2: TIPOS TYPESCRIPT BACKEND ✅ COMPLETADA
**Archivo:** `backend/src/db/tipos.ts`

- [x] Campos en TareaDb: comportamiento, idGrupo, numeroParte
- [x] TareaRecurrenciaDb
- [x] TareaInstanciaDb
- [x] TareaAvanceMensualDb

---

## FASE 3: REPOSITORIO ✅ COMPLETADA
- [x] `backend/src/clarity/recurrencia.repo.ts`
- [x] `backend/src/planning/avance-mensual.repo.ts`
- [x] `backend/src/planning/grupo.repo.ts`

---

## FASE 4: SERVICIO ✅ COMPLETADA
- [x] `backend/src/clarity/recurrencia.service.ts`
- [x] Métodos en PlanningService

---

## FASE 5: CONTROLADOR ✅ COMPLETADA
**Endpoints probados con 10/10 OK:**

| Método | Ruta | Estado |
|--------|------|--------|
| POST | `/api/tareas/:id/recurrencia` | ✅ |
| GET | `/api/tareas/:id/recurrencia` | ✅ |
| POST | `/api/tareas/:id/instancia` | ✅ |
| GET | `/api/tareas/:id/instancias` | ✅ |
| GET | `/api/agenda-recurrente` | ✅ |
| POST | `/api/planning/tasks/:id/avance-mensual` | ✅ |
| GET | `/api/planning/tasks/:id/avance-mensual` | ✅ |
| POST | `/api/planning/tasks/:id/crear-grupo` | ✅ |
| POST | `/api/planning/tasks/:id/agregar-fase` | ✅ |
| GET | `/api/planning/grupos/:idGrupo` | ✅ |

---

## FASE 6: FRONTEND - TIPOS ✅ COMPLETADA
**Archivo:** `clarity-pwa/src/types/modelos.ts`

- [x] Campos en Tarea: comportamiento, idGrupo, numeroParte
- [x] ComportamientoTarea, TipoRecurrencia, EstadoInstancia
- [x] TareaRecurrencia
- [x] TareaInstancia
- [x] TareaAvanceMensual
- [x] DTOs: CrearRecurrenciaDto, MarcarInstanciaDto, AvanceMensualDto

---

## FASE 7: FRONTEND - SERVICIOS ✅ COMPLETADA
**Archivos:**
- `clarity-pwa/src/services/clarity.service.ts`
- `clarity-pwa/src/services/planning.service.ts`

**Métodos agregados:**
- `crearRecurrencia()`
- `obtenerRecurrencia()`
- `marcarInstancia()`
- `obtenerInstancias()`
- `obtenerAgendaRecurrente()`
- `registrarAvanceMensual()`
- `obtenerHistorialMensual()`
- `crearGrupo()`
- `agregarFase()`
- `obtenerGrupo()`

---

## FASE 8: FRONTEND - UI ✅ COMPLETADA
**Componentes implementados:**

- [x] Formulario crear tarea recurrente (`CreateTaskModal.tsx`)
- [x] Modal tarea recurrente - bitácora (`TaskABCSection.tsx`)
- [x] Modal tarea larga - avance mensual (`TaskABCSection.tsx`)
- [x] Vista grupo/fases (`TaskABCSection.tsx`)

---

## FASE 9: PRUEBAS 🔲 PENDIENTE con Frontend
**Estimado: 2 horas**

- [x] Pruebas backend (10/10 OK)
- [x] Compilación frontend (Build exitoso)
- [ ] Pruebas E2E / Manuales

---

## RESUMEN

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1 | ✅ | Base de datos |
| 2 | ✅ | Tipos backend |
| 3 | ✅ | Repositorios |
| 4 | ✅ | Servicios backend |
| 5 | ✅ | Controladores (10/10 endpoints) |
| 6 | ✅ | Tipos frontend |
| 7 | ✅ | Servicios frontend |
| 8 | ✅ | UI frontend |
| 9 | 🔲 | Pruebas integración |

**Progreso: 8/9 Fases Completadas (89%)**

---

## NOTAS

- Token JWT cambiado a 12h para desarrollo
- Backend 100% funcional
- Frontend UI implementada y verificada
- Implementación de comportamiento (SIMPLE/RECURRENTE/LARGA) en creación de tareas
- Soporte para fases y avance mensual en detalle de tarea

*Última actualización: 2026-01-21 16:30*
