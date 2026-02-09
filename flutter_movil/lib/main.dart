import 'package:flutter/material.dart';

import 'app.dart';
import 'core/services/push_notification_service.dart';
import 'core/sync/sync_worker.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase y Push Notifications
  try {
    await PushNotificationService.instance.initialize();
  } catch (e) {
    debugPrint('⚠️ Firebase no configurado: $e');
  }

  // Inicializar Worker de Sincronización (Offline -> Online)
  SyncWorker.instance.initialize();
  
  runApp(const MomentusMobileApp());
}
