import 'dart:async';
import 'dart:convert';
import 'dart:developer';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/tasks/data/local/task_local_data_source.dart';
import '../config/app_config.dart';

/// Worker que procesa la cola de sincronización en segundo plano
/// cuando hay conexión a internet disponible.
class SyncWorker {
  SyncWorker._();
  static final SyncWorker instance = SyncWorker._();

  final _localSource = TaskLocalDataSource();
  final _storage = const FlutterSecureStorage();
  final _connectivity = Connectivity();
  
  StreamSubscription? _subscription;
  bool _isSyncing = false;

  /// Inicia el worker de sincronización
  void initialize() {
    log('🔄 SyncWorker: Inicializando...', name: 'Sync');
    
    try {
      // 1. Intentar sincronizar al inicio si hay red
      // Usamos un Future.microtask para no bloquear el hilo principal durante el arranque
      Future.microtask(() => _checkAndSync().catchError((e) {
        log('⚠️ Error inicial en SyncWorker check: $e', name: 'Sync');
      }));

      // 2. Escuchar cambios de red
      _subscription = _connectivity.onConnectivityChanged.listen((result) {
        try {
          if (result.contains(ConnectivityResult.mobile) || 
              result.contains(ConnectivityResult.wifi)) {
             log('🌐 SyncWorker: Conexión detectada, iniciando sync...', name: 'Sync');
             _checkAndSync();
          }
        } catch (e) {
          log('⚠️ Error procesando cambio de red: $e', name: 'Sync');
        }
      });
    } catch (e) {
      log('❌ Error FATAL inicializando SyncWorker: $e', name: 'Sync');
      // No re-lanzamos para no tumbar la app
    }
  }

  void dispose() {
    _subscription?.cancel();
  }

  /// Stream para notificar cuando hay datos nuevos disponibles
  final _onSyncCompleteController = StreamController<void>.broadcast();
  Stream<void> get onSyncComplete => _onSyncCompleteController.stream;

  /// Procesa la cola de sincronización y luego refresca datos del servidor
  Future<void> _checkAndSync() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // === FASE 1: PUSH (Subir cambios locales) ===
      final pendingEvents = await _localSource.getPendingSyncEvents();
      
      final token = await _storage.read(key: 'momentus_access_token');
      if (token == null) {
        log('⚠️ SyncWorker: No hay token, abortando sync', name: 'Sync');
        _isSyncing = false;
        return;
      }

      final dio = Dio();
      dio.options.baseUrl = AppConfig.apiBaseUrl;
      dio.options.headers['Authorization'] = 'Bearer $token';

      if (pendingEvents.isNotEmpty) {
        log('🔄 SyncWorker: Procesando ${pendingEvents.length} eventos pendientes...', name: 'Sync');

        for (final event in pendingEvents) {
          final id = event['id'] as int;
          final attempts = (event['sync_attempts'] as int? ?? 0) + 1;
          
          try {
            await _processEvent(dio, event);
            await _localSource.removeSyncEvent(id);
            log('✅ Evento $id sincronizado exitosamente', name: 'Sync');
          } catch (e) {
            log('❌ Error sincronizando evento $id: $e', name: 'Sync');
            await _localSource.markSyncEventFailed(
              queueId: id,
              attempts: attempts,
              error: e.toString(),
            );
          }
        }
      }

      // === FASE 2: PULL (Descargar datos nuevos del servidor) ===
      log('⬇️ SyncWorker: Descargando datos frescos del servidor...', name: 'Sync');
      await _pullFreshData(dio);

      // Notificar a los listeners que hay datos nuevos
      _onSyncCompleteController.add(null);
      log('✅ SyncWorker: Sincronización completa (Push + Pull)', name: 'Sync');

    } catch (e) {
      log('❌ Error general en SyncWorker: $e', name: 'Sync');
    } finally {
      _isSyncing = false;
    }
  }

  /// Descarga datos frescos del servidor y actualiza la BD local
  Future<void> _pullFreshData(Dio dio) async {
    try {
      // Obtener tareas del usuario actual
      final response = await dio.get('/clarity/tasks/me');
      
      if (response.statusCode == 200) {
        final tasks = response.data as List<dynamic>? ?? [];
        log('⬇️ Recibidas ${tasks.length} tareas del servidor', name: 'Sync');
        
        // Aquí podrías actualizar la BD local con las tareas frescas
        // Por ahora solo logueamos; la implementación completa requiere
        // lógica de merge (conflictos, timestamps, etc.)
      }
    } catch (e) {
      log('⚠️ Error en Pull: $e (no crítico)', name: 'Sync');
      // El Pull falla silenciosamente para no bloquear la app
    }
  }

  Future<void> _processEvent(Dio dio, Map<String, dynamic> event) async {
    final entidad = event['entidad'] as String;
    final operacion = event['operacion'] as String;
    final payload = jsonDecode(event['payload'] as String) as Map<String, dynamic>;

    // Mapeo de operaciones a endpoints
    if (entidad == 'task') {
      if (operacion == 'create') {
        await dio.post('/tasks', data: payload);
      } else if (operacion == 'update') {
        final id = event['entidad_id'];
        await dio.put('/tasks/$id', data: payload);
      }
    }
    // Agregar más entidades aquí si es necesario
  }
}
