// --- Auth Module ---
export * from './auth/entities/rol.entity';
export * from './auth/entities/usuario.entity';
export * from './auth/entities/usuario-credenciales.entity';
export * from './auth/entities/usuario-config.entity';
export * from './auth/entities/organizacion-nodo.entity';
export * from './auth/entities/usuario-organizacion.entity';

// --- Planning Module ---
export * from './planning/entities/proyecto.entity';
export * from './planning/entities/tarea.entity';
export * from './planning/entities/tarea-asignado.entity';
export * from './planning/entities/tarea-asignacion-log.entity';
export * from './planning/entities/tarea-avance.entity';
export * from './planning/entities/solicitud-cambio.entity';
export * from './planning/entities/plan-trabajo.entity';

// --- Clarity Module ---
export * from './clarity/entities/checkin.entity';
export * from './clarity/entities/checkin-tarea.entity';
export * from './clarity/entities/bloqueo.entity';
export * from './clarity/entities/foco-diario.entity';
export * from './clarity/entities/nota.entity';

// --- Common Module ---
export * from './common/entities/log-sistema.entity';
export * from './common/entities/audit-log.entity';

// --- Acceso Module (Permisos/Visibilidad) ---
// export * from './acceso/entities/empleado.entity'; // Removed
export * from './acceso/entities/organizacion-nodo-rh.entity';
export * from './acceso/entities/permiso-area.entity';
export * from './acceso/entities/permiso-empleado.entity';
export * from './acceso/entities/delegacion-visibilidad.entity';
