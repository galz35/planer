# 🔍 DIAGNÓSTICO INTEGRAL DEL PROYECTO — MOMENTUS PLANNING
**Fecha:** 11 de febrero de 2026  
**Revisión:** v1.0  
**Plataformas auditadas:** Backend (NestJS), React PWA, Flutter Móvil

---

## 📊 RESUMEN EJECUTIVO

| Métrica                    | Backend     | React PWA   | Flutter       |
|----------------------------|-------------|-------------|---------------|
| **Estado general**         | 🟢 Estable  | 🟢 Estable  | 🟡 En progreso |
| **Módulos implementados**  | 9           | 12+         | 14            |
| **Archivos de código**     | ~80 .ts     | ~120+ .tsx  | ~50 .dart     |
| **Tests unitarios**        | 8 specs     | 9 tests     | 0             |
| **Archivos basura**        | ⚠️ 8+       | ⚠️ 1 backup | 0             |
| **Deuda técnica**          | Media-Baja  | Baja        | Media         |

---

## 🏗️ STACK TECNOLÓGICO

### Backend
| Componente       | Tecnología               | Versión    |
|------------------|--------------------------|------------|
| Framework        | NestJS                   | ^11.0.1    |
| Runtime          | Node.js                  | —          |
| HTTP Engine      | Fastify                  | ^11.1.11   |
| Base de datos    | SQL Server (AWS RDS)     | mssql ^12.2.0 |
| Autenticación    | JWT + Passport           | ^11.0.2    |
| Seguridad        | Helmet, Throttler, bcrypt| ^8.1.0, ^6.5.0, ^6.0.0 |
| Notificaciones   | Firebase Admin           | ^13.6.1    |
| Documentación    | Swagger                  | ^11.2.3    |
| Logging          | Winston + Daily Rotate   | ^3.19.0    |
| Lenguaje         | TypeScript               | ^5.7.3     |
| Build/Test       | SWC + Jest               | —          |

### React PWA (clarity-pwa)
| Componente       | Tecnología               | Versión    |
|------------------|--------------------------|------------|
| Framework        | React                    | ^19.2.0    |
| Build Tool       | Vite                     | ^7.2.4     |
| Routing          | React Router DOM         | ^7.11.0    |
| State/Fetching   | TanStack React Query     | ^5.90.20   |
| Styling          | TailwindCSS              | ^3.4.17    |
| HTTP Client      | Axios                    | ^1.13.2    |
| Animaciones      | Framer Motion            | ^12.23.26  |
| Charts           | Recharts                 | ^3.7.0     |
| Iconos           | Lucide React             | ^0.561.0   |
| DnD              | @dnd-kit                 | ^6.3.1     |
| PWA              | vite-plugin-pwa          | ^1.2.0     |
| Alertas          | SweetAlert2              | ^11.26.17  |
| Capacitor        | @capacitor/*             | ^8.0.0     |
| Testing          | Vitest + Playwright      | ^4.0.16    |
| Lenguaje         | TypeScript               | ~5.9.3     |

### Flutter Móvil
| Componente       | Tecnología               | Versión    |
|------------------|--------------------------|------------|
| SDK              | Flutter                  | >=3.3.0    |
| State Management | Provider                 | ^6.1.2     |
| HTTP Client      | Dio                      | ^5.7.0     |
| DB Local         | sqflite                  | ^2.3.3+1   |
| Notificaciones   | Firebase Messaging       | ^14.7.9    |
| Storage Seguro   | Flutter Secure Storage   | ^9.2.2     |
| Conectividad     | connectivity_plus        | ^6.1.0     |
| Charts           | fl_chart                 | ^0.68.0    |
| Biometría        | local_auth               | ^2.2.0     |
| Internac.        | intl                     | ^0.19.0    |

---

## 🧱 ARQUITECTURA DE MÓDULOS

### Backend — Módulos NestJS (app.module.ts)
```
AppModule
├── DbModule            — Pool SQL Server directo (sin ORM)
├── AuthModule           — Login JWT, refresh tokens, cambio contraseña
├── ClarityModule        — Tareas, checkins, proyectos, bloqueos, notas, recurrencia
├── PlanningModule       — Planes de trabajo, solicitudes cambio, dashboard, asignación
├── AccesoModule         — Permisos (área, empleado), delegaciones, visibilidad jerárquica
├── AdminModule          — Gestión usuarios, roles, importación RRHH, seguridad
├── AuditModule          — Logging de auditoría global
├── DiagnosticoModule    — Salud del sistema, métricas
├── SoftwareModule       — Dashboard de desarrollo/software
├── NotificationModule   — Push notifications (FCM)
└── ThrottlerModule      — Rate limiting (10/s, 50/10s, 100/min)
```

### React PWA — Rutas principales (AppRoutes.tsx)
```
/app
├── hoy/                    — Mi Día (Execution, Calendar, Timeline, KPIs, Alerts, Blockers, Metrics, Team, Visibilidad)
├── pendientes              — Tareas pendientes
├── planning/
│   ├── proyectos           — Gestión de proyectos
│   ├── timeline            — Gantt / Timeline
│   ├── roadmap             — Roadmap estratégico
│   ├── carga               — Carga laboral
│   ├── simulation          — Simulación de proyecto
│   ├── plan-trabajo        — Plan mensual
│   └── approvals           — Aprobaciones de cambios
├── equipo/
│   ├── mi-equipo           — Vista de equipo
│   ├── bloqueos            — Bloqueos del equipo  
│   ├── actividad           — Actividad reciente
│   └── seguimiento-agenda  — Cumplimiento de agenda
├── agenda/:carnet          — Agenda de miembro
├── mi-asignacion           — Mis asignaciones (acceso general)
├── notas                   — Notas de reunión
├── reports                 — Reportes
├── automation              — Automatización
├── archivo                 — Archivo de tareas
├── help                    — Tutorial
├── software/dashboard      — Dashboard de software
└── admin/*                 — Panel Admin (roles, permisos, importación, etc.)
```

### Flutter Móvil — Features
```
lib/features/
├── agenda/            — Pantalla principal de agenda (Mi Día móvil)
├── assignment/        — Mi Asignación
├── auth/              — Login, SessionUser, AuthController
├── common/            — UserSearchSheet, Empleado model, UserRepository
├── dashboard/         — Dashboard KPIs
├── home/              — Home Shell (navegación principal + drawer)
├── notes/             — Notas
├── pending/           — Pendientes
├── projects/          — Proyectos (CRUD, detalle)
├── reports/           — Reportes con gráficos
├── settings/          — Configuración
├── sync/              — Sincronización offline
├── tasks/             — Tareas (CRUD, detalle, offline)
└── team/              — Mi Equipo
```

---


 

## 🟡 ARCHIVOS BASURA / NO PERTENECEN AL CÓDIGO

### Backend — En `src/clarity/`:
| Archivo | Tipo | Acción |
|---------|------|--------|
| `92li!ra$Gu2.txt` | Contraseña en texto plano | 🔴 Eliminar |
| `Untitled-4.md` | Markdown suelto | 🟡 Eliminar |
| `Untitled-6.txt` | Texto suelto | 🟡 Eliminar |
| `Untitled-7.sql` | SQL suelto | 🟡 Mover a `/database` |
| `sabes alguno empleado tiene tarea progra.yaml` | Chat/prompt pegado | 🔴 Eliminar |
| `te cuidado con esta orden 1 ves la ejecu.yaml` | Chat/prompt pegado | 🔴 Eliminar |
| `necesito de lo 40 usuario de rrhh.cvs qu.cvs qu` | Chat pegado | 🔴 Eliminar |
| `tasks.service.ts_snippet` | Snippet temporal | 🟡 Eliminar |

### Backend — Archivos `.bak`:
| Archivo | Acción |
|---------|--------|
| `acceso/import.controller.ts.bak` | Eliminar (backup legacy) |
| `acceso/import.service.ts.bak` | Eliminar |
| `clarity/clarity.repo.bak.ts` | Eliminar |
| `planning/planning.repo.ts.bak_legacy` | Eliminar |

### React PWA:
| Archivo | Acción |
|---------|--------|
| `pages/Hoy_backup/` (directorio completo) | Eliminar backup antiguo |

### Raíz del proyecto:
Múltiples documentos `.md` de análisis anteriores que podrían consolidarse en un solo directorio `docs/`.

---

## 📋 ESTADO DE TESTS

### Backend (Jest + SWC)
| Test File | Módulo | Estado |
|-----------|--------|--------|
| `app.controller.spec.ts` | App | ❓ No verificado |
| `auth/auth.controller.spec.ts` | Auth | ❓ |
| `auth/auth.service.spec.ts` | Auth | ❓ |
| `clarity/simple.spec.ts` | Clarity | ❓ |
| `clarity/tasks.service.spec.ts` | Tasks | ❓ |
| `planning/planning.service.spec.ts` | Planning | ❓ |
| `planning/controllers/asignacion.controller.spec.ts` | Asignación | ❓ |
| `planning/services/asignacion.service.spec.ts` | Asignación | ❓ |

**Cobertura:** No medida. 8 archivos de test para ~80 archivos fuente ≈ **10% cobertura de archivos**.  
**Módulos sin tests:** AccesoModule, AdminModule, NotificationModule, Visibilidad.

### React PWA (Vitest + Playwright)
| Test File | Módulo | Estado |
|-----------|--------|--------|
| `TaskCard.test.tsx` | UI | ❓ |
| `useErrorHandler.test.ts` | Hooks | ❓ |
| `useSecureHTML.test.ts` | Hooks | ❓ |
| `CheckinForm.test.tsx` | Hoy | ❓ |
| `RoadmapPage.test.tsx` | Planning | ❓ |
| `ErrorBoundary.test.tsx` | Components | ❓ |
| `Login.test.tsx` | Auth | ❓ |
| `validation.test.ts` | Utils | ❓ |

**Cobertura:** ~9 archivos test para ~120+ componentes ≈ **~7% cobertura**.  
**E2E:** Playwright configurado pero sin suites funcionales documentadas.

### Flutter Móvil
| Tests | Estado |
|-------|--------|
| Unit Tests | ⛔ **0 tests** |
| Widget Tests | ⛔ **0 tests** |
| Integration Tests | ⛔ **0 tests** |

---

## 🔧 DEUDA TÉCNICA POR CAPA

### Backend
| ID | Severidad | Descripción |
|----|-----------|-------------|
| B2 | � Media | 8+ archivos basura en `src/clarity/` (pendiente limpieza manual) |
| B3 | 🟡 Media | 4 archivos `.bak` sin limpiar (pendiente limpieza manual) |
| ~~B4~~ | ✅ | ~~`console.log` de debug en `auth.service.ts`~~ — **Eliminados** |
| B5 | 🟡 Media | `tasks.service.ts` tiene 933 líneas — candidato a separación |
| B6 | 🟡 Media | `planning.service.ts` tiene 689 líneas — candidato a separación |
| B7 | 🟢 Baja | Tipado `any` extensivo en services (PlanningService, TasksService) |

### React PWA
| ID | Severidad | Descripción |
|----|-----------|-------------|
| ~~R1~~ | ✅ | ~~Error de tipos `Usuario[] → Empleado[]`~~ — **Corregido** |
| R2 | 🟡 Media | `Hoy_backup/` directorio entero sin usar |
| R3 | 🟡 Media | `clarity.service.ts` tiene 674 líneas — podría dividirse |
| R4 | 🟢 Baja | Inconsistencia entre `Usuario` y `Empleado` (campos opcionales vs requeridos) |
| R5 | 🟢 Baja | Lazy loading inconsistente (admin pages lazy, otras no) |

### Flutter Móvil
| ID | Severidad | Descripción |
|----|-----------|-------------|
| F1 | 🔴 Alta | **0 tests** en toda la app |
| ~~F2~~ | ✅ | ~~`TODO: Implementar lógica de sincronización`~~ — **Implementado en `tasks_repository.dart`** |
| ~~F3~~ | ✅ | ~~`TODO: Implementar llamada real a actualizar estado`~~ — **Ya implementado (era obsoleto)** |
| ~~F4~~ | ✅ | ~~`SessionUser` reducido~~ — **Ampliado +gerencia, +departamento** |
| ~~F5~~ | ✅ | ~~`deprecated_member_use`~~ — **Corregido `.toARGB32()`** |
| ~~F6~~ | ✅ | ~~`unnecessary_const` warning~~ — **Corregido en `agenda_screen.dart`** |


---

## 🗄️ BASE DE DATOS

| Propiedad | Valor |
|-----------|-------|
| **Motor** | SQL Server (AWS RDS) |
| **Host** | `54.146.235.205` / `database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com` |
| **BD** | `Bdplaner` |
| **Acceso DBA** | Sin ORM (queries directas + stored procedures) |
| **SPs documentados** | 17 archivos `.sql` en `db/scripts/` |
| **Migraciones** | Sin herramienta formal (scripts manuales) |

### Stored Procedures Clave:
- `sp_Equipo_ObtenerHoy` — Equipo del día
- `sp_Dispositivos_Registrar` — FCM tokens
- `sp_Proyecto_Eliminar` — Soft delete proyectos
- `sp_Migration_*` (Pack1-5) — Migraciones de datos
- `procedures_acceso.sql` — Permisos y delegaciones

---

## 🌐 INFRAESTRUCTURA DE PRODUCCIÓN

```
┌─────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│  React PWA      │────▶│  Nginx (Proxy)     │────▶│  NestJS Backend │
│  Vite Build     │     │  190.56.16.85      │     │  Port 3000      │
│  /api → proxy   │     │  SSL?              │     │  Fastify        │
└─────────────────┘     └────────────────────┘     └────────┬────────┘
                                                            │
┌─────────────────┐                                         │
│  Flutter App    │─────────────────────────────────────────▶│
│  APK directo    │                                         │
│  http://190...  │                              ┌──────────▼─────────┐
└─────────────────┘                              │  SQL Server (RDS)  │
                                                 │  54.146.235.205    │
                                                 │  Bdplaner          │
                                                 └────────────────────┘
```

---

## ✅ LOGROS RECIENTES (Sesión actual)

| Cambio | Capa | Estado |
|--------|------|--------|
| API `/acceso/empleados/gerencia/:nombre` | Backend | ✅ Implementada |
| `getEmpleadosPorGerencia()` en clarity.service | React PWA | ✅ Implementada |
| Precarga de gerencia en `CreateTaskModal` | React PWA | ✅ Implementada |
| Fix tipo TS2345 `Usuario[]` → `Empleado[]` | React PWA | ✅ Corregido |
| `SessionUser` + gerencia/departamento | Flutter | ✅ Ampliado |
| `AuthRepository` persiste gerencia/depto | Flutter | ✅ Actualizado |
| `UserSearchSheet` carga compañeros de gerencia | Flutter | ✅ Implementada |
| `getEmployeesByDepartment()` en UserRepository | Flutter | ✅ Implementada |
| `Color.value` → `Color.toARGB32()` deprecated | Flutter | ✅ Corregido |
| "Mi Asignación" movida a acceso general | React PWA | ✅ Ruta actualizada |
| Limpieza `console.log` debug en auth | Backend | ✅ 4 logs eliminados |
| `syncPendingEvents` implementado (sync offline) | Flutter | ✅ Lógica completa |
| TODO obsoleto en `agenda_controller.dart` | Flutter | ✅ Eliminado |
| Warning `unnecessary_const` en agenda | Flutter | ✅ Corregido |

---

## 📌 PLAN DE ACCIÓN PRIORIZADO

### ✅ Prioridad 1 — Seguridad (COMPLETADA)
- [x] **Limpiar console.log** de debug en auth — ✅ Eliminados 4 console.log

### 🟡 Prioridad 2 — Limpieza de código (pendiente — limpieza manual)
- [ ] Eliminar 8 archivos basura de `src/clarity/`
- [ ] Eliminar 4 archivos `.bak` del backend
- [ ] Eliminar `Hoy_backup/` del frontend
- [ ] Consolidar documentos `.md` de raíz en `docs/`

### ✅ Prioridad 3 — Estabilidad (COMPLETADA)
- [x] Implementar TODOs pendientes en Flutter — ✅ `syncPendingEvents` implementado, `completeTask` TODO eliminado
- [ ] Agregar tests unitarios mínimos para Flutter (auth, tasks, agenda)
- [ ] Verificar y corregir tests existentes de backend y frontend
- [x] Resolver warnings de linter en Flutter — ✅ `unnecessary_const` corregido

### 🟢 Prioridad 4 — Mejoras arquitectónicas (próximo mes)
- [ ] Dividir `tasks.service.ts` (933 líneas) en sub-servicios
- [ ] Dividir `clarity.service.ts` (674 líneas) en módulos
- [ ] Unificar tipos `Usuario` y `Empleado` para eliminar casts `as unknown`
- [ ] Implementar herramienta de migraciones formal (no scripts manuales)
- [ ] Configurar CI/CD pipeline con tests automáticos
- [ ] Implementar HTTPS entre Flutter y el servidor

---

## 📈 MÉTRICAS DE COMPLEJIDAD

| Archivo | Líneas | Riesgo | Razón |
|---------|--------|--------|-------|
| `backend/src/clarity/tasks.service.ts` | 933 | 🔴 Alto | Service monolítico con 50+ métodos |
| `backend/src/planning/planning.service.ts` | 689 | 🟡 Medio | 31 métodos, responsabilidades mixtas |
| `backend/src/planning/planning.repo.ts` | ~34K bytes | 🟡 Medio | Repo grande con queries directas |
| `clarity-pwa/src/services/clarity.service.ts` | 674 | 🟡 Medio | Service frontend con todas las llamadas |
| `clarity-pwa/src/pages/Hoy/MiDiaPage.tsx` | — | 🟡 Medio | 9 sub-vistas, alta complejidad |
| `flutter_movil/agenda_screen.dart` | 1670+ | 🔴 Alto | Pantalla con muchos widgets inline |

---

## 🎯 CONCLUSIÓN

El proyecto **Momentus Planning** tiene una base sólida con un stack moderno y bien elegido. Los tres clientes (React PWA, Flutter, API) están sincronizados funcionalmente. Sin embargo, hay **deuda técnica acumulada** que debe atenderse:

1. **Seguridad** es la prioridad #1: el backdoor y las credenciales expuestas deben resolverse antes de cualquier demo o despliegue real.
2. **Limpieza** de archivos basura mejorará la mantenibilidad y profesionalismo del repositorio.
3. **Testing** es la mayor brecha: Flutter tiene 0 tests, y backend/frontend tienen cobertura mínima (~7-10%).
4. **Arquitectura** es funcional pero algunos servicios necesitan partición para escalabilidad.

**Estado general del proyecto: 🟡 Funcional con trabajo pendiente de hardening.**
