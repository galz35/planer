import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';

/// Mi Asignación
///
/// Este módulo reutiliza endpoint existente de web:
/// - GET /tareas/mias
///
/// Incluye:
/// - Filtro por estado
/// - Búsqueda por texto
/// - Acción rápida "Marcar hecha"
class MyAssignmentScreen extends StatefulWidget {
  const MyAssignmentScreen({super.key});

  @override
  State<MyAssignmentScreen> createState() => _MyAssignmentScreenState();
}

class _MyAssignmentScreenState extends State<MyAssignmentScreen> {
  static const _cacheKey = 'assignment_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;
  String _query = '';
  String _filter = 'Todas';

  @override
  void initState() {
    super.initState();
    _future = _fetchAssignments();
  }

  Future<OfflineListResult> _fetchAssignments() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/tareas/mias');
        return unwrapApiList(response.data);
      },
    );
  }

  List<Map<String, dynamic>> _visible(List<dynamic> items) {
    final asMaps = items.map((e) => (e as Map).cast<String, dynamic>()).toList();

    return asMaps.where((t) {
      final estado = (t['estado'] ?? '').toString();
      final titulo = (t['titulo'] ?? '').toString().toLowerCase();
      final desc = (t['descripcion'] ?? '').toString().toLowerCase();
      final q = _query.trim().toLowerCase();

      final statusOk = _filter == 'Todas' || estado == _filter;
      final queryOk = q.isEmpty || titulo.contains(q) || desc.contains(q);
      return statusOk && queryOk;
    }).toList();
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Asignación completada')));
      }
      setState(() => _future = _fetchAssignments());
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No se pudo actualizar')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mi Asignación')),
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
                onPressed: () => setState(() => _future = _fetchAssignments()),
                child: const Text('Reintentar asignaciones'),
              ),
            );
          }

          final tasks = _visible(data.items);
          if (tasks.isEmpty) return const Center(child: Text('No tienes asignaciones para este filtro.'));

          return Column(
            children: [
              if (data.fromCache)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Buscar en mis asignaciones',
                  ),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    _chip('Todas'),
                    _chip('Pendiente'),
                    _chip('EnCurso'),
                    _chip('Hecha'),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: tasks.length,
                  itemBuilder: (_, i) {
                    final t = tasks[i];
                    final estado = (t['estado'] ?? 'Pendiente').toString();
                    final color = estado == 'Hecha' ? Colors.green : Colors.orange;

                    return Card(
                      child: ListTile(
                        title: Text((t['titulo'] ?? 'Tarea').toString()),
                        subtitle: Text((t['descripcion'] ?? '').toString()),
                        trailing: Wrap(
                          spacing: 8,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(estado, style: TextStyle(color: color, fontWeight: FontWeight.w700)),
                            ),
                            if (estado != 'Hecha')
                              IconButton(
                                icon: const Icon(Icons.check_circle_outline),
                                onPressed: () => _markDone(t),
                              ),
                          ],
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

  Widget _chip(String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: _filter == label,
        onSelected: (_) => setState(() => _filter = label),
      ),
    );
  }
}
