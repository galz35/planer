const fs = require('fs');
const path = require('path');

const csvPath = 'd:/planificacion/rrhh.csv';

console.log(`📂 Testing CSV Read from: ${csvPath}`);

if (!fs.existsSync(csvPath)) {
    console.error('❌ File does not exist!');
    process.exit(1);
}

try {
    // Try latin1 as in the service
    const content = fs.readFileSync(csvPath, { encoding: 'latin1' });
    console.log(`✅ File read. Total length: ${content.length} chars`);

    const lines = content.split(/\r?\n/);
    console.log(`📊 Total lines found: ${lines.length}`);

    if (lines.length > 0) {
        console.log(`header raw: ${lines[0]}`);
        const headers = lines[0].split(';');
        console.log(`Detected headers (${headers.length}):`, headers);

        // Check finding 'correo' and 'carnet'
        const idxCorreo = headers.findIndex(h => h.trim() === 'correo');
        const idxCarnet = headers.findIndex(h => h.trim() === 'carnet');
        console.log(`Index correo: ${idxCorreo}`);
        console.log(`Index carnet: ${idxCarnet}`);

        if (lines.length > 1) {
            console.log(`First data row raw: ${lines[1]}`);
            const row = lines[1].split(';');
            console.log(`Parsed row 1 columns: ${row ? row.length : 0}`);
            if (row && idxCorreo >= 0) console.log(`Value correo: ${row[idxCorreo]}`);
            if (row && idxCarnet >= 0) console.log(`Value carnet: ${row[idxCarnet]}`);
        }
    }
} catch (e) {
    console.error('❌ Error reading file:', e);
}
