# Designer: Alternativas de Sincronización - Dashboard vs Mi Día

Este documento presenta 3 alternativas para resolver el problema de visibilidad de las tareas en el Dashboard sin alterar la estructura actual ni romper el flujo de datos reales.

## 1. El Problema (Resumen)
*   **Dashboard**: Consulta `p_TareaAsignados` para saber de quién es una tarea.
*   **Mi Día**: Al crear una tarea rápida, a veces solo se registra en `p_CheckinTareas` / `p_Checkins`, pero el registro de vinculación oficial (`p_TareaAsignados`) no se genera o no tiene el carnet correcto.
*   **Resultado**: El Manager no ve lo que el usuario está trabajando hoy si la tarea nació en "Mi Día".

---

## 2. Alternativas de Solución

### Alternativa A: Consulta Unificada (La más segura)
En lugar de que el Dashboard solo mire `p_TareaAsignados`, cambiamos la consulta SQL del backend para que busque en **ambas** fuentes. No toca datos, solo cambia cómo lee.

*   **Lógica SQL**:
    ```sql
    SELECT * FROM p_Tareas t
    WHERE idTarea IN (
        SELECT idTarea FROM p_TareaAsignados WHERE carnet IN (@Carnets) -- Fuente 1
        UNION
        SELECT ct.idTarea FROM p_CheckinTareas ct 
        JOIN p_Checkins c ON ct.idCheckin = c.idCheckin 
        WHERE c.usuariocarnet IN (@Carnets) -- Fuente 2 (Plan Diario)
    )
    ```
*   **Pros**: 100% seguro. Si el usuario la puso en su plan, el manager la ve aunque la asignación oficial haya fallado.
*   **Contras**: Requiere actualizar la query en el repositorio.

### Alternativa B: Sincronización por Trigger (Nivel Base de Datos)
Crear un Trigger en la tabla `p_CheckinTareas` que, cada vez que se inserte una tarea en un plan diario, verifique y cree el registro de asignación si falta.

*   **Lógica**: En el `AFTER INSERT`, busca si existe el carnet en `p_TareaAsignados` para esa tarea. Si no, lo inserta.
*   **Pros**: Transparente para el código. Garantiza integridad a nivel de DB.
*   **Contras**: Los Triggers pueden ocultar lógica de negocio, pero resuelven el problema de raíz para cualquier aplicación que use la DB.

### Alternativa C: Overlay en Capa de Servicio (Nivel NestJS)
Modificar `getDashboardAlerts` en el backend para que devuelva la unión de ambos sets de datos combinándolos en memoria (JavaScript).

*   **Lógica**:
    1. Obtener tareas de `planningRepo.obtenerTareasCriticas` (Asignados).
    2. Obtener tareas de los checkins de hoy del equipo.
    3. Mezclarlos usando el `idTarea` como llave única.
*   **Pros**: No toca SQL ni tablas. 
*   **Contras**: Ligeramente más lento por procesar la unión en el servidor de aplicaciones, pero despreciable para equipos normales.

---

## 3. Recomendación
La **Alternativa A (Consulta Unificada)** es la más profesional y eficiente. Permite que el Dashboard sea el "reflejo fiel" de lo que el equipo dice estar haciendo en su día a día, sin obligar a que la tabla de asignación sea perfecta.

---

## Próximo Paso Sugerido
Si estás de acuerdo con la **Alternativa A**, puedo prepararte la Query exacta para que la pruebes en SQL Server antes de que yo haga cualquier cambio en el código.
