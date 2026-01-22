# Plan de Implementación: Dashboard Directivo de Software

Este plan detalla los pasos seguidos y los pendientes para habilitar el Dashboard de Gestión bajo la nueva ruta `http://localhost:5173/app/software/dashboard`, asegurando el uso exclusivo de datos reales.

## 1. Fase Backend: Garantía de Datos Reales
- [x] **Optimización de `AnalyticsService.ts`**: Modificado para que la propiedad `tasksDetails` devuelva el array `allTasksRaw`. Esto habilita la funcionalidad de drilldown (ver tareas específicas al hacer clic en un área).
- [x] **Mapeo de Jerarquías**: Verificado que `getDashboardStats` agrupa correctamente por `subgerencia` y `area`, eliminando fallbacks estáticos.
- [ ] **Validación de Consultas**: Ejecutar pruebas de estrés para asegurar que la consulta con múltiples JOINs (`p_Proyectos`, `p_Tareas`, `p_TareaAsignados`) no degrade el tiempo de respuesta.

## 2. Fase Frontend: Construcción del Componente `DashboardManager`
- [x] **Creación del Archivo**: Se creó `clarity-pwa/src/pages/Equipo/DashboardManager.tsx` como copia limpia del dashboard original.
- [x] **Remoción de Mocks**: Se eliminaron los bloques `if (!data.projectsStats || data.projectsStats.length === 0)` que inyectaban datos de prueba.
- [x] **Refactorización de UI**:
    - [x] Tabla compacta de proyectos para alta densidad de información.
    - [x] KPIs dinámicos basados en el cumplimiento global real.
    - [x] Drilldown modal para visualización de tareas en tiempo real.

## 3. Fase de Configuración y Rutas
- [x] **Registro en `App.tsx`**: Importado `DashboardManager` y configurada la ruta bajo el segmento `software`.
- [x] **Definición de URL**: Activada la ruta específica `app/software/dashboard`.
- [ ] **Protección de Ruta**: Asegurar que solo usuarios con rol 'Manager' o 'Gerente' puedan acceder (actualmente heredado de `ProtectedRoute`).

## 4. Tareas de Verificación (QA)
- [ ] **Prueba de Carga**: Acceder a `http://localhost:5173/app/software/dashboard` y verificar que el spinner de carga desaparezca satisfactoriamente.
- [ ] **Integridad de Datos**: Comparar los KPIs del Dashboard con los listados de `MiEquipoPage` para asegurar consistencia.
- [ ] **Filtrado por Período**: Cambiar mes/año y verificar que la API responda con los cortes de fecha correctos.

## 5. Próximos Pasos Proactivos
- [ ] **Incorporación al Sidebar**: Una vez aprobado el diseño "limpio", añadir una nueva entrada en el menú lateral bajo una sección llamada "Software" o "Inteligencia".
- [ ] **Gráficos Avanzados**: Reintroducir visualizaciones de `recharts` (Pie charts, Bar charts) pero estrictamente ligadas a los datos dinámicos obtenidos.

---
**Estado Actual:** 🟢 Listo para pruebas funcionales.
