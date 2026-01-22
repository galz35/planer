# PAQUETE DE CONSULTA EXPERTA - CHATGPT 5.2

## 1. SITUACIÓN ACTUAL
- **Stack:** Node.js (NestJS) + driver `mssql` (v11/tedious) + AWS RDS SQL Server.
- **Evento:** Se ejecutó `ALTER TABLE p_Tareas ADD idCreador INT` en caliente.
- **Estado:**
    - App (Process A, uptime > 1h) -> Fallo: `Invalid column name 'idCreador'`.
    - Script Diagnóstico (Process B, nuevo) -> Éxito: Puede ver e insertar en `idCreador`.

## 2. ERRORES OBSERVADOS (LOGS)
```json
// TAREA ERROR
{"success":false,"statusCode":500,"errorCode":"INTERNAL_ERROR","message":"Invalid column name 'idCreador'."}

// TREE ERROR
{"success":false,"statusCode":500,"errorCode":"INTERNAL_ERROR","message":"Error: Invalid column name 'true'."}
```

## 3. DIAGNÓSTICO APLICADO
Se confirmó mediante inserción dummy desde un proceso fresco que la base de datos está íntegra y las columnas existen. La falla es aislada al proceso antiguo.

## 4. PREGUNTAS PARA CHATGPT 5.2
1.  **Validación de Hipótesis:** ¿Confirmas que esto es comportamiento estándar de `tedious`/`mssql` al cachear metadata de Prepared Statements?
2.  **Error 'True':** El error `Invalid column name 'true'` en una query que hace `WHERE activo = 1` es desconcertante. ¿Es una alucinación del parser de SQL Server al recibir un plan corrupto?
3.  **Prevención:** ¿Recomiendas alguna configuración de pool (e.g. `maxLifetime`) para mitigar esto en entornos de desarrollo con cambios de esquema frecuentes?

## 5. ARCHIVOS ADJUNTOS
- `diagnose_deep.js`: Script de prueba exitoso.
- `error_log.txt`: Logs de fallos del proceso viejo.
