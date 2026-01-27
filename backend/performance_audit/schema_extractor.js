const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

const OUTPUT_FILE = path.join(__dirname, `schema_dump_${Date.now()}.md`);

async function extractSchema() {
    console.log('Extracting Schema & Index Information (v2 - Flat Query)...');
    let pool;
    try {
        pool = await sql.connect(config);

        // Query to get all user tables
        const tablesRes = await pool.request().query(`
            SELECT t.name 
            FROM sys.tables t
            WHERE t.name LIKE 'p_%' OR t.name LIKE 'sp_%' OR t.name LIKE 'tvp_%'
            ORDER BY t.name
        `);

        const tables = tablesRes.recordset.map(t => t.name);

        let mdContent = `# Database Schema Documentation\n\n**Date:** ${new Date().toLocaleString()}\n\n`;

        for (const tableName of tables) {
            console.log(`Processing ${tableName}...`);
            mdContent += `## Table: ${tableName}\n\n`;

            // Get Columns
            const colsRes = await pool.request()
                .input('tableName', sql.NVarChar, tableName)
                .query(`
                    SELECT 
                        c.name as ColumnName,
                        ty.name as DataType,
                        c.max_length as MaxLength,
                        c.is_nullable as IsNullable,
                        c.is_identity as IsIdentity
                    FROM sys.columns c
                    JOIN sys.types ty ON c.user_type_id = ty.user_type_id
                    WHERE object_id = OBJECT_ID(@tableName)
                    ORDER BY c.column_id
                `);

            mdContent += `### Columns\n| Column | Type | Length | Nullable | Identity |\n|---|---|---|---|---|\n`;
            if (colsRes.recordset.length > 0) {
                for (const col of colsRes.recordset) {
                    mdContent += `| ${col.ColumnName} | ${col.DataType} | ${col.MaxLength} | ${col.IsNullable ? 'YES' : 'NO'} | ${col.IsIdentity ? 'YES' : 'NO'} |\n`;
                }
            } else {
                mdContent += `| - | - | - | - | - |\n`;
            }

            mdContent += `\n`;

            // Get Indexes (Flat)
            const idxRes = await pool.request()
                .input('tableName', sql.NVarChar, tableName)
                .query(`
                   SELECT 
                        i.name AS IndexName,
                        i.type_desc AS IndexType,
                        i.is_unique,
                        i.is_primary_key,
                        c.name AS ColumnName,
                        ic.is_included_column,
                        ic.is_descending_key,
                        ic.key_ordinal,
                        ic.index_column_id
                    FROM sys.indexes i
                    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                    INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                    WHERE i.object_id = OBJECT_ID(@tableName)
                    ORDER BY i.name, ic.key_ordinal, ic.index_column_id
                `);

            if (idxRes.recordset.length > 0) {
                mdContent += `### Indexes\n| Index Name | Type | Unique | Primary | Columns | Included |\n|---|---|---|---|---|---|\n`;

                // Group by Index Name
                const indexes = {};
                for (const row of idxRes.recordset) {
                    if (!indexes[row.IndexName]) {
                        indexes[row.IndexName] = {
                            type: row.IndexType,
                            isUnique: row.is_unique,
                            isPrimary: row.is_primary_key,
                            columns: [],
                            included: []
                        };
                    }
                    if (row.is_included_column) {
                        indexes[row.IndexName].included.push(row.ColumnName);
                    } else {
                        const colName = row.ColumnName + (row.is_descending_key ? ' DESC' : '');
                        indexes[row.IndexName].columns.push(colName);
                    }
                }

                for (const [name, idx] of Object.entries(indexes)) {
                    const cols = idx.columns.join(', ');
                    const incs = idx.included.length > 0 ? idx.included.join(', ') : '-';
                    mdContent += `| ${name} | ${idx.type} | ${idx.isUnique ? 'YES' : 'NO'} | ${idx.isPrimary ? 'YES' : 'NO'} | ${cols} | ${incs} |\n`;
                }
            } else {
                mdContent += `*No indexes found.*\n`;
            }
            mdContent += `\n---\n\n`;
        }

        fs.writeFileSync(OUTPUT_FILE, mdContent);
        console.log(`Schema dump saved to: ${OUTPUT_FILE}`);

    } catch (err) {
        console.error('Error extracting schema:', err);
    } finally {
        if (pool) await pool.close();
    }
}

extractSchema();
