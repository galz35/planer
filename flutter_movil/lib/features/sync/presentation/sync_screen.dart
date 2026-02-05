import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../tasks/data/local/local_database.dart';
import '../../../tasks/presentation/task_controller.dart';

class SyncScreen extends StatefulWidget {
  const SyncScreen({super.key});

  @override
  State<SyncScreen> createState() => _SyncScreenState();
}

class _SyncScreenState extends State<SyncScreen> {
  String lastCacheUpdate = '-';

  String _formatDate(DateTime? value) {
    if (value == null) return '-';
    return DateFormat('yyyy-MM-dd HH:mm:ss').format(value);
  }

  @override
  void initState() {
    super.initState();
    _loadMeta();
  }

  Future<void> _loadMeta() async {
    final db = await LocalDatabase.instance.database;
    final rows = await db.rawQuery('SELECT MAX(updated_at) AS max_updated FROM kv_cache');
    final value = rows.first['max_updated']?.toString() ?? '-';
    if (!mounted) return;
    setState(() => lastCacheUpdate = value);
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TaskController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Sincronización')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Estado offline-first', style: TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    Text('Eventos sincronizados en último intento: ${controller.lastSyncCount}'),
                    const SizedBox(height: 6),
                    Text('Tareas locales cargadas: ${controller.tasks.length}'),
                    const SizedBox(height: 6),
                    Text('Pendientes por sincronizar: ${controller.unsyncedCount}'),
                    const SizedBox(height: 6),
                    Text('Última actualización de caché: $lastCacheUpdate'),
                    const SizedBox(height: 6),
                    Text('Última sincronización: ${_formatDate(controller.lastSyncAt)}'),
                    if (controller.lastSyncError != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        controller.lastSyncError!,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: controller.loading
                  ? null
                  : () async {
                      await controller.syncNow();
                      await _loadMeta();
                    },
              icon: const Icon(Icons.sync),
              label: const Text('Sincronizar ahora'),
            ),
            const SizedBox(height: 10),
            const Text(
              'Estrategia actual: write-local-first + cola + retry exponencial + lectura API-first con fallback a cache local.',
            ),
          ],
        ),
      ),
    );
  }
}
