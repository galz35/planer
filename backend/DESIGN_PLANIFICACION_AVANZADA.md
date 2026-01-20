# Diseño de Sistema de Planificación Avanzada y Auditoría

## 1. Objetivo
Implementar un sistema robusto de gestión de tareas y proyectos que soporte diferentes niveles de gobernanza (Estratégico vs Operativo), requiera autorización para cambios sensibles y mantenga una auditoría granular de todas las modificaciones.

## 2. Clasificación de Proyectos

Los proyectos tendrán un nuevo campo `tipo` que determinará las reglas de negocio aplicables:

| Tipo | Descripción | Reglas de Modificación |
|------|-------------|------------------------|
| **Estratégico** | Proyectos clave para la compañía. | **Requiere Aprobación** para cambios en fechas, alcance o recursos. |
| **Táctico** | Proyectos de área o mediano plazo. | Modificación libre por el Líder, auditada. |
| **Operativo** | Tareas del día a día. | Modificación libre por el Responsable, auditada. |
| **Rutinario** | Tareas recurrentes/menores. | Libre total. |

## 3. Modelo de Datos (Cambios)

### 3.1 Entidad `Proyecto` (Modificación)
- `tipo`: string ('Estrategico', 'Operativo', 'Tactico')
- `requiereAprobacion`: boolean (default: true para Estrategico)

### 3.2 Nueva Entidad `SolicitudCambio`
Tabla para manejar el flujo de aprobación de cambios en planes restringidos.

- `idSolicitud`: PK
- `idTarea`: FK -> Tarea
- `idUsuarioSolicitante`: FK -> Usuario
- `fechaSolicitud`: Date
- `campoAfectado`: string (ej: 'fechaObjetivo', 'estado')
- `valorAnterior`: string
- `valorNuevo`: string
- `motivo`: string
- `estado`: 'Pendiente', 'Aprobado', 'Rechazado'
- `idAprobador`: FK -> Usuario (nullable)
- `fechaResolucion`: Date

### 3.3 Entidad `AuditLog` (mejora)
Se usará extensivamente para registrar TODOS los cambios en proyectos operativos donde no hay aprobación previa.

## 4. Flujos de Usuario

### 4.1 Flujo de Edición de Tarea (Empleado)
1. Usuario intenta cambiar fecha de entrega de Tarea X.
2. Backend verifica tipo de Proyecto de Tarea X.
3. SI Proyecto es **Estratégico**:
   - Backend rechaza el UPDATE directo.
   - Backend crea registro en `SolicitudCambio`.
   - Frontend muestra: "Solicitud de cambio enviada a su gerente".
4. SI Proyecto es **Operativo**:
   - Backend aplica UPDATE.
   - Backend inserta registro en `AuditLog`.
   - Frontend muestra: "Cambio guardado".

### 4.2 Flujo de Aprobación (Jefe)
1. Jefe entra a "Bandeja de Entrada".
2. Ve "Solicitudes de Cambio de Planificación".
3. Revisa impacto (Valor anterior vs Nuevo).
4. Aprueba o Rechaza.
   - Si Aprueba: Se aplica el cambio a la Tarea.
   - Si Rechaza: La tarea se mantiene igual.

## 5. Auditoría y Visibilidad
- **Logs**: Cada cambio debe registrar: Quién, Cuándo, Qué (Antes/Después).
- **Visibilidad**: Los jefes podrán entrar al "Tablero de Equipo" y ver el plan (Gantt/Lista) de cualquiera de sus subordinados directos e indirectos (según árbol organizacional).

## 6. Diseño de Tarea Inteligente

La tarea deja de ser un simple registro para convertirse en un objeto inteligente con ciclo de vida gobernado.

### 6.1 Atributos Extendidos Propuestos
- **Nivel de Gobernanza**: Heredado del Proyecto (Estratégico/Operativo).
- **Bloqueo de Edición**: Si el proyecto es Estratégico, los campos `fechaObjetivo`, `asignados` y `prioridad` estarán bloqueados (read-only) para el ejecutor, mostrando un ícono de candado 🔒.
- **Historial Visual**: Línea de tiempo integrada en la tarea mostrando cada cambio ("Juan cambió la fecha del 12/Oct al 15/Oct").

### 6.2 Interfaz de Usuario (UI) de la Tarea

El modal de edición de tarea tendrá 3 zonas claras:

1.  **Cabecera de Estado (Semáforo)**:
    - Indicador de color según estado (Verde: En Tiempos, Amarillo: Riesgo, Rojo: Atrasada).
    - Badge de Tipo: "ESTRATÉGICA" (Morado) o "OPERATIVA" (Gris).

2.  **Cuerpo Principal (Datos)**:
    - Título y Descripción.
    - Fechas (Con botón "Solicitar Cambio" si es Estratégica).
    - Asignación (Avatar del responsable).

3.  **Pie de Auditoría (Log en vivo)**:
    - Lista compacta de eventos recientes.
    - Ejemplo:
      - *[Hoy 10:00 AM] Gerente aprobó cambio de fecha.*
      - *[Ayer 4:30 PM] Juan solicitó cambio de fecha (Motivo: Proveedor retrasado).*

## 7. Próximos pasos de implementación
1. Actualizar Entidades (Backend) - **✅ REALIZADO**.
2. Crear Endpoints para `SolicitudCambio`.
3. Actualizar Endpoints de `Tarea` para implementar la lógica condicional.
4. Crear Interfaz de "Solicitudes" en Frontend.
5. Desarrollar el componente `SmartTaskModal` en React.
