import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';
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

    @HttpCode(HttpStatus.OK)
    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Cambiar contraseña propia' })
    async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
        const userId = req.user.userId || req.user.sub;
        if (!userId) throw new UnauthorizedException('Token inválido');

        await this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
        return { success: true, message: 'Contraseña actualizada correctamente' };
    }
}
