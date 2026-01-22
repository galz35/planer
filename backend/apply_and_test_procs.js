const sql = require('mssql');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

const SQL_CREATE_SPS = `
CREATE OR ALTER PROCEDURE sp_Clarity_CrearTareaRapida
    @titulo NVARCHAR(200),
    @idUsuario INT,
    @prioridad NVARCHAR(50) = 'Media',
    @tipo NVARCHAR(50) = 'Administrativa'
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO p_Tareas (nombre, idCreador, estado, prioridad, tipo, fechaCreacion, fechaActualizacion)
    VALUES (@titulo, @idUsuario, 'Pendiente', @prioridad, @tipo, GETDATE(), GETDATE());
    SELECT SCOPE_IDENTITY() AS idTarea;
END;

CREATE OR ALTER PROCEDURE sp_Acceso_ObtenerArbol
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id AS idorg, nombre, tipo, idPadre AS padre, orden, activo 
    FROM p_OrganizacionNodos WHERE activo = 1;
END;
`;

async function run() {
    try {
        console.log('🔌 Conectando...');
        await sql.connect(config);

        // 1. CREAR SPs
        console.log('🔨 Creando Stored Procedures...');
        try {
            // Separar por GO falso o ejecutar en bloque si driver soporta batch (generalmente no con GO)
            // Ejecutamos uno por uno dividiendo por ; (simple) o enviando todo si es valid T-SQL batch (sin GO)
            const queries = SQL_CREATE_SPS.split('CREATE OR ALTER').filter(x => x.trim()).map(x => 'CREATE OR ALTER ' + x);

            for (const q of queries) {
                await sql.query(q);
            }
            console.log('✅ SPs creados/actualizados.');
        } catch (e) {
            console.error('Error creando SPs (Puede ser sintaxis batch):', e.message);
            // Fallback: Ejecutar uno simple
        }

        // 2. PROBAR SP CREAR
        console.log('\n🧪 Probando sp_Clarity_CrearTareaRapida...');
        const req1 = new sql.Request();
        req1.input('titulo', sql.NVarChar, 'Tarea Via SP ' + Date.now());
        req1.input('idUsuario', sql.Int, 999);
        const res1 = await req1.execute('sp_Clarity_CrearTareaRapida');
        console.log('✅ Tarea Creada OK. ID:', res1.recordset[0].idTarea);

        // 3. PROBAR SP TREE
        console.log('\n🧪 Probando sp_Acceso_ObtenerArbol...');
        const req2 = new sql.Request();
        const res2 = await req2.execute('sp_Acceso_ObtenerArbol');
        console.log(`✅ Tree Obtenido OK. Nodos: ${res2.recordset.length}`);
        if (res2.recordset.length > 0) console.log('Sample:', res2.recordset[0]);

    } catch (err) {
        console.error('❌ ERROR:', err);
    } finally {
        await sql.close();
    }
}
run();
