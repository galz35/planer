const sql = require('mssql');

const config = {
    user: 'plan',
    password: 'admin123',
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    database: 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true }
};

async function checkLongTasks() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        await sql.connect(config);

        console.log('🔍 Buscando tareas con comportamiento "LARGA"...');
        const result = await sql.query(`
            SELECT 
                idTarea, 
                nombre, 
                descripcion, 
                comportamiento, 
                estado, 
                porcentaje,
                fechaCreacion
            FROM p_Tareas 
            WHERE comportamiento = 'LARGA'
            ORDER BY fechaCreacion DESC
        `);

        if (result.recordset.length === 0) {
            console.log('❌ No se encontraron tareas con comportamiento "LARGA".');
        } else {
            console.log(`✅ Se encontraron ${result.recordset.length} tareas:`);
            console.log(JSON.stringify(result.recordset, null, 2));
        }

        // También revisar si hay avances registrados para esas tareas
        if (result.recordset.length > 0) {
            const ids = result.recordset.map(t => t.idTarea).join(',');
            console.log('\n📊 Buscando avances mensuales registrados...');
            const avances = await sql.query(`
                SELECT idTarea, mes, anio, porcentajeMes, comentario, fechaActualizacion
                FROM p_TareaAvanceMensual
                WHERE idTarea IN (${ids})
                ORDER BY idTarea, anio, mes
            `);

            if (avances.recordset.length === 0) {
                console.log('ℹ️ No hay avances mensuales registrados aún.');
            } else {
                console.log(`✅ Se encontraron ${avances.recordset.length} registros de avance:`);
                console.table(avances.recordset);
            }
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await sql.close();
    }
}

checkLongTasks();
