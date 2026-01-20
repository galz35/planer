
const { DataSource } = require('typeorm');
require('dotenv').config();

async function addDatesToProjects() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await ds.initialize();
        console.log('Adding headers...');

        // Add columns if they don't exist
        await ds.query(`ALTER TABLE "p_Proyectos" ADD COLUMN IF NOT EXISTS "fechaInicio" TIMESTAMP`);
        await ds.query(`ALTER TABLE "p_Proyectos" ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP`);

        console.log('Columns added successfully.');

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

addDatesToProjects();
