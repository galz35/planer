# 📱 Mobile Design Review - Flutter App (Momentus Mobile)

**Fecha:** Febrero 2026  
**Revisión:** Análisis estático de código (sin ejecución visual)  
**Archivos revisados:** 10 pantallas principales + componentes auxiliares

---

## 📊 Resumen Ejecutivo

| Categoría | Críticos 🔴 | Medios 🟡 | Menores 🟢 |
|---|---|---|---|
| Layout / Overflow | 3 | 2 | 1 |
| Touch Targets | 1 | 3 | 0 |
| Texto / Tipografía | 0 | 3 | 2 |
| Responsividad | 2 | 2 | 0 |
| UX / Usabilidad | 1 | 4 | 2 |
| Rendimiento | 1 | 2 | 0 |
| **Total** | **8** | **16** | **5** |

---

## 🔴 Problemas CRÍTICOS (RESUELTOS ✅)

### 1. `QuickCreateTaskSheet` — Overflow en pantallas pequeñas
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se cambió `Container` por `DraggableScrollableSheet` con `initialChildSize: 0.9` y se agregó padding inferior para el teclado. Los chips ahora usan `AnimatedContainer`.

---

### 2. `_PlanningView` — Scaffold anidado con FAB doble
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se eliminó el `Scaffold` anidado y se reemplazó por un `Stack`. El FAB ahora se posiciona manualmente con `Positioned` en la esquina inferior derecha.

---

### 3. `_ExecutionView` — `SingleChildScrollView` sin `SafeArea` inferior
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se agregó `MediaQuery.of(context).padding.bottom` al padding inferior del scroll view.

---

### 4. `ProjectDetailScreen` — Estadísticas overflow en pantallas estrechas
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se reemplazó el ancho fijo de 80px por `Expanded` en cada tarjeta de estadística dentro del `Row`.

---

### 5. `TeamScreen` — `RefreshIndicator` envuelve un `Column` (no scrollable)
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se reestructuró el árbol de widgets para que `RefreshIndicator` sea padre directo del `ListView` dentro del `Expanded`, manteniendo el banner de caché fijo arriba.

---

### 6. `ReportsScreen` — `GridView` con `childAspectRatio` fijo
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se ajustó el `childAspectRatio` a `1.3` para dar más espacio vertical al contenido de las tarjetas.

---

### 7. `TaskDetailSheet` — `_showAssigneeModal` con altura fija de 500
**Estado: CORREGIDO ✅**
**Solución aplicada:** Se cambió la altura fija por `MediaQuery.of(context).size.height * 0.65`.

---

### 8. `PendingScreen` — Sin indicador de carga visible al refrescar
**Archivo:** `pending_screen.dart` L43-48  
**Problema:** `_refresh()` hace `await _load()` y luego `setState`, pero durante la carga, la UI no muestra feedback porque el `FutureBuilder` ya tiene datos previos y no re-entra al estado `ConnectionState.waiting`.

**Impacto:** El usuario no sabe si la acción de refrescar tuvo efecto (salvo por el `RefreshIndicator` que desaparece rápido).

---

## 🟡 Problemas MEDIOS (Importante mejorar)

### 9. Touch targets demasiado pequeños
| Ubicación | Elemento | Tamaño actual | Mínimo recomendado |
|---|---|---|---|
| `agenda_screen.dart` L884-898 | Botón "X" en SlotCard | 26x26 (padding 6 + icon 14) | 48x48 |
| `agenda_screen.dart` L1006-1007 | Icono "+" en SuggestionChip | 18x18 | 48x48 |
| `task_detail_sheet.dart` L894 | Icono "Editar" en AssigneeSelector | 16x16 | 44x44 |
| `project_detail_screen.dart` L292-310 | Toggle List/Gantt | 32x20 + 12px padding | 44x44 |

**Estándar:** Material Design recomienda touch targets de **mínimo 48x48 dp**.

---

### 10. `ProjectsScreen` — Cards demasiado densas
**Archivo:** `projects_screen.dart` L260-517  
**Problema:** Cada tarjeta de proyecto contiene: icono + nombre + porcentaje + badge atraso + breadcrumbs jerarquía + descripción + barra de progreso + grid CREADOR/RESPONSABLE + tipo + fechas. **Esto es excesivo para una vista de lista móvil.**

**Recomendación:** 
- Mover detalles secundarios (CREADOR, RESPONSABLE, tipo, fechas) a una vista expandible o al detalle
- Mantener en la card: nombre, progreso, estado, área
- Reduce la densidad de información para mejorar escaneabilidad

---

### 11. `LoginScreen` — No maneja `SafeArea` correctamente
**Archivo:** `login_screen.dart` L30-40  
**Problema:** El `Scaffold` no envuelve el contenido en `SafeArea`. En dispositivos con notch o Dynamic Island, el header móvil puede quedar parcialmente oculto.

---

### 12. Texto clipped en fechas del ProjectDetail
**Archivo:** `project_detail_screen.dart` L501-509  
**Problema:** El rango de fechas `$fechaInicio - $fechaFin` se muestra en una sola línea (font-size 10). Con fechas largas como "2025-01-15 - 2025-12-31", el texto puede quedar recortado en pantallas estrechas.

---

### 13. `AgendaScreen` — TabBar con emojis inconsistentes
**Archivo:** `agenda_screen.dart` L375-418  
**Problema menor de UX:** Los tabs usan emojis (🎯, ⏰) que pueden renderizarse diferente según el dispositivo Android. Considerar usar `Icon` de Material en su lugar para consistencia visual.

---

### 14. `HomeShell` — NavigationBar con 5 items
**Archivo:** `home_shell.dart`  
**Problema:** El `NavigationBar` inferior tiene 5 pestañas (Agenda, Pendientes, Proyectos, Equipo, Reportes). Mientras esto es técnicamente funcional, en pantallas estrechas los labels pueden truncarse. 

**Recomendación:** Evaluar si "Reportes" debería moverse al Drawer para reducir a 4 items, que es el número óptimo para navegación inferior según Material Design guidelines.

---

### 15. `_buildChipRow` en QuickCreateTask — Chips sin feedback visual
**Archivo:** `quick_create_task_sheet.dart` L549-599  
**Problema:** Los chips de Prioridad y Esfuerzo usan `InkWell` pero NO tienen `splashColor` ni animación de selección. El cambio de estado es abrupto (sin transición).

**Solución:** Agregar `AnimatedContainer` con `duration: Duration(milliseconds: 200)`.

---

### 16. Colores inconsistentes entre pantallas
| Pantalla | Color de acción principal |
|---|---|
| Agenda | `MomentusTheme.primary` (Rojo) |
| Pendientes | `MomentusTheme.primary` (Rojo) |
| Proyectos | `Color(0xFF059669)` (Verde Emerald) |
| Equipo | `Color(0xFF6366F1)` (Indigo) |
| Reportes | `MomentusTheme.primary` (Rojo) |
| QuickCreate | `Color(0xFF059669)` (Verde) |

**Problema:** La falta de un color de acción consistente puede confundir al usuario sobre qué elementos son interactivos.

---

## 🟢 Problemas MENORES (Mejoras opcionales)

### 17. Sin animaciones de transición entre tabs
El `IndexedStack` en `HomeShell` cambia de pantalla sin transición. Agregar un `AnimatedSwitcher` mejoraría la percepción de fluidez.

### 18. Skeleton loading inconsistente
`PendingScreen` y `ProjectsScreen` tienen skeleton loading, pero `TeamScreen`, `ReportsScreen` y `AgendaScreen` usan `CircularProgressIndicator` genérico. Estandarizar con skeleton placeholders en todas las pantallas.

### 19. Formato de fechas inconsistente
- `ProjectDetailScreen`: `d/M` (ej: "15/1")
- `PendingScreen`: `d/M` (ej: "15/1")  
- `AgendaScreen`: `d MMM` (ej: "15 ene")
- `TaskDetailSheet`: `d MMM yyyy` (ej: "15 ene 2025")

Recomendación: Estandarizar a un formato a lo largo de toda la app.

### 20. `DropdownButton` estilo por defecto en QuickCreateTask
El `DropdownButton` de "Tipo" (L208-233) usa el estilo de Material clásico sin personalización. Esto rompe la consistencia visual con el resto de los inputs que usan border radius 12 y estilo slate.

### 21. Sin soporte para modo oscuro
Todos los colores están hardcodeados. `MomentusTheme` solo define tema claro. Considerar agregar soporte de Dark Mode a futuro.

---

## 🏗️ Mejoras Arquitectónicas Recomendadas

### A. Centralizar estilos de Input
Múltiples archivos definen `_inputDecoration()` con variaciones mínimas. Mover a `MomentusTheme` como método estático:
```dart
static InputDecoration inputDecoration({
  required String hint,
  IconData? prefixIcon,
  Widget? suffix,
}) { ... }
```

### B. Extraer componentes reutilizables
Los siguientes patrones se repiten en 3+ archivos:
- **Panel decoration** (`BoxDecoration` con `slate50` fill + `slate200` border + `radius 20`)
- **Section header** (`Text` con fontSize 10, w900, slate400, letterSpacing 1.2)
- **Skeleton item** (containers con `F1F5F9` color y border radius 8)
- **Error state** (icon + message + retry button)
- **Empty state** (icon + message)

### C. Normalizar manejo de datos con Mapas vs Modelos
`PendingScreen`, `ProjectsScreen` y `TeamScreen` trabajan con `Map<String, dynamic>` directamente, mientras que `AgendaScreen` usa modelos (`Tarea`, `Checkin`). Esto causa:
- Código defensivo excesivo (`task['titulo'] ?? task['nombre'] ?? 'Sin título'`)
- Riesgo de null pointer en keys incorrectas
- Difícil mantenimiento

**Recomendación:** Crear modelos Dart para todas las entidades.

---

## 📋 Plan de Corrección Priorizado

| # | Corrección | Complejidad | Impacto |
|---|---|---|---|
| 1 | Fix QuickCreateTaskSheet overflow (usar DraggableScrollableSheet) | Baja | 🔴 Alto |
| 2 | Fix SafeArea en ExecutionView | Baja | 🔴 Alto |
| 3 | Fix ProjectDetail stat items width fijo → Expanded | Baja | 🔴 Alto |
| 4 | Fix TeamScreen RefreshIndicator structure | Media | 🔴 Alto |
| 5 | Fix AssigneeModal height fija → relativa | Baja | 🔴 Alto |
| 6 | Aumentar touch targets (SlotCard X, SuggestionChip +) | Baja | 🟡 Medio |
| 7 | Simplificar ProjectCard (mover detalles a expandible) | Media | 🟡 Medio |
| 8 | Fix ReportsScreen GridView aspect ratio | Media | 🟡 Medio |
| 9 | Estandarizar formato de fechas | Baja | 🟢 Bajo |
| 10 | Agregar skeleton loading a todas las pantallas | Media | 🟢 Bajo |
| 11 | Extraer componentes reutilizables | Alta | 🟢 Bajo |
| 12 | Soporte Dark Mode | Alta | 🟢 Bajo |

---

*Revisión realizada por análisis estático de código. Se recomienda validar visualmente en un dispositivo físico o emulador con las resoluciones: 360x640 (pequeño), 393x852 (estándar), 428x926 (grande).*
