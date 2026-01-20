import * as fs from 'fs';

const csvPath = 'd:\\planificacion\\rrhh.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const parseLine = (l: string) => l.split(';');
const employees = lines.slice(1).map(l => parseLine(l)).filter(p => p.length > 31);

const carnetMap = new Map();
employees.forEach(e => {
    const c = e[5];
    if (c) {
        carnetMap.set(c, {
            carnet: c,
            nombre: e[7],
            correo: e[8],
            cargo: e[9],
            idorg: e[60],
            jefe1: e[31],
            jefe2: e[37]
        });
    }
});

const targets = ['300042', '772', '666', '1005898'];
interface EmployeeData {
    carnet: string;
    nombre: string;
    correo: string;
    cargo: string;
    idorg: string;
    jefe1: string;
    jefe2: string;
    subs?: any[];
}
const results: EmployeeData[] = [];

targets.forEach(t => {
    const e = carnetMap.get(t);
    if (!e) {
        // Try searching by ID at start of line too
        const found = employees.find(p => p[0] === t);
        if (found) {
            const e2 = {
                carnet: found[5],
                nombre: found[7],
                correo: found[8],
                cargo: found[9],
                idorg: found[60],
                jefe1: found[31],
                jefe2: found[37]
            };
            results.push(e2);
        }
    } else {
        results.push(e);
    }
});

// For each target, find their subordinates (where they are jefe1)
results.forEach(r => {
    r.subs = employees
        .filter(p => p[31] === r.carnet)
        .map(p => ({
            carnet: p[5],
            nombre: p[7],
            cargo: p[9]
        }));
});

fs.writeFileSync('refined_hierarchy.json', JSON.stringify(results, null, 2));
console.log('Refined hierarchy saved.');
