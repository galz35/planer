# 💎 GUÍA ESTRUCTURAL DEL PROYECTO: CLARITY / MOMENTUS
> **Documento de Contexto para Modelos de IA de Nueva Generación (ChatGPT 5.2 / Claude 3.5)**
> **Propósito:** Explicar la arquitectura, la interconexión entre componentes y la lógica de negocio subyacente de Clarity.

---

## 1. 📂 FILOSOFÍA Y ARQUITECTURA GENERAL

Clarity no es un gestor de tareas común; es un **Sistema de Gobernanza Corporativa**. La premisa central es: **"Solo puedes ver lo que tu posición jerárquica permite"**.

### Stack Tecnológico
*   **Backend:** NestJS (Node.js). Ha evolucionado de TypeORM a consultas directas a **SQL Server** para máximo rendimiento en reportes complejos.
*   **Frontend:** Vite + React. Uso intensivo de **Context API** para estado global y **Tailwind CSS** para una estética premium "Glassmorphism".
*   **Base de Datos:** SQL Server. Lógica pesada reside en procedimientos almacenados y consultas de visibilidad recursiva.

---

## 2. 🧠 EL CEREBRO: MÓDULO DE ACCESO Y VISIBILIDAD
Antes de entender las páginas, hay que entender cómo se filtran los datos:
*   **`AccesoModule` (Backend):** Utiliza un algoritmo de **Herencia Recursiva**. Si eres Gerente, el sistema calcula en tiempo real todos tus subordinados directos e indirectos.
*   **`VisibilidadService`**: El componente más crítico. Filtra cada consulta de base de datos para asegurar que un usuario nunca vea datos de un área o jefe superior si no tiene el permiso explícito.

---

## 3. 🖥️ ANÁLISIS DETALLADO POR PÁGINA

### A. Mi Agenda (`/app/hoy`)
**Propósito:** Centro de ejecución diario para el usuario final.
*   **Componentes Frontend:**
    *   `MiDiaPage.tsx`: Contenedor principal que gestiona el estado de la fecha actual.
    *   `ExecutionView.tsx`: Lista de tareas accionables para el día.
    *   `CalendarView.tsx`: Vista temporal para planificación a corto plazo.
    *   `TimelineView.tsx`: Bitácora histórica de lo realizado.
*   **Backend Relacionado:**
    *   `ClarityService.getTasks()`: Recupera tareas filtradas por fecha y usuario.
    *   `ClarityService.updateTaskStatus()`: Maneja la lógica de "Hecho/Pendiente".
*   **¿Por qué está así?** Para separar la **ejecución** (hacer tareas) de la **reflexión** (ver el calendario o bitácora) sin perder el contexto del día.

### B. Portafolio de Proyectos (`/app/planning/proyectos`)
**Propósito:** Control de iniciativas estratégicas de alto nivel.
*   **Componentes Frontend:**
    *   `ProyectosPage.tsx`: Tabla densa de información con filtros por Gerencia/Subgerencia/Área.
    *   `ProjectModal`: Gestión de metadatos (fechas, dueños, descripción).
*   **Backend Relacionado:**
    *   `PlanningService.getProyectos()`: Retorna proyectos que el usuario tiene permiso de ver.
    *   `ClarityService.confirmarProyecto()`: Implementa el flujo de gobernanza (bloquea el proyecto una vez planificado).
*   **¿Por qué está así?** Permite a la PMO ver el avance global mientras que los jefes de área ven solo sus proyectos específicos. El diseño usa **selectores en cascada** para reflejar la estructura real de la empresa.

### C. Plan de Trabajo (`/app/planning/plan-trabajo`)
**Propósito:** Desglose operativo de un proyecto (WBS - Work Breakdown Structure).
*   **Componentes Frontend:**
    *   Vista de lista jerárquica de hitos y tareas.
    *   Barras de progreso por hito.
*   **Backend Relacionado:**
    *   `ClarityService.getProjectDetails()`: Cruza hitos, tareas y responsables.
*   **¿Por qué está así?** Es el puente entre la estrategia (Proyecto) y la operación (Tarea). Permite asignar responsables y definir fechas críticas.

### D. Mi Equipo (`/app/equipo/mi-equipo`)
**Propósito:** Panel de control para líderes (Manager Dashboard).
*   **Componentes Frontend:**
    *   `MiEquipoPage.tsx`: Tarjetas de rendimiento por empleado.
    *   Indicadores de Carga Laboral y Tareas Críticas.
*   **Backend Relacionado:**
    *   `VisibilidadService.getSubordinados()`: Motor de búsqueda de equipo.
    *   `AnalyticsService.getMemberStats()`: Cálculo de KPIs individuales.
*   **¿Por qué está así?** Un líder necesita identificar **cuellos de botella** rápidamente. Se enfoca en "quién tiene qué" y "quién está bloqueado".

### E. Dashboard Anality (`/app/software/dashboard`)
**Propósito:** Inteligencia de negocio y agregación masiva de datos.
*   **Componentes Frontend:**
    *   Charts (Recharts): Distribución de estados, cumplimiento global, top de bloqueos.
*   **Backend Relacionado:**
    *   `SoftwareService.getDashboardAnalytics()`: Consultas pesadas de agregación que recorren toda la jerarquía autorizada.

---

## 4. 🛠️ COMPONENTES TRANSVERSALES (LAYOUT)

1.  **`Sidebar.tsx`**: Generado dinámicamente por `MenuBuilder`. No muestra opciones que el usuario no pueda usar.
2.  **`TopBar.tsx`**: Proporciona contexto de navegación y acciones rápidas.
3.  **`CommandPalette.tsx`**: (Atajo `Ctrl+K`) Permite saltar entre proyectos o tareas rápidamente, mejorando la UX para usuarios avanzados.
4.  **`AuthContext.tsx`**: Gestiona la sesión, el token JWT y lo más importante: **el Perfil del usuario** (Admin vs Colaborador).

---

## 🤖 NOTA PARA EL ANALISTA IA (CHATGPT 5.2)

Al proponer cambios, ten en cuenta:
1.  **Duality Frontend-Backend**: Cada nueva página suele requerir un ajuste en el `MenuBuilder` (DB) y un nuevo Service en el Backend.
2.  **Seguridad**: Nunca sugieras endpoints que devuelvan datos sin pasar por el `VisibilidadGuard`.
3.  **React Patterns**: Preferimos Hooks personalizados para la lógica de datos (`useProjects`, `useTasks`) manteniendo los componentes visuales limpios.
4.  **SQL Server**: Las consultas deben ser compatibles con T-SQL (evitar sintaxis exclusiva de Postgres como `JSONB` o `ILIKE`).
