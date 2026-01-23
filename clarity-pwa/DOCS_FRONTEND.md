# 📄 Documento de Diseño y Arquitectura - Frontend Clarity PWA

Este documento sirve como guía técnica para entender cómo está construido el frontend de **Clarity**, cómo se comunican sus partes y qué función cumple cada módulo.

---

## 1. 🏗️ Arquitectura General
El proyecto es una **PWA (Progressive Web App)** construida con:
- **React 18 + Vite**: Para la interfaz y empaquetado rápido.
- **TypeScript**: Para asegurar que los datos (Tareas, Usuarios) siempre tengan el formato correcto.
- **Tailwind CSS**: Para el diseño visual (estilos premium y responsivos).
- **Axios**: Para todas las peticiones al servidor.
- **React Router 6**: Gestiona la navegación y las sub-vistas (Outlet).

---

## 2. 🗺️ Mapa de Módulos (Organización)

El sistema se divide en **4 pilares principales**, cada uno con su propósito y servicios dedicados.

### A. Módulo de Autenticación (`/src/context/AuthContext.tsx`)
- **¿Qué es?**: El cerebro que sabe quién está usando la app.
- **Componentes**: `LoginPage.tsx`.
- **API**: `/auth/login`, `/auth/refresh`.
- **Estudio**: Mira cómo se guarda el "Token" en el navegador para no pedir contraseña cada vez que refrescas.

### B. Módulo Personal: "Mi Día" (`/src/pages/Hoy`)
- **¿Qué es?**: El panel de control diario para el empleado.
- **Vistas internas**: 
    - `ExecutionView`: Lista de tareas para hoy.
    - `CalendarView`: Calendario personal.
    - `TimelineView`: Registro histórico de qué hiciste.
- **Componentes clave**: `TaskCard.tsx`, `QuickTaskModal.tsx`.
- **API Principal**: `getMiDia(fecha)`, `postCheckin()`.

### C. Módulo de Liderazgo: "Gestión de Equipo" (`/src/pages/Equipo`)
- **¿Qué es?**: Herramientas para que Jefes y Gerentes supervisen.
- **Páginas**: 
    - `ManagerDashboard`: Semáforo general de cumplimiento.
    - `MiEquipoPage`: Listado de personal a cargo.
    - `MemberAgendaPage`: Permite al jefe ver exactamente lo mismo que el empleado en su "Mi Día".
- **API Principal**: `getEquipoHoy()`, `getMyTeam()`.

### D. Módulo de Planificación: "Proyectos" (`/src/pages/Planning`)
- **¿Qué es?**: Gestión de cronogramas y carga laboral.
- **Páginas**: 
    - `PlanTrabajoPage`: Edición masiva de tareas de un proyecto.
    - `WorkloadPage`: Gráficas de quién está saturado de trabajo.
    - `ProyectosPage`: Listado de todos los planes activos.
- **API Principal**: `getProyectos()`, `getProyectosTareas()`.

---

## 3. 🧩 Componentes y su Función

| Componente | ¿Para qué se usa? | ¿Qué se espera? |
| :--- | :--- | :--- |
| **`TaskCard`** | Mostrar un resumen de una tarea. | Que cambie de color si está atrasada (Rojo/Naranja). |
| **`StatusPill`** | Mostrar un estado (Hecha, En Curso). | Que use colores estándar (Azul para En Curso, Verde para Hecha). |
| **`Sidebar`** | Menú lateral de navegación. | Que oculte opciones según el Rol del usuario (Admin vs Usuario). |
| **`CommandPalette`** | Buscador rápido (Ctrl+K). | Que permita buscar tareas o personas desde cualquier lugar. |
| **`QuickTaskModal`** | Crear tareas de forma veloz. | Que pida solo lo mínimo para no interrumpir el flujo del usuario. |

---

## 4. 🔌 Flujo de una Petición (Data Flow)

Cuando un usuario hace clic en **"Completar Tarea"**, ocurre lo siguiente:

1.  **UI**: El componente `TaskCard` detecta el clic y llama a una función.
2.  **Servicio**: Se invoca `clarityService.actualizarTarea(id, { estado: 'Hecha' })`.
3.  **Cliente HTTP**: `api.ts` inyecta el Token de seguridad y envía un `PATCH` al servidor.
4.  **Respuesta**: El servidor confirma el cambio.
5.  **Estado**: El `MiDiaContext` recibe los nuevos datos y actualiza la lista en pantalla automáticamente.

---

## 5. 💡 Consejos para Estudiar el Código

1.  **Empieza por `modelos.ts`**: Si entiendes cómo es el objeto "Tarea", entenderás todo el código.
2.  **Sigue las rutas en `App.tsx`**: Es el índice de todo el libro.
3.  **Usa los comentarios**: He dejado notas con **¿QUÉ ES?** en los archivos más importantes para guiarte.

---
*Documento generado para el estudio del equipo Frontend de Clarity.*
