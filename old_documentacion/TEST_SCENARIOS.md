
# 🧪 Escenarios de Prueba - RRHH (Datos Reales)

Este documento detalla los escenarios de prueba configurados en base a la jerarquía real del archivo `rrhh.csv`. Cada escenario está diseñado para probar funcionalidades específicas del sistema.

## 👥 Actores Principales

| Nombre | Carnet | Correo (Login) | Rol Sistema | Rol RRHH |
|--------|--------|----------------|-------------|----------|
| **Juan Carlos Ortuño** | `300042` | `juan.ortuno@claro.com.ni` | **Admin** | Gerente General RRHH |
| **Candida Sanchez** | `772` | `candida.sanchez@claro.com.ni` | User | Coord. Soporte (Reporta a Ortuño) |
| **Gustavo Lira** | `500708` | `gustavo.lira@claro.com.ni` | User | Analista (Reporta a Candida) |
| **Tania Aguirre** | `1005898` | `taniaa.aguirre@claro.com.ni` | User | Especialista (Reporta a Ortuño) |
| **Scarleth Vivas** | `666` | `scarleth.vivas@claro.com.ni` | User | Especialista (Reporta a Ortuño) |
| **Sergio Martinez** | `400850` | `sergio.martinez@claro.com.ni` | User | Subgerente C.D. |

---

## 🎭 Escenario 1: Gerencia General & Supervisión (Juan Carlos Ortuño)

**Objetivo:** Probar la vista de Administrador, Dashboard de Equipo y Planes Compartidos.

*   **Acción:** Iniciar sesión con Correo: `juan.ortuno@claro.com.ni` (o Carnet: `300042`) / Pass: `Claro123!`.
*   **Ir a "Dashboard":**
    *   Debe ver alertas globales de su equipo (Bloqueos, Atrasos).
    *   Verificar KPI de cumplimiento global.
*   **Ir a "Plan de Trabajo":**
    *   Buscar el plan **"Plan Estratégico Selección"**.
    *   Este es un **Plan Compartido**: Verá sus tareas ("Definición Lineamientos") y las de su subordinada **Tania Aguirre** ("Publicación de vacantes").
*   **Ir a "Mi Agenda" (Hoy):**
    *   Verá una tarea **"Importante"** (Urgente) llamada *"Revisión Presupuesto Anual"*.
    *   Esta tarea **NO tiene plan asociado**, probando la funcionalidad de "Agenda fuera de plan".

## 🎭 Escenario 2: Operación, Bloqueos & Atrasos (Candida Sanchez)

**Objetivo:** Probar la gestión de problemas operativos (Bloqueos) y cumplimiento de fechas (Atrasos).

*   **Acción:** Iniciar sesión con Correo: `candida.sanchez@claro.com.ni` / Pass: `Claro123!`.
*   **Ir a "Bloqueos":**
    *   Debe aparecer la tarea **"Actualización de Pólizas Seguros"**.
    *   Estado: **Activo**. Motivo: *"Falta firma del Gerente General"*.
*   **Ir a "Mi Agenda":**
    *   Debe ver la tarea **"Entrega de Carnets Nuevos"** marcada en **ROJO** (Atrasada).
    *   Tipo de Tarea: **Logística**.

## 🎭 Escenario 3: Agenda Pura & Tipos de Tarea (Gustavo Lira)

**Objetivo:** Probar el uso del sistema sin un Plan de Trabajo formal (solo gestión de tareas diarias).

*   **Acción:** Iniciar sesión con Correo: `gustavo.lira@claro.com.ni` / Pass: `Claro123!`.
*   **Ir a "Mi Agenda":**
    *   Gustavo **NO tiene Plan de Trabajo** asignado.
    *   Verá tareas sueltas creadas directamente en la agenda.
    *   Tarea 1: *"Atención Solicitud Corporativa AMX"* -> Tipo: **AMX**.
    *   Tarea 2: *"Envío de papelería"* -> Tipo: **Logística**.

## 🎭 Escenario 4: Planes en Borrador & Estrategia (Scarleth & Tania)

**Objetivo:** Probar estados de planes y asignación de tareas estratégicas.

*   **Acción:** Iniciar sesión con `scarleth.vivas@claro.com.ni` (Carnet: `666`) o verla desde el usuario de Ortuño.
*   **Estado:** Su plan *"Plan Bienestar"* está en estado **Borrador**. Aún no es oficial.
*   **Acción:** Iniciar sesión con `taniaa.aguirre@claro.com.ni` (Carnet: `1005898`).
*   **Estado:** Ella participa en el plan de Ortuño con tareas de tipo **Administrativa** y **Estratégica**.

## 🎭 Escenario 5: Flujo Inicial (Sergio Martinez)

**Objetivo:** Probar la creación de un plan desde cero.

*   **Acción:** Iniciar sesión con Correo: `sergio.martinez@claro.com.ni` (Carnet: `400850`).
*   **Estado:** **Sin Plan**.
*   **Prueba:** Ir a "Plan de Trabajo" y usar el botón **"Nuevo Plan"** para crear su plan de Enero 2026.

---

## 🛠️ Notas Técnicas

*   Todos los usuarios tienen contraseña por defecto: `Claro123!`
*   Los datos se reinician al ejecutar el script de setup.
*   La jerarquía (Quién ve a quién) está basada estrictamente en el campo `carnet_jefe1` del archivo CSV.

---

## 🚚 Escenario 6: Transporte y Logística (Ali Rodriguez)

**Objetivo:** Supervisión de flota y gestión de logística.

*   **Jefe:** `ali.rodriguez@claro.com.ni` (Carnet: `402178`)
*   **Ir a "Mi Equipo":**
    *   Verá a **Edgardo Saballos** (`edgardo.saballos@claro.com.ni`) trabajando en *"Mantenimiento Preventivo"*.
    *   Verá a **Pedro Castillo** (`pedro.castillo@claro.com.ni`) con *"Gestión de Combustible"*.

## 🎓 Escenario 7: Capacitación y Desarrollo (Sergio Martinez)

**Objetivo:** Gestión de planes de formación (Sergio ahora tiene rol de Jefe).

*   **Jefe:** `sergio.martinez@claro.com.ni` (Carnet: `400850`)
*   **Ir a "Mi Equipo":**
    *   **Milcy Velasquez** (`milcy.velasquez@claro.com.ni`): Tarea **Finalizada** ("Reporte de Asistencia").
    *   **Jilma Zelaya** (`jilma.zelaya@claro.com.ni`): Tarea Administrativa en curso.

## 👥 Escenario 8: Reclutamiento y Selección (Yesenia Manzanarez)

**Objetivo:** Gestión de procesos de selección masiva (Tipos AMX y Operativa).

*   **Jefe:** `yesenia.manzanarez@claro.com.ni` (Carnet: `400103`)
*   **Ir a "Dashboard":** Verá alertas de atraso.
*   **Equipo:**
    *   **Arlen Rivera** (`arlen.rivera@claro.com.ni`): Tarea tipo **AMX** ("Feria de Empleo").
    *   **Francis Villarreal** (`francis.villarreal@claro.com.ni`): Tarea **Atrasada** ("Entrevistas Gerente TI").
    *   **Kevin Barahona** (`kevin.barahona@claro.com.ni`): Tarea Operativa ("Filtrado CVs").

## 💰 Escenario 9: Nómina (Javier Toruño & Mario Rios)

**Objetivo:** Gestión crítica con Bloqueos.

*   **Jefe:** `javier.toruno@claro.com.ni` (Carnet: `229354`)
*   **Ir a "Bloqueos":**
    *   Verá que **Mario Rios** (`mario.rios@claro.com.ni`) está **BLOQUEADO** en la tarea *"Cálculo Planilla Quincenal"* (Motivo: Sistema SAP).

## ⚖️ Escenario 10: Compensaciones (Aurora Espinoza)

**Objetivo:** Tareas estratégicas de alto nivel.

*   **Jefe:** `aurora.espinoza@claro.com.ni` (Carnet: `1008937`)
*   **Equipo:**
    *   **Kevin Torrez** (`kevin.torrez@claro.com.ni`): Tarea **Estratégica** ("Análisis de Equidad Interna").
