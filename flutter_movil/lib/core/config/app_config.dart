class AppConfig {
  static const String appName = 'Momentus Mobile';
  static const String apiBaseUrl = 'https://api.tu-dominio.com';

  /// Intervalo sugerido para sincronizar en segundo plano al abrir la app.
  static const Duration syncWindow = Duration(seconds: 10);
}
