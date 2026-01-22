const API_URL = 'http://localhost:3000/api';
const EMAIL_SUB = 'franklin.flores@claro.com.ni';
const PASS = '123456';
const EMAIL_BOSS = 'juan.ortuno@claro.com.ni'; // Assuming he is the boss or Admin
// If Juan is not Admin/Boss of Franklin, this might fail on hierarchy check, but let's try.

async function main() {
    console.log(`🚀 Testing Work Plan Full Flow...`);

    // 1. Login Subordinate
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: EMAIL_SUB, password: PASS })
    });
    const jsonSub = await res.json();
    const tokenSub = jsonSub.data?.access_token;
    const headersSub = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSub}` };
    const idSub = jsonSub.data.usuario.idUsuario;

    const month = 3; // March
    const year = 2026;

    // 2. Create Task
    console.log('📌 [Sub] Creating task...');
    const t1 = await fetch(`${API_URL}/tareas/rapida`, {
        method: 'POST', headers: headersSub,
        body: JSON.stringify({ titulo: 'Task to Change' })
    }).then(r => r.json());
    const idTarea = t1.data.idTarea;

    // 3. Create & Confirm Plan
    console.log('📅 [Sub] Creating & Confirming Plan...');
    const planRes = await fetch(`${API_URL}/planning/plans`, {
        method: 'POST', headers: headersSub,
        body: JSON.stringify({
            idUsuario: idSub, mes: month, anio: year,
            nombre: 'Plan Locked Test',
            tareasIds: [idTarea],
            estado: 'Confirmado' // Locking it immediately
        })
    });
    console.log('Plan Upsert Status:', planRes.status);

    // 4. Try Direct Edit (Should Fail)
    console.log('🛑 [Sub] Attempting forbidden edit...');
    const editRes = await fetch(`${API_URL}/planning/update-operative`, {
        method: 'POST', headers: headersSub,
        body: JSON.stringify({ idTarea, updates: { titulo: 'Hacked Title' } })
    });
    console.log('Direct Edit Status (Expect 403):', editRes.status);

    // 5. Request Change
    console.log('📝 [Sub] Requesting Change...');
    const reqRes = await fetch(`${API_URL}/planning/request-change`, {
        method: 'POST', headers: headersSub,
        body: JSON.stringify({
            idTarea, campo: 'titulo', valorNuevo: 'Title Approved via Flow', motivo: 'Typo correction'
        })
    });
    console.log('Request Status:', reqRes.status);

    // 6. Login Boss
    console.log('🔑 [Boss] Logging in...');
    const resBoss = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: EMAIL_BOSS, password: PASS })
    });
    const jsonBoss = await resBoss.json();
    const headersBoss = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jsonBoss.data.access_token}` };

    // 7. View Pending
    console.log('👀 [Boss] Checking Inbox...');
    const pendingRes = await fetch(`${API_URL}/planning/pending`, { headers: headersBoss });
    const pending = await pendingRes.json();
    console.log('Pending Requests:', pending.length);
    const myReq = pending.find((r: any) => r.idTarea === idTarea);

    if (myReq) {
        // 8. Approve
        console.log('✅ [Boss] Approving Request...');
        const resolveRes = await fetch(`${API_URL}/planning/resolve`, {
            method: 'POST', headers: headersBoss,
            body: JSON.stringify({ idSolicitud: myReq.idSolicitud, accion: 'Aprobar' })
        });
        console.log('Resolve Status:', resolveRes.status);

        // 9. Verify
        const verifyRes = await fetch(`${API_URL}/planning/plans?mes=${month}&anio=${year}&idUsuario=${idSub}`, { headers: headersBoss });
        const planData = await verifyRes.json();
        // The API returns array of plans
        const taskUpdated = planData[0].tareas.find((t: any) => t.idTarea === idTarea);
        console.log('Task Title After Approval:', taskUpdated.titulo);

        // 10. Close Plan (Month End)
        console.log('🔒 [Boss] Closing Plan for Month End...');
        const planId = planData[0].idPlan;
        const closeRes = await fetch(`${API_URL}/planning/plans/${planId}/close`, {
            method: 'POST', headers: headersBoss
        });
        console.log('Close Status:', closeRes.status);

        // 11. Verify Closed State
        const finalRes = await fetch(`${API_URL}/planning/plans?mes=${month}&anio=${year}&idUsuario=${idSub}`, { headers: headersBoss });
        const finalData = await finalRes.json();
        const finalPlan = finalData.find((p: any) => p.idPlan === planId);
        console.log('Final Plan State:', finalPlan.estado);
        console.log('Final Plan Summary:', finalPlan.resumenCierre);
    } else {
        console.error('Request not found in Boss Inbox. Hierarchy check might have failed.');
    }
}

main().catch(console.error);
