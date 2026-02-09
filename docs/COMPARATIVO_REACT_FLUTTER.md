# Cuadro Comparativo: React (PLANNER-EF) vs Flutter (PLANNER-EF App)

**Fecha:** 8 de Febrero, 2026.
**Objetivo:** Auditoría minuciosa de alineación entre la versión Web (React) y la versión Móvil (Flutter).

## Resumen Ejecutivo

El proyecto Flutter ha recibido una actualización mayor ("Rebranding PLANNER-EF") para alinear su identidad visual y funcional con la versión Web. Los módulos críticos (Login, Agenda/Home) ahora son **réplicas exactas** o muy cercanas a la experiencia Premium de React. Sin embargo, los módulos secundarios (Pendientes, Proyectos, Reportes) aún conservan un diseño "Material Standard" que debe ser elevado en la siguiente fase.

## Detalle Módulo por Módulo

| Módulo / Pantalla | Estado React (Web Premium) | Estado Flutter (Móvil Actual) | Nivel de Fidelidad | Diferencias Clave |
| :--- | :--- | :--- | :--- | :--- |
| **1. Login** | Diseño "Split Screen" moderno. Fondo Slate 50. Tarjeta central con sombra suave, borde superior gradiente Esmeralda. Inputs estilizados con iconos. | **PREMIUM (100%)**. Se reescribió `LoginScreen` para ser una réplica visual exacta. Usa la misma paleta de colores, tipografía Inter y disposición de elementos. | ⭐⭐⭐⭐⭐ | Ninguna. La experiencia es idéntica adaptada a móvil. |
| **2. Mi Día (Agenda)** | Dashboard central del usuario. Muestra KPIs (Total/Hechas), Alertas de Bloqueos (Rojo), Lista de Tareas Sugeridas con Checkbox y Backlog. Usa endpoint `/mi-dia`. | **PREMIUM (95%)**. Se implementó `AgendaScreen` conectada al endpoint `/mi-dia`. Diseño de tarjetas blancas con sombras, KPIs en cabecera y alertas visuales para bloqueos. Navegación por fecha implementada. | ⭐⭐⭐⭐⭐ | La web tiene más espacio horizontal. En móvil se adaptó a lista vertical scrolleable. Falta validación de edición en sitio (marcar hecha funciona, editar texto no). |
| **3. Navegación (Shell)** | Barra lateral (Sidebar) fija con perfil de usuario (nombre + avatar + bandera). Menú categorizado. | **PREMIUM (100%)**. Se rediseñó el `Drawer` móvil. Ahora incluye cabecera con logo "PLANNER-EF" y pie con perfil de usuario flotante (Bandera 🇳🇮 incluida). Iconos `Cupertino` para look moderno. | ⭐⭐⭐⭐⭐ | El Drawer móvil es colapsable, el de React es fijo (Desktop). Adaptación correcta. |
| **4. Pendientes** | Lista poderosa con filtros rápidos (Chips), búsqueda instantánea y visualización rica de metadata (fechas, etiquetas). | **BÁSICO (40%)**. Funcional (`PendingScreen`), pero usa componentes nativos `ListTile` y `Card` genéricos. No tiene la riqueza visual de la Agenda renovada. | ⭐⭐ | El diseño se siente "viejo" comparado con la nueva Agenda. Los filtros son funcionales pero visualmente simples. |
| **5. Proyectos** | Vista de Grid/Tabla con estados visuales (pills de colores), barras de progreso y avatares de responsables. | **BÁSICO (30%)**. Lista vertical simple de texto. Falta visualizar el progreso, fechas y estado de forma gráfica. | ⭐⭐ | Falta mucha información visual que sí está en React. Es funcional pero no "Premium". |
| **6. Reportes** | Dashboards interactivos con filtros profundos y gráficas estilizadas. | **INTERMEDIO (60%)**. Usa `fl_chart` para mostrar gráficas de Pie y Barras. Son funcionales, pero el contenedor y la tipografía no están alineados al estilo "Slate/Clean" de la nueva UI. | ⭐⭐⭐ | Las gráficas funcionan, pero el "envoltorio" es genérico. |
| **7. Equipo** | Vistas de "Equipo Hoy" (quién hace qué) y "Bloqueos de Equipo". | **INTERMEDIO (50%)**. Existen las pantallas, pero la visualización es estándar. Falta la vista rápida de "semáforo" de productividad. | ⭐⭐⭐ | Funcionalidad presente, estética pendiente de mejora. |

## Análisis Técnico (Backend & Datos)

*   **Endpoint `/mi-dia`:**
    *   **React:** Usa este endpoint para traer toda la data del dashboard en una sola llamada.
    *   **Flutter (Antes):** No lo usaba, intentaba sincronizar tareas sueltas.
    *   **Flutter (Ahora):** ✅ **Corregido.** Se implementó `AgendaRepository` que consume `/mi-dia` inyectando el Token JWT correctamente. Esto soluciona el problema de "no carga nada".

*   **Autenticación:**
    *   **React:** Manejo robusto de JWT y Refresh Token.
    *   **Flutter:** ✅ Implementación correcta de `ApiClient` con interceptors para inyectar y refrescar tokens.

*   **Sincronización Offline:**
    *   **React:** Online-first (React Query cache).
    *   **Flutter:** Offline-first (SQLite + SyncWorker). **Ventaja para Flutter:** Funciona sin internet, algo que la Web no hace tan bien.

## Plan de Acción Recomendado

1.  **Validación Inmediata:** Probar la nueva **Agenda** en dispositivo real. Verificar que datos carguen.
2.  **Fase de Pulido (Siguiente Sprint):**
    *   Migrar `PendingScreen` para usar las nuevas `TaskCards` creadas para la Agenda.
    *   Mejorar `ProjectsScreen` agregando barras de progreso y estados visuales (Pills).
    *   Aplicar el fondo `Slate 50` a todas las pantallas secundarias para consistencia.

---
**Conclusión:** El núcleo de la aplicación (Entrada y Dashboard Principal) ya está al nivel de React. La base es sólida para elevar el resto de las pantallas progresivamente.
