class AppConfig {
  static const String appName = 'Momentus Mobile';

  /// Base URL configurable desde build/run:
  /// flutter run --dart-define=API_BASE_URL=https://api.mi-dominio.com
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://TU_IP_O_DOMINIO/api/',
  );

  /// Ventana de debounce para auto-sync (segundos).
  /// flutter run --dart-define=SYNC_WINDOW_SECONDS=10
  static const int _syncWindowSeconds = int.fromEnvironment(
    'SYNC_WINDOW_SECONDS',
    defaultValue: 10,
  );

  /// Intervalo sugerido para sincronizar en segundo plano al abrir la app.
  static Duration get syncWindow => const Duration(seconds: _syncWindowSeconds);
}
