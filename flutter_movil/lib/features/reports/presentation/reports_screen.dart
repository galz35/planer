import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';

/// Dashboard ejecutivo móvil.
///
/// Fuente principal: /planning/stats
/// Fallback: cache local mensual.
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  static const _offline = OfflineResourceService();

  late Future<OfflineMapResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetchStats();
  }

  Future<OfflineMapResult> _fetchStats() {
    final now = DateTime.now();
    final cacheKey = 'stats_${now.year}_${now.month}';

    return _offline.loadMap(
      cacheKey: cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/planning/stats', queryParameters: {
          'mes': now.month,
          'anio': now.year,
        });
        return unwrapApiData(response.data);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Dashboard / Reportes')),
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
                onPressed: () => setState(() => _future = _fetchStats()),
                child: const Text('Reintentar dashboard'),
              ),
            );
          }

          final entries = payload.data.entries.toList();
          if (entries.isEmpty) return const Center(child: Text('Sin estadísticas para mostrar.'));

          return Column(
            children: [
              if (payload.fromCache)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(12),
                  children: entries
                      .map(
                        (e) => Card(
                          child: ListTile(
                            title: Text(e.key),
                            trailing: Text(e.value.toString()),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
