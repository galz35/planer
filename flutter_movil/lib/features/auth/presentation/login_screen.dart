import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import 'auth_controller.dart';
import 'forgot_password_screen.dart';

/// ============================================
/// PANTALLA DE LOGIN - Diseño Verde Premium
/// ============================================
/// Login moderno con fondo verde sutil, logo animado,
/// inputs elegantes y botón con gradiente.

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> 
    with SingleTickerProviderStateMixin {
  final _correoCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscurePassword = true;
  
  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOut),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOut));
    
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _correoCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: MomentusTheme.backgroundGradient,
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: EdgeInsets.symmetric(
              horizontal: MomentusTheme.spaceXl,
              vertical: size.height < 700 
                  ? MomentusTheme.spaceLg 
                  : MomentusTheme.spaceXxl,
            ),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: size.height * 0.08),
                    
                    // Logo y Título
                    _buildHeader(context),
                    
                    SizedBox(height: size.height * 0.06),
                    
                    // Card de Login
                    _buildLoginCard(context, auth),
                    
                    const SizedBox(height: 24),
                    
                    // Footer
                    _buildFooter(context),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Column(
      children: [
        // Logo con gradiente
        Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            gradient: MomentusTheme.primaryGradient,
            borderRadius: BorderRadius.circular(MomentusTheme.radiusXl),
            boxShadow: MomentusTheme.buttonShadow,
          ),
          child: const Icon(
            Icons.check_circle_rounded,
            size: 44,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 28),
        
        // Nombre de la app
        Text(
          'Momentus',
          style: Theme.of(context).textTheme.displaySmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -1,
          ),
        ),
        const SizedBox(height: 8),
        
        // Subtítulo
        Text(
          'Gestiona tu día con claridad',
          style: Theme.of(context).textTheme.bodyLarge?.copyWith(
            color: MomentusTheme.slate500,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginCard(BuildContext context, AuthController auth) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusXl),
        boxShadow: MomentusTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Título del card
          Text(
            'Iniciar Sesión',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Ingresa tus credenciales para continuar',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          
          const SizedBox(height: 28),
          
          // Error message
          if (auth.error != null) ...[
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: MomentusTheme.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
                border: Border.all(
                  color: MomentusTheme.error.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    color: MomentusTheme.error,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      auth.error!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: MomentusTheme.error,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
          
          // Email or Carnet Input
          TextField(
            controller: _correoCtrl,
            keyboardType: TextInputType.text, // Puede ser texto o número
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(
              labelText: 'Correo o Carnet',
              hintText: 'Ej. tu@email.com o Carnet',
              prefixIcon: Icon(
                Icons.account_circle_outlined,
                color: MomentusTheme.slate400,
              ),
            ),
          ),
          
          const SizedBox(height: 18),
          
          // Password Input
          TextField(
            controller: _passCtrl,
            obscureText: _obscurePassword,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _handleLogin(auth),
            decoration: InputDecoration(
              labelText: 'Contraseña',
              prefixIcon: const Icon(
                Icons.lock_outline_rounded,
                color: MomentusTheme.slate400,
              ),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword 
                      ? Icons.visibility_outlined 
                      : Icons.visibility_off_outlined,
                  color: MomentusTheme.slate400,
                ),
                onPressed: () {
                  setState(() => _obscurePassword = !_obscurePassword);
                },
              ),
            ),
          ),
          
          const SizedBox(height: 28),
          
          // Botón de Login
          _buildLoginButton(context, auth),
          
          const SizedBox(height: 18),
          
          // Olvidé contraseña
          Center(
            child: TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                );
              },
              child: Text(
                '¿Olvidaste tu contraseña?',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: MomentusTheme.primary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginButton(BuildContext context, AuthController auth) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      height: 56,
      decoration: BoxDecoration(
        gradient: auth.loading ? null : MomentusTheme.primaryGradient,
        color: auth.loading ? MomentusTheme.slate200 : null,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
        boxShadow: auth.loading ? null : MomentusTheme.buttonShadow,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: auth.loading ? null : () => _handleLogin(auth),
          borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
          child: Center(
            child: auth.loading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation(MomentusTheme.slate500),
                    ),
                  )
                : const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Iniciar Sesión',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.2,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return Column(
      children: [
        // Divider con texto
        Row(
          children: [
            const Expanded(child: Divider(color: MomentusTheme.slate200)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Momentus © 2026',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
            const Expanded(child: Divider(color: MomentusTheme.slate200)),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'Versión 1.0.0',
          style: Theme.of(context).textTheme.labelSmall,
        ),
      ],
    );
  }

  Future<void> _handleLogin(AuthController auth) async {
    // Ocultar teclado
    FocusScope.of(context).unfocus();
    
    final ok = await auth.login(
      _correoCtrl.text.trim(),
      _passCtrl.text.trim(),
    );
    
    if (!ok && mounted) {
      // Animar el error (shake effect podría ir aquí)
    }
  }
}
