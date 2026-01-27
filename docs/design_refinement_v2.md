# Documento de Diseño: Refinamiento de Tareas y Dashboard (V2.2)

## 1. Objetivo
Ajustar la terminología de la aplicación para mayor claridad y refinar la lógica de visualización de tareas en el Dashboard (Panel de Control) para que el Manager pueda ver tanto las tareas entregadas hoy como las que están por vencer.

## 2. Cambios Realizados en UI (Frontend)

### A. Terminología "Hoy" (`CheckinForm.tsx` y `ActivePlanView.tsx`)
- Se eliminó el término **"Foco"**.
- **"Objetivo Principal"** → renombrado a **"Tarea Principal"**.
- **"Victorias Rápidas"** → renombrado a **"Tarea Rápidas"**.
- Se actualizó el título del resumen diario de "Tu Plan de Hoy" a **"Mi Tarea Principal"**.

### B. Dashboard de Gestión (`DashboardManager.tsx`)
1. **Pestaña: Revisión de Tareas (Individual)**
   - **Tabla "Entregas de Hoy"**: 
     - Filtro: Tareas SIN proyecto.
     - Lógica: Muestra tareas que vencen hoy o que fueron terminadas hoy.
   - **Tabla "Tareas Individuales Atrasadas"**: 
     - Filtro: Tareas SIN proyecto con fecha vencida y no completadas.

2. **Pestaña: Tareas Proyecto (Estratégico)**
   - **Tabla "Entregas de Hoy (Proyecto)"**: 
     - Filtro: Tareas CON proyecto.
     - Lógica: Muestra tareas que vencen hoy (según campo `fechaObjetivo`) o que fueron terminadas hoy (según campo `fechaCompletado`).
   - **Tabla "Tareas Atrasadas Proyectos"**: 
     - Filtro: Tareas CON proyecto vencidas.

## 3. Cambios en Backend (`planning.repo.ts`)

### Lógica de Alertas (Query `obtenerTareasCriticas`)
Se modificó la cláusula `WHERE` para incluir resultados en tiempo real de lo que se está completando:
- **Antes**: Solo traía tareas pendientes con fecha vencida o de hoy.
- **Actualización**: 
  - Incluye tareas **Pendientes/En Curso** cuya fecha de objetivo es <= Hoy.
  - **NUEVO**: Incluye tareas **Hechas/Completadas** cuya fecha de finalización real (`fechaCompletado`) sea exactamente el día de Hoy.
- Se agregó el campo `t.fechaCompletado` al SELECT para que el frontend pueda discriminar si la tarea es una entrega del día.

## 4. Ejemplo de Implementación: Tarea "test1"
- La tarea "test1" (sin proyecto) aparecerá en el dashboard en la columna **"Entregas de Hoy"** dentro de la pestaña **"Revisión de Tareas"**.
- Si el usuario la marca como terminada, seguirá apareciendo en esa columna durante el día de hoy como una "victoria" o entrega realizada, en lugar de desaparecer inmediatamente.
