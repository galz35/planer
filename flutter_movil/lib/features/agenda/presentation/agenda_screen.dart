import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../common/data/offline_resource_service.dart';

/// Pantalla Hoy/Agenda.
///
/// - Online: consume /mi-dia
/// - Offline: fallback automático a cache local (kv_cache)
/// - Acciones rápidas: marcar hecha, posponer
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

  Future<void> _refresh() async {
    final result = await _fetchAgenda();
    if (mounted) {
      setState(() => _future = Future.value(result));
    }
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Tarea completada')),
        );
      }
      _refresh();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al actualizar')),
        );
      }
    }
  }

  Future<void> _postpone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    final tomorrow = DateTime.now().add(const Duration(days: 1));
    final fechaNueva = DateFormat('yyyy-MM-dd').format(tomorrow);

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'fechaVencimiento': fechaNueva});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('📅 Tarea pospuesta para mañana')),
        );
      }
      _refresh();
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Error al posponer')),
        );
      }
    }
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

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (payload.fromCache)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: MomentusTheme.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cloud_off, color: MomentusTheme.warning),
                        SizedBox(width: 8),
                        Text('Mostrando caché local (sin conexión)'),
                      ],
                    ),
                  ),
                _MetricCard(label: 'Tareas sugeridas', value: tareas.length, color: MomentusTheme.primary),
                _MetricCard(label: 'Backlog', value: backlog.length, color: MomentusTheme.warning),
                _MetricCard(label: 'Bloqueos activos', value: bloqueos.length, color: MomentusTheme.error),
                const SizedBox(height: 16),
                Text('Tareas del día', style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                if (tareas.isEmpty)
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('🎉 Excelente, no hay tareas sugeridas para hoy.'),
                    ),
                  )
                else
                  ...tareas.take(20).map((t) {
                    final m = (t as Map).cast<String, dynamic>();
                    final estado = (m['estado'] ?? 'Pendiente').toString();
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text((m['titulo'] ?? 'Sin título').toString()),
                        subtitle: Text(estado),
                        trailing: estado != 'Hecha'
                            ? PopupMenuButton<String>(
                                icon: const Icon(Icons.more_vert),
                                onSelected: (value) {
                                  if (value == 'done') _markDone(m);
                                  if (value == 'postpone') _postpone(m);
                                },
                                itemBuilder: (_) => [
                                  const PopupMenuItem(value: 'done', child: Text('✅ Marcar hecha')),
                                  const PopupMenuItem(value: 'postpone', child: Text('📅 Posponer')),
                                ],
                              )
                            : const Icon(Icons.check_circle, color: MomentusTheme.success),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value, required this.color});

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
          ),
          child: Center(
            child: Text(
              '$value',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: color),
            ),
          ),
        ),
        title: Text(label),
      ),
    );
  }
}

