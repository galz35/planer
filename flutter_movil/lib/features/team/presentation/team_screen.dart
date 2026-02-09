import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart';

/// Módulo Equipos:
/// - Online: /planning/team
/// - Offline: cache local `team_my`
/// - Detalle rápido por miembro: tareas asignadas.
class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  static const _cacheKey = 'team_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _fetchTeam();
  }

  Future<OfflineListResult> _fetchTeam() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/planning/team');
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _openMemberTasks(Map<String, dynamic> member) async {
    final id = member['idUsuario'] ?? member['id'];
    if (id == null) return;

    List<dynamic> tasks = [];
    String error = '';

    try {
      final response = await ApiClient.dio.get('/equipo/miembro/$id/tareas');
      tasks = unwrapApiList(response.data);
    } catch (_) {
      error = 'No se pudieron cargar tareas del miembro.';
    }

    if (!mounted) return;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.7,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text((member['nombre'] ?? member['nombreCompleto'] ?? 'Miembro').toString(), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
                const SizedBox(height: 10),
                if (error.isNotEmpty)
                  Text(error)
                else if (tasks.isEmpty)
                  const Text('No hay tareas para este miembro.')
                else
                  Expanded(
                    child: ListView.builder(
                      itemCount: tasks.length,
                      itemBuilder: (_, i) {
                        final t = (tasks[i] as Map).cast<String, dynamic>();
                        return ListTile(
                          title: Text((t['titulo'] ?? 'Tarea').toString()),
                          subtitle: Text((t['estado'] ?? '').toString()),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF64748B)),
          onPressed: () => HomeShell.scaffoldKey.currentState?.openDrawer(),
          tooltip: 'Menú',
        ),
        title: const Text('Equipos'),
      ),
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
                onPressed: () => setState(() => _future = _fetchTeam()),
                child: const Text('Reintentar equipo'),
              ),
            );
          }

          final members = data.items;
          if (members.isEmpty) return const Center(child: Text('No se encontraron miembros de equipo.'));

          return Column(
            children: [
              if (data.fromCache)
                const Padding(
                  padding: EdgeInsets.all(8),
                  child: Text('Mostrando caché local (sin conexión).'),
                ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: members.length,
                  itemBuilder: (_, i) {
                    final m = (members[i] as Map).cast<String, dynamic>();
                    final name = (m['nombre'] ?? m['nombreCompleto'] ?? 'Miembro').toString();
                    final correo = (m['correo'] ?? '').toString();

                    return Card(
                      child: ListTile(
                        onTap: () => _openMemberTasks(m),
                        title: Text(name),
                        subtitle: Text(correo.isEmpty ? 'Sin correo' : correo),
                        leading: CircleAvatar(child: Text(name.substring(0, 1).toUpperCase())),
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
