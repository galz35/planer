import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Tarea } from '../planning/entities/tarea.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface<any> {
    constructor(
        @InjectDataSource() readonly dataSource: DataSource,
    ) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return Tarea;
    }

    async afterInsert(event: InsertEvent<any>) {
        // Solo auditar si se proveyó un usuario de contexto
        if (!event.entity._auditUsuario) return;

        // Verificar si la entidad tiene ID (a veces no está disponible inmediatamente si es trigger database, pero en insert normalmente sí tras save)
        const recursoId = event.entity.idTarea?.toString();
        if (!recursoId) return;

        const log = new AuditLog();
        log.idUsuario = event.entity._auditUsuario;
        log.accion = 'TAREA_CREADA'; // Usar string directo para desconectar de ENUM por ahora
        log.recurso = 'Tarea';
        log.recursoId = recursoId;
        log.detalles = JSON.stringify({ titulo: event.entity.titulo });
        log.fecha = new Date();

        await event.manager.save(log);
    }

    async afterUpdate(event: UpdateEvent<any>) {
        if (!event.entity || !event.entity._auditUsuario) return;

        const cambios: string[] = [];
        const ignorarCampos = ['fechaUltActualizacion', '_auditUsuario', 'orden', 'progreso']; // Ignorar campos ruidosos
        const dbEntity = event.databaseEntity;
        const newEntity = event.entity;

        if (!dbEntity) return;

        // Iterar sobre columnas actualizadas
        event.updatedColumns.forEach(col => {
            const prop = col.propertyName;
            if (ignorarCampos.includes(prop)) return;

            const valAnterior = dbEntity[prop];
            const valNuevo = newEntity[prop];

            // Conversión básica para evitar falsos positivos por tipos (Date vs string)
            const strAnterior = this.normalizeValue(valAnterior);
            const strNuevo = this.normalizeValue(valNuevo);

            if (strAnterior !== strNuevo) {
                // Formato amigable para el array de cambios que espera el frontend
                cambios.push(`${this.formatPropName(prop)}: ${strAnterior} -> ${strNuevo}`);
            }
        });

        if (cambios.length === 0) return;

        const log = new AuditLog();
        log.idUsuario = event.entity._auditUsuario;
        log.accion = 'TAREA_ACTUALIZADA';
        log.recurso = 'Tarea';
        log.recursoId = dbEntity.idTarea?.toString();
        log.detalles = JSON.stringify({
            titulo: dbEntity.titulo,
            cambios: cambios
        });
        log.fecha = new Date();

        await event.manager.save(log);
    }

    private normalizeValue(val: any): string {
        if (val === null || val === undefined) return 'N/A';
        if (val instanceof Date) return val.toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
        return String(val);
    }

    private formatPropName(prop: string): string {
        const map: Record<string, string> = {
            titulo: 'Título',
            descripcion: 'Descripción',
            fechaInicioPlanificada: 'Inicio',
            fechaObjetivo: 'Fin',
            prioridad: 'Prioridad',
            estado: 'Estado',
            esfuerzo: 'Esfuerzo'
        };
        return map[prop] || prop;
    }
}
