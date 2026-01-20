import * as fs from 'fs';

const csvPath = 'd:\\planificacion\\rrhh.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');
const header = lines[0].split(',');

const parseLine = (l: string) => {
    // Basic CSV parser that handles internal quotes if any
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < l.length; i++) {
        const char = l[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.trim());
    return parts;
};

const targetCarnets = ['300042', '000772', '000666', '1005898'];
const employees = lines.slice(1).map(l => parseLine(l)).filter(p => p.length > 5);

console.log('--- TARGET EMPLOYEES ---');
targetCarnets.forEach(c => {
    const e = employees.find(p => p[5] === c);
    if (e) {
        console.log(`Carnet: ${e[5]}, Nombre: ${e[7]}, Jefe1: ${e[25]}`);
    } else {
        // Try searching anywhere in line for partial match if not at index 5
        const partial = lines.find(l => l.includes(c));
        if (partial) {
            const parsed = parseLine(partial);
            console.log(`Partial found for ${c}: Carnet: ${parsed[5]}, Nombre: ${parsed[7]}, Jefe1: ${parsed[25]}`);
        }
    }
});

console.log('\n--- HIERARCHY ANALYSIS ---');
targetCarnets.forEach(c => {
    const subs = employees.filter(p => p[25] === c);
    if (subs.length > 0) {
        console.log(`\nSubordinados de ${c}:`);
        subs.forEach(s => console.log(` - ${s[5]} | ${s[7]} | ${s[8]}`));
    }
});
