# Plan de Impacto Móvil: "Productividad Instantánea"

**Objetivo:** Transformar la app móvil de un "visor" a una herramienta de **acción rápida** que supere a la experiencia web en inmediatez y conexión.

## 1. El Factor "WOW" (Velocidad y Fluidez)

El usuario debe sentir que la app vuela. No más pantallas blancas o spinners infinitos.

*   **Acción 1.1: Skeleton Loaders (Esqueletos de Carga)**
    *   *Problema:* Los spinners son aburridos y hacen sentir la app lenta.
    *   *Solución:* Implementar efectos "Shimmer" (brillo) sobre estructuras grises que imitan la lista final mientras carga.
    *   *Impacto:* Percepción de carga instantánea.

*   **Acción 1.2: Optimización "Offline-First" Real**
    *   *Estrategia:* Al abrir la app, mostrar INMEDIATAMENTE último contenido guardado en base de datos local (SQLite/Isar) mientras se actualiza en segundo plano.
    *   *Resultado:* La app siempre abre con datos, incluso en "Modo Avión" o con mala señal en campo.

*   **Acción 1.3: Prefetching Inteligente**
    *   *Lógica:* Mientras el usuario lee su "Agenda", la app pre-descarga silenciosamente la pantalla de "Pendientes" y "Proyectos".
    *   *Resultado:* Navegación instantánea (cero espera) al cambiar de tabs.

## 2. "Me Notifica": Conexión en Tiempo Real

La app debe ser el asistente personal que te avisa de lo importante *antes* de que entres a revisar.

*   **Acción 2.1: Integración Profunda de FCM (Firebase Cloud Messaging)**
    *   *Backend:* Asegurar que eventos de negocio (Asignar tarea, Comentario, Nuevo Bloqueo) disparen notificaciones a los Tokens FCM del usuario.
    *   *Móvil:* Manejar notificaciones en 3 estados:
        1.  **Foreground:** Mostrar SnackBar elegante ("Juan te asignó: Tarea X").
        2.  **Background:** Notificación de sistema estándar.
        3.  **Terminated:** Abrir la app directamente en el detalle de la tarea notificada (Deep Linking).

*   **Acción 2.2: Categorías de Notificación Activa**
    *   🔴 **Urgente:** "Te han bloqueado en Proyecto X" (Sonido/Vibración fuerte).
    *   🟡 **Relevante:** "Nueva tarea asignada para hoy".
    *   🔵 **Informativo:** "Alguien comentó en tu tarea".

## 3. "Hacer mi Tarea y Asignar": Gestión Completa

La app móvil no es solo para ver, es para **mandar y ejecutar**.

*   **Acción 3.1: Botón de Acción Flotante (FAB) Universal**
    *   Implementar un botón `+` persistente con menú rápido:
        *   📝 Nueva Tarea
        *   🚫 Reportar Bloqueo
        *   🗒️ Nota Rápida

*   **Acción 3.2: Modal de Creación Rápida ("Quick Task")**
    *   Formulario simplificado: "Título", "Fecha", "Responsable".
    *   Permitir asignar tareas a **otros usuarios** (desplegable de equipo) directamente desde el móvil.

*   **Acción 3.3: Task Detail Interactivo**
    *   Convertir la pantalla de detalle en un centro de comando:
        *   **Chat de Tarea:** Ver y enviar comentarios tipo chat (WhatsApp style).
        *   **Cambio de Estado:** Slider deslizable para completar ("Desliza para terminar").
        *   **Subida de Evidencia:** Tomar foto con la cámara y adjuntarla a la tarea en un clic.

## Hoja de Ruta Sugerida (Roadmap)

| Fase | Duración Est. | Entregable Clave |
| :--- | :--- | :--- |
| **Fase 1 (Actual)** | Completada | Diseño Premium + Lectura de Agenda (`/mi-dia`). |
| **Fase 2 (Esta semana)** | 3 Días | **Interacción**: Quick Create Modal + Asignación de Usuarios + Marcar Hecha. |
| **Fase 3 (Próxima)** | 3 Días | **Notificaciones**: FCM Full Integration + Deep Linking. |
| **Fase 4 (Final)** | 2 Días | **Velocidad**: Skeletons, Cache agresiva y Modo Offline robusto. |

---

**Nota Técnica:** Para implementar la "Asignación", necesitaremos habilitar el endpoint `/users/list` en la app móvil (con caché) para llenar el selector de responsables sin latencia.
