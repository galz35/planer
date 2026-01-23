# Proyecto Clarity - Métricas, Jobs y Roadmap

## 1. Métricas y KPIs (Definiciones)

### Participación
- **Participación diaria (%)** = (Personas que reportaron) / (Activos del equipo).
- **Meta:** >90% antes de las 10:00 AM.
asdsa
### Flujo de Trabajo (WIP & Throughput)
- **WIP (Work In Progress):** Tareas en estado `EnCurso` + `Bloqueadas`.
- **Riesgo Saturación:** WIP/persona > 3.
- **Throughput:** Tareas `Hechas` por día/semana.
- **Tendencia:** Comparativa vs semana anterior.

### Bloqueos (Aging)
- **Aging de bloqueos** = `Ahora` − `FechaCreacion`.
- **Top Bloqueos:** Ordenados por antigüedad.
- **Riesgo Crítico:** Bloqueos > 48h.

### Calidad / Ciclo
- **Tiempo de ciclo** = `FechaHecha` − `FechaEnCurso` (por tarea).
- **Estancamiento:** Tareas `EnCurso` sin actualización > 3 días.

## 2. Reportes para Gerencia

### Dashboard Hoy (Rollup)
- Entregables Top (Key Achievements).
- Top Bloqueos (Cuellos de botella).
- % Participación Global.

### Análisis de Riesgos
- **Bloqueos Envejecidos:** Top 10 por antigüedad + “cuántas personas dependen de esto”.
- **Saturación:** Equipos con WIP muy alto.

### Históricos
- Throughput semanal por proyecto.
- Tiempo de ciclo promedio (detectar fases lentas: Revisión vs Desarrollo).

## 3. Jobs Automáticos (Scheduler)

Para que el sistema sea proactivo (Server-Side):

1.  **Recordatorio Check-in (Push):**
    - A usuarios que no han reportado a las 10:00 AM.
2.  **Escalamiento de Bloqueos:**
    - **24h:** Notificación al Jefe directo.
    - **48h:** Notificación al Gerente (Riesgo).
3.  **Revalidación de Tareas Estancadas:**
    - Tareas `EnCurso` sin update > 3 días → Marcar flag “Revalidar” para el próximo Check-in.
4.  **Digest Diario (Opcional):**
    - Resumen al final del día por email/telegram a líderes.

## 4. Roadmap de Entrega

### MVP (Lo mínimo viable)
*Meta: Que cambie la cultura desde el día 1.*
- “Mi Día” + “Mis Pendientes”.
- Tareas simples (Crear/Editar) + Asignación.
- Bloqueos con dueño (Espero a X).
- Panel Jefe (Semáforo Equipo Hoy).
- Push Reminders básicos.

### V1 (Optimización y Automatización)
- Dependencias entre tareas (Bloqueo automático si A depende de B).
- Escalamiento automático de bloqueos (Jobs).
- Reportes completos (Gráficos históricos).
- Integración Auth (SSO / Active Directory).

### V2 (Expansión Conversacional: "Momentus Bot")
*Meta: Llevar la productividad a donde ya está el usuario (WhatsApp/Telegram).*

1.  **Funcionalidad "Magic Input" (Ingesta Rápida):**
    - El usuario reenvía un audio o mensaje de texto al Bot.
    - El sistema procesa el texto y crea una **Tarea Pendiente** automáticamente en el Inbox.
    - *Valor:* Capturar ideas o compromisos al vuelo sin abrir la Web App.

2.  **"Daily Briefing" Inteligente (Push):**
    - **8:00 AM:** El bot envía un resumen compacto:
        > "👋 Buenos días. Tienes **3 tareas clave** para hoy.
        > ⚠️ **Atención:** Juan sigue bloqueando tu tarea 'Reporte Q3'.
        > ¿Quieres enviarle un recordatorio? (Sí/No)"

3.  **Comando SOS (Reporte de Bloqueo Express):**
    - El usuario escribe: `/bloqueo No tengo acceso al servidor`.
    - El sistema registra el bloqueo inmediatamente y notifica al responsable.
    - *Valor:* Reducción de fricción para reportar problemas críticos.

4.  **Consulta de Estatus (Para Gerentes):**
    - Comando: `/resumen ventas`
    - Respuesta: "El equipo de Ventas tiene un **ánimo promedio de 2.8/3** 🙂 y **0 bloqueos críticos** hoy."
