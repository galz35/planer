# Análisis de Optimización: Tabla de Visibilidad (Closure Table)

Este documento detalla la mejora sugerida para resolver el cuello de botella de 10 segundos en la consulta de jerarquía de equipo.

## A) Diagnóstico
El retardo de 7-10s se debe a la búsqueda en 4 niveles de jefatura (`jefeCarnet`, `carnet_jefe2`, etc.) mediante operadores `OR`. Esto obliga a SQL Server a realizar un "Full Table Scan" en lugar de usar índices eficientes.

## B) Solución: Tabla `p_UsuarioVisibilidad`
Crear una tabla precalculada que almacene las relaciones "Jefe -> Subordinado".

### Estructura sugerida:
- `idJefe` (INT) - PK
- `idVisible` (INT) - PK
- `nivel` (TINYINT) - Distancia en el organigrama (0=yo, 1=equipo directo, etc.)
- `fechaRefresco` (DATETIME)

## C) Ventajas
1. **Velocidad**: Las consultas de equipo pasan de segundos a **milisegundos**.
2. **Simplicidad**: Los SPs ahora solo hacen un `INNER JOIN` simple a esta tabla.
3. **Escalabilidad**: Soporta miles de usuarios sin degradar el rendimiento.

## D) Estrategia de Refresco
Se recomienda un refresco **"Al Login"**. Cuando el jefe entra a la app, un proceso de milisegundos actualiza su lista de subordinados. Esto garantiza que si hubo cambios en el equipo (nuevas altas o bajas), el jefe los vea de inmediato al iniciar su jornada.

---
*Análisis técnico para Clarity PWA.*
