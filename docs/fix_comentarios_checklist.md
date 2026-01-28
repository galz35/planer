# Plan de Solución: Funcionalidad de Comentarios (Avances)

Este documento detalla el flujo de trabajo para diagnosticar y corregir definitivamente el problema de que los comentarios no se visualizan ni persisten correctamente en la interfaz.

## 1. Diagnóstico y Verificación

Antes de aplicar correcciones, debemos validar el estado actual.

- [ ] **Validar Base de Datos**: Confirmar que la tabla `p_TareaAvances` existe y tiene la estructura correcta.
- [ ] **Validar API Crear**: Verificar que `POST /tareas/:id/avance` inserta el registro en BD y no da error 500.
- [ ] **Validar API Leer**: Verificar que `GET /tareas/:id` retorna el array `avances` con los datos insertados.
- [ ] **Validar Frontend**: Verificar si el frontend recibe los datos y si falla en el mapeo (nombres de propiedades incorrectos).

## 2. Plan de Acción (Backend)

La corrección en Backend asegura que los datos se guarden y se devuelvan formateados correctamente al cliente.

- [ ] **Paso B1: Unificar Repositorio de Lectura**
    - Verificar que el método que retorna la tarea después de guardar (`planningRepo.obtenerTareaPorId` o equivalente) incluya explícitamente la consulta a `p_TareaAvances`.
    - *Riesgo Detectado*: Es posible que `tasks.service` esté llamando a una versión del repo que no tiene el `join/select` de avances.

- [ ] **Paso B2: Retorno Inmediato**
    - Asegurar que al llamar a `registrarAvance`, la respuesta incluya la lista actualizada de comentarios, para evitar tener que hacer una segunda llamada desde el frontend.

## 3. Plan de Acción (Frontend)

La corrección en Frontend asegura que el usuario vea lo que acaba de escribir.

- [ ] **Paso F1: Mapeo de Tipos**
    - Revisar la interfaz `Tarea` en el frontend. Debe tener la propiedad `avances?: TareaAvance[]`.
    - Asegurar que el mapeo en `PlanTrabajoPage.tsx` coincida: `idLog` vs `id`, `fecha` vs `timestamp`.

- [ ] **Paso F2: Actualización Optimista (opcional) o Reactiva**
    - Corregir `handleAddComment` para que use la respuesta del servidor en lugar de recargar toda la tarea, o asegurar que la recarga de la tarea trae los datos nuevos.

- [ ] **Paso F3: Visibilidad del Botón Eliminar**
    - Verificar lógica `isMine` y la comparación de fechas (UTC vs Local) para que el botón de eliminar aparezca correctamente.

## 4. Checklist de Validación Final

- [ ] Crear una tarea de prueba.
- [ ] Agregar un comentario "Test 1".
- [ ] **Verificación Visual**: El comentario aparece inmediatamente en la lista.
- [ ] **Verificación Persistencia**: Recargar la página (F5) y verificar que el comentario sigue ahí.
- [ ] Agregar un comentario "Test 2".
- [ ] Eliminar "Test 2".
- [ ] Verificar que "Test 2" desapareció y "Test 1" persiste.
