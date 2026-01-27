# Designer: Plan de Implementación - Corrección de Creación y Lógica "Mi Día"

Este documento detalla los pasos técnicos para asegurar que el carnet del creador se guarde correctamente al crear tareas y explica la lógica de clasificación de tareas en la vista "Hoy".

## 🛠️ Parte 1: Corrección de Carnet en Creación de Tareas
**Problema:** Al crear una tarea desde la vista "Hoy", se guarda el `idUsuario` pero no el `carnet` en la tabla `p_Tareas`.

### Checklist de Implementación:

- [ ] **1. Actualizar Interfaz del Repositorio (`tasks.repo.ts`)**
  - Agregar `creadorCarnet?: string` a la interfaz `CreateTaskParams`.
  
- [ ] **2. Modificar Llamada al SP en Repositorio (`tasks.repo.ts`)**
  - Actualizar la función `crearTarea` para enviar el parámetro `@creadorCarnet` al Store Procedure `sp_Tarea_CrearCompleta_v2`.
  - Nota: Si el SP no tiene ese parámetro, se deberá agregar un `UPATE` posterior o validar el SP.
  
- [ ] **3. Resolver Carnet en Capa de Servicio (`tasks.service.ts`)**
  - En `tareaCrearRapida`, obtener el carnet mediante `visibilidadService.obtenerCarnetPorId(idUsuario)`.
  - Pasar el carnet resuelto a la llamada `tasksRepo.crearTarea`.

- [ ] **4. Verificación de Auditoría**
  - Asegurar que el log de auditoría (`auditService.log`) use el carnet correcto si es necesario.

---

## 🔍 Parte 2: Lógica de Clasificación en "Mi Día" (Hoy)
**Pregunta:** ¿Qué consulta decide si una tarea es "Tarea Principal", "Para Avanzar" o "Tarea Rápida"?

### Checklist de Entendimiento:

- [ ] **1. Identificar el Origen de Datos (Backend)**
  - La consulta principal ocurre en `clarityRepo.obtenerCheckinPorFecha(carnet, fecha)`.
  - Se consulta la tabla principal `p_Checkins` para obtener el ID del plan del día.

- [ ] **2. Consulta de Clasificación (`p_CheckinTareas`)**
  - Se ejecuta un `SELECT` sobre la tabla relacional `p_CheckinTareas`:
    ```sql
    SELECT ct.idTarea, ct.tipo, t.nombre as titulo, t.estado
    FROM p_CheckinTareas ct
    JOIN p_Tareas t ON ct.idTarea = t.idTarea
    WHERE ct.idCheckin = @idCheckin
    ```
  - **El campo clave es `ct.tipo`**:
    *   Si `tipo = 'Entrego'` → Aparece en **Tarea Principal** (Color Rojo/Rosa).
    *   Si `tipo = 'Avanzo'` → Aparece en **Para Avanzar** (Color Azul).
    *   Si `tipo = 'Extra'` → Aparece en **Tarea Rápidas** (Color Esmeralda).

- [ ] **3. Filtrado de "Nuevas Tareas" disponibles**
  - Las tareas que "son mías" pero aún no están en el plan se obtienen mediante `sp_Tareas_ObtenerPorUsuario`.
  - Solo se muestran aquellas cuyo `estado` no sea 'Hecha' (a menos que sean de hoy) y que estén asignadas a tu carnet.

---

## ✅ Próximos Pasos Inmediatos
1. Aplicar cambios en `tasks.repo.ts`.
2. Aplicar cambios en `tasks.service.ts`.
3. Validar creación de tarea "test" y verificar campo `creadorCarnet` en la base de datos.
