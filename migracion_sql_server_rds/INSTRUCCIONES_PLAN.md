# PASOS PARA MIGRAR AWS RDS A SQL SERVER LOCAL

Sigue estos pasos para generar el archivo SQL perfecto que mantenga todos tus IDs (300 registros) intactos.

## PASO 1: Generar el archivo SQL desde SSMS (Management Studio)
1. Conéctate a tu base de datos de **AWS RDS (54.146.235.205)**.
2. Click derecho en la base de datos `Bdplaner` -> **Tasks** -> **Generate Scripts...**
3. Selecciona las tablas (p_Usuarios, p_Tareas, etc.).
4. En **"Set Scripting Options"**, haz clic en el botón **[Advanced]**.
5. **CRÍTICO:** Cambia estas opciones:
   - **Types of data to script:** Ponlo en `Schema and data`.
   - **Script IDENTITY:** Ponlo en `True`.
   - **Script Foreign Keys:** Ponlo en `True`.
6. Guarda el archivo como `backup_aws_rds.sql` en esta carpeta.

## PASO 2: Preparar el archivo para ejecución local
Antes de ejecutar el script en tu servidor local, abre el archivo `.sql` generado y asegúrate de pegar los bloques de código que están en el archivo `01_preparar_db_local.sql` de esta carpeta.

1. El bloque de **"APAGAR RESTRICCIONES"** debe ir al puro inicio del archivo.
2. El bloque de **"ENCENDER RESTRICCIONES"** debe ir al puro final.

## PASO 3: Ejecutar en el Local
1. Abre tu SQL Server local.
2. Crea la base de datos `Bdplaner` si no existe.
3. Abre el archivo SQL que preparaste.
4. Presiona **F5 / Execute**.

---
**Nota:** Si prefieres automatizar esto con Python, usa el script `migrar_identidad.py` que también he incluido en esta carpeta.
