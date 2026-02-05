import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';

/// Pendientes
///
/// - Lee pendientes reales del backend.
/// - Si falla red, usa cache local.
/// - Permite acción rápida: marcar como hecha.
class PendingScreen extends StatefulWidget {
  const PendingScreen({super.key});

  @override
  State<PendingScreen> createState() => _PendingScreenState();
}

class _PendingScreenState extends State<PendingScreen> {
  static const _cacheKey = 'pending_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<OfflineListResult> _load() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/tareas/mias', queryParameters: {'estado': 'Pendiente'});
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tarea marcada como hecha')));
      }
      setState(() => _future = _load());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo actualizar la tarea')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pendientes')),
      body: FutureBuilder<OfflineListResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final data = snapshot.data;
          if (data == null) {
            return Center(
              child: ElevatedButton(
                onPressed: () => setState(() => _future = _load()),
                child: const Text('Reintentar pendientes'),
              ),
            );
          }

          final pending = data.items;
          if (pending.isEmpty) {
            return const Center(child: Text('Excelente, no tienes pendientes.'));
          }

          return Column(
            children: [
              if (data.fromCache)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: pending.length,
                  itemBuilder: (_, i) {
                    final item = (pending[i] as Map).cast<String, dynamic>();
                    return Card(
                      child: ListTile(
                        title: Text((item['titulo'] ?? 'Tarea').toString()),
                        subtitle: Text((item['descripcion'] ?? '').toString()),
                        leading: const Icon(Icons.radio_button_unchecked),
                        trailing: IconButton(
                          icon: const Icon(Icons.check_circle_outline),
                          onPressed: () => _markDone(item),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
