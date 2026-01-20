# Modelo de Visibilidad y Jerarquías

Este documento define las reglas de negocio críticas respecto a la estructura jerárquica y la lógica de cálculo de visibilidad del personal.

## 1. Definición de Jerarquías

El sistema maneja dos tipos de jerarquías que coexisten:

### A. Jerarquía de Mando (Cadena de Reporte)
Define la relación "Persona a Persona" (Jefe - Subordinado). Es la base natural de la visibilidad.
- **Estructura**:
  - `carnet` (Empleado) reporta a `carnet_jefe1` (Jefe Inmediato).
  - `carnet_jefe1` reporta a `carnet_jefe2`.
  - `carnet_jefe2` reporta a `carnet_jefe3`.
  - ...y así sucesivamente hasta la raíz.
- **Uso**:
  - Un jefe ve automáticamente a todos sus subordinados directos (`jefe1`) y a toda la descendencia recursiva de estos.
  - Se modela en base de datos mediante la columna `jefeCarnet` (recursividad) y las columnas aplanadas `carnet_jefe[1-4]` para consultas rápidas o auditoría.

### B. Jerarquía Organizacional (Estructura de Áreas)
Define la ubicación del empleado dentro de la estructura de la empresa ("Cajas" organizativas).
- **Estructura (Ascendente)**:
  - `primer_nivel`: Área específica más baja del empleado (Hijo).
  - `segundo_nivel`: Agrupación superior (Padre del nivel 1).
  - `tercer_nivel`: Agrupación superior (Padre del nivel 2).
  - ...hasta `quinto_nivel` / `sexto_nivel` (Raíz).
- **Relación**:
  - `primer_nivel` ⊂ `segundo_nivel` ⊂ `tercer_nivel` ...
- **Uso**:
  - Permite otorgar visibilidad masiva sobre un departamento entero.
  - Ejemplo: Dar permiso sobre la "Gerencia de Ventas" (`segundo_nivel`) otorga visibilidad sobre todos los empleados cuyo `segundo_nivel` sea 'Ventas', independientemente de quién sea su jefe directo.

## 2. Algoritmo de Cálculo de Visibilidad (ALLOW / DENY)

La visibilidad final de un usuario ("¿A quién puedo ver?") se calcula en capas:

1.  **Capa Base (Mando Natural)**:
    *   Se obtienen todos los subordinados recursivos usando la Cadena de Mando (`jefeCarnet`).

2.  **Capa de Inclusión (ALLOW Explicit)**:
    *   **Delegaciones**: Se suman los empleados visibles por delegación activa.
    *   **Permisos por Empleado**: Se suman los empleados específicos otorgados con `tipoAcceso = 'ALLOW'`.
    *   **Permisos por Área**: Se suman todos los empleados que pertenezcan a los nodos organizacionales (Niveles) otorgados.

3.  **Capa de Exclusión (DENY Explicit)**:
    *   Se **eliminan** de la lista resultante a todos los empleados que tengan un registro de permiso con `tipoAcceso = 'DENY'` para el usuario solicitante.
    *   **Regla de Oro**: El DENY tiene prioridad absoluta sobre cualquier forma de inclusión (Jerarquía, Área o Permiso Puntual).

## 3. Implicaciones Técnicas

- **Consultas**: Deben utilizar `WITH RECURSIVE` para la jerarquía de mando.
- **Filtros de Área**: Las consultas de permisos por área deben comparar los campos `primer_nivel`...`sexto_nivel` contra el `idOrg` o nombre del área otorgada.
- **Optimización**: El uso de CTEs es preferible para resolver la recursividad de mando en una sola consulta.
