import { IsIn, IsOptional, IsString, MaxLength, IsBoolean, IsDateString } from 'class-validator';

/**
 * DTO para crear un permiso por área/subárbol
 */
export class CrearPermisoAreaDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    carnetOtorga?: string;

    @IsString()
    @MaxLength(100)
    carnetRecibe: string;

    @IsString()
    idOrgRaiz: string; // bigint como string

    @IsOptional()
    @IsIn(['SUBARBOL', 'SOLO_NODO'])
    alcance?: 'SUBARBOL' | 'SOLO_NODO';

    @IsOptional()
    @IsBoolean()
    activo?: boolean;

    @IsOptional()
    @IsDateString()
    fechaFin?: string;

    @IsOptional()
    @IsString()
    @MaxLength(300)
    motivo?: string;

    @IsOptional()
    @IsIn(['ALLOW', 'DENY'])
    tipoAcceso?: 'ALLOW' | 'DENY';
}
