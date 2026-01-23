# 🚀 Resumen del Proyecto: Momentus (Clarity System)

Este documento contiene una descripción técnica y funcional completa del proyecto para contextualizar a un asistente de IA (como Gemini).

---

## 1. Visión General
**Nombre del Sistema:** Momentus (Frontend PWA) / Clarity (Backend API)
**Propósito:** Sistema corporativo interno para la gestión avanzada de planificación, ejecución de estrategia y seguimiento de tareas (Task Management) con soporte **multi-país**.
**Enfoque:** Gobernanza diferenciada entre proyectos Estratégicos (rígidos, requieren aprobación) y Operativos (flexibles, auditados).

## 2. Stack Tecnológico

### 后端 (Backend)
- **Framework:** NestJS (Node.js)
- **Motor:** Fastify (Adapter)
- **Lenguaje:** TypeScript
- **Base de Datos:** PostgreSQL
- **ORM:** TypeORM
- **Logging:** Winston (Logs estructurados)
- **Testing:** Jest
- **Características Clave:**
  - Rate Limiting (Throttler)
  - Validación Global (Pipes)
  - Documentación Swagger automática
  - Arquitectura Modular

### Frontend (User Interface)
- **Framework:** React 19
- **Build Tool:** Vite
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS
- **Componentes:** Componentes personalizados con Framer Motion (animaciones)
- **Estado/Data:** Axios, React Hooks
- **Librerías Clave:**
  - `dnd-kit`: Drag and drop (Kanban, listas)
  - `recharts`: Gráficos y métricas
  - `fuse.js`: Búsqueda difusa
  - `lucide-react`: Iconografía
  - `@capacitor/*`: Soporte nativo móvil (PWA)

## 3. Arquitectura del Sistema

### Módulos Principales (Backend)
1.  **AuthModule:** Autenticación, gestión de usuarios, roles, nodos organizacionales.
2.  **PlanningModule:** Núcleo de gestión de `Proyectos` y `Tareas`. Lógica de fechas, asignaciones y avances.
3.  **ClarityModule:** Funcionalidades de productividad diaria (`Bloqueos`, `Checkin`, `FocoDiario`, `Notas`).
4.  **AdminModule:** Gestión administrativa del sistema.
5.  **AccesoModule:** Control de acceso granular, jerarquías de empleados (`Empleado`, `OrganizacionNodoRh`), permisos y visibilidad.

### Modelo de Datos (Entidades Clave)
*   **Usuario / Empleado:** Identificación principal ahora basada en `carnet`. Vinculación con jerarquía organizacional.
*   **Proyecto:**
    *   Campos: `tipo` (Estratégico, Táctico, Operativo), `pais`, `requiereAprobacion`.
    *   Regla: Proyectos estratégicos bloquean edición directa de fechas/alcance.
*   **Tarea:** Unidad de trabajo inteligente. Hereda restricciones del proyecto padre.
*   **SolicitudCambio:** Entidad para manejar flujos de aprobación cuando se intenta modificar un proyecto Estratégico.
*   **AuditLog (p_auditoria):** Registro inmutable de cambios (quién, qué, cuándo, valor anterior/nuevo). Crítico para proyectos operativos.

## 4. Reglas de Negocio Críticas

### Clasificación de Proyectos y Gobernanza
| Tipo | Comportamiento |
|------|----------------|
| **Estratégico** | **Restringido.** Cambios en fechas/alcance requieren crear una `SolicitudCambio` y aprobación gerencial. |
| **Táctico/Operativo** | **Flexible.** Edición permitida. Todos los cambios generan un `AuditLog` automático. |

### Aislamiento Multi-País
- Los datos (`Proyectos`, `Tareas`) están segregados por el campo `pais`.
- Los usuarios solo ven y gestionan datos correspondientes a su país asignado (a menos que tengan permisos globales).

## 5. Estado Actual del Desarrollo (Snapshot Enero 2026)

### ✅ Completado / Estable
- **Backend API:** Sólido, 100% test suites pasando (262 tests).
- **Entidades:** Modelo de datos refactorizado y estable (dependencias circulares resueltas).
- **Auditoría:** Sistema de logs (`AuditService`) integrado en servicios core.
- **Identidad:** Migración a `carnet` como identificador único completada.
- **Aislamiento:** Lógica de backend para separación de datos por país implementada.

### 🚧 En Proceso / Pendiente
- **Frontend Tests:** Cobertura baja (~17%). Se necesita aumentar para producción.
- **Refactorización UI:** Algunos componentes (`ManagerDashboard`, `TimelinePage`) son monolíticos y requieren división.
- **Internacionalización (i18n):** Pendiente para soporte completo de idiomas (actual: solo Español).
- **DevOps:** CI/CD pipeline y monitoreo de producción pendientes.

## 6. Métricas del Código
- **Total Líneas:** ~35,000
- **TypeScript (Backend):** ~17,000 líneas
- **React/TSX (Frontend):** ~18,500 líneas
- **Archivos:** ~250+

---
*Este archivo fue generado automáticamente para proporcionar contexto rápido a asistentes de IA.*
