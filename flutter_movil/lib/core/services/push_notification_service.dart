import 'dart:developer';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';

/// Servicio de Push Notifications usando Firebase Cloud Messaging
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  static const String taskAssignmentTopic = 'tareas_asignaciones';
  static const _storage = FlutterSecureStorage();

  String? _token;
  String? get token => _token;

  /// Inicializar Firebase y solicitar permisos
  Future<void> initialize() async {
    if (defaultTargetPlatform != TargetPlatform.android &&
        defaultTargetPlatform != TargetPlatform.iOS) {
      log('📱 FCM: Solo disponible en Android/iOS', name: 'FCM');
      return;
    }

    await _initializeFirebase();
    await _requestPermission();
    await _setupForegroundListeners();
    await subscribeToTopic(taskAssignmentTopic);
  }

  Future<void> _initializeFirebase() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
        log('✅ Firebase inicializado correctamente', name: 'FCM');
      }
    } catch (e, st) {
      log('❌ Error inicializando Firebase', error: e, stackTrace: st, name: 'FCM');
    }
  }

  Future<String?> getToken() async {
    try {
      _token = await FirebaseMessaging.instance.getToken();
      log('📱 FCM Token: ${_token?.substring(0, 20)}...', name: 'FCM');
      return _token;
    } catch (e, st) {
      log('❌ Error obteniendo token FCM', error: e, stackTrace: st, name: 'FCM');
      return null;
    }
  }

  Future<void> _requestPermission() async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      log('📱 Permisos FCM: ${settings.authorizationStatus}', name: 'FCM');

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        await getToken();
      }
    } catch (e, st) {
      log('❌ Error solicitando permisos FCM', error: e, stackTrace: st, name: 'FCM');
    }
  }

  Future<void> _setupForegroundListeners() async {
    // Mensajes en foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      log(
        '📩 Push en foreground: ${message.notification?.title} - ${message.notification?.body}',
        name: 'FCM',
      );
      // Notificación local se implementará con flutter_local_notifications en fase 2
    });

    // Usuario toca la notificación
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      log('👆 Push abierto: ${message.data}', name: 'FCM');
      // Navegación global se implementará con GoRouter o Key global en fase 2
    });
  }

  /// Registrar token FCM en el backend después del login
  Future<void> registerTokenWithBackend() async {
    if (_token == null) {
      await getToken();
    }
    if (_token == null) {
      log('⚠️ No hay token FCM para registrar', name: 'FCM');
      return;
    }

    try {
      final accessToken = await _storage.read(key: 'momentus_access_token');
      if (accessToken == null) {
        log('⚠️ No hay access token, no se puede registrar FCM', name: 'FCM');
        return;
      }

      final dio = Dio();
      await dio.post(
        '${AppConfig.apiBaseUrl}/notifications/device-token',
        data: {
          'token': _token,
          'platform': defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios',
        },
        options: Options(
          headers: {'Authorization': 'Bearer $accessToken'},
        ),
      );
      log('✅ Token FCM registrado en backend', name: 'FCM');
    } catch (e) {
      log('❌ Error registrando token FCM en backend: $e', name: 'FCM');
    }
  }

  Future<void> subscribeToTopic(String topic) async {
    try {
      await FirebaseMessaging.instance.subscribeToTopic(topic);
      log('📢 Suscrito a topic: $topic', name: 'FCM');
    } catch (e, st) {
      log('❌ Error suscribiendo a topic $topic', error: e, stackTrace: st, name: 'FCM');
    }
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await FirebaseMessaging.instance.unsubscribeFromTopic(topic);
      log('🔕 Desuscrito de topic: $topic', name: 'FCM');
    } catch (e) {
      log('❌ Error desuscribiendo de topic $topic: $e', name: 'FCM');
    }
  }
}
