import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart';

/// Dashboard ejecutivo móvil.
///
/// Fuente principal: /planning/stats
/// Fallback: cache local mensual.
/// Incluye: gráficos de barras y pie chart
class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  static const _offline = OfflineResourceService();

  late Future<OfflineMapResult> _future;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _future = _fetchStats();
  }

  Future<OfflineMapResult> _fetchStats() {
    final cacheKey = 'stats_${_selectedYear}_$_selectedMonth';

    return _offline.loadMap(
      cacheKey: cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('/planning/stats', queryParameters: {
          'mes': _selectedMonth,
          'anio': _selectedYear,
        });
        return unwrapApiData(response.data);
      },
    );
  }

  void _changeMonth(int delta) {
    int newMonth = _selectedMonth + delta;
    int newYear = _selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setState(() {
      _selectedMonth = newMonth;
      _selectedYear = newYear;
      _future = _fetchStats();
    });
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
        title: const Text('Dashboard / Reportes'),
      ),
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

          final data = payload.data;
          if (data.isEmpty) return const Center(child: Text('Sin estadísticas para mostrar.'));

          // Extraer métricas comunes
          final totalTareas = (data['totalTareas'] ?? data['total_tareas'] ?? 0) as num;
          final completadas = (data['completadas'] ?? data['hechas'] ?? 0) as num;
          final pendientes = (data['pendientes'] ?? 0) as num;
          final enCurso = (data['enCurso'] ?? data['en_curso'] ?? 0) as num;
          final porcentaje = totalTareas > 0 ? (completadas / totalTareas * 100).round() : 0;

          return RefreshIndicator(
            onRefresh: () async {
              final result = await _fetchStats();
              if (mounted) {
                setState(() => _future = Future.value(result));
              }
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (payload.fromCache)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: MomentusTheme.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cloud_off, color: MomentusTheme.warning),
                        SizedBox(width: 8),
                        Text('Mostrando caché local'),
                      ],
                    ),
                  ),

                // Selector de período
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        IconButton(
                          onPressed: () => _changeMonth(-1),
                          icon: const Icon(Icons.chevron_left),
                        ),
                        Text(
                          '${_getMonthName(_selectedMonth)} $_selectedYear',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        IconButton(
                          onPressed: () => _changeMonth(1),
                          icon: const Icon(Icons.chevron_right),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Porcentaje de completitud
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Text(
                          '$porcentaje%',
                          style: const TextStyle(
                            fontSize: 48,
                            fontWeight: FontWeight.bold,
                            color: MomentusTheme.primary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text('Tareas completadas'),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(
                          value: porcentaje / 100,
                          backgroundColor: Colors.grey[200],
                          valueColor: const AlwaysStoppedAnimation(MomentusTheme.primary),
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // KPIs en row
                Row(
                  children: [
                    Expanded(child: _KpiCard(label: 'Total', value: totalTareas.toInt(), color: MomentusTheme.primary)),
                    const SizedBox(width: 8),
                    Expanded(child: _KpiCard(label: 'Hechas', value: completadas.toInt(), color: MomentusTheme.success)),
                    const SizedBox(width: 8),
                    Expanded(child: _KpiCard(label: 'Pendientes', value: pendientes.toInt(), color: MomentusTheme.warning)),
                  ],
                ),
                const SizedBox(height: 16),

                // Gráfico de barras
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Distribución de tareas', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 200,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              barTouchData: BarTouchData(enabled: true),
                              titlesData: FlTitlesData(
                                show: true,
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (value, meta) {
                                      final labels = ['Hechas', 'En curso', 'Pendientes'];
                                      final index = value.toInt();
                                      if (index >= 0 && index < labels.length) {
                                        return Padding(
                                          padding: const EdgeInsets.only(top: 8),
                                          child: Text(labels[index], style: const TextStyle(fontSize: 12)),
                                        );
                                      }
                                      return const SizedBox.shrink();
                                    },
                                  ),
                                ),
                                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: const FlGridData(show: false),
                              borderData: FlBorderData(show: false),
                              barGroups: [
                                _buildBarGroup(0, completadas.toDouble(), MomentusTheme.success),
                                _buildBarGroup(1, enCurso.toDouble(), MomentusTheme.primary),
                                _buildBarGroup(2, pendientes.toDouble(), MomentusTheme.warning),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Pie chart
                if (totalTareas > 0)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Por estado', style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 16),
                          SizedBox(
                            height: 180,
                            child: PieChart(
                              PieChartData(
                                sectionsSpace: 2,
                                centerSpaceRadius: 40,
                                sections: [
                                  PieChartSectionData(
                                    value: completadas.toDouble(),
                                    title: '${completadas.toInt()}',
                                    color: MomentusTheme.success,
                                    radius: 50,
                                    titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  ),
                                  if (enCurso > 0)
                                    PieChartSectionData(
                                      value: enCurso.toDouble(),
                                      title: '${enCurso.toInt()}',
                                      color: MomentusTheme.primary,
                                      radius: 50,
                                      titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  if (pendientes > 0)
                                    PieChartSectionData(
                                      value: pendientes.toDouble(),
                                      title: '${pendientes.toInt()}',
                                      color: MomentusTheme.warning,
                                      radius: 50,
                                      titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _LegendItem(color: MomentusTheme.success, label: 'Hechas'),
                              SizedBox(width: 16),
                              _LegendItem(color: MomentusTheme.primary, label: 'En curso'),
                              SizedBox(width: 16),
                              _LegendItem(color: MomentusTheme.warning, label: 'Pendientes'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  BarChartGroupData _buildBarGroup(int x, double y, Color color) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: color,
          width: 24,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  String _getMonthName(int month) {
    const months = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month];
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.label, required this.value, required this.color});

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Text(
              '$value',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color),
            ),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  const _LegendItem({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}

