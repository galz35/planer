
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
dotenv.config();
const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: true,
    extra: { ssl: { rejectUnauthorized: false } },
    connectTimeoutMS: 60000,
});
async function main() {
    await ds.initialize();

    const tables = ['p_Checkins', 'p_FocoDiario', 'p_Tareas', 'p_Bloqueos', 'p_Notas'];
    for (const t of tables) {
        const res = await ds.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}'`);
        console.log(`\n📚 ${t}: ${res.map(r => r.column_name).join(', ')}`);
    }

    await ds.destroy();
}
main().catch(console.error);
