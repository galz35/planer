
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart';
import 'project_detail_screen.dart';

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
    _fetchProjects();
  }

  void _fetchProjects() {
    setState(() {
      _future = _offline.loadList(
        cacheKey: _cacheKey,
        remote: () async {
          final response = await ApiClient.dio.get('/planning/my-projects');
          return unwrapApiList(response.data);
        },
      );
    });
  }

  Future<void> _refresh() async {
    _fetchProjects();
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF64748B)),
          onPressed: () => HomeShell.scaffoldKey.currentState?.openDrawer(),
          tooltip: 'Menú',
        ),
        title: const Text(
          'Mis Proyectos',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.bold,
            color: Color(0xFF0F172A),
            fontSize: 18,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.add, color: Color(0xFF059669)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Creación de proyectos próximamente')),
              );
            },
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: FutureBuilder<OfflineListResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return _buildSkeleton();
          }

          final data = snapshot.data;
          if (data == null) {
            return Center(
              child: ElevatedButton(
                onPressed: _fetchProjects,
                child: const Text('Reintentar'),
              ),
            );
          }

          final items = data.items;
          
          return Column(
            children: [
              if (data.fromCache)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                  color: const Color(0xFFFFF7ED),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.cloud_off, size: 16, color: Color(0xFFF97316)),
                      SizedBox(width: 8),
                      Text(
                        'Modo Offline - Datos cacheados',
                        style: TextStyle(
                          fontSize: 12,
                          color: Color(0xFF9A3412),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

              if (items.isEmpty)
                const Expanded(child: _ProjectsEmptyState())
              else
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    color: const Color(0xFF059669),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: items.length,
                      itemBuilder: (_, i) {
                        final p = (items[i] as Map).cast<String, dynamic>();
                        return _buildProjectCard(p);
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

  Widget _buildProjectCard(Map<String, dynamic> p) {
    final nombre = (p['nombre'] ?? p['titulo'] ?? 'Sin Nombre').toString();
    final desc = (p['descripcion'] ?? 'Sin descripción').toString();
    final estado = (p['estado'] ?? 'ACTIVO').toString().toUpperCase();
    final avance = ((p['avance'] ?? 0) as num).toDouble(); 
    
    Color statusColor = const Color(0xFF10B981); // Emerald
    Color statusBg = const Color(0xFFECFDF5);
    
    if (estado == 'CERRADO' || estado == 'FINALIZADO') {
      statusColor = const Color(0xFF64748B);
      statusBg = const Color(0xFFF1F5F9);
    } else if (estado == 'DETENIDO' || estado == 'PAUSADO') {
      statusColor = const Color(0xFFF59E0B);
      statusBg = const Color(0xFFFFFBEB);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => ProjectDetailScreen(project: p)),
        ),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: const Icon(CupertinoIcons.folder_fill, color: Color(0xFF334155)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          nombre,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: #${p['idProyecto'] ?? p['id']}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      estado,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Text(
                desc,
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  height: 1.4,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 16),
              
              if (avance > 0) ...[
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: avance / 100,
                          backgroundColor: const Color(0xFFF1F5F9),
                          color: const Color(0xFF10B981),
                          minHeight: 6,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${avance.toInt()}%',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF10B981),
                      ),
                    ),
                  ],
                ),
              ] else 
                const Row(
                  children: [
                    Icon(CupertinoIcons.calendar, size: 14, color: Color(0xFF94A3B8)),
                    SizedBox(width: 4),
                    Text(
                      'Sin progreso registrado',
                      style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    Widget box(double w, double h) => Container(
      width: w, height: h, 
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
    );

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (_, i) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            Row(children: [box(40, 40), const SizedBox(width: 12), Expanded(child: box(150, 20))]),
            const SizedBox(height: 12),
            box(double.infinity, 40),
          ],
        ),
      ),
    );
  }
}

class _ProjectsEmptyState extends StatelessWidget {
  const _ProjectsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.folder_open, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text(
            'No tienes proyectos asignados',
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
