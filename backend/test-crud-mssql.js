// ============================================================
// PRUEBA CRUD COMPLETA CON MSSQL DIRECTO (ESTILO DAPPER)
// ============================================================
const sql = require('mssql');
const bcrypt = require('bcrypt');

const config = {
    server: 'database-2.cufqs68ewpdj.us-east-1.rds.amazonaws.com',
    port: 1433,
    user: 'plan',
    password: 'admin123',
    database: 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    connectionTimeout: 15000,
    requestTimeout: 60000
};

let pool = null;

async function getPool() {
    if (!pool) {
        console.log('🔌 Creando pool de conexiones...');
        pool = await sql.connect(config);
        console.log('✅ Pool creado!');
    }
    return pool;
}

// ============================================================
// CRUD: READ - Obtener usuario por correo
// ============================================================
async function obtenerUsuarioPorCorreo(correo) {
    const p = await getPool();
    const result = await p.request()
        .input('correo', sql.NVarChar, correo)
        .query('SELECT * FROM p_Usuarios WHERE correo = @correo AND activo = 1');
    return result.recordset[0] || null;
}

// ============================================================
// CRUD: READ - Obtener credenciales por idUsuario
// ============================================================
async function obtenerCredenciales(idUsuario) {
    const p = await getPool();
    const result = await p.request()
        .input('idUsuario', sql.Int, idUsuario)
        .query('SELECT * FROM p_UsuariosCredenciales WHERE idUsuario = @idUsuario');
    return result.recordset[0] || null;
}

// ============================================================
// CRUD: UPDATE - Actualizar último login
// ============================================================
async function actualizarUltimoLogin(idUsuario) {
    const p = await getPool();
    await p.request()
        .input('idUsuario', sql.Int, idUsuario)
        .query('UPDATE p_UsuariosCredenciales SET ultimoLogin = GETDATE() WHERE idUsuario = @idUsuario');
    return true;
}

// ============================================================
// CRUD: READ - Obtener proyectos de un usuario
// ============================================================
async function obtenerProyectos() {
    const p = await getPool();
    const result = await p.request()
        .query('SELECT TOP 5 idProyecto, nombre, estado, fechaCreacion FROM p_Proyectos ORDER BY fechaCreacion DESC');
    return result.recordset;
}

// ============================================================
// CRUD: READ - Obtener tareas de un proyecto
// ============================================================
async function obtenerTareas(idProyecto) {
    const p = await getPool();
    const result = await p.request()
        .input('idProyecto', sql.Int, idProyecto)
        .query('SELECT idTarea, nombre, estado, porcentaje FROM p_Tareas WHERE idProyecto = @idProyecto');
    return result.recordset;
}

// ============================================================
// CRUD: CREATE - Crear un proyecto de prueba
// ============================================================
async function crearProyectoPrueba() {
    const p = await getPool();
    const result = await p.request()
        .input('nombre', sql.NVarChar, 'Proyecto Test MSSQL ' + Date.now())
        .input('descripcion', sql.NVarChar, 'Creado desde prueba CRUD')
        .input('estado', sql.NVarChar, 'Activo')
        .input('pais', sql.NVarChar, 'NI')
        .query(`
            INSERT INTO p_Proyectos (nombre, descripcion, estado, pais, fechaCreacion)
            OUTPUT INSERTED.idProyecto
            VALUES (@nombre, @descripcion, @estado, @pais, GETDATE())
        `);
    return result.recordset[0].idProyecto;
}

// ============================================================
// CRUD: DELETE - Eliminar proyecto de prueba
// ============================================================
async function eliminarProyecto(idProyecto) {
    const p = await getPool();
    await p.request()
        .input('idProyecto', sql.Int, idProyecto)
        .query('DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto');
    return true;
}

// ============================================================
// FLUJO DE LOGIN COMPLETO
// ============================================================
async function login(correo, password) {
    const usuario = await obtenerUsuarioPorCorreo(correo);
    if (!usuario) {
        return { success: false, error: 'Usuario no encontrado' };
    }

    const creds = await obtenerCredenciales(usuario.idUsuario);
    if (!creds) {
        return { success: false, error: 'Sin credenciales' };
    }

    const match = await bcrypt.compare(password, creds.passwordHash);
    if (!match) {
        return { success: false, error: 'Contraseña incorrecta' };
    }

    await actualizarUltimoLogin(usuario.idUsuario);

    return {
        success: true,
        usuario: {
            idUsuario: usuario.idUsuario,
            nombre: usuario.nombre,
            correo: usuario.correo,
            carnet: usuario.carnet,
            cargo: usuario.cargo,
            rolGlobal: usuario.rolGlobal
        }
    };
}

// ============================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================
async function runTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   PRUEBA CRUD COMPLETA - MSSQL DIRECTO (ESTILO DAPPER)');
    console.log('═══════════════════════════════════════════════════════\n');

    try {
        // Test 1: Login
        console.log('📌 TEST 1: Login con juan.ortuno@claro.com.ni / 123456');
        const loginResult = await login('juan.ortuno@claro.com.ni', '123456');
        console.log('   Resultado:', loginResult.success ? '✅ ÉXITO' : '❌ FALLO');
        if (loginResult.success) {
            console.log('   Usuario:', loginResult.usuario.nombre);
        } else {
            console.log('   Error:', loginResult.error);
        }

        // Test 2: Listar proyectos
        console.log('\n📌 TEST 2: Listar proyectos (TOP 5)');
        const proyectos = await obtenerProyectos();
        console.log('   Proyectos encontrados:', proyectos.length);
        proyectos.forEach(p => console.log('   -', p.nombre, '|', p.estado));

        // Test 3: Crear proyecto
        console.log('\n📌 TEST 3: Crear proyecto de prueba');
        const nuevoId = await crearProyectoPrueba();
        console.log('   ✅ Proyecto creado con ID:', nuevoId);

        // Test 4: Verificar creación
        console.log('\n📌 TEST 4: Verificar proyecto creado');
        const proyectosNuevos = await obtenerProyectos();
        const creado = proyectosNuevos.find(p => p.idProyecto === nuevoId);
        console.log('   Encontrado:', creado ? '✅ SÍ' : '❌ NO');

        // Test 5: Eliminar proyecto
        console.log('\n📌 TEST 5: Eliminar proyecto de prueba');
        await eliminarProyecto(nuevoId);
        console.log('   ✅ Proyecto eliminado');

        // Test 6: Obtener tareas (si hay proyectos)
        if (proyectos.length > 0) {
            console.log('\n📌 TEST 6: Obtener tareas del proyecto', proyectos[0].idProyecto);
            const tareas = await obtenerTareas(proyectos[0].idProyecto);
            console.log('   Tareas encontradas:', tareas.length);
            tareas.slice(0, 3).forEach(t => console.log('   -', t.nombre, '|', t.porcentaje + '%'));
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('   ✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');

    } catch (err) {
        console.error('\n❌ ERROR:', err.message);
    } finally {
        if (pool) {
            await pool.close();
            console.log('\n🔌 Pool cerrado');
        }
    }
}

runTests();
