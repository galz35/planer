# 🎯 Software Dashboard: Plan de Ingeniería y Checklist

Este documento sirve como guía maestra para la implementación de la API de Software y la optimización del Dashboard. El objetivo es eliminar cualquier rastro de datos estáticos y asegurar una integración nativa con el motor de base de datos.

## 🏗️ 1. Arquitectura de Datos (Backend)
- [x] **Crear `SoftwareController` (`backend/src/software/software.controller.ts`)**:
    - [x] Endpoint `GET /app-software/dashboard-stats`: Punto de entrada único para el dashboard.
- [x] **Crear `SoftwareService` (`backend/src/software/software.service.ts`)**:
    - [x] Método `getDashboardData(userId)`:
        - [x] Consumir `VisibilidadService` para obtener colaboradores visibles.
        - [x] Ejecutar Query consolidada para Proyectos (similar a `ProyectosPage` pero con agregados de tareas).
        - [x] Calcular KPIs en tiempo real (Global Completion, Burn-down simple).
- [x] **Módulo `SoftwareModule`**: Registrar el nuevo controlador y servicio en el `AppModule`.

## 🎨 2. Interfaz Dinámica (Frontend)
- [x] **Servicio `software.service.ts`**: Crear el cliente para la nueva API.
- [x] **Actualización de `DashboardManager.tsx`**:
    - [x] Vincular el estado global del componente al nuevo servicio.
    - [x] **Sincronización de Tablas**: Asegurar que la tabla de proyectos en el dashboard sea idéntica en lógica a la de `/app/planning/proyectos` (usando el mismo mapeo de campos).
    - [x] **Eliminación Total de Hardcoding**: Reemplazar cualquier array manual (si queda alguno) por los datos del backend.

## 🧪 3. Pruebas de Calidad (Checklist de Verificación)
- [x] **Carga de Datos Reales**: Verificar que los proyectos nuevos creados en la pestaña "Proyectos" aparezcan inmediatamente en el Dashboard.
- [x] **Prueba de Permisos**: Validar que un usuario sin gente a cargo vea su propia información y proyectos donde es responsable.
- [x] **Desempeño SQL**: Validar que la consulta de `projectsStats` use índices y no cause demoras superiores a 500ms con 100+ proyectos.

## 📝 4. Notas Técnicas para el "Designer"
- **Coherencia de Nombres**: Usar `idProyecto` siempre como llave primaria (evitar ambigüedad con `id`).
- **Estados de Proyecto**: Consolidar estados ('Activo', 'Confirmado', 'Borrador') para que el dashboard los pinte con los colores correctos de `ProyectosPage.tsx`.
- **Ruta Oficial**: Mantener `//localhost:5173/app/software/dashboard`.

---
**Planificador:** Antigravity (AI)
**Fecha de Inicio:** 21 de Enero, 2026
**Estatus:** ⚙️ Diseñando API
