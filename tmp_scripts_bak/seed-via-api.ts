
const fs = require('fs');
const API_URL = 'http://localhost:3000/api';

// --- ARQUETIPOS DE TAREAS POR ROL/CARGO ---
interface TareaArquetipo {
    t: string;
    estado: string;
    bloqueo?: string;
    esVictoria?: boolean;
}

const ARQUETIPOS: Record<string, TareaArquetipo[]> = {
    'GERENTE': [
        { t: 'Revisión de KPIs mensuales', estado: 'En Progreso' },
        { t: 'Aprobación de presupuesto Q1', estado: 'Pendiente', bloqueo: 'Falta firma de Dirección Financiera' },
        { t: 'Reunión estratégica con Directores', estado: 'Terminado', esVictoria: true },
        { t: 'Validar plan de vacaciones del equipo', estado: 'Pendiente' }
    ],
    'LIDER': [
        { t: 'Supervisar avance del equipo', estado: 'En Progreso' },
        { t: 'Resolver incidencias operativas', estado: 'En Progreso', bloqueo: 'Sistema lento hoy' },
        { t: 'Reporte de cierre semanal', estado: 'Terminado' },
        { t: 'Feedback 1:1 con analistas', estado: 'Pendiente' }
    ],
    'ANALISTA': [
        { t: 'Actualizar base de datos maestra', estado: 'Terminado' },
        { t: 'Generar reporte de indicadores', estado: 'En Progreso' },
        { t: 'Análisis de desviaciones', estado: 'Pendiente' },
        { t: 'Documentar proceso actualizado', estado: 'Pendiente' }
    ],
    'ESPECIALISTA': [
        { t: 'Coordinar logística del evento', estado: 'En Progreso' },
        { t: 'Contactar proveedores externos', estado: 'Terminado' },
        { t: 'Diseñar material entregable', estado: 'Pendiente' }
    ],
    'CONDUCTOR': [
        { t: 'Ruta matutina de personal', estado: 'Terminado' },
        { t: 'Llevar vehículo a mantenimiento', estado: 'Pendiente', bloqueo: 'Taller sin cupo' },
        { t: 'Liquidación de combustible', estado: 'En Progreso' }
    ],
    'PASANTE': [
        { t: 'Apoyo en archivo físico', estado: 'En Progreso' },
        { t: 'Captura de datos de encuestas', estado: 'Terminado' },
        { t: 'Organizar sala de reuniones', estado: 'Terminado', esVictoria: true }
    ],
    'SOPORTE': [
        { t: 'Atender tickets de nivel 1', estado: 'En Progreso' },
        { t: 'Mantenimiento de impresoras', estado: 'Terminado' },
        { t: 'Configurar equipos nuevos', estado: 'Pendiente' }
    ]
};

function determinarArquetipo(cargo: string, nombre: string): string {
    const c = cargo.toUpperCase();
    if (c.includes('GERENTE') || c.includes('DIRECTOR')) return 'GERENTE';
    if (c.includes('COORD') || c.includes('JEFE') || c.includes('SUPERVISOR') || c.includes('LIDER')) return 'LIDER';
    if (c.includes('CONDUCTOR') || c.includes('CHOFER')) return 'CONDUCTOR';
    if (c.includes('PASANTE') || c.includes('BECARIO')) return 'PASANTE';
    if (c.includes('SOPORTE') || c.includes('TECNICO')) return 'SOPORTE';
    if (c.includes('ESPECIALISTA') || c.includes('CAPACITADOR') || c.includes('RECLUTADOR')) return 'ESPECIALISTA';
    return 'ANALISTA';
}

async function login(correo: string): Promise<string | null> {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password: '123456' })
        });

        if (!res.ok) {
            console.error(`Login Failed for ${correo}: ${res.status}`);
            return null;
        }

        const json: any = await res.json();
        // TransformInterceptor wrapper handling
        const data = json.data;

        if (!data || !data.access_token) {
            console.error('Login OK but no token found in structure:', JSON.stringify(json).substring(0, 200));
            return null;
        }
        return data.access_token;
    } catch (e: any) {
        console.error('Login Error:', e.message);
        return null;
    }
}

async function getUsuarios(tokenAdmin: string): Promise<any[]> {
    const res = await fetch(`${API_URL}/admin/usuarios?limit=100`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    const json: any = await res.json();
    return json.data ? (json.data.items || []) : [];
}

async function main() {
    console.log('🚀 Iniciando Simulación Masiva "Total Immersion"...');

    console.log('🔑 Obteniendo lista maestra de empleados...');
    const tokenAdmin = await login('gustavo.lira@claro.com.ni');
    if (!tokenAdmin) {
        console.error('❌ No se pudo loguear como Admin. Abortando.');
        return;
    }

    const usuarios = await getUsuarios(tokenAdmin);
    console.log(`👥 Se encontraron ${usuarios.length} empleados activos.`);

    const hoy = new Date().toISOString().split('T')[0];

    for (const u of usuarios) {
        console.log(`\n🎭 Simulando: ${u.nombre} (${u.cargo || 'Sin Cargo'})`);
        const token = await login(u.correo);
        if (!token) {
            console.log(`   ⚠️ Login fallido para ${u.correo}.`);
            continue;
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        const arquetipo = determinarArquetipo(u.cargo || '', u.nombre);
        console.log(`   🛠️ Rol Simulado: ${arquetipo}`);

        const tareasModelo = ARQUETIPOS[arquetipo];
        const animos = ['Motivado', 'Normal', 'Energico', 'Cansado', 'Estresado'];
        const animo = animos[Math.floor(Math.random() * animos.length)];

        // A) CHECKIN
        await fetch(`${API_URL}/checkins`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                fecha: hoy,
                entregableTexto: `Objetivos del día (${arquetipo})`,
                estadoAnimo: animo,
                nota: `Simulación operativa rol ${arquetipo}`
            })
        });

        // B) TAREAS
        let orden = 1;
        const tareasMezcladas = [...tareasModelo].sort(() => Math.random() - 0.5);

        for (const t of tareasMezcladas) {
            // Tarea Rápida
            const resT = await fetch(`${API_URL}/tareas/rapida`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ titulo: t.t })
            });
            const jsonT: any = await resT.json();
            const dataT = jsonT.data;

            if (dataT && dataT.idTarea) {
                // Agregar a Foco
                await fetch(`${API_URL}/foco`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        idTarea: dataT.idTarea,
                        fecha: hoy,
                        orden: orden++,
                        esEstrategico: Math.random() > 0.8
                    })
                });

                // Estado
                let estadoBD = 'Pendiente';
                if (t.estado === 'En Progreso') estadoBD = 'En Progreso';
                if (t.estado === 'Terminado') estadoBD = 'Completada';

                await fetch(`${API_URL}/tareas/${dataT.idTarea}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ estado: estadoBD })
                });

                // Bloqueo
                if (t.bloqueo && Math.random() > 0.3) {
                    await fetch(`${API_URL}/bloqueos`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            idTarea: dataT.idTarea,
                            motivo: t.bloqueo,
                            estado: 'Activo'
                        })
                    });
                    console.log(`   ⛔ Bloqueo registrado.`);
                }
            }
        }
    }
    console.log('\n✨ Simulación Masiva Completada.');
}

main().catch(console.error);
