export interface Usuario {
    idUsuario: number;
    nombre: string;
    correo: string;
    telefono?: string;
    activo: boolean;
    rolGlobal: string; // 'Admin' | 'Empleado'
    idRol?: number;
    carnet?: string;  // Carnet UNIFICADO
    rol?: { // Relación con entidad Rol
        idRol: number;
        nombre: string;
    };
    // === CAMPOS UNIFICADOS RRHH (Desde p_Usuarios) ===
    nombreCompleto?: string;
    cargo?: string;
    departamento?: string; // Departamento
    orgDepartamento?: string; // oDEPARTAMENTO
    orgGerencia?: string; // OGERENCIA
    idOrg?: number; // Converted to number by backend if numeric
    jefeCarnet?: string;
    jefeNombre?: string;
    jefeCorreo?: string;
    fechaIngreso?: string;
    genero?: string;
    username?: string;
    pais?: string;

    // Campos de jerarquía organizacional (de RRHH.csv)
    primerNivel?: string; // Área
    segundoNivel?: string; // Subgerencia
    tercerNivel?: string; // Gerencia

    // Legacy fields handling
    area?: string; // Deprecated or mapped to departamento
    tipoArea?: string;
}


export interface OrganizacionNodo {
    idNodo: number;
    idPadre?: number;
    tipo: 'Gerencia' | 'Equipo';
    nombre: string;
    activo: boolean;
}

export interface Proyecto {
    idProyecto: number;
    nombre: string;
    descripcion?: string;
    idNodoDuenio?: number;
    estado: 'Borrador' | 'Confirmado' | 'EnEjecucion' | 'Cerrado' | 'Activo'; // 'Activo' kept for legacy
    fechaCreacion?: string;
    enllavado?: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    area?: string;
    subgerencia?: string;
    gerencia?: string;
    progreso?: number;
    requiereAprobacion?: boolean;
}

export interface SolicitudCambio {
    idSolicitud: number;
    idTarea: number;
    idUsuarioSolicitante: number;
    campoAfectado: string;
    valorAnterior: string | null;
    valorNuevo: string | null;
    motivo: string;
    estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
    fechaSolicitud: string;
}

export type Prioridad = 'Alta' | 'Media' | 'Baja';
export type Esfuerzo = 'S' | 'M' | 'L';
export type EstadoTarea = 'Pendiente' | 'EnCurso' | 'Pausa' | 'Bloqueada' | 'Revision' | 'Hecha' | 'Descartada';
export type TipoTarea = 'Logistica' | 'Administrativa' | 'Estrategica' | 'AMX' | 'Otros' | 'Operativo';
export type AlcanceTarea = 'Local' | 'Regional' | 'AMX';

export interface Tarea {
    idTarea: number;
    idProyecto: number;
    proyecto?: Proyecto;
    titulo: string;
    descripcion?: string;
    estado: EstadoTarea;
    prioridad: Prioridad;
    esfuerzo: Esfuerzo;
    tipo?: TipoTarea;
    alcance?: AlcanceTarea;
    fechaInicioPlanificada?: string;
    fechaObjetivo?: string;
    fechaEnCurso?: string;
    fechaHecha?: string;
    idCreador: number;
    idAsignadoPor?: number;
    asignados?: TareaAsignado[];
    fechaUltActualizacion: string;
    fechaCreacion?: string;
    progreso: number; // 0-100
    orden: number;
    comentario?: string;
    motivoBloqueo?: string;
}

export interface TareaRegistrarAvanceDto {
    idUsuario: number;
    progreso: number;
    comentario: string;
}

export interface TareaAsignado {
    idAsignacion: number;
    idTarea: number;
    idUsuario: number;
    usuario?: Usuario;
    tipo: 'Responsable' | 'Colaborador';
}

export interface Checkin {
    idCheckin: number;
    fecha: string; // YYYY-MM-DD
    idUsuario: number;
    usuario?: Usuario;
    entregableTexto: string;
    nota?: string;
    linkEvidencia?: string;
    estadoAnimo?: 'Tope' | 'Bien' | 'Bajo';
    tareas?: CheckinTarea[];
}

export interface CheckinTarea {
    idCheckinTarea: number;
    idCheckin: number;
    idTarea: number;
    tarea?: Tarea;
    tipo: 'Entrego' | 'Avanzo' | 'Extra';
}

export interface Bloqueo {
    idBloqueo: number;
    idTarea?: number;
    tarea?: Tarea;
    idOrigenUsuario: number;
    origenUsuario?: Usuario;
    idDestinoUsuario?: number;
    destinoUsuario?: Usuario;
    destinoTexto?: string;
    motivo: string;
    accionMitigacion?: string;
    estado: 'Activo' | 'Resuelto';
    fechaCreacion: string;
    fechaResolucion?: string;
}

// DTOs para Formularios
export interface CheckinUpsertDto {
    idUsuario: number;
    fecha: string;
    entregableTexto: string;
    nota?: string;
    linkEvidencia?: string;
    idNodo?: number;
    entrego: number[]; // IDs de tareas
    avanzo: number[]; // IDs de tareas
    extras?: number[]; // IDs de tareas (opcional, max 5)
    estadoAnimo?: 'Tope' | 'Bien' | 'Bajo';
}

export interface TareaCrearRapidaDto {
    titulo: string;
    idProyecto?: number;
    prioridad: Prioridad;
    esfuerzo: Esfuerzo;
    tipo?: TipoTarea;
    idUsuario: number; // Creador
    idResponsable?: number;
    fechaInicioPlanificada?: string;
    fechaObjetivo?: string;
    descripcion?: string;
}

export interface BloqueoCrearDto {
    idTarea?: number;
    idOrigenUsuario: number;
    idDestinoUsuario?: number;
    destinoTexto?: string;
    motivo: string;
    accionMitigacion?: string;
}

export interface PlanTrabajo {
    idPlan: number;
    nombre?: string;
    idProyecto?: number;
    idUsuario: number;
    usuario?: Usuario;
    mes: number; // 1-12
    anio: number; // 2026
    estado: 'Borrador' | 'Confirmado' | 'Cerrado';
    objetivoGeneral?: string;
    resumenCierre?: string;
    idCreador: number;
    creador?: Usuario;
    // Campos organizacionales
    area?: string;
    subgerencia?: string;
    gerencia?: string;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    tareas?: Tarea[];
}
