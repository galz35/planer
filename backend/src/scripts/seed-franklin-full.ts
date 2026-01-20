
const API_URL = 'http://localhost:3000/api';
// Franklin or any specific user
const EMAIL = 'franklin.flores@claro.com.ni';
const PASS = '123456';

async function main() {
    console.log(`🚀 Seeding FULL scenario for ${EMAIL}...`);

    // 1. Login
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: EMAIL, password: PASS })
    });

    if (!res.ok) {
        console.error('Login Failed', res.status);
        return;
    }
    const json = await res.json();
    const token = json.data?.access_token;
    if (!token) return console.error('No token');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    const hoy = new Date().toISOString().split('T')[0];

    // 2. Checkin
    console.log('📝 Creating Checkin...');
    await fetch(`${API_URL}/checkins`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            fecha: hoy,
            entregableTexto: 'Completar migración de datos RRHH y pruebas',
            estadoAnimo: 'Energico',
            nota: 'Simulación manual dedicada para verificación.'
        })
    });

    // 3. Tasks (Analista Archetype)
    const tasks = [
        { t: 'Actualizar base de datos maestra', estado: 'Terminado' },
        { t: 'Generar reporte de indicadores', estado: 'En Progreso' },
        { t: 'Análisis de desviaciones', estado: 'Pendiente' },
        { t: 'Documentar proceso actualizado', estado: 'Pendiente' }
    ];

    let orden = 1;
    for (const t of tasks) {
        console.log(`📌 Creating Task: ${t.t}`);
        const resT = await fetch(`${API_URL}/tareas/rapida`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ titulo: t.t })
        });
        const jsonT = await resT.json();
        const dataT = jsonT.data;

        if (dataT?.idTarea) {
            // Foco
            await fetch(`${API_URL}/foco`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    idTarea: dataT.idTarea,
                    fecha: hoy,
                    orden: orden++,
                    esEstrategico: Math.random() > 0.7
                })
            });

            // Update Status
            let estadoBD = 'Pendiente';
            if (t.estado === 'En Progreso') estadoBD = 'En Curso'; // Check enum!
            if (t.estado === 'Terminado') estadoBD = 'Hecha'; // Check enum!

            // Correction: Enum values in TareaActualizarDto: 'Pendiente', 'EnCurso', 'Bloqueada', 'Revision', 'Hecha', 'Descartada'

            await fetch(`${API_URL}/tareas/${dataT.idTarea}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ estado: estadoBD })
            });
        }
    }

    // 4. Blockers
    console.log('⛔ Creating Blocker...');
    // Create a task to block
    const resB = await fetch(`${API_URL}/tareas/rapida`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ titulo: 'Tarea Bloqueada por IT' })
    });
    const jsonB = await resB.json();
    if (jsonB.data?.idTarea) {
        await fetch(`${API_URL}/bloqueos`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                idTarea: jsonB.data.idTarea,
                motivo: 'Esperando acceso a servidor de producción',
                estado: 'Activo',
                accionMitigacion: 'Avanzando en documentación local'
            })
        });
    }

    console.log('✨ Seed for Franklin COMPLETED.');
}

main().catch(console.error);
