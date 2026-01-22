const sql = require('mssql');
const config = {
    user: 'plan',
    password: 'admin123',
    server: '54.146.235.205',
    database: 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

const query = `
-- 1. Insertar a la usuaria en p_Usuarios
INSERT INTO p_Usuarios (
    nombre, 
    nombreCompleto, 
    correo, 
    carnet, 
    cargo, 
    departamento, 
    area, 
    gerencia, 
    subgerencia, 
    jefeCarnet, 
    jefeNombre, 
    jefeCorreo, 
    pais, 
    activo, 
    rolGlobal, 
    fuente_datos
)
VALUES (
    'Dr. Tania', 
    'Dr. Tania (Servicio Médico)', 
    'Serviciomedico@claro.com.ni', 
    'MED_300034', 
    'Médico Externo', 
    'Servicio Médico', 
    'Servicio Médico', 
    'NI GERENCIA DE RECURSOS HUMANOS', 
    'NI SUBGERENCIA DE RELACIONES LABORALES Y ATENCION EMPLEADOS',
    '300034', 
    'NELSON ENRIQUE PEREZ FONSECA',
    'nelson.perez@claro.com.ni',
    'NI', 
    1, 
    'Employee', 
    'MANUAL'
);

DECLARE @NewUserId INT = SCOPE_IDENTITY();

-- 2. Crear credencial de acceso (Password: 123456)
INSERT INTO p_UsuariosCredenciales (idUsuario, passwordHash, ultimoLogin)
VALUES (
    @NewUserId, 
    '$2b$10$yheVSfcs5WhLHOsnjHYxo.0TQfWp2LxKYdX5Ln8SmhllOnX.A3AvTu', 
    NULL
);

-- 3. Asignar organización
INSERT INTO p_UsuariosOrganizacion (idUsuario, idNodo, rol, fechaAsignacion)
SELECT @NewUserId, id, 'Miembro', GETDATE()
FROM p_OrganizacionNodos 
WHERE nombre = 'NI SUBGERENCIA DE RELACIONES LABORALES Y ATENCION EMPLEADOS';

SELECT @NewUserId as newUserId;
`;

async function run() {
    try {
        await sql.connect(config);
        const res = await sql.query(query);
        console.log('Usuario creado exitosamente. ID:', res.recordset[0].newUserId);
        process.exit(0);
    } catch (e) {
        console.error('Error al crear usuario:', e);
        process.exit(1);
    }
}
run();
