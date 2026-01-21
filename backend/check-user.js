const { Client } = require('pg');

async function check() {
    const c = new Client({
        host: 'localhost',
        port: 5432,
        database: 'clarity_dev',
        user: 'clarity_user',
        password: 'clarity_pass'
    });

    await c.connect();

    // Check juan.ortuno's role
    const user = await c.query(`
        SELECT "idUsuario", nombre, "rolGlobal", carnet, cargo 
        FROM "p_Usuarios" 
        WHERE correo = 'juan.ortuno@claro.com.ni'
    `);
    console.log('=== Usuario Juan Ortuño ===');
    console.log(JSON.stringify(user.rows, null, 2));

    await c.end();
}

check().catch(console.error);
