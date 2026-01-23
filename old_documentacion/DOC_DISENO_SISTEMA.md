# Documentación de Diseño y Análisis del Sistema Clarity

## 1. Inventario de Base de Datos (Esquema Relacional)

El sistema utiliza **TypeORM** con una arquitectura modular. A continuación, se detallan las entidades principales categorizadas por su dominio:

### A. Núcleo de Autenticación y Estructura Organizativa (`auth`, `acceso`)
*   **`Usuario`**: Perfil de usuario, país, cargo y relaciones de sistema.
*   **`Rol`**: Definición de permisos globales y específicos.
*   **`OrganizacionNodo`**: Estructura jerárquica (Nacional, Dirección, Gerencia, Equipo).
*   **`UsuarioOrganizacion`**: Vincula usuarios con nodos y define su rol funcional (Líder, Miembro).
*   **`Empleado`**: Datos extendidos de recursos humanos sincronizados con el sistema.
*   **`Permisos`**: Tablas de delegación de visibilidad y acceso por área.

### B. Gestión de Planificación (`planning`)
*   **`Proyecto`**: Contenedor de tareas, configurado por país y tipo (Estratégico/Operativo). Incluye control de "Enllavado" (bloqueo de edición).
*   **`Tarea`**: Entidad central. Almacena fechas (Planificada vs Objetivo), estado, prioridad, esfuerzo y progreso.
*   **`TareaAsignado`**: Relación N:M entre tareas y usuarios (Responsable, Colaborador).
*   **`TareaAvance`**: Historial de registros de progreso con comentarios.
*   **`SolicitudCambio`**: Flujo de aprobación para modificar fechas en tareas "enllavadas" o estratégicas.

### C. Ejecución y Productividad (`clarity`)
*   **`Checkin`**: Registro diario de estado de ánimo y entregables principales.
*   **`CheckinTarea`**: Detalle de tareas específicas avanzadas durante un check-in.
*   **`Bloqueo`**: Gestión de impedimentos entre usuarios, con estados Activo/Resuelto.
*   **`FocoDiario`**: Priorización personal de tareas para el día actual.
*   **`Nota`**: Captura de minutas o ideas, con soporte para detección inteligente de tareas.

### D. Trazabilidad y Seguridad (`common`)
*   **`AuditLog`**: Registro de acciones de negocio (quién cambió qué).
*   **`LogSistema`**: Registro técnico de errores y telemetría de red.

---

## 2. Análisis del Diseño del Sistema

### Fortalezas del Diseño Actual
1.  **Arquitectura por Capas**: Clara separación entre controladores, servicios y entidades.
2.  **Seguridad Basada en Jerarquía**: El uso de `getSubtreeUserIds` permite que los líderes vean automáticamente el trabajo de sus subordinados sin configurar permisos manuales por cada tarea.
3.  **Auditoría Nativa**: El sistema registra cambios críticos de forma proactiva, facilitando la transparencia.
4.  **Multi-País**: La inclusión del campo `pais` en entidades clave permite el filtrado regional de la información desde el núcleo.
5.  **UX Orientada a la Acción**: El diseño del frontend (Clarity PWA) prioriza la resolución de bloqueos y el foco diario sobre la gestión administrativa pesada.

### Cumplimiento de Requisitos (Checklist)
*   [x] **Visibilidad Jerárquica**: Implementada vía lógica de nodos organizativos.
*   [x] **Control de Cambios**: Implementado mediante `AuditLog` y `SolicitudCambio`.
*   [x] **Dashboard Gerencial**: Implementado con métricas de KPI y tendencias.
*   [x] **Sincronización PWA**: Capacidad offline y diseño responsivo para móviles.

---

## 3. Debilidades y Faltantes (Gap Analysis)

### Lo que falta (Crítico)
1.  **Notificaciones en Tiempo Real**: Actualmente, los usuarios dependen de actualizar la página para ver nuevos bloqueos o asignaciones. Falta integración con **WebSockets (Socket.io)** o **Web Push Notifications**.
2.  **Motor de Reglas Automático**: Falta una capa de "Automatización" que, por ejemplo, cree un bloqueo automático si una tarea predecesora se retrasa.
3.  **Gestión de Documentos Adjuntos**: El sistema maneja texto y enlaces, pero no tiene un almacenamiento centralizado para archivos (S3 o similar).
4.  **Reportes Formales**: Aunque existen Dashboards, falta la generación de reportes en PDF/Excel para reuniones de comité regional.

### Aspectos de Diseño a Refinar
*   **Hardcoding de Lógica de Permisos**: La lógica de "quién puede editar" está dispersa en métodos de servicio. Se sugiere centralizar esto en **NestJS Guards** o **Interceptors**.
*   **Sincronización de Datos**: El proceso de creación de `Empleado` al hacer login es funcional pero podría generar duplicados si no se manejan bien las transacciones.

---

## 4. Sugerencias de Mejora y Evolución

### Sugerencia 1: Refactor de Auditoría (Subscribers)
En lugar de llamar a `saveAuditLog` manualmente en cada método, implementar **TypeORM Event Subscribers**. Esto capturaría automáticamente todos los cambios en `Tarea` y `Proyecto`, comparando el estado anterior y nuevo sin riesgo de olvidar un log.

### Sugerencia 2: Motor de Notificaciones Centralizado
Crear un `NotificationModule` que reciba eventos del sistema y decida cómo enviarlos (UI, Email, WhatsApp) basándose en las preferencias del usuario en `usuario-config.entity.ts`.

### Sugerencia 3: Optimización de Consultas Jerárquicas
La consulta recursiva (`WITH RECURSIVE`) en `getSubtreeNodeIds` es potente pero costosa. Se sugiere implementar **Materialized Paths** o un cache con **Redis** para las estructuras de nodos que no cambian frecuentemente.

### Sugerencia 4: Dashboard de Inteligencia Predictiva
Aprovechar los datos de `TareaAvance` y `fechaObjetivo` para predecir retrasos antes de que ocurran (basado en la velocidad histórica del usuario o equipo).

---

**Conclusión**: El sistema tiene una base sólida y escalable. El diseño de la base de datos es robusto para un entorno corporativo multi-país. La prioridad inmediata debería ser la **comunicación en tiempo real** para cerrar el ciclo de feedback entre el equipo y la gerencia.
