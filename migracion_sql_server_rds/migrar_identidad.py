import pyodbc

# ══════════════════════════════════════════════════════════════════════
# SCRIPT DE MIGRACIÓN AUTOMÁTICA (AWS -> LOCAL)
# Conserva IDs y mantiene integridad.
# ══════════════════════════════════════════════════════════════════════

# DATOS DE CONEXIÓN
aws_config = {
    'server': '54.146.235.205',
    'database': 'Bdplaner',
    'user': 'plan',
    'pass': 'admin123'
}

local_config = {
    'server': 'localhost', # O la IP de tu servidor local
    'database': 'Bdplaner',
    'user': 'sa',
    'pass': 'TuPasswordLocal' # <--- CAMBIA ESTO
}

# ORDEN DE TABLAS PARA EVITAR CONFLICTOS
tablas_a_migrar = [
    'p_Usuarios', 
    'p_Proyectos', 
    'p_Tareas', 
    'p_TareaAsignados', 
    'p_Checkins', 
    'p_CheckinTareas'
]

def migrar():
    try:
        print("🔗 Conectando a AWS y Local...")
        aws_conn = pyodbc.connect(f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={aws_config['server']};DATABASE={aws_config['database']};UID={aws_config['user']};PWD={aws_config['pass']}")
        local_conn = pyodbc.connect(f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={local_config['server']};DATABASE={local_config['database']};UID={local_config['user']};PWD={local_config['pass']}")
        
        aws_cursor = aws_conn.cursor()
        local_cursor = local_conn.cursor()

        print("🚫 Desactivando temporalmente restricciones en Local...")
        local_cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'")

        for tabla in tablas_a_migrar:
            print(f"📦 Procesando tabla: {tabla}...")
            
            # Obtener datos de AWS
            aws_cursor.execute(f"SELECT * FROM {tabla}")
            columns = [column[0] for column in aws_cursor.description]
            rows = aws_cursor.fetchall()

            if not rows:
                print(f"   (Tabla {tabla} está vacía. Saltando...)")
                continue

            # Preparar Query
            col_names = ", ".join(columns)
            placeholders = ", ".join(["?"] * len(columns))
            insert_query = f"INSERT INTO {tabla} ({col_names}) VALUES ({placeholders})"

            # Insertar en Local manteniendo IDs
            local_cursor.execute(f"SET IDENTITY_INSERT {tabla} ON")
            
            # Procesar filas (300 registros son pocos, execmany es rápido)
            data_to_insert = [list(row) for row in rows]
            local_cursor.executemany(insert_query, data_to_insert)
            
            local_cursor.execute(f"SET IDENTITY_INSERT {tabla} OFF")
            print(f"   ✅ {len(rows)} registros migrados con éxito.")

        print("🔗 Reactivando restricciones...")
        local_cursor.execute("EXEC sp_MSforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'")
        
        local_conn.commit()
        print("\n✨ MIGRACIÓN FINALIZADA SIN ERRORES ✨")

    except Exception as e:
        print(f"\n❌ ERROR DURANTE LA MIGRACIÓN: {e}")

if __name__ == "__main__":
    migrar()
