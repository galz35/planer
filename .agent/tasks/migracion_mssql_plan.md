## REGLAS ANTI-ALUCINACIÓN (OBLIGATORIAS)
1) NO crear Stored Procedures nuevas ni cambiar el contrato DB a menos que yo lo pida.
2) Migrar endpoint por endpoint replicando EXACTAMENTE la lógica actual de TypeORM (joins, filtros, orden, paginación).
3) Cada endpoint migrado debe tener prueba manual (curl) antes de continuar.
4) NO borrar archivos .entity.ts hasta que:
   - el proyecto compile,
   - no haya imports,
   - y todos los endpoints críticos estén probados.
5) Logging: logear solo errores + queries lentas (>1000ms). Nunca loggear passwords/tokens/hashes.

# 📋 PLAN DE MIGRACIÓN: TypeORM → MSSQL Directo (Estilo Dapper)
## Backend Clarity/Planer - SQL Server

---

## 📊 ANÁLISIS COMPLETO DEL BACKEND

### 🗂️ RESUMEN DE ESTRUCTURA

| Componente | Cantidad | Descripción |
|------------|----------|-------------|
| **Entidades** | 26 | Modelos de datos TypeORM |
| **Servicios** | 16 | Lógica de negocio |
| **Controladores** | 11 | Endpoints REST API |
| **Módulos** | 6 | Auth, Planning, Clarity, Admin, Acceso, Common |

---

## 📁 LISTA DE ENTIDADES (26 total)

### Módulo AUTH (7 entidades)
1. `usuario.entity.ts` → **p_Usuarios** (tabla principal)
2. `usuario-credenciales.entity.ts` → **p_UsuariosCredenciales**
3. `usuario-config.entity.ts` → **p_UsuariosConfig**
4. `rol.entity.ts` → **p_Roles**
5. `seguridad-perfil.entity.ts` → **p_SeguridadPerfiles**
6. `organizacion-nodo.entity.ts` → **p_OrganizacionNodos**
7. `usuario-organizacion.entity.ts` → **p_UsuariosOrganizacion**

### Módulo PLANNING (7 entidades)
1. `proyecto.entity.ts` → **p_Proyectos**
2. `tarea.entity.ts` → **p_Tareas**
3. `tarea-asignado.entity.ts` → **p_TareaAsignados**
4. `tarea-asignacion-log.entity.ts` → **p_TareaAsignacionLog**
5. `tarea-avance.entity.ts` → **p_TareaAvances**
6. `plan-trabajo.entity.ts` → **p_PlanesTrabajo**
7. `solicitud-cambio.entity.ts` → **p_SolicitudCambios**

### Módulo CLARITY (6 entidades)
1. `checkin.entity.ts` → **p_Checkins**
2. `checkin-tarea.entity.ts` → **p_CheckinTareas**
3. `bloqueo.entity.ts` → **p_Bloqueos**
4. `nota.entity.ts` → **p_Notas**
5. `foco-diario.entity.ts` → **p_FocoDiario**
6. `organizacion.view.entity.ts` → (View, no tabla)

### Módulo ACCESO (4 entidades)
1. `organizacion-nodo-rh.entity.ts` → **p_organizacion_nodos** (RH sync)
2. `permiso-area.entity.ts` → **p_permiso_area**
3. `permiso-empleado.entity.ts` → **p_permiso_empleado**
4. `delegacion-visibilidad.entity.ts` → **p_delegacion_visibilidad**

### Módulo COMMON (2 entidades)
1. `audit-log.entity.ts` → **p_Auditoria**
2. `log-sistema.entity.ts` → **p_Logs**

---

## 🔌 LISTA COMPLETA DE ENDPOINTS (75+ endpoints)

### AuthController (`/api/auth`)
| # | Método | Endpoint | Descripción | SP Sugerido |
|---|--------|----------|-------------|-------------|
| 1 | POST | `/login` | Iniciar sesión | `sp_Auth_Login` |
| 2 | POST | `/refresh` | Refrescar token | `sp_Auth_RefreshToken` |

### PlanningController (`/api/planning`)
| # | Método | Endpoint | Descripción | SP Sugerido |
|---|--------|----------|-------------|-------------|
| 3 | POST | `/check-permission` | Verificar permiso edición | `sp_Planning_CheckPermission` |
| 4 | POST | `/request-change` | Solicitar cambio | `sp_Planning_RequestChange` |
| 5 | GET | `/pending` | Solicitudes pendientes | `sp_Planning_GetPending` |
| 6 | POST | `/resolve` | Resolver solicitud | `sp_Planning_ResolveRequest` |
| 7 | POST | `/update-operative` | Actualizar tarea operativa | `sp_Planning_UpdateOperative` |
| 8 | GET | `/plans` | Obtener planes | `sp_Planning_GetPlans` |
| 9 | POST | `/plans` | Crear/actualizar plan | `sp_Planning_UpsertPlan` |
| 10 | GET | `/stats` | Estadísticas dashboard | `sp_Planning_GetStats` |
| 11 | GET | `/team` | Mi equipo | `sp_Planning_GetTeam` |
| 12 | GET | `/my-projects` | Mis proyectos | `sp_Planning_GetMyProjects` |
| 13 | POST | `/tasks/:id/clone` | Clonar tarea | `sp_Planning_CloneTask` |
| 14 | POST | `/reassign` | Reasignar tareas | `sp_Planning_ReassignTasks` |
| 15 | GET | `/tasks/:id/history` | Historial de tarea | `sp_Planning_GetTaskHistory` |
| 16 | POST | `/plans/:id/close` | Cerrar plan | `sp_Planning_ClosePlan` |

### ClarityController (`/api/clarity`) - 40+ endpoints
| # | Método | Endpoint | Descripción | SP Sugerido |
|---|--------|----------|-------------|-------------|
| 17 | GET | `/config` | Obtener config usuario | `sp_Clarity_GetConfig` |
| 18 | PATCH | `/config` | Actualizar config | `sp_Clarity_UpdateConfig` |
| 19 | GET | `/mi-dia` | Agenda del día | `sp_Clarity_GetMiDia` |
| 20 | GET | `/equipo/:id/agenda` | Agenda de miembro | `sp_Clarity_GetMemberAgenda` |
| 21 | POST | `/checkin` | Upsert check-in | `sp_Clarity_UpsertCheckin` |
| 22 | POST | `/tarea-rapida` | Crear tarea rápida | `sp_Clarity_CrearTareaRapida` |
| 23 | GET | `/tareas` | Mis tareas | `sp_Clarity_GetMisTareas` |
| 24 | GET | `/tareas/historico/:carnet` | Tareas históricas | `sp_Clarity_GetTareasHistorico` |
| 25 | PATCH | `/tareas/:id` | Actualizar tarea | `sp_Clarity_UpdateTarea` |
| 26 | POST | `/tareas/:id/revalidar` | Revalidar tarea | `sp_Clarity_RevalidarTarea` |
| 27 | DELETE | `/tareas/:id` | Descartar tarea | `sp_Clarity_DescartarTarea` |
| 28 | PATCH | `/tareas/:id/orden` | Actualizar orden | `sp_Clarity_UpdateOrden` |
| 29 | POST | `/tareas/reordenar` | Reordenar múltiples | `sp_Clarity_ReordenarTareas` |
| 30 | POST | `/tareas/:id/avance` | Registrar avance | `sp_Clarity_RegistrarAvance` |
| 31 | POST | `/tareas/:id/asignar` | Asignar tarea | `sp_Clarity_AsignarTarea` |
| 32 | POST | `/solicitud-cambio` | Solicitar cambio | `sp_Clarity_SolicitarCambio` |
| 33 | POST | `/bloqueo` | Crear bloqueo | `sp_Clarity_CrearBloqueo` |
| 34 | PATCH | `/bloqueo/:id/resolver` | Resolver bloqueo | `sp_Clarity_ResolverBloqueo` |
| 35 | GET | `/dashboard/kpis` | KPIs dashboard | `sp_Clarity_GetKPIs` |
| 36 | GET | `/equipo/hoy` | Equipo hoy | `sp_Clarity_GetEquipoHoy` |
| 37 | GET | `/equipo/bloqueos` | Bloqueos equipo | `sp_Clarity_GetEquipoBloqueos` |
| 38 | GET | `/equipo/backlog` | Backlog equipo | `sp_Clarity_GetEquipoBacklog` |
| 39 | GET | `/equipo/:id/tareas` | Tareas de miembro | `sp_Clarity_GetMiembroTareas` |
| 40 | GET | `/equipo/:id/bloqueos` | Bloqueos de miembro | `sp_Clarity_GetMiembroBloqueos` |
| 41 | GET | `/equipo/:id` | Info de miembro | `sp_Clarity_GetMiembro` |
| 42 | GET | `/gerencia/resumen` | Resumen gerencia | `sp_Clarity_GetGerenciaResumen` |
| 43 | GET | `/foco` | Foco del día | `sp_Clarity_GetFoco` |
| 44 | POST | `/foco` | Agregar al foco | `sp_Clarity_AddFoco` |
| 45 | PATCH | `/foco/:id` | Actualizar foco | `sp_Clarity_UpdateFoco` |
| 46 | DELETE | `/foco/:id` | Eliminar del foco | `sp_Clarity_DeleteFoco` |
| 47 | POST | `/foco/reordenar` | Reordenar foco | `sp_Clarity_ReordenarFoco` |
| 48-55 | ... | Notas CRUD | Notas y meeting notes | `sp_Clarity_Notas_*` |
| 56-60 | ... | Proyectos | CRUD proyectos | `sp_Clarity_Proyectos_*` |

### AdminController (`/api/admin`)
| # | Método | Endpoint | Descripción | SP Sugerido |
|---|--------|----------|-------------|-------------|
| 61 | POST | `/empleados/import` | Importar empleados | `sp_Admin_ImportEmpleados` |
| 62 | POST | `/usuarios` | Crear usuario | `sp_Admin_CrearUsuario` |
| 63 | PATCH | `/empleados/:correo/estado` | Actualizar estado | `sp_Admin_UpdateEstado` |
| 64 | POST | `/empleados/:correo/reset-password` | Reset password | `sp_Admin_ResetPassword` |
| 65 | GET | `/empleados` | Listar empleados | `sp_Admin_GetEmpleados` |
| 66 | POST | `/roles/:id/menu` | Actualizar menú rol | `sp_Admin_UpdateRoleMenu` |
| 67 | POST | `/usuarios/:id/menu` | Actualizar menú user | `sp_Admin_UpdateUserMenu` |
| 68 | GET | `/stats` | Estadísticas | `sp_Admin_GetStats` |

### AccesoController (`/api/acceso`)
| # | Método | Endpoint | Descripción | SP Sugerido |
|---|--------|----------|-------------|-------------|
| 69 | POST | `/permiso-area` | Crear permiso área | `sp_Acceso_CrearPermisoArea` |
| 70 | GET | `/permiso-area/:carnet` | Listar permisos | `sp_Acceso_GetPermisosArea` |
| 71 | DELETE | `/permiso-area/:id` | Desactivar permiso | `sp_Acceso_DeletePermisoArea` |
| 72 | POST | `/permiso-empleado` | Crear permiso empleado | `sp_Acceso_CrearPermisoEmpleado` |
| 73 | GET | `/permiso-empleado/:carnet` | Listar permisos emp | `sp_Acceso_GetPermisosEmpleado` |
| 74 | DELETE | `/permiso-empleado/:id` | Desactivar | `sp_Acceso_DeletePermisoEmpleado` |
| 75 | POST | `/delegacion` | Crear delegación | `sp_Acceso_CrearDelegacion` |
| 76 | GET | `/delegacion/delegado/:carnet` | Por delegado | `sp_Acceso_GetDelegacionesDelegado` |
| 77 | GET | `/empleados` | Listar empleados | `sp_Acceso_GetEmpleados` |
| 78 | GET | `/organizacion/tree` | Árbol organizacional | `sp_Acceso_GetOrgTree` |

---

## 🏗️ ARQUITECTURA PROPUESTA

```
src/
├── db/
│   ├── sqlserver.provider.ts      # Pool singleton de conexiones
│   ├── base.repo.ts               # ejecutarQuery, ejecutarSP, conTransaccion
│   └── tipos.ts                   # Interfaces de parámetros SQL
├── auth/
│   ├── auth.controller.ts         # (sin cambios)
│   ├── auth.service.ts            # REFACTORIZAR → usa base.repo
│   └── auth.repo.ts               # NUEVO: queries de auth
├── planning/
│   ├── planning.controller.ts     # (sin cambios)
│   ├── planning.service.ts        # REFACTORIZAR → usa base.repo
│   └── planning.repo.ts           # NUEVO: queries de planning
├── clarity/
│   ├── clarity.controller.ts      # (sin cambios)
│   ├── clarity.service.ts         # REFACTORIZAR → usa base.repo
│   └── clarity.repo.ts            # NUEVO: queries de clarity
├── ...
```

---

## ✅ CHECKLIST DE MIGRACIÓN

### FASE 0: PREPARACIÓN (30 min)
- [ ] **0.1** Backup de código actual (commit git)
- [ ] **0.2** Ejecutar `fix_all_columns.sql` en SQL Server
- [ ] **0.3** Verificar conexión con `test-crud-mssql.js`
- [ ] **0.4** Instalar dependencia: `npm install mssql`

### FASE 1: INFRAESTRUCTURA DB (45 min)
- [ ] **1.1** Crear `src/db/sqlserver.provider.ts` (pool singleton)
- [ ] **1.2** Crear `src/db/base.repo.ts` (ejecutarQuery, ejecutarSP)
- [ ] **1.3** Crear `src/db/tipos.ts` (interfaces)
- [ ] **1.4** Crear `src/db/db.module.ts` (módulo NestJS)
- [ ] **1.5** Registrar DbModule en AppModule
- [ ] **1.6** Crear endpoint de diagnóstico `/diagnostico/ping`
- [ ] **1.7** Probar conexión con curl

### FASE 2: MÓDULO AUTH (1 hora)
- [ ] **2.1** Crear `src/auth/auth.repo.ts` con queries:
  - `obtenerUsuarioPorCorreo(correo)`
  - `obtenerCredenciales(idUsuario)`
  - `actualizarUltimoLogin(idUsuario)`
  - `actualizarRefreshToken(idUsuario, hash)`
  - `obtenerUsuarioPorId(idUsuario)`
  - `obtenerRol(idRol)`
- [ ] **2.2** Refactorizar `auth.service.ts`:
  - `validateUser()` → usa authRepo
  - `login()` → usa authRepo
  - `refreshTokens()` → usa authRepo
- [ ] **2.3** Eliminar `@InjectRepository` de AuthService
- [ ] **2.4** Probar LOGIN con curl
- [ ] **2.5** Probar REFRESH con curl

### FASE 3: MÓDULO PLANNING (1.5 horas)
- [ ] **3.1** Crear `src/planning/planning.repo.ts` con queries:
  - `getProyectosPorUsuario(idUsuario)`
  - `getTareasPorProyecto(idProyecto)`
  - `getTareaPorId(idTarea)`
  - `crearTarea(datos)`
  - `actualizarTarea(idTarea, datos)`
  - `eliminarTarea(idTarea)`
  - `getEquipo(carnetJefe)`
  - `getPlanesTrabajo(idUsuario, mes, anio)`
  - `getSolicitudesPendientes(idUsuario)`
- [ ] **3.2** Refactorizar `planning.service.ts`
- [ ] **3.3** Probar endpoints principales:
  - GET `/planning/my-projects`
  - GET `/planning/plans`
  - POST `/planning/update-operative`

### FASE 4: MÓDULO CLARITY (2 horas)
- [ ] **4.1** Crear `src/clarity/clarity.repo.ts` con queries principales
- [ ] **4.2** Refactorizar `clarity.service.ts`
- [ ] **4.3** Refactorizar `foco.service.ts`
- [ ] **4.4** Refactorizar `tasks.service.ts`
- [ ] **4.5** Probar endpoints principales:
  - GET `/clarity/mi-dia`
  - POST `/clarity/checkin`
  - GET `/clarity/tareas`
  - POST `/clarity/bloqueo`

### FASE 5: MÓDULO ADMIN (45 min)
- [ ] **5.1** Crear `src/admin/admin.repo.ts`
- [ ] **5.2** Refactorizar `admin.service.ts`
- [ ] **5.3** Probar endpoints

### FASE 6: MÓDULO ACCESO (45 min)
- [ ] **6.1** Crear `src/acceso/acceso.repo.ts`
- [ ] **6.2** Refactorizar `acceso.service.ts`
- [ ] **6.3** Probar endpoints

### FASE 7: LIMPIEZA (30 min)
- [ ] **7.1** Eliminar imports de TypeORM no usados
- [ ] **7.2** Actualizar `app.module.ts` (quitar TypeOrmModule si ya no se usa)
- [ ] **7.3** Remover archivos `.entity.ts` si ya no se usan
- [ ] **7.4** Actualizar documentación

### FASE 8: PRUEBAS FINALES (1 hora)
- [ ] **8.1** Probar flujo completo de login → dashboard
- [ ] **8.2** Probar creación de tareas
- [ ] **8.3** Probar check-in diario
- [ ] **8.4** Probar bloqueos
- [ ] **8.5** Probar permisos
- [ ] **8.6** Verificar con frontend

---

## ⏱️ ESTIMACIÓN DE TIEMPO

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 0: Preparación | 30 min |
| Fase 1: Infraestructura | 45 min |
| Fase 2: Auth | 1 hora |
| Fase 3: Planning | 1.5 horas |
| Fase 4: Clarity | 2 horas |
| Fase 5: Admin | 45 min |
| Fase 6: Acceso | 45 min |
| Fase 7: Limpieza | 30 min |
| Fase 8: Pruebas | 1 hora |
| **TOTAL** | **~9 horas** |

*Con Antigravity escribiendo código: ~2-3 horas de interacción*

---

## 🔧 STORED PROCEDURES RECOMENDADOS (OPCIONAL)

Si prefieres usar Stored Procedures en lugar de queries inline, aquí están los principales:

### Auth
```sql
CREATE PROCEDURE sp_Auth_Login
    @correo NVARCHAR(200),
    @passwordProvisto NVARCHAR(100) -- Se compara en backend con bcrypt
AS
BEGIN
    SELECT u.*, c.passwordHash, r.nombre as rolNombre, r.defaultMenu
    FROM p_Usuarios u
    LEFT JOIN p_UsuariosCredenciales c ON u.idUsuario = c.idUsuario
    LEFT JOIN p_Roles r ON u.idRol = r.idRol
    WHERE u.correo = @correo AND u.activo = 1
END
```

### Planning
```sql
CREATE PROCEDURE sp_Planning_GetMyProjects
    @idUsuario INT
AS
BEGIN
    -- Obtener proyectos donde el usuario tiene asignaciones
    SELECT DISTINCT p.*
    FROM p_Proyectos p
    INNER JOIN p_Tareas t ON t.idProyecto = p.idProyecto
    INNER JOIN p_TareaAsignados ta ON ta.idTarea = t.idTarea
    WHERE ta.idUsuario = @idUsuario
    ORDER BY p.fechaCreacion DESC
END
```

---

## 📝 NOTAS IMPORTANTES

1. **NO eliminar entidades todavía**: Las entidades sirven como documentación del esquema.
2. **Transacciones**: Usar `base.repo.conTransaccion()` para operaciones que modifican múltiples tablas.
3. **Parámetros SQL**: SIEMPRE usar parámetros (`@param`) para evitar SQL injection.
4. **Pool**: El pool se crea UNA sola vez y se reutiliza. NO abrir/cerrar por request.
5. **Errores**: Capturar y logear errores de SQL con código y mensaje.

---

## 🚀 COMANDO PARA EMPEZAR

```bash
# 1. Asegúrate de tener el fix de columnas ejecutado
# 2. Instala mssql
npm install mssql

# 3. Corre el test CRUD
node test-crud-mssql.js

# 4. Si pasa, avísame para empezar la Fase 1
```

---

**Documento creado**: 2026-01-21
**Versión**: 1.0
**Autor**: Antigravity AI Assistant
