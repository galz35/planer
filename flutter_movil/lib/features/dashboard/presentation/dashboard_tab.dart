
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../dashboard/data/dashboard_models.dart';
import 'dashboard_controller.dart';

class DashboardTab extends StatelessWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => DashboardController()..loadKPIs(),
      child: const _DashboardView(),
    );
  }
}

class _DashboardView extends StatelessWidget {
  const _DashboardView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<DashboardController>();

    if (controller.loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            Text('Error: ${controller.error}', textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: controller.loadKPIs,
              child: const Text('Reintentar'),
            )
          ],
        ),
      );
    }

    final data = controller.data;
    if (data == null) return const SizedBox();

    final resumen = data.resumen;
    final completionRate = resumen.total > 0 
        ? ((resumen.hechas / resumen.total) * 100).round()
        : 0;

    return RefreshIndicator(
      onRefresh: controller.loadKPIs,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Efectividad
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF4F46E5), Color(0xFF6366F1)], // Indigo 600-500
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color:const Color(0xFF6366F1).withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Dashboard Ejecutivo',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Resumen operativo',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$completionRate%',
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        height: 1,
                      ),
                    ),
                    const Text(
                      'EFECTIVIDAD GLOBAL',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: Colors.white70,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 20),

          // Grid KPIs
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.5,
            children: [
              _MetricCard(
                label: 'Total Tareas',
                value: resumen.total.toString(),
                icon: Icons.layers_outlined,
                color: const Color(0xFF4B5563), // Gray 600
                bgColor: const Color(0xFFF9FAFB), // Gray 50
              ),
              _MetricCard(
                label: 'Completadas',
                value: resumen.hechas.toString(),
                icon: Icons.check_circle_outline,
                color: const Color(0xFF059669), // Emerald 600
                bgColor: const Color(0xFFECFDF5), // Emerald 50
              ),
              _MetricCard(
                label: 'En Proceso',
                value: resumen.pendientes.toString(),
                icon: Icons.timelapse, // Circle icon replacement
                color: const Color(0xFF2563EB), // Blue 600
                bgColor: const Color(0xFFEFF6FF), // Blue 50
              ),
              _MetricCard(
                label: 'Bloqueadas',
                value: resumen.bloqueadas.toString(),
                icon: Icons.warning_amber_rounded,
                color: const Color(0xFFDC2626), // Red 600
                bgColor: const Color(0xFFFEF2F2), // Red 50
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Lista Proyectos
          const Text(
            'RENDIMIENTO POR PROYECTO',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: Color(0xFF64748B),
              letterSpacing: 1,
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(height: 12),
          
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: [
                 BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                if (data.proyectos.isEmpty)
                   const Padding(
                     padding: EdgeInsets.all(32),
                     child: Text('No hay proyectos activos', style: TextStyle(color: Colors.grey)),
                   ),
                   
                for (int i = 0; i < data.proyectos.length; i++)
                  _ProjectItem(
                    item: data.proyectos[i],
                    isLast: i == data.proyectos.length - 1,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label.toUpperCase(),
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: color.withValues(alpha: 0.8),
                    letterSpacing: 0.5,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          Text(
            value,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Color.lerp(color, Colors.black, 0.2), // Darken slightly
            ),
          ),
        ],
      ),
    );
  }
}

class _ProjectItem extends StatelessWidget {
  final ProyectoKPI item;
  final bool isLast;

  const _ProjectItem({required this.item, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final percent = item.avancePercent;
    
    // Determine color based on percent
    Color barColor;
    if (percent >= 80) barColor = const Color(0xFF10B981); // Green
    else if (percent >= 50) barColor = const Color(0xFF3B82F6); // Blue
    else barColor = const Color(0xFFF59E0B); // Amber

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: isLast ? null : Border(bottom: BorderSide(color: Colors.grey[100]!)),
      ),
      child: Row(
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.proyecto,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                    fontFamily: 'Inter',
                  ),
                ),
                Text(
                  item.area,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                    fontFamily: 'Inter',
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    Text(
                      '$percent%',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: barColor,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: item.total > 0 ? item.hechas / item.total : 0,
                    backgroundColor: const Color(0xFFF1F5F9),
                    color: barColor,
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
