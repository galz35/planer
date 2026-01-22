import * as fs from 'fs';
import * as readline from 'readline';

const INPUT_FILE = 'd:\\planificacion\\database\\empleado y organizacion';

async function probe() {
    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let count = 0;
    for await (const line of rl) {
        if (line.includes('INSERT [dbo].[EMP2024]')) {
            const valuesPart = line.split('VALUES (')[1];
            if (!valuesPart) continue;
            // Split by comma attempting to respect quotes minimally
            const parts = valuesPart.split(/, (?=N'|CAST|NULL|\d)/).map(p => p.replace(/^N'|'$/g, '').replace(/'$/, '').trim());

            // Print sample to identify date columns
            // Look for date formats YYYY-MM-DD
            const dateLike = parts.map((p, i) => ({ i, val: p })).filter(x => x.val.match(/^\d{4}-\d{2}-\d{2}/));

            if (parts[75] !== 'NULL' || parts[74] !== 'NULL') {
                console.log('--- Muestra con Fechas ---');
                console.log(`Email: ${parts[8]}`);
                console.log(`[74]: ${parts[74]}`);
                console.log(`[75]: ${parts[75]}`);
                console.log(`[76]: ${parts[76]}`);
                count++;
            }
            if (count > 5) break;
        }
    }
}
probe();
