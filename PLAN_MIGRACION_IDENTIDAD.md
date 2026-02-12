# PLAN DE MIGRACIÓN: MANTENIMIENTO DE INTEGRIDAD Y IDs (IDENTITY)

Sí, es totalmente posible migrar con Python o JS manteniendo los IDs originales. La clave técnica es el comando `SET IDENTITY_INSERT [Tabla] ON`.

## 1. El Problema de los IDs
En SQL Server, las columnas autonuméricas (IDENTITY) no permiten insertar valores manualmente por defecto. Si intentas migrar datos, el servidor generará nuevos IDs (1, 2, 3...) y romperá todas tus relaciones (Foreign Keys).

## 2. La Solución Química: Python + pyodbc
Python es el lenguaje ideal para esto por su manejo de flujos de datos grandes.

### Librerías Recomendas:
*   `pyodbc`: Para la conexión robusta.
*   `sqlalchemy`: Para facilitar la reflexión de tablas.
*   `tqdm`: Para ver una barra de progreso de la migración.

### El Algoritmo de "Cero Errores":
1.  **Extraer Schema:** Generar primero todas las tablas, vistas y SPs en el destino (sin datos).
2.  **Desactivar Constraints:** Temporalmente desactivar las llaves foráneas (`ALTER TABLE ... NOCHECK CONSTRAINT ALL`).
3.  **Migración por Tabla:**
    *   `SET IDENTITY_INSERT {tabla} ON`
    *   Insertar filas manteniendo el valor del ID original.
    *   `SET IDENTITY_INSERT {tabla} OFF`
4.  **Reactivar Constraints:** Volver a validar la integridad.
5.  **Resedear Identidades:** Ajustar el contador al último valor insertado (`DBCC CHECKIDENT`).

---

## 3. Herramienta Recomendada: mssql-scripter (Microsoft)
Antes de programar algo desde cero, te recomiendo **mssql-scripter**. Es una herramienta de línea de comandos basada en Python desarrollada por Microsoft.

**Comando para generar TODO (Schema + Data + IDs):**
```bash
mssql-scripter -S <aws_host> -d Bdplaner -U plan -P <pass> --schema-and-data --include-identity-values > migración_completa.sql
```
*   `--include-identity-values`: Este flag es el "santo grial"; genera automáticamente los `SET IDENTITY_INSERT` por ti.

---

## 4. Plan de Acción Paso a Paso

### Paso 1: Preparación del Terreno
Crea la base de datos vacía en tu servidor local con el mismo nombre y **Collation** (Cotejamiento).

### Paso 2: Extracción con Python (Script Personalizado)
Si prefieres un script para tener control total, el flujo en Python sería:
```python
import pyodbc

# Origen (AWS) y Destino (Local)
conn_aws = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=...;DATABASE=Bdplaner;UID=plan;PWD=...')
conn_local = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=Bdplaner;UID=sa;PWD=...')

def migrar_tabla(nombre_tabla):
    cursor_aws = conn_aws.cursor()
    cursor_local = conn_local.cursor()
    
    # 1. Leer datos
    cursor_aws.execute(f"SELECT * FROM {nombre_tabla}")
    rows = cursor_aws.fetchall()
    
    # 2. Habilitar inserción de IDs
    cursor_local.execute(f"SET IDENTITY_INSERT {nombre_tabla} ON")
    
    # 3. Insertar (Cuidado con el orden de columnas)
    # ... lógica de inserción masiva ...
    
    cursor_local.execute(f"SET IDENTITY_INSERT {nombre_tabla} OFF")
    conn_local.commit()
```

### Paso 3: Validación
Cruzar los conteos: `SELECT COUNT(*) FROM Tabla` en ambos lados. Si coinciden, la migración fue un éxito.

---

## 5. RECOMENDACIÓN FINAL
Como tu RDS es **Capa Gratuita**, Amazon te cobra por el tráfico de salida (Egress). Mi consejo es:
1.  Usa **mssql-scripter** para generar un solo archivo `.sql`.
2.  Comprime ese archivo (pesará un 90% menos).
3.  Ejecútalo localmente.

Es el método más seguro para no romper los IDs y asegurar que Planner-EF (especialmente los Check-ins y las Tareas asignadas) sigan vinculados correctamente.
