import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../common/data/offline_resource_service.dart';

/// Pendientes
///
/// - Lee pendientes reales del backend.
/// - Si falla red, usa cache local.
/// - Permite acción rápida: marcar como hecha.
/// - Filtros: Hoy, Esta semana, Atrasadas, Todas
/// - Búsqueda por texto
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

    final filtered = items.map((e) => (e as Map).cast<String, dynamic>()).where((task) {
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
      if (fechaStr.isEmpty) return _filterDate == 'Todas';

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

    return filtered;
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    try {
      await ApiClient.dio.patch('/tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Tarea marcada como hecha')),
        );
      }
      _refresh();
    } catch (_) {
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

          final pending = _filter(data.items);

          return Column(
            children: [
              if (data.fromCache)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  color: MomentusTheme.warning.withValues(alpha: 0.1),
                  child: const Row(
                    children: [
                      Icon(Icons.cloud_off, color: MomentusTheme.warning, size: 18),
                      SizedBox(width: 8),
                      Text('Mostrando caché local (sin conexión)'),
                    ],
                  ),
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  onChanged: (v) => setState(() => _query = v),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search),
                    hintText: 'Buscar en pendientes...',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
                    ),
                    filled: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    _chip('Todas'),
                    _chip('Hoy'),
                    _chip('Esta semana'),
                    _chip('Atrasadas'),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (pending.isEmpty)
                Expanded(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline, size: 64, color: MomentusTheme.success),
                        const SizedBox(height: 12),
                        Text(
                          'Excelente, no tienes pendientes${_filterDate != 'Todas' ? ' para este filtro' : ''}.',
                          style: Theme.of(context).textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  ),
                )
              else
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: pending.length,
                      itemBuilder: (_, i) {
                        final item = pending[i];
                        final titulo = (item['titulo'] ?? 'Tarea').toString();
                        final desc = (item['descripcion'] ?? '').toString();
                        final fecha = (item['fechaVencimiento'] ?? item['fecha_vencimiento'] ?? '').toString();
                        
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(titulo),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (desc.isNotEmpty) Text(desc, maxLines: 2, overflow: TextOverflow.ellipsis),
                                if (fecha.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Row(
                                      children: [
                                        Icon(Icons.calendar_today, size: 14, color: Colors.grey[600]),
                                        const SizedBox(width: 4),
                                        Text(
                                          fecha.substring(0, fecha.length >= 10 ? 10 : fecha.length),
                                          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                        ),
                                      ],
                                    ),
                                  ),
                              ],
                            ),
                            leading: const Icon(Icons.radio_button_unchecked),
                            trailing: IconButton(
                              icon: const Icon(Icons.check_circle_outline, color: MomentusTheme.success),
                              onPressed: () => _markDone(item),
                            ),
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

  Widget _chip(String label) {
    final selected = _filterDate == label;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        selectedColor: MomentusTheme.primary.withValues(alpha: 0.2),
        onSelected: (_) => setState(() => _filterDate = label),
      ),
    );
  }
}

