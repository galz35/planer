
import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../agenda/domain/agenda_models.dart';
import 'agenda_controller.dart';
import '../../home/presentation/home_shell.dart';
import '../../tasks/presentation/task_detail_sheet.dart';
import '../../../core/network/api_client.dart';
import '../../dashboard/presentation/dashboard_tab.dart';

class AgendaScreen extends StatelessWidget {
  const AgendaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        backgroundColor: Colors.white, // Fondo blanco para less "gris"
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.menu_rounded, color: Color(0xFF1E293B)),
            onPressed: () => HomeShell.scaffoldKey.currentState?.openDrawer(),
          ),
          title: const Text(
            'Mi Día',
            style: TextStyle(
              fontFamily: 'Inter',
              color: Color(0xFF0F172A),
              fontWeight: FontWeight.bold,
              fontSize: 20,
            ),
          ),
          bottom: const TabBar(
            labelColor: Color(0xFF6366F1), // Indigo 500
            unselectedLabelColor: Color(0xFF94A3B8), // Slate 400
            indicatorColor: Color(0xFF6366F1),
            indicatorWeight: 3,
            labelStyle: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: [
              Tab(text: 'MIS TAREAS'),
              Tab(text: 'DASHBOARD'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            AgendaTab(),
            DashboardTab(),
          ],
        ),
      ),
    );
  }
}

/// Pestaña de Agenda (Tareas)
class AgendaTab extends StatelessWidget {
  const AgendaTab({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AgendaController()..loadAgenda(),
      child: const _AgendaTabContent(),
    );
  }
}

class _AgendaTabContent extends StatelessWidget {
  const _AgendaTabContent();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AgendaController>();

    return Column(
      children: [
        // Date Navigation Header
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
             color: Colors.white,
             border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded, color: Color(0xFF64748B)),
                onPressed: controller.loading ? null : controller.prevDay,
                tooltip: 'Día anterior',
              ),
              
              InkWell(
                onTap: () {
                    // Date picker logic could go here
                    // controller.loadAgenda(DateTime.now()); // Reset to today
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9), // Slate 100
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF475569)),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat('EEEE d MMMM', 'es_ES').format(controller.currentDate).toUpperCase(),
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          color: Color(0xFF334155),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              IconButton(
                icon: const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
                onPressed: controller.loading ? null : controller.nextDay,
                tooltip: 'Día siguiente',
              ),
            ],
          ),
        ),

        // Body
        Expanded(
          child: controller.loading
            ? const Center(child: CircularProgressIndicator())
            : controller.error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(controller.error!, style: const TextStyle(color: Colors.grey)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => controller.loadAgenda(),
                          child: const Text('Reintentar'),
                        ),
                      ],
                    ),
                  )
                : _AgendaList(data: controller.data!, onRefresh: controller.loadAgenda),
        ),
      ],
    );
  }
}

class _AgendaList extends StatefulWidget {
  final AgendaResponse data;
  final VoidCallback onRefresh;

  const _AgendaList({required this.data, required this.onRefresh});

  @override
  State<_AgendaList> createState() => _AgendaListState();
}

class _AgendaListState extends State<_AgendaList> {
  
  Future<void> _markTaskDone(Tarea t) async {
    try {
      await ApiClient.dio.patch('/tareas/${t.idTarea}', data: {'estado': 'Hecha', 'progreso': 100});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.celebration, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('¡Tarea completada! 🎉'),
              ],
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        widget.onRefresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _openTaskDetail(Tarea t) {
    TaskDetailSheet.show(
      context,
      t.toJson(),
      onUpdated: widget.onRefresh,
    );
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.data;
    final total = data.tareasSugeridas.length + data.backlog.length;
    final hechas = data.tareasSugeridas.where((t) => t.estado == 'Hecha').length;
    final pendientes = total - hechas;

    return RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // === KPIS HEADER (Resumen del día) ===
          Row(
            children: [
              _buildKpiCard('Total', total.toString(), const Color(0xFF6366F1), Icons.layers_outlined),
              const SizedBox(width: 12),
              _buildKpiCard('Hechas', hechas.toString(), const Color(0xFF10B981), Icons.check_circle_outline),
              const SizedBox(width: 12),
              _buildKpiCard('Faltan', pendientes.toString(), const Color(0xFFF59E0B), Icons.timelapse),
            ],
          ),
          
          const SizedBox(height: 24),

          // === BLOQUEOS ACTIVOS (Alerta) ===
          if (data.bloqueosActivos.isNotEmpty) ...[
            const Text(
              '⚠️ BLOQUEOS CRÍTICOS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Color(0xFFB91C1C), // Red 800
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 8),
            ...data.bloqueosActivos.map((b) => _buildBloqueoCard(b)),
            const SizedBox(height: 24),
          ],

          // === MI AGENDA (Sugeridas) ===
         Row(
           children: [
             const Icon(Icons.wb_sunny_rounded, size: 16, color: Color(0xFFF59E0B)),
             const SizedBox(width: 8),
             const Text(
                'MI AGENDA HOY',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF64748B), // Slate 500
                  letterSpacing: 1,
                ),
              ),
           ],
         ),
          const SizedBox(height: 12),
          
          if (data.tareasSugeridas.isEmpty)
            _buildEmptyState()
          else
            ...data.tareasSugeridas.map((t) => _buildTaskCard(t)),
            
          const SizedBox(height: 24),

          // === BACKLOG ===
          if (data.backlog.isNotEmpty) ...[
            const Text(
              'BACKLOG / OTRAS',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Color(0xFF94A3B8), // Slate 400
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 12),
            ...data.backlog.map((t) => _buildTaskCard(t, isBacklog: true)),
          ],
          
          const SizedBox(height: 48), // Bottom padding
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(32.0),
      // decoration: BoxDecoration(
      //   color: Colors.white,
      //   borderRadius: BorderRadius.circular(16),
      //   border: Border.all(color: const Color(0xFFE2E8F0)),
      // ), // Clean look, no border container
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              shape: BoxShape.circle,
              boxShadow: [
                 BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                 )
              ]
            ),
            child: const Icon(CupertinoIcons.check_mark, size: 32, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 16),
          const Text(
            '¡Todo al día!',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'No hay tareas pendientes en tu agenda para hoy.\n¡Disfruta tu tiempo o adelanta backlog!',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF64748B), height: 1.5),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
             onPressed: () {
                // Navegar a planificar? o simplemente recargar
                widget.onRefresh();
             },
             icon: const Icon(Icons.refresh),
             label: const Text('Comprobar agenda'),
          )
        ],
      ),
    );
  }

  Widget _buildKpiCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color.withValues(alpha: 0.8)),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: color,
                height: 1,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: Color(0xFF94A3B8), // Slate 400
              ),
              textAlign: TextAlign.center,
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBloqueoCard(Bloqueo b) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2), // Red 50
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)), // Red 200
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bloqueo: ${b.motivo}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF991B1B), // Red 800
                    fontSize: 14,
                  ),
                ),
                if (b.destinoTexto != null)
                  Text(
                    'Para: ${b.destinoTexto}',
                    style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTaskCard(Tarea t, {bool isBacklog = false}) {
    final isDone = t.estado == 'Hecha';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFFF0FDF4) : Colors.white, // Green 50 si hecha
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
            spreadRadius: 0
          ),
        ],
        border: Border.all(
          color: isDone ? const Color(0xFFBBF7D0) : const Color(0xFFF1F5F9),
        ),
      ),
      child: InkWell(
        onTap: () => _openTaskDetail(t),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Checkbox Custom - Clickeable
              InkWell(
                onTap: isDone ? null : () => _markTaskDone(t),
                borderRadius: BorderRadius.circular(12), // Rounder
                child: Container(
                  width: 28, // Bigger touch area
                  height: 28,
                  decoration: BoxDecoration(
                    color: isDone ? const Color(0xFF10B981) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isDone ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                      width: 2,
                    ),
                  ),
                  child: isDone
                      ? const Icon(Icons.check, size: 18, color: Colors.white)
                      : null,
                ),
              ),
              const SizedBox(width: 16),
              
              // Contenido
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.titulo,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: isDone ? const Color(0xFF059669) : const Color(0xFF1E293B),
                        decoration: isDone ? TextDecoration.lineThrough : null,
                        decorationColor: const Color(0xFF059669),
                      ),
                    ),
                    if (t.proyectoNombre != null) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4)
                        ),
                        child: Text(
                          t.proyectoNombre!,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                    // Barra de progreso si hay progreso parcial
                    if (!isDone && t.progreso > 0 && t.progreso < 100) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: t.progreso / 100,
                                backgroundColor: const Color(0xFFF1F5F9),
                                color: const Color(0xFF3B82F6), // Blue for progress
                                minHeight: 4,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${t.progreso}%',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF3B82F6),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(width: 8),

              // Badge Prioridad + Chevron
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (!isDone && t.prioridad == 'Alta')
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      margin: const EdgeInsets.only(bottom: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: const Text(
                        'ALTA',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFFEF4444),
                        ),
                      ),
                    ),
                  const Icon(CupertinoIcons.chevron_right, size: 16, color: Color(0xFFCBD5E1)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
