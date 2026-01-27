
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        requestTimeout: 120000
    }
};

async function run() {
    const sqlPath = "d:\\planificacion\\respaldo sql server\\chatgpt sql mejorado revisa vs original.sql";

    if (!fs.existsSync(sqlPath)) {
        console.error("El archivo SQL no existe:", sqlPath);
        process.exit(1);
    }

    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("🔌 Conectando a SQL Server...");
        const pool = await sql.connect(config);

        // 1. Ejecutar DDL (Indices y SPs _test)
        // Separar por GO (case insensitive, multiline)
        const batches = sqlContent.split(/^\s*GO\s*$/gmi);

        console.log(`📜 Ejecutando script de configuración (${batches.length} lotes)...`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch.length > 0) {
                try {
                    // Ignorar la parte del benchmark del archivo original, nosotros haremos uno propio
                    if (batch.includes("Ejecutando BENCHMARK")) {
                        console.log("   -> Saltando benchmark interno del script (haremos uno comparativo)...");
                        break;
                    }

                    await pool.request().query(batch);
                    // console.log(`   ✅ Lote ${i+1} OK`);
                } catch (e: any) {
                    // Ignorar errores de indices ya existentes
                    if (e.message.includes('already exists') || e.message.includes('duplicate')) {
                        // console.log(`   ⚠️ Nota en lote ${i+1}: Indice/Objeto ya existe.`);
                    } else {
                        console.error(`   ❌ Error en lote ${i + 1}:`, e.message);
                        console.error(`      Contenido: ${batch.substring(0, 200)}...`);
                    }
                }
            }
        }

        console.log("\n🚀 Ejecutando BENCHMARK COMPARATIVO (Original vs Test)...");
        console.log("   (Corriendo 3 veces cada prueba para promediar)\n");

        // 2. Ejecutar Benchmark Comparativo
        const benchSQL = `
            SET NOCOUNT ON;
            DECLARE @carnet NVARCHAR(50) = N'500708';
            DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
            DECLARE @mes INT = MONTH(GETDATE());
            DECLARE @anio INT = YEAR(GETDATE());
            DECLARE @carnetsList NVARCHAR(MAX) = @carnet;

            IF OBJECT_ID('tempdb..#BenchFinal') IS NOT NULL DROP TABLE #BenchFinal;
            CREATE TABLE #BenchFinal(
                Category NVARCHAR(50), 
                Type NVARCHAR(10), 
                ms INT
            );
            
            DECLARE @t0 DATETIME2(7);
            DECLARE @i INT = 1;

            WHILE @i <= 3 
            BEGIN
                -- 1. PROYECTOS
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_ObtenerProyectos @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('01. Proyectos', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_ObtenerProyectos_test @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('01. Proyectos', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));

                -- 2. TAREAS
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Tareas_ObtenerPorUsuario @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('02. Tareas', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Tareas_ObtenerPorUsuario_test @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('02. Tareas', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));

                -- 3. KPIS
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Dashboard_Kpis @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('03. KPIs', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Dashboard_Kpis_test @carnet=@carnet; 
                INSERT INTO #BenchFinal VALUES ('03. KPIs', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                -- 4. PLANNING
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Planning_ObtenerPlanes @carnet=@carnet, @mes=@mes, @anio=@anio; 
                INSERT INTO #BenchFinal VALUES ('04. Planning', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Planning_ObtenerPlanes_test @carnet=@carnet, @mes=@mes, @anio=@anio; 
                INSERT INTO #BenchFinal VALUES ('04. Planning', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));

                 -- 5. EQUIPO
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Equipo_ObtenerInforme @carnetsList=@carnetsList, @fecha=@hoy; 
                INSERT INTO #BenchFinal VALUES ('05. Equipo', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Equipo_ObtenerInforme_test @carnetsList=@carnetsList, @fecha=@hoy; 
                INSERT INTO #BenchFinal VALUES ('05. Equipo', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));

                -- 6. USUARIOS
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Usuarios_ObtenerPorLista @carnetsList=@carnetsList;
                INSERT INTO #BenchFinal VALUES ('06. Usuarios', 'ORIG', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));
                
                SET @t0 = SYSDATETIME(); EXEC dbo.sp_Usuarios_ObtenerPorLista_test @carnetsList=@carnetsList;
                INSERT INTO #BenchFinal VALUES ('06. Usuarios', 'TEST', DATEDIFF(MILLISECOND, @t0, SYSDATETIME()));

                SET @i = @i + 1;
            END

            SELECT 
                Category, 
                MAX(CASE WHEN Type='ORIG' THEN msAvg ELSE 0 END) as Orig_ms,
                MAX(CASE WHEN Type='TEST' THEN msAvg ELSE 0 END) as Test_ms,
                MAX(CASE WHEN Type='ORIG' THEN msAvg ELSE 0 END) - MAX(CASE WHEN Type='TEST' THEN msAvg ELSE 0 END) as Diff_ms
            FROM (
                SELECT Category, Type, AVG(ms) as msAvg 
                FROM #BenchFinal 
                GROUP BY Category, Type
            ) src
            GROUP BY Category
            ORDER BY Category;
        `;

        const res = await pool.request().query(benchSQL);

        console.log("\nRESULTADOS (Milisegundos Promedio):");
        console.log("-------------------------------------------------------------");
        console.log("Categoría             | Orig (ms) | Test (ms) | Mejora (ms)");
        console.log("-------------------------------------------------------------");

        const results = res.recordsets[res.recordsets.length - 1];
        console.log("Recordsets count:", res.recordsets.length);
        console.log("Last recordset items:", results.length);
        console.log(JSON.stringify(results, null, 2));

        results.forEach((r: any) => {
            // console.log(r); // Debug
            const cat = (r.Category || "Unknown").padEnd(21);
            const orig = (r.Orig_ms ?? 0).toString().padStart(9);
            const test = (r.Test_ms ?? 0).toString().padStart(9);
            const diff = (r.Diff_ms ?? r.diff_ms ?? ((r.Orig_ms || 0) - (r.Test_ms || 0)));
            const diffStr = diff.toString().padStart(11);
            console.log(`${cat} | ${orig} | ${test} | ${diffStr}`);
        });
        console.log("-------------------------------------------------------------");

        await pool.close();
        console.log("\n✅ Benchmark completado.");

    } catch (err) {
        console.error("Error fatal:", err);
        process.exit(1);
    }
}
run();
