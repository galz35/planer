# Plan de Trabajo: Resolución de Auditoría (Ref. ChatGPT 5.2)

Este plan aborda las debilidades reales identificadas en el análisis de los archivos del 2026-02-04, priorizando la seguridad y la integridad del sistema. (Nota: CORS se pospone por solicitud del usuario).

## Fase 1: Blindaje de Seguridad Backend (Inmediato)
**Objetivo:** Evitar exposición de información técnica y proteger el acceso a endpoints de diagnóstico.

1. **Protección de Diagnóstico:**
   - [ ] Implementar `@UseGuards(JwtAuthGuard)` en `DiagnosticoController`.
   - [ ] Mover la lógica de `/test-tarea` a un área de pruebas controlada o eliminarla si ya no se requiere.
2. **Limpieza de AppController:**
   - [ ] Eliminar los endpoints `/reset-passwords` y `/seed-*` que contienen snippets de SQL y metadata innecesaria.
3. **Migración de SQL Vulnerable (In-place):**
   - [ ] Refactorizar `obtenerHijosDeNodos` y `obtenerUsuariosEnNodos` en `planning.repo.ts` para usar **TVP (Table-Valued Parameters)** en lugar de inyección de strings en el `IN (...)`.

## Fase 2: Consistencia de Identidad y Datos (Frontend-Backend)
**Objetivo:** Asegurar que el sistema use correctamente el binomio Carnet/ID y eliminar datos mock.

1. **Sincronización de Carnet:**
   - [ ] Corregir `VisibilidadView.tsx` para que use `user.carnet` en lugar de convertir el `idUsuario` a string (esto rompe la lógica de seguridad por equipo).
2. **Conexión de Vistas Equipo:**
   - [ ] Reemplazar los mocks de `TeamPlanningPage.tsx` por llamadas reales a `clarityService.getTareasUsuario(userId)`.
   - [ ] Asegurar que el "Modo Supervisor" en `MemberAgendaPage.tsx` cargue datos reales de la API.

## Fase 3: Funcionalidad y UX Premium
**Objetivo:** Cumplir con la promesa de una aplicación terminada y profesional.

1. **Resolución de Placeholders:**
   - [ ] Implementar la lógica real de exportación en `ProjectSimulationPage.tsx` (o al menos conectar con el endpoint de reporte si existe).
   - [ ] Documentar o habilitar las pestañas marcadas como "Próximamente" (Ej: Pestaña Excel en ImportPage).
2. **Accesibilidad y Headless UI:**
   - [ ] Vincular todos los `label` con sus `input` mediante `htmlFor` e `id` en `LoginPage.tsx` y modales.
3. **Optimización de Interfaz:**
   - [ ] Corregir el posicionamiento del menú contextual en `PendientesPage.tsx` para que sea relativo a la scroll area.

## Fase 4: Pruebas de Estrés y Cierre
1. **Validación de Jerarquía:** Ejecutar `verify_hierarchy` para asegurar que ningún cambio rompió las reglas de visibilidad.
2. **Cierre de Brechas:** Verificación final de que no quedan `TODO`s críticos en `tasks.service.ts`.

---
**¿Deseas que comience con la Fase 1: Blindaje de Seguridad Backend?**
