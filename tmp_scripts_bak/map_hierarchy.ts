import * as fs from 'fs';

const csvPath = 'd:\\planificacion\\rrhh.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const parseLine = (l) => l.split(';');

const employees = lines.slice(1).map(l => parseLine(l)).filter(p => p.length > 5);

// Build map: carnet -> employee data
const carnetMap = new Map();
employees.forEach(e => {
    carnetMap.set(e[5], {
        carnet: e[5],
        nombre: e[7],
        cargo: e[8],
        idorg: e[21],
        jefe1: e[25] ? e[25].replace(/"/g, '').trim() : null
    });
});

console.log('Total employees found:', carnetMap.size);

// Find the target nodes
// Find the target nodes
const targets = ['300042', '772', '666', '1005898'];
const output: any[] = [];

targets.forEach(c => {
    const e = carnetMap.get(c);
    if (e) {
        const subs = employees.filter(p => p[25] && p[25].replace(/"/g, '').trim() === c);
        output.push({
            ...e,
            subordinates: subs.map(s => ({
                carnet: s[5],
                nombre: s[7],
                cargo: s[8]
            }))
        });
    }
});

fs.writeFileSync('hierarchy_map.json', JSON.stringify(output, null, 2));
console.log('Hierarchy map saved to hierarchy_map.json');
