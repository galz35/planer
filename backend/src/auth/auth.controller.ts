import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { InvalidCredentialsException } from '../common/exceptions';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private jwtService: JwtService
    ) { }

    @HttpCode(HttpStatus.OK)
    @Post('login')
    @ApiOperation({ summary: 'Iniciar sesión' })
    @ApiResponse({ status: 200, description: 'Login exitoso, retorna tokens.' })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.correo, loginDto.password);
        if (!user) {
            throw new InvalidCredentialsException();
        }
        return this.authService.login(user);
    }

    @HttpCode(HttpStatus.OK)
    @Post('refresh')
    @ApiOperation({ summary: 'Refrescar token de acceso' })
    async refresh(@Body() dto: RefreshTokenDto) {
        try {
            const payload = await this.jwtService.verifyAsync(dto.refreshToken);
            return this.authService.refreshTokens(payload.sub, dto.refreshToken);
        } catch (e) {
            throw new InvalidCredentialsException('Invalid Refresh Token');
        }
    }
}
