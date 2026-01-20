import * as fs from 'fs';

const csvPath = 'd:\\planificacion\\rrhh.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const header = lines[0].split(',');

// Search for the indices of important columns based on what we see in the file
// Often carnets are the first or second numeric columns.
// Let's print the header and the row for Ortuño 300042

console.log('Header:', header.join(' | '));

const ortunoRow = lines.find(l => l.includes('300042'));
if (ortunoRow) {
    console.log('Ortuño Row:', ortunoRow);
    const parts = ortunoRow.split(',');
    parts.forEach((p, i) => console.log(`[${i}] ${header[i] || '?'}: ${p}`));
}

const findByCarnet = (carnet: string) => {
    const row = lines.find(l => l.startsWith(carnet + ','));
    if (row) {
        const parts = row.split(',');
        return {
            carnet: parts[0],
            nombre: parts[7], // Based on visual inspection of previous output
            idorg: parts[14],
            jefe1: parts[15],
            jefe2: parts[16]
        };
    }
    return null;
};

const names = ['300042', '000772', '000666', '1005898'];
names.forEach(c => {
    const data = findByCarnet(c);
    if (data) console.log(`DATA FOR ${c}:`, data);
});
