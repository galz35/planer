const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function run() {
    try {
        await sql.connect(config);

        // Ver todos los proyectos con sus áreas
        const proyectos = await sql.query("SELECT idProyecto, LEFT(nombre, 30) as nombre, gerencia FROM p_Proyectos");
        console.log('Proyectos y sus gerencias:');
        proyectos.recordset.forEach(p => {
            console.log(`  ${p.idProyecto}: ${p.nombre} -> Ger: ${p.gerencia || 'NULL'}`);
        });

        // Ver la gerencia del usuario 41
        const user = await sql.query("SELECT gerencia FROM p_Usuarios WHERE idUsuario = 41");
        console.log('\nGerencia del user 41:', user.recordset[0].gerencia);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
