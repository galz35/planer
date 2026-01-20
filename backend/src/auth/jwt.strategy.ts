
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
        });
    }

    async validate(payload: any) {
        console.log(`[JwtStrategy] Validating payload for user: ${payload.sub} (${payload.correo})`);
        return {
            userId: payload.sub,
            username: payload.correo,
            rol: payload.rol,
            rolGlobal: payload.rol,
            pais: payload.pais || 'NI'
        };
    }
}
