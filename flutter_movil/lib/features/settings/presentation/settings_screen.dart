import 'package:flutter/material.dart';

import '../data/notification_preferences_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final NotificationPreferencesService _notificationPreferencesService =
      NotificationPreferencesService();

  NotificationPreferences _preferences = const NotificationPreferences(
    enabled: true,
    assignmentAlerts: true,
    pendingReminders: true,
  );
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final preferences = await _notificationPreferencesService.load();
    if (!mounted) {
      return;
    }
    setState(() {
      _preferences = preferences;
      _loading = false;
    });
  }

  Future<void> _updatePreferences(NotificationPreferences updated) async {
    setState(() {
      _preferences = updated;
    });
    await _notificationPreferencesService.save(updated);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ajustes')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Ajustes')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const ListTile(
            leading: Icon(Icons.security),
            title: Text('Seguridad móvil'),
            subtitle: Text('Agregar biometría, pin local y cierre por inactividad.'),
          ),
          SwitchListTile(
            secondary: const Icon(Icons.notifications_active),
            title: const Text('Notificaciones activas'),
            subtitle: const Text(
              'Permitir avisos de nuevas asignaciones y recordatorios de pendientes.',
            ),
            value: _preferences.enabled,
            onChanged: (value) {
              _updatePreferences(_preferences.copyWith(enabled: value));
            },
          ),
          SwitchListTile(
            secondary: const Icon(Icons.assignment_ind_outlined),
            title: const Text('Nuevas asignaciones de tarea'),
            subtitle: const Text('Avisar cuando se te asigne una nueva tarea.'),
            value: _preferences.enabled && _preferences.assignmentAlerts,
            onChanged: _preferences.enabled
                ? (value) {
                    _updatePreferences(_preferences.copyWith(assignmentAlerts: value));
                  }
                : null,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.alarm_on_outlined),
            title: const Text('Recordatorios de pendientes'),
            subtitle: const Text(
              'Avisar si tienes tareas pendientes por vencer o atrasadas.',
            ),
            value: _preferences.enabled && _preferences.pendingReminders,
            onChanged: _preferences.enabled
                ? (value) {
                    _updatePreferences(_preferences.copyWith(pendingReminders: value));
                  }
                : null,
          ),
          const ListTile(
            leading: Icon(Icons.cloud_done),
            title: Text('Sincronización'),
            subtitle: Text('Política: write-local-first + cola + reconciliación.'),
          ),
          const ListTile(
            leading: Icon(Icons.palette),
            title: Text('Tema visual'),
            subtitle: Text('Diseño verde enterprise: simple, rápido y legible.'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Nota: este control define las preferencias del usuario. '
            'La entrega real de push (FCM/APNs) se conecta en la siguiente fase.',
          ),
        ],
      ),
    );
  }
}
