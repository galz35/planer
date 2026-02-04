# Revisión backend (por archivo, directo)

## backend/src/main.ts
- CORS permite cualquier origen (`origin: true`) y credenciales, con `allowedHeaders: '*'`.
- No se registra Helmet; el comentario indica que se omitió.

## backend/src/app.controller.ts
- `/reset-passwords` responde por GET y expone una sentencia SQL de ejemplo en la respuesta.
- Rutas `/seed-*` permanecen registradas (responden mensajes de deshabilitado) sin guardas visibles en el controlador.

## backend/src/diagnostico/diagnostico.controller.ts
- Endpoints de diagnóstico (`/ping`, `/stats`, `/contexto`, `/test-tarea`, `/test-idcreador`) están expuestos sin guardas en el controlador.
- `/test-tarea` ejecuta creación real de tarea vía SP.
- `/contexto` devuelve metadata de BD y proceso (db, server, schema, processId, uptime, nodeEnv).

## backend/src/planning/planning.repo.ts
- `obtenerHijosDeNodos` y `obtenerUsuariosEnNodos` interpolan `idsStr` dentro de `IN (...)` en SQL.

## backend/src/clarity/tasks.service.ts
- `proyectoActualizar`, `proyectoEnllavar`, `proyectoEliminar` tienen TODO de validación de permisos y ejecutan cambios.
- `getSolicitudesPendientes` y `resolverSolicitud` están implementados como stubs que retornan valores vacíos.
