
const { DataSource } = require('typeorm');
require('dotenv').config();

async function checkQuotes() {
    const ds = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        synchronize: false,
    });

    try {
        await ds.initialize();
        console.log('Testing with quotes...');
        try {
            await ds.query("SELECT \"rolGlobal\" FROM \"p_Usuarios\" LIMIT 1");
            console.log('SUCCESS with "rolGlobal"');
        } catch (e) { console.log('FAIL with "rolGlobal": ' + e.message); }

        console.log('Testing without quotes...');
        try {
            await ds.query("SELECT rolGlobal FROM \"p_Usuarios\" LIMIT 1");
            console.log('SUCCESS without quotes');
        } catch (e) { console.log('FAIL without quotes: ' + e.message); }

        console.log('Testing jefeCarnet with quotes...');
        try {
            await ds.query("SELECT \"jefeCarnet\" FROM \"p_Usuarios\" LIMIT 1");
            console.log('SUCCESS with "jefeCarnet"');
        } catch (e) { console.log('FAIL with "jefeCarnet": ' + e.message); }

    } catch (e) {
        console.error(e);
    } finally {
        await ds.destroy();
    }
}

checkQuotes();
