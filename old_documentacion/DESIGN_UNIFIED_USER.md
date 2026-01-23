# Propuesta de Diseño: Unificación de Usuarios y Empleados

Actualmente el sistema tiene dos tablas separadas:
1. `p_Usuarios` (Para login en el sistema Clarity)
2. `p_empleados` (Para datos de RRHH)

**Solicitud:** Unificar todo en una sola tabla (`p_Usuarios`) que contenga tanto las credenciales de acceso como toda la información rica de RRHH proveniente del archivo `rrhh.csv`.

## Nueva Estructura de `p_Usuarios`

La tabla `p_Usuarios` se expandirá para incluir todos los campos vitales de `rrhh.csv`.

| Campo CSV | Propiedad Entidad Usuario | Tipo | Descripción |
|-----------|---------------------------|------|-------------|
| - | `idUsuario` | PK | ID interno del sistema (Login) |
| `correo` | `correo` | string | **Corazón del sistema**. Único. |
| `UserNam` | `username` | string | Nombre de usuario de red/AD |
| `carnet` | `carnet` | string | Identificador único de empleado |
| `nombre_completo` | `nombreCompleto` | string | Nombre real completo |
| `cargo` | `cargo` | string | Puesto de trabajo |
| `Departamento` | `departamento` | string | Unidad organizativa principal |
| `oDEPARTAMENTO` | `orgDepartamento` | string | Departamento oficial (nivel 1) |
| `OGERENCIA` | `orgGerencia` | string | Gerencia (nivel 2) |
| `carnet_jefe1` | `jefeCarnet` | string | Carnet del jefe directo |
| `nom_jefe1` | `jefeNombre` | string | Nombre del jefe directo |
| `correo_jefe1` | `jefeCorreo` | string | Correo del jefe directo |
| `pais` | `pais` | string | País (NI, etc.) |
| `fechaingreso` | `fechaIngreso` | Date | Antigüedad |
| `Gender` | `genero` | string | M/F |

## Ventajas
1. **Simplicidad Suprema**: Al hacer `SELECT * FROM p_Usuarios WHERE email = '...'`, obtienes TODO: quién es, quién es su jefe, dónde trabaja y sus credenciales.
2. **Cero Joins**: No hace falta cruzar tablas para saber el departamento de un usuario logueado.
3. **Sincronización Directa**: El proceso de carga del CSV (`seed`) irá directo a esta tabla. Si el usuario existe, actualiza sus datos de RRHH. Si no, lo crea.

## Plan de Migración

### Fase 1: Backend
1. Modificar `usuario.entity.ts`: Agregar todos los campos de `Empleado`.
2. Actualizar `auth.service.ts` / `seed.service.ts`:
   - Crear un script que lea `rrhh.csv`.
   - Para cada fila, buscar usuario por `correo`.
   - Insertar o Actualizar (Upsert) en `p_Usuarios`.
3. Eliminar la entidad `Empleado` y la tabla `p_empleados` para evitar duplicidad, como solicitado.

### Fase 2: Frontend
1. Actualizar interfaces en `modelos.ts` (`Usuario` ahora tendrá `cargo`, `carnet`, etc.).
2. Refactorizar `MiEquipoPage.tsx`:
   - Ya no necesitamos llamar a `accesoService.getVisibilidad`.
   - Podemos filtrar directamente sobre la lista de usuarios.
   - El "mapa de correos" desaparece; el usuario YA tiene el carnet y el departamento.

## Pregunta Clave
¿Desea proceder con este diseño? Implica **borrar** la tabla `p_empleados` actual y engordar `p_Usuarios`.
