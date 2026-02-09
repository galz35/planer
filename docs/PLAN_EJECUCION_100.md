# Plan de Ejecución para el 100% (PLANNER-EF Móvil)

**Objetivo:** Completar la funcionalidad crítica y elevar la experiencia de usuario al nivel "Premium" de la versión Web.

## 🚀 Fase 1: Acción y Productividad (PRIORIDAD ALTA - EJECUCIÓN INMEDIATA)
El usuario necesita **crear** y **asignar**, no solo ver.

*   [ ] **1.1 Botón Universal (+):** Agregar un `FloatingActionButton` en `HomeShell` visible en todas las pantallas principales.
*   [ ] **1.2 Modal de Creación Rápida (`QuickCreateTaskSheet`):**
    *   Diseño limpio (Bottom Sheet).
    *   Campos: Título, Descripción (opcional), Fecha (por defecto Hoy), Responsable.
*   [ ] **1.3 Integración Backend:** Conectar el modal al endpoint `POST /tareas`.

## 🎨 Fase 2: Consistencia Visual "Premium"
Eliminar el rastro de "diseño básico" en pantallas secundarias.

*   [ ] **2.1 Rediseño `PendingScreen`:**
    *   Reemplazar `ListTile` genérico por `TaskCard` (la misma usada en Agenda).
    *   Implementar filtros visuales (Chips estilo "Pill" animados).
    *   Agregar "Skeleton Loader".
*   [ ] **2.2 Rediseño `ProjectsScreen`:**
    *   Crear `ProjectCard` con barra de progreso visual, avatar del líder y estado (pill de color).

## 🔔 Fase 3: Conexión Real (Notificaciones)
Que el usuario se sienta conectado con su equipo.

*   [ ] **3.1 Configuración FCM:** Instalar y configurar `firebase_messaging`.
*   [ ] **3.2 Manejo de Mensajes:** Mostrar notificaciones "In-App" (SnackBar) cuando la app está abierta.
*   [ ] **3.3 Vinculación:** Asegurar que el `device_token` se envía al login.

## 💾 Fase 4: Robustez Offline
Asegurar que lo creado sin internet se suba cuando vuelva la conexión.

*   [ ] **4.1 Cola de Subida:** Verificar que `SyncWorker` reintente las tareas creadas offline (`QuickCreate`).

---
**Estrategia de Ejecución:**
Comenzaremos **YA** con la **Fase 1** (Creación de Tareas), ya que es el "Game Changer" funcional más grande pendiente.
