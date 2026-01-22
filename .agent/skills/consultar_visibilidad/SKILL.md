---
name: verify_visibility_query
description: Guía estándar para consultar la visibilidad del equipo garantizando consistencia con el módulo de Carga Laboral.
---

# Verificación de Consulta de Visibilidad

Este skill documenta el proceso estándar y probado para obtener los empleados visibles de un gerente, basado en la implementación exitosa de `WorkloadPage` (/app/planning/carga).

## Proceso Estándar

1. **Obtener Carnet del Solicitante**:
   Siempre iniciar obteniendo el carnet del usuario actual desde la base de datos, no asumir que está en el token si no es necesario.
   ```typescript
   const usuario = await authRepo.obtenerUsuarioPorId(idUsuario); // o accesoRepo.obtenerCarnetDeUsuario
   const carnet = usuario.carnet;
   ```

2. **Invocar VisibilidadService**:
   Usar `VisibilidadService.obtenerEmpleadosVisibles(carnet)`. Este método encapsula la lógica compleja de SQL Server:
   - Ejecuta `sp_Visibilidad_ObtenerCarnets`.
   - Resuelve delegaciones y permisos.
   - Devuelve objetos de usuario completos combinados con `p_Usuarios`.
   - **IMPORTANTE**: Asegurar que `accesoRepo` maneje `LTRIM/RTRIM` al comparar carnets para evitar fallos por espacios en blanco.

3. **Filtrar por IDs**:
   Extraer los IDs de la respuesta para usarlos en consultas posteriores.
   ```typescript
   const visibleUsers = await visibilidadService.obtenerEmpleadosVisibles(carnet);
   const ids = visibleUsers.map(u => u.idUsuario);
   ```

4. **Consulta de Datos (Patrón Safe-IN)**:
   Al consultar tablas relacionadas (`p_Tareas`, `p_Checkins`), usar la lista de IDs.
   - Si la lista es grande, usar parámetros dinámicos en `ejecutarQuery` en lugar de concatenación directa si es posible, o asegurarse de sanear.
   - **Crucial**: Usar `LEFT JOIN` con `p_Proyectos` si se desea incluir tareas "sueltas", o `INNER JOIN` si solo se desean tareas de proyectos formales.
   - Verificar siempre inconsistencias de datos (ej. tareas asignadas a usuarios inactivos).

## Lógica Core: `sp_Visibilidad_ObtenerCarnets`

El núcleo de la visibilidad reside en este procedimiento almacenado. **NO reimplementar esta lógica en código**.

### Definición del SP Reference (2026-01-21)
El SP consolida múltiples fuentes de visibilidad:
1. **Admin Global**: Roles ROOT, ADMIN, etc. ven todo.
2. **Autoconsulta**: El usuario siempre se ve a sí mismo.
3. **Subordinados Directos**: Basado en `jefeCarnet`.
4. **Delegaciones**: Vistas otorgadas por otros (`p_delegacion_visibilidad`).
5. **Permisos Puntuales**: Accesos individuales explícitos (`p_permiso_empleado`).
6. **Permisos de Área (Nombre)**: Coincidencia por texto en Gerencia, Subgerencia, etc. (Usa `UPPER(LTRIM(RTRIM(...)))`).
7. **Permisos de Área (Jerarquía)**: Recursividad basada en `p_OrganizacionNodos` e `idOrg`.
8. **Exclusiones**: Filtra explícitamente permisos `DENY`.

```sql
ALTER PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets]
    @carnetSolicitante NVARCHAR(50)
AS
BEGIN
    -- [Lógica detallada omitida para brevedad, ver implementación en DB]
    -- Cubre: Admin, Actores, Subordinados, VisiblesPuntual, VisiblesAreaNombre, VisiblesAreaIdOrg, Excluidos
END
```

## Referencia de Implementación (Backend)

Ver `src/clarity/tasks.service.ts` -> `getWorkload`:

```typescript
async getWorkload(idUsuario: number) {
    const usuarioRoot = await authRepo.obtenerUsuarioPorId(idUsuario);
    const allUsersList = await this.visibilidadService.obtenerEmpleadosVisibles(usuarioRoot.carnet);
    const allIds = allUsersList.map(u => u.idUsuario);
    // ... query usando allIds
}
```
