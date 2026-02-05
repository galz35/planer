import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';

/// Pantalla Hoy/Agenda.
///
/// - Online: consume /mi-dia
/// - Offline: fallback automático a cache local (kv_cache)
class AgendaScreen extends StatefulWidget {
  const AgendaScreen({super.key});

  @override
  State<AgendaScreen> createState() => _AgendaScreenState();
}

class _AgendaScreenState extends State<AgendaScreen> {
  static const _cacheKey = 'agenda_today';
  static const _offline = OfflineResourceService();

  late Future<OfflineMapResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetchAgenda();
  }

  Future<OfflineMapResult> _fetchAgenda() {
    return _offline.loadMap(
      cacheKey: _cacheKey,
      remote: () async {
        final fecha = DateFormat('yyyy-MM-dd').format(DateTime.now());
        final response = await ApiClient.dio.get('/mi-dia', queryParameters: {'fecha': fecha});
        return unwrapApiData(response.data);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hoy / Agenda')),
      body: FutureBuilder<OfflineMapResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final payload = snapshot.data;
          if (payload == null) {
            return Center(
              child: ElevatedButton(
                onPressed: () => setState(() => _future = _fetchAgenda()),
                child: const Text('Reintentar'),
              ),
            );
          }

          final data = payload.data;
          final tareas = (data['tareasSugeridas'] as List<dynamic>? ?? <dynamic>[]).cast<dynamic>();
          final backlog = (data['backlog'] as List<dynamic>? ?? <dynamic>[]).cast<dynamic>();
          final bloqueos = (data['bloqueosActivos'] as List<dynamic>? ?? <dynamic>[]).cast<dynamic>();

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (payload.fromCache)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              _MetricCard(label: 'Tareas sugeridas', value: tareas.length),
              _MetricCard(label: 'Backlog', value: backlog.length),
              _MetricCard(label: 'Bloqueos activos', value: bloqueos.length),
              const SizedBox(height: 12),
              const Text('Tareas del día', style: TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              if (tareas.isEmpty)
                const Text('No hay tareas sugeridas para hoy.')
              else
                ...tareas.take(20).map((t) {
                  final m = (t as Map).cast<String, dynamic>();
                  return ListTile(
                    title: Text((m['titulo'] ?? 'Sin título').toString()),
                    subtitle: Text((m['estado'] ?? '').toString()),
                  );
                }),
            ],
          );
        },
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(label),
        trailing: Text('$value', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
      ),
    );
  }
}
