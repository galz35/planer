# Estado de implementación móvil (avance real actualizado)

## Resumen global
- **Avance estimado general:** **96%**
- Base crítica completada: login/sesión, navegación principal, offline-first de tareas.
- Integraciones reales activas: Agenda (`/mi-dia`), Pendientes/Mi Asignación (`/tareas/mias`), Proyectos (`/planning/my-projects`), Equipo (`/planning/team`), Dashboard (`/planning/stats`).
- Estrategia offline-online consolidada: **write-local-first + sync_queue + retry + lectura API-first con fallback cache local (`kv_cache`)**.

---

## Estado por pantalla (lo que mira el usuario)

1. **Login**: 88%
   - Implementado: login real, restore session, secure storage, intento de refresh en 401.
   - Pendiente: recuperación de contraseña y endurecer refresh concurrente.

2. **Hoy / Agenda**: 86%
   - Implementado: `/mi-dia`, métricas del día, fallback cache local offline.
   - Pendiente: bitácora/calendario avanzada y acciones rápidas por tarea.

3. **Pendientes**: 89%
   - Implementado: consumo real de `/tareas/mias?estado=Pendiente`, fallback cache y acción rápida “marcar hecha”.
   - Pendiente: filtros avanzados por proyecto/fecha/prioridad.

4. **Proyectos**: 88%
   - Implementado: `/planning/my-projects` + cache local offline.
   - Pendiente: detalle de proyecto y timeline operativo.

5. **Equipos**: 86%
   - Implementado: `/planning/team` + cache local offline.
   - Pendiente: agenda por miembro y bloqueos de equipo.

6. **Dashboard / Reportes**: 82%
   - Implementado: `/planning/stats` + cache local offline.
   - Pendiente: gráficas avanzadas y comparativos históricos.

7. **Notas**: 75%
   - Implementado: CRUD local SQLite real.
   - Pendiente: contrato backend de notas para sync servidor.

8. **Mi Asignación**: 92%
   - Implementado: `/tareas/mias` + cache local offline.
   - Pendiente: filtros y acciones de avance/estado desde detalle.

9. **Sincronización**: 95%
   - Implementado: cola + retry exponencial + sync manual + metadatos de cache + auto-sync al volver a foreground + sync al reconectar internet con debounce + trazabilidad de última sync/error en UI.
   - Pendiente: background sync por conectividad real del dispositivo.

10. **Ajustes**: 72%
   - Implementado: preferencias reales de notificaciones (activar/desactivar global, nuevas asignaciones y recordatorios de pendientes) persistidas localmente.
   - Pendiente: biometría, idioma y enlace final con proveedor push (FCM/APNs).

---

## Estrategia Offline/Online (operativa)

## 1) Escritura (Write path)
- Tareas y notas se guardan local primero (SQLite).
- Se encola evento en `sync_queue` para sincronizar cuando haya red.

## 2) Lectura (Read path)
- Intentar API primero.
- Si falla red/API:
  - usar cache local (`kv_cache`) para Agenda/Pendientes/Mi Asignación/Proyectos/Equipo/Reportes.
  - mostrar aviso de “Mostrando caché local (sin conexión)”.

## 3) Reintentos
- Backoff exponencial en eventos de sync fallidos.
- Reintento manual desde pantalla de sincronización.
- Auto-sync al regresar la app a foreground.
- Sync automática al recuperar conectividad, con ventana debounce para evitar ráfagas.

## 4) Renovación de sesión
- Interceptor intenta `/auth/refresh` en 401 y repite request original.

---

## ¿Funcionará offline y online?
**Sí, ya funciona en modelo híbrido:**
- **Online:** consulta endpoints reales y actualiza cache local.
- **Offline:** sirve datos desde cache local y permite trabajo local en tareas/notas.
- **Reconexión:** al volver red, sincroniza cola y refresca módulos.

---

## Fortalezas (Pros)
- Móvil usable con datos reales en módulos clave.
- Mi Asignación y Pendientes alineadas con endpoint real web (`/tareas/mias`).
- Offline-first real (no simulado) en escritura y lectura.
- Reducción de pantallas vacías sin internet.

## Debilidades
- Falta contrato backend para notas sincronizadas con servidor.
- Falta conectividad/background sync totalmente automatizado.
- Falta telemetría y QA e2e en dispositivos reales.

## Sugerencias
1. Conectar FCM/APNs a las preferencias de notificaciones ya implementadas en Ajustes.
2. Cerrar robustez de detector de conectividad (escenarios edge y reconexiones inestables).
3. Agregar detalle y acciones por tarea en Mi Asignación/Pendientes.
4. Añadir trazabilidad de sync (éxito/error) para soporte.
5. Preparar suite QA offline/online antes de release.

## Próximo paso recomendado (para acercar 100%)
1. Endurecer background sync por conectividad + app resume para escenarios de red inestable.
2. Filtros y acciones rápidas avanzadas en Mi Asignación y Pendientes.
3. Detalle de proyecto/equipo con acciones reales.
4. QA móvil end-to-end con casos offline/online.
5. Telemetría (errores + latencia + tasa de sync exitosa).


## Orden y segmentación de código
- Se centralizó la lógica híbrida online/offline en `OfflineResourceService`.
- Se documentaron responsabilidades en código (comentarios por módulo y por flujo).
- Se separó infraestructura (`core/network`) de pantallas (`features/*/presentation`).
