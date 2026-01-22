require('dotenv').config();
const sql = require('mssql');

async function testQuery() {
    const config = {
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        server: process.env.MSSQL_HOST,
        database: process.env.MSSQL_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: true,
            connectTimeout: 30000 // 30 seconds
        }
    };

    try {
        await sql.connect(config);
        console.log('Connected to MSSQL');

        const query = `
            SELECT
                LTRIM(RTRIM(ISNULL(ogerencia, '')))      AS gerencia,
                LTRIM(RTRIM(ISNULL(subgerencia, '')))    AS subgerencia,
                LTRIM(RTRIM(ISNULL(primer_nivel, '')))   AS area
            FROM dbo.p_Usuarios
            WHERE activo = 1
            GROUP BY
                LTRIM(RTRIM(ISNULL(ogerencia, ''))),
                LTRIM(RTRIM(ISNULL(subgerencia, ''))),
                LTRIM(RTRIM(ISNULL(primer_nivel, '')))
            ORDER BY 1,2,3;
        `;

        const result = await sql.query(query);
        console.log('Results found:', result.recordset.length);
        console.log(JSON.stringify(result.recordset, null, 2));

    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await sql.close();
    }
}

testQuery();
