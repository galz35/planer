import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import 'project_detail_screen.dart';

/// Módulo Proyectos:
/// - Online: /planning/my-projects
/// - Offline: cache local `projects_my`
/// - Detalle: consulta tareas de proyecto al tocar un elemento.
class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  static const _cacheKey = 'projects_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetchProjects();
  }

  Future<OfflineListResult> _fetchProjects() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/planning/my-projects');
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _refresh() async {
    setState(() => _future = _fetchProjects());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Proyectos')),
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
                onPressed: () => setState(() => _future = _fetchProjects()),
                child: const Text('Reintentar proyectos'),
              ),
            );
          }

          final items = data.items;
          if (items.isEmpty) {
            return const Center(child: Text('No hay proyectos visibles para tu usuario.'));
          }

          return Column(
            children: [
              if (data.fromCache)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: items.length,
                    itemBuilder: (_, i) {
                      final p = (items[i] as Map).cast<String, dynamic>();
                      return Card(
                        child: ListTile(
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ProjectDetailScreen(project: p),
                            ),
                          ),
                          title: Text((p['nombre'] ?? p['titulo'] ?? 'Proyecto').toString()),
                          subtitle: Text((p['descripcion'] ?? 'Sin descripción').toString()),
                          trailing: Text('#${(p['idProyecto'] ?? p['id'] ?? '-')}'),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
