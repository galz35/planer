
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';

class PendingScreen extends StatefulWidget {
  const PendingScreen({super.key});

  @override
  State<PendingScreen> createState() => _PendingScreenState();
}

class _PendingScreenState extends State<PendingScreen> {
  static const _cacheKey = 'pending_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;
  String _filterDate = 'Todas';
  String _query = '';

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

  Future<void> _refresh() async {
    final result = await _load();
    if (mounted) {
      setState(() => _future = Future.value(result));
    }
  }

  List<Map<String, dynamic>> _filter(List<dynamic> items) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekEnd = today.add(const Duration(days: 7));

    return items.map((e) => (e as Map).cast<String, dynamic>()).where((task) {
      // Filtro por búsqueda
      if (_query.isNotEmpty) {
        final titulo = (task['titulo'] ?? '').toString().toLowerCase();
        final desc = (task['descripcion'] ?? '').toString().toLowerCase();
        if (!titulo.contains(_query.toLowerCase()) && !desc.contains(_query.toLowerCase())) {
          return false;
        }
      }

      // Filtro por fecha
      if (_filterDate == 'Todas') return true;

      final fechaStr = (task['fechaVencimiento'] ?? task['fecha_vencimiento'] ?? '').toString();
      if (fechaStr.isEmpty) return _filterDate == 'Todas'; // Si no tiene fecha y es 'Todas', pasa.

      final fecha = DateTime.tryParse(fechaStr);
      if (fecha == null) return false;

      final fechaDate = DateTime(fecha.year, fecha.month, fecha.day);

      if (_filterDate == 'Hoy') {
        return fechaDate.isAtSameMomentAs(today);
      } else if (_filterDate == 'Esta semana') {
        return fechaDate.isAfter(today.subtract(const Duration(days: 1))) && 
               fechaDate.isBefore(weekEnd);
      } else if (_filterDate == 'Atrasadas') {
        return fechaDate.isBefore(today);
      }

      return true;
    }).toList();
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    // Actualización optimista
    final previousFuture = _future;
    setState(() {
      _future = _future.then((data) {
        final newItems = List<dynamic>.from(data.items)..removeWhere((t) => (t['idTarea'] ?? t['id']) == id);
        return OfflineListResult(newItems, data.fromCache, data.timestamp);
      });
    });

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: const [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Tarea completada'),
              ],
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            duration: const Duration(seconds: 2),
            action: SnackBarAction(
              label: 'DESHACER',
              textColor: Colors.white,
              onPressed: () {
                // TODO: Implementar Undo
              },
            ),
          ),
        );
      }
    } catch (_) {
      // Revertir si falla
      setState(() => _future = previousFuture);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo actualizar la tarea')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        title: const Text(
          'Mis Pendientes',
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
          // Manejo de error o null
          if (data == null && snapshot.hasError) {
             return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (data == null) {
            // Caso raro, reintentar
             return const Center(child: CircularProgressIndicator()); 
          }

          final pending = _filter(data.items);

          return Column(
            children: [
              // Barra de Búsqueda y Filtros
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  children: [
                    TextField(
                      onChanged: (v) => setState(() => _query = v),
                      style: const TextStyle(fontFamily: 'Inter'),
                      decoration: InputDecoration(
                        hintText: 'Buscar tarea...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(CupertinoIcons.search, color: Color(0xFF94A3B8), size: 20),
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9), // Slate 100
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('Todas'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Hoy'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Esta semana'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Atrasadas'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 1), // Separador sutil

              // Lista de Tareas
              Expanded(
                child: pending.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _refresh,
                        color: const Color(0xFF059669),
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: pending.length,
                          itemBuilder: (_, i) => _buildTaskItem(pending[i]),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _filterDate == label;
    return InkWell(
      onTap: () => setState(() => _filterDate = label),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9), // Slate 900 vs Slate 100
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> item) {
    final titulo = (item['titulo'] ?? 'Sin título').toString();
    final proyecto = item['proyecto']?['nombre'] ?? item['nombreProyecto']; // Ajustar según backend
    final fechaRaw = (item['fechaVencimiento'] ?? item['fecha_vencimiento'] ?? '').toString();
    String? fechaFmt;
    
    if (fechaRaw.isNotEmpty) {
      final date = DateTime.tryParse(fechaRaw);
      if (date != null) {
        fechaFmt = '${date.day}/${date.month}';
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: () {
          // TODO: Navegar al detalle
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Checkbox de Acción Rápida
              SizedBox(
                width: 24,
                height: 24,
                child: Checkbox(
                  value: false,
                  onChanged: (_) => _markDone(item),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  activeColor: const Color(0xFF10B981),
                  side: const BorderSide(color: Color(0xFFCBD5E1), width: 2),
                ),
              ),
              const SizedBox(width: 16),
              
              // Contenido Textual
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      titulo,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B), // Slate 800
                      ),
                    ),
                    if (proyecto != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        proyecto.toString(),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 12,
                          color: Color(0xFF64748B), // Slate 500
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                    if (fechaFmt != null) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          const Icon(CupertinoIcons.calendar, size: 12, color: Color(0xFF94A3B8)),
                          const SizedBox(width: 4),
                          Text(
                            fechaFmt,
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),

              // Chevron o Inidcador
              const Icon(CupertinoIcons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    Widget box(double w, double h) => Container(
      width: w, height: h,
      decoration: BoxDecoration(color: Colors.grey.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        box(double.infinity, 50), // Search bar skeleton
        const SizedBox(height: 16),
        box(double.infinity, 40), // Filter chips skeleton
        const SizedBox(height: 24),
        for (int i = 0; i < 5; i++)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
            ),
            child: Row(children: [
              box(24, 24),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                box(150, 16),
                const SizedBox(height: 8),
                box(100, 12),
              ]))
            ]),
          )
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              shape: BoxShape.circle,
            ),
            child: const Icon(CupertinoIcons.check_mark, size: 48, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 24),
          Text(
            '¡Todo al día!',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'No hay tareas pendientes en este filtro.',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 15,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
