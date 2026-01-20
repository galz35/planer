
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();
async function main() {
    const ds = new DataSource({
        type: 'postgres', host: process.env.DB_HOST, port: 5432, username: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME
    });
    await ds.initialize();
    await ds.query('UPDATE p_empleados SET carnet_jefe1 = $1 WHERE carnet = $2', ['USR-1353', 'EMP899']);
    console.log('DONE: Candida (USR-1353) is boss of Gustavo (EMP899)');
    await ds.destroy();
}
main();
