# flutter_movil

Base inicial de aplicación móvil nativa para Momentus en Flutter.

## Objetivo
Construir una app móvil **real** (iOS/Android) con enfoque:
- UX simple + eficiente + bonita (tema verde enterprise).
- Rendimiento alto.
- Offline-first con SQLite.
- Sincronización diferida con backend NestJS.

## Estructura
- `lib/core`: tema, configuración global.
- `lib/features/tasks`: dominio de tareas, data local/remote, repository, controlador y pantallas.
- `lib/features/sync`: módulo visual para sincronización manual y estado.
- `lib/features/pending`: vista rápida de pendientes.
- `lib/features/settings`: ajustes móviles y preferencias de notificaciones por usuario.
- `docs/BACKEND_REUSE_MAP.md`: mapa para reutilizar backend actual.

## Patrón offline-first implementado
1. Usuario crea/actualiza tarea.
2. Se guarda primero en SQLite (`tasks`).
3. Se encola un evento en `sync_queue`.
4. Cuando hay red, `syncNow()` empuja los eventos al API.
5. Si el push responde OK, se elimina evento de cola y se marca `synced=1`.
6. Si falla, se aumenta `sync_attempts` y se programa `next_retry_at` con backoff exponencial.
7. Lecturas críticas usan cache local por módulo para fallback offline.
8. Auto-sync al volver la app a foreground (resume).

## UX aplicada (rápida y fácil)
- Botón flotante de “Nueva tarea”.
- Formulario corto en modal inferior.
- KPI rápidos (total, pendientes, offline).
- Búsqueda por texto + filtros por estado.
- Chips visuales de estado y sincronización.

## Documentación complementaria
- Benchmark de apps similares (Todoist, TickTick, Notion, Linear, Asana):
  `manuales/BENCHMARK_APPS_MOVILES_PRODUCTIVIDAD.md`.
- Plan detallado de implementación móvil (sin admin):
  `flutter_movil/docs/PLAN_TRABAJO_MOVIL_DETALLADO.md`.
- Mapa funcional web->móvil por módulo:
  `flutter_movil/docs/MAPA_FUNCIONAL_WEB_A_MOVIL.md`.
- Estado real de implementación móvil:
  `flutter_movil/docs/ESTADO_IMPLEMENTACION_MOVIL.md`.
- Handoff para ejecutar y depurar en local con Gemini 3:
  `flutter_movil/docs/HANDOFF_LOCAL_GEMINI3.md`.
- Estadísticas técnicas actuales del proyecto móvil:
  `flutter_movil/docs/PROJECT_STATS.md`.
- Revisión general + plan de trabajo siguiente:
  `flutter_movil/docs/REVISION_GENERAL_Y_PLAN_SIGUIENTE.md`.
- Checklist final para cierre en pruebas locales:
  `flutter_movil/docs/CHECKLIST_FINAL_LOCAL.md`.

## Configuración rápida para pruebas locales
Puedes levantar la app contra tu backend local/remoto sin tocar código usando `--dart-define`:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://10.0.2.2:3000 \
  --dart-define=SYNC_WINDOW_SECONDS=8
```

> En Android Emulator usa `10.0.2.2` para apuntar al host local.
> En dispositivo físico usa la IP LAN de tu máquina (ej: `http://192.168.1.20:3000`).

## Siguientes pasos recomendados
- Agregar autenticación JWT + refresh token + secure storage (Keychain/Keystore).
- Detectar conectividad y disparar sync automática en foreground/background.
- Manejo de conflictos por versión (`updated_at`, `etag`, strategy last-write-wins o merge guiado).
- Conectar FCM/APNs con las preferencias de notificaciones (nuevas asignaciones y recordatorios).
- Agregar pruebas unitarias y de integración por feature.

## Comandos sugeridos
```bash
flutter pub get
flutter run
flutter test
```
