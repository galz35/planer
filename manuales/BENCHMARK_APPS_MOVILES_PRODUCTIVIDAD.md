# Benchmark de apps móviles similares (enfoque UX simple + rápido)

> Objetivo: tomar patrones de producto que ya demostraron adopción y trasladarlos a Momentus Mobile.

## 1) Todoist (to-do list premium)
### Qué hace bien
- Captura ultra rápida (1-2 taps).
- Navegación limpia y mínima fricción.
- Indicadores visuales simples por prioridad/estado.

### Patrón aplicable a Momentus
- Botón flotante permanente para crear tarea.
- Formularios cortos en modal inferior.
- Estados legibles (pendiente/completada/sin sync) con chips.

## 2) TickTick
### Qué hace bien
- Equilibrio entre simplicidad y funciones avanzadas.
- Vista diaria muy accionable.
- Excelente rendimiento en listas largas.

### Patrón aplicable a Momentus
- Filtros rápidos por estado y búsqueda inmediata.
- KPI superiores de “lo importante hoy”.
- Priorización de pendientes no sincronizadas.

## 3) Notion Mobile
### Qué hace bien
- Arquitectura por bloques flexible.
- UX consistente entre web y móvil.
- Carga progresiva de contenido.

### Patrón aplicable a Momentus
- Diseñar componentes reutilizables (cards, chips, modales).
- Cargar datos por lotes/paginación para no bloquear UI.

## 4) Linear Mobile
### Qué hace bien
- Velocidad percibida altísima.
- Interacciones muy optimizadas y animaciones discretas.
- Flujo de estados de tickets impecable.

### Patrón aplicable a Momentus
- Transiciones cortas.
- Menos pasos para actualizar estado de tareas.
- Feedback inmediato de sincronización.

## 5) Asana Mobile
### Qué hace bien
- Claridad para trabajo en equipo y asignaciones.
- Visibilidad por proyectos y responsables.

### Patrón aplicable a Momentus
- Vista de equipo por bloques simples.
- Separar modo “mi trabajo” y modo “equipo” para evitar ruido.

---

## Recomendación UX consolidada para Momentus Mobile

1. **Captura rápida primero**
   - Crear tarea en menos de 10 segundos.
2. **Navegación de 4 tabs máximo**
   - Inicio, Pendientes, Sync, Ajustes (módulos avanzados por rutas secundarias).
3. **Información densa pero escaneable**
   - Chips de estado y tarjetas compactas.
4. **Offline visible, no oculto**
   - Mostrar siempre cuántos cambios faltan por sincronizar.
5. **Performance sobre adornos**
   - Priorizar listas fluidas, paginación y fetch incremental.

## Métricas objetivo (primer release)
- Crear tarea: < 10s promedio.
- Carga inicial dashboard: < 2.0s en red normal.
- Crash-free sessions: > 99.5%.
- Sincronización exitosa en primer intento: > 90%.
