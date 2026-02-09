import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../common/data/offline_resource_service.dart';
import 'create_project_sheet.dart';

/// Pantalla de detalle completo de un proyecto
/// Muestra información del proyecto y lista de tareas asociadas
class ProjectDetailScreen extends StatefulWidget {
  final Map<String, dynamic> project;
  
  const ProjectDetailScreen({super.key, required this.project});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final _offlineService = const OfflineResourceService();
  late Future<OfflineListResult> _tasksFuture;
  bool _fromCache = false;

  @override
  void initState() {
    super.initState();
    _tasksFuture = _fetchTasks();
  }

  Future<OfflineListResult> _fetchTasks() async {
    final id = widget.project['idProyecto'] ?? widget.project['id'];
    final cacheKey = 'project_tasks_$id';
    
    return _offlineService.loadList(
      cacheKey: cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/proyectos/$id/tareas');
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _refresh() async {
    setState(() {
      _tasksFuture = _fetchTasks();
    });
  }

  @override
  Widget build(BuildContext context) {
    final nombre = widget.project['nombre']?.toString() ?? 'Proyecto';
    final descripcion = widget.project['descripcion']?.toString() ?? 'Sin descripción';
    final estado = widget.project['estado']?.toString() ?? '-';
    final fechaInicio = widget.project['fechaInicio']?.toString() ?? '-';
    final fechaFin = widget.project['fechaFin']?.toString() ?? '-';

    return Scaffold(
      appBar: AppBar(
        title: Text(nombre),
        actions: [
          if (_fromCache)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Chip(
                label: const Text('Offline', style: TextStyle(fontSize: 11)),
                backgroundColor: MomentusTheme.warning.withValues(alpha: 0.2),
                side: BorderSide.none,
                padding: EdgeInsets.zero,
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: Color(0xFF64748B)),
              onPressed: () {
                CreateProjectSheet.show(
                  context,
                  project: widget.project,
                  onCreated: () => Navigator.pop(context), 
                );
              },
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header del proyecto
              _buildProjectHeader(descripcion, estado, fechaInicio, fechaFin),
              
              const SizedBox(height: 24),
              
              // Sección de tareas
              Text(
                'Tareas del Proyecto',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              
              // Lista de tareas
              _buildTasksList(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProjectHeader(String descripcion, String estado, String fechaInicio, String fechaFin) {
    Color estadoColor = MomentusTheme.slate500;
    if (estado.toLowerCase().contains('activo') || estado.toLowerCase().contains('curso')) {
      estadoColor = MomentusTheme.primary;
    } else if (estado.toLowerCase().contains('complet')) {
      estadoColor = MomentusTheme.success;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusLg),
        boxShadow: MomentusTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Estado badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: estadoColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              estado,
              style: TextStyle(
                color: estadoColor,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ),
          
          const SizedBox(height: 16),
          
          // Descripción
          Text(
            descripcion,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: MomentusTheme.slate600,
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Fechas
          Row(
            children: [
              Expanded(
                child: _infoItem(
                  icon: Icons.calendar_today_outlined,
                  label: 'Inicio',
                  value: _formatDate(fechaInicio),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: _infoItem(
                  icon: Icons.event_outlined,
                  label: 'Fin',
                  value: _formatDate(fechaFin),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _infoItem({required IconData icon, required String label, required String value}) {
    return Row(
      children: [
        Icon(icon, size: 18, color: MomentusTheme.slate400),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: MomentusTheme.slate400,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _formatDate(String dateStr) {
    if (dateStr == '-' || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr;
    }
  }

  Widget _buildTasksList() {
    return FutureBuilder<OfflineListResult>(
      future: _tasksFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: CircularProgressIndicator(),
            ),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Text('Error: ${snapshot.error}'),
            ),
          );
        }

        final result = snapshot.data!;
        final tasks = result.items;
        
        // Actualizar estado de caché
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && _fromCache != result.fromCache) {
            setState(() => _fromCache = result.fromCache);
          }
        });

        if (tasks.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: MomentusTheme.slate50,
              borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
            ),
            child: const Column(
              children: [
                Icon(Icons.task_alt, size: 48, color: MomentusTheme.slate300),
                SizedBox(height: 12),
                Text(
                  'No hay tareas en este proyecto',
                  style: TextStyle(color: MomentusTheme.slate500),
                ),
              ],
            ),
          );
        }

        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: tasks.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) => _buildTaskCard(tasks[index]),
        );
      },
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final titulo = task['titulo']?.toString() ?? 'Sin título';
    final estado = task['estado']?.toString() ?? 'Pendiente';
    final asignado = task['asignadoNombre']?.toString() ?? task['asignado']?.toString() ?? '-';
    
    Color estadoColor = MomentusTheme.warning;
    IconData estadoIcon = Icons.radio_button_unchecked;
    
    if (estado.toLowerCase().contains('hecha') || estado.toLowerCase().contains('complet')) {
      estadoColor = MomentusTheme.success;
      estadoIcon = Icons.check_circle;
    } else if (estado.toLowerCase().contains('curso')) {
      estadoColor = MomentusTheme.primary;
      estadoIcon = Icons.play_circle_outline;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
        border: Border.all(color: MomentusTheme.slate200),
      ),
      child: Row(
        children: [
          Icon(estadoIcon, color: estadoColor, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  titulo,
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    decoration: estado.toLowerCase().contains('hecha') 
                        ? TextDecoration.lineThrough 
                        : null,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Asignado a: $asignado',
                  style: const TextStyle(
                    fontSize: 12,
                    color: MomentusTheme.slate500,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: estadoColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              estado,
              style: TextStyle(
                fontSize: 11,
                color: estadoColor,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
