

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../agenda/domain/agenda_models.dart';
import 'agenda_controller.dart';

import '../../home/presentation/home_shell.dart';

class AgendaScreen extends StatelessWidget {
  const AgendaScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AgendaController()..loadAgenda(),
      child: const _AgendaView(),
    );
  }
}

class _AgendaView extends StatelessWidget {
  const _AgendaView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<AgendaController>();
    
    // Formato fecha: "Lun 24 Ene"
    final fechaFormat = DateFormat('EEE d MMM', 'es_ES').format(controller.currentDate);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded, color: Color(0xFF64748B)),
          onPressed: () => HomeShell.scaffoldKey.currentState?.openDrawer(),
          tooltip: 'Menú',
        ),
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left_rounded, color: Color(0xFF64748B)),
              onPressed: controller.loading ? null : controller.prevDay,
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9), // Slate 100
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_rounded, size: 14, color: Color(0xFF475569)),
                  const SizedBox(width: 8),
                  Text(
                    fechaFormat,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                      color: Color(0xFF0F172A), // Slate 900
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right_rounded, color: Color(0xFF64748B)),
              onPressed: controller.loading ? null : controller.nextDay,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF64748B)),
            onPressed: () => controller.loadAgenda(),
          ),
        ],
      ),
      body: controller.loading
          ? _buildSkeleton(context)
          : controller.error != null
              ? Center(child: Text(controller.error!, style: const TextStyle(color: Colors.red)))
              : _buildContent(context, controller.data!),
    );
  }

  Widget _buildContent(BuildContext context, AgendaResponse data) {
    final total = data.tareasSugeridas.length + data.backlog.length;
    final hechas = data.tareasSugeridas.where((t) => t.estado == 'Hecha').length;
    
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // === KPIS HEADER ===
        Row(
          children: [
            _buildKpiCard('Total', total.toString(), const Color(0xFF6366F1)), // Indigo
            const SizedBox(width: 12),
            _buildKpiCard('Hechas', hechas.toString(), const Color(0xFF10B981)), // Emerald
            const SizedBox(width: 12),
            _buildKpiCard('Pendientes', (total - hechas).toString(), const Color(0xFFF59E0B)), // Amber
          ],
        ),
        
        const SizedBox(height: 24),

        // === BLOQUEOS ACTIVOS (Alerta) ===
        if (data.bloqueosActivos.isNotEmpty) ...[
          const Text(
            'BLOQUEOS CRÍTICOS',
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
        const Text(
          'MI AGENDA HOY',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w800,
            color: Color(0xFF64748B), // Slate 500
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 12),
        
        if (data.tareasSugeridas.isEmpty)
          const Padding(
            padding: EdgeInsets.all(32.0),
            child: Center(
              child: Text(
                'No hay tareas programadas para hoy',
                style: TextStyle(color: Color(0xFF94A3B8)),
              ),
            ),
          )
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
      ],
    );
  }

  Widget _buildKpiCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
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
        child: Column(
          children: [
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFFF0FDF4) : Colors.white, // Green 50 si hecha
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: isDone ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          // Checkbox Custom
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: isDone ? const Color(0xFF10B981) : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isDone ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                width: 2,
              ),
            ),
            child: isDone
                ? const Icon(Icons.check, size: 16, color: Colors.white)
                : null,
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
                    color: isDone ? const Color(0xFF059669) : const Color(0xFF1E293B), // Emerald 600 vs Slate 800
                    decoration: isDone ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (t.proyectoNombre != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      t.proyectoNombre!,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF64748B), // Slate 500
                      ),
                    ),
                  ),
              ],
            ),
          ),
          
          // Badge Prioridad
          if (!isDone && t.prioridad == 'Alta')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: const Text(
                'Alta',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFFEF4444),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSkeleton(BuildContext context) {
    // Helper para placeholder boxes
    Widget box(double height, double width) => Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // KPIs Skeleton
        Row(
          children: [
            Expanded(child: box(80, double.infinity)),
            const SizedBox(width: 12),
            Expanded(child: box(80, double.infinity)),
            const SizedBox(width: 12),
            Expanded(child: box(80, double.infinity)),
          ],
        ),
        const SizedBox(height: 32),
        
        // Title Skeleton
        box(20, 150),
        const SizedBox(height: 16),
        
        // Task List Skeleton (3 items)
        for(int i=0; i<3; i++)
          Container(
            height: 80,
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.1)),
            ),
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                box(24, 24), // Checkbox
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      box(16, double.infinity), // Title
                      const SizedBox(height: 8),
                      box(12, 100), // Subtitle
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

