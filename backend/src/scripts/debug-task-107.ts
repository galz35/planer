import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    await ds.initialize();

    console.log('--- BUSCANDO TAREA 107 ---');
    const t = await ds.query('SELECT * FROM "p_Tareas" WHERE "idTarea" = 107');
    console.log('Tarea 107:', JSON.stringify(t[0], null, 2));

    if (t[0] && t[0].idProyecto) {
        const p = await ds.query('SELECT * FROM "p_Proyectos" WHERE "idProyecto" = $1', [t[0].idProyecto]);
        console.log('Proyecto Tarea 107:', JSON.stringify(p[0], null, 2));
    }

    console.log('--- BUSCANDO TAREA "Revisar presupuesto Q1" ---');
    const t2 = await ds.query('SELECT * FROM "p_Tareas" WHERE titulo LIKE \'%presupuesto Q1%\'');
    console.log('Tarea Presupuesto:', JSON.stringify(t2[0], null, 2));

    await ds.destroy();
}

run().catch(console.error);
