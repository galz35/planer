import * as fs from 'fs';

const csvPath = 'd:\\planificacion\\rrhh.csv';
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const parseLine = (l) => l.split(';');

const searchTerms = [
    'EDGARDO', 'PABLO CRUZ', 'ALI RODRIGUEZ', // Transporte?
    'YESENIA', 'KEVIN', 'FRANCIS', 'ARLEN', // Reclutamiento?
    'ALLAM', 'MILCY', 'JILMA', 'BRAYAM', 'BELKY', 'SERGIO', // Capacitacion
    'AURORA', 'LINDA URBINA', 'KEVIN TORREZ', // Compensacion
    'MARIO', 'JAVIER', // Nomina
    'TANIA'
];

const found: any[] = [];

lines.slice(1).forEach(l => {
    const p = parseLine(l);
    if (p.length < 10) return;

    const name = p[7] || '';
    const carnet = p[5];
    const cargo = p[9];
    const jefeCarnet = p[31];
    const jefeName = p[27];
    const area = p[21] || p[22] || p[23]; // Try to get department info

    // Check if name matches any search term
    const match = searchTerms.some(term => name.toUpperCase().includes(term));
    if (match) {
        found.push({
            carnet,
            nombre: name,
            cargo,
            jefeCarnet,
            jefeName,
            area
        });
    }
});


fs.writeFileSync('users_found_clean.json', JSON.stringify(found, null, 2));
console.log('Saved to users_found_clean.json');

