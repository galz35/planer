# 📋 PLAN DE IMPLEMENTACIÓN: Tablero de Seguimiento de Agenda Diaria

**Fecha:** 06 de Febrero, 2026  
**Objetivo:** Crear una vista de supervisión para que los líderes visualicen en tiempo real qué miembros de su equipo han realizado su "Planeación del Día" (Check-in) y quiénes faltan.

---

## 1. 🎨 Propuesta de Diseño (UX/UI)

El diseño será **limpio, visual y enfocado en la acción**. Se integrará como una nueva opción en el menú lateral bajo la sección de "Gestión" o "Equipo".

### **Estructura de la Pantalla**

1.  **Encabezado y Filtros:**
    *   **Título:** "Cumplimiento de Agenda"
    *   **Selector de Fecha:** Por defecto "Hoy", pero permite revisar cumplimiento de días anteriores.
    *   **Botón de Actualizar:** Para refrescar datos en tiempo real.

2.  **Tarjetas de Resumen (KPIs):**
    *   Una fila superior con 3 tarjetas grandes:
        *   🔵 **Total Equipo:** Número total de subordinados directos e indirectos.
        *   🟢 **Completado:** Cuántos ya registraron su agenda (con barra de progreso circular).
        *   🔴 **Pendiente:** Cuántos faltan (alerta visual).

3.  **Listados (Layout Dividido o Pestañas):**

    *   **Sección A: ✅ Completados (Con Agenda)**
        *   Lista de tarjetas compactas.
        *   **Datos:** Foto/Avatar, Nombre, Cargo.
        *   **Hora de Registro:** "Grabado a las 08:15 AM" (Resaltado si fue temprano, amarillo si fue tarde).
        *   **Resumen:** "5 Tareas planeadas".
        *   **Acción:** Botón "Ver Plan" (Abre modal con el detalle).

    *   **Sección B: ⏳ Pendientes (Sin Agenda)**
        *   Lista de usuarios que aún no registran actividad.
        *   **Datos:** Avatar (en escala de grises o con borde rojo), Nombre.
        *   **Acción:** Botón "Notificar/Recordar" (Simulado por ahora, o integrado a WhatsApp/Email).
    
    *   *Detalle Visual:* Los usuarios pendientes aparecerán con un estilo de "fantasmas" o deshabilitados para denotar inactividad.

---

## 2. 🛠️ Arquitectura Técnica

### **Backend (NestJS)**

Necesitamos un nuevo endpoint que cruce la información de la **Jerarquía** (quién es mi equipo) con la tabla de **Checkins** (quién registró hoy).

*   **Endpoint:** `GET /planning/team-compliance`
*   **Query Params:** `?date=YYYY-MM-DD` (Opcional, default Today).
*   **Lógica:**
    1.  Obtener `ids` del equipo del usuario logueado (usando `visibilidadService.obtenerMiEquipo`).
    2.  Consultar la tabla `p_Checkins` filtrando por esos carnets y la fecha solicitada.
    3.  Combinar listas:
        *   Si existe en `p_Checkins` -> Estado `COMPLETADO`.
        *   Si NO existe -> Estado `PENDIENTE`.

### **Base de Datos (SQL Server)**

*   No se requieren tablas nuevas.
*   Se usará `p_Checkins` (tabla existente de agenda) y `p_Usuarios`/`p_Organizacion` (jerarquía).

---

## 3. ✅ Checklist de Tareas

A continuación, el paso a paso detallado para construir esto.

### **Fase 1: Backend (API)**
- [ ] **DB-1:** Verificar estructura de `p_Checkins` para asegurar que tenemos la columna de `fechaCreacion` u hora exacta.
- [ ] **API-1:** Crear método `getTeamCompliance(leaderId, date)` en `PlanningService`.
- [ ] **API-2:** Crear endpoint en `PlanningController`.
- [ ] **API-3:** Probar con Postman asegurando que traiga tanto a los que cumplieron como a los que no.

### **Fase 2: Frontend (Clarity PWA)**
- [ ] **UI-1:** Crear nueva página `src/pages/Team/TeamCompliancePage.tsx`.
- [ ] **UI-2:** Configurar la ruta `/app/team/compliance` en el Router principal.
- [ ] **NAV-1:** Agregar ítem "Seguimiento Diario" en el Sidebar (Menu).
- [ ] **SRV-1:** Agregar método `getTeamCompliance` en `planning.service.ts` del frontend.
- [ ] **UI-3:** Maquetar los KPIs superiores (Total, Hecho, Pendiente).
- [ ] **UI-4:** Maquetar la lista de usuarios (Card Component con estilos condicionales).
- [ ] **UI-5:** Integrar consumo de API real.

---

## 4. 🚀 Entregable Final

Una nueva opción en el menú donde el líder entra y en **menos de 5 segundos** sabe quién está alineado y quién no ha planeado su día, con la hora exacta de reporte.
