const sql = require('mssql');
const fs = require('fs');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
    try {
        console.log('🔌 Conectando...');
        await sql.connect(config);

        // 1. APLICAR SQL
        console.log('🔨 Aplicando create_procs_full.sql...');
        const sqlParams = fs.readFileSync('./sql/create_procs_full.sql', 'utf8');
        // Separar bloques por GO (case insensitive, en linea propia)
        const blocs = sqlParams.split(/[\r\n]+GO[\r\n]*/i);

        for (const bloc of blocs) {
            if (!bloc || !bloc.trim()) continue;
            try {
                await sql.query(bloc);
                console.log('  > Bloque ejecutado OK.');
            } catch (e) {
                console.error('  X Bloque falló:', e.message.split('\n')[0]);
            }
        }
        console.log('✅SPs Aplicados.');

        // 2. PROBAR SP TAREA
        console.log('\n🧪 Testing sp_Tarea_Crear...');
        const r1 = new sql.Request();
        r1.input('nombre', 'Tarea Full SP');
        r1.input('idUsuario', 123);
        const res1 = await r1.execute('sp_Tarea_Crear');
        console.log('  Tarea ID:', res1.recordset[0].idTarea);

        // 3. PROBAR SP CHECKIN
        console.log('\n🧪 Testing sp_Checkin_Crear...');
        const r2 = new sql.Request();
        r2.input('idUsuario', 123);
        r2.input('fecha', '2026-01-21');
        r2.input('entregableTexto', 'Checkin via SP');
        r2.input('estadoAnimo', 'Bien');
        const res2 = await r2.execute('sp_Checkin_Crear');
        console.log('  Checkin ID:', res2.recordset[0]?.idCheckin || 'OK');

        // 4. PROBAR SP TREE
        console.log('\n🧪 Testing sp_Organizacion_ObtenerArbol...');
        const r3 = new sql.Request();
        const res3 = await r3.execute('sp_Organizacion_ObtenerArbol');
        console.log('  Nodos Tree:', res3.recordset.length);

        // 5. PROBAR SP VISIBILIDAD (Complex)
        // Necesitamos un carnet de prueba: 'juan.ortuno' (o similar)
        // Buscamos un carnet real primero
        const rUser = await sql.query("SELECT TOP 1 carnet FROM p_Usuarios WHERE activo=1");
        const carnet = rUser.recordset[0]?.carnet;

        if (carnet) {
            console.log(`\n🧪 Testing sp_Visibilidad_ObtenerCarnets (${carnet})...`);
            const r4 = new sql.Request();
            r4.input('carnetSolicitante', carnet);
            const res4 = await r4.execute('sp_Visibilidad_ObtenerCarnets');
            console.log('  Carnets Visibles:', res4.recordset.length);
        } else {
            console.log('skip visibilidad test (no users)');
        }

    } catch (err) {
        console.error('❌ ERROR FATAL:', err);
    } finally {
        await sql.close();
    }
}
run();
