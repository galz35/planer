import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../domain/task_item.dart';
import 'task_controller.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TaskController>();
    final items = controller.visibleTasks;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Momentus Mobile'),
        actions: [
          IconButton(
            onPressed: () => controller.loadTasks(),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreateTask(context),
        icon: const Icon(Icons.add),
        label: const Text('Nueva tarea'),
      ),
      body: controller.loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Column(
                    children: [
                      _Kpis(
                        pending: controller.pendingCount,
                        unsynced: controller.unsyncedCount,
                        total: controller.tasks.length,
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        onChanged: controller.setQuery,
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search),
                          hintText: 'Buscar por título o descripción',
                        ),
                      ),
                      const SizedBox(height: 8),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _FilterChip(
                              label: 'Todas',
                              selected: controller.filter == TaskFilter.all,
                              onTap: () => controller.setFilter(TaskFilter.all),
                            ),
                            _FilterChip(
                              label: 'Pendientes',
                              selected: controller.filter == TaskFilter.pending,
                              onTap: () => controller.setFilter(TaskFilter.pending),
                            ),
                            _FilterChip(
                              label: 'Completadas',
                              selected: controller.filter == TaskFilter.completed,
                              onTap: () => controller.setFilter(TaskFilter.completed),
                            ),
                            _FilterChip(
                              label: 'Sin sincronizar',
                              selected: controller.filter == TaskFilter.unsynced,
                              onTap: () => controller.setFilter(TaskFilter.unsynced),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: items.isEmpty
                      ? const Center(child: Text('No hay resultados para este filtro.'))
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                          itemBuilder: (_, index) {
                            final task = items[index];
                            return _TaskCard(
                              task: task,
                              onComplete: task.estado == 'completada'
                                  ? null
                                  : () => controller.markDone(task),
                            );
                          },
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemCount: items.length,
                        ),
                ),
              ],
            ),
    );
  }

  Future<void> _openCreateTask(BuildContext context) async {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final controller = context.read<TaskController>();

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(
            16,
            20,
            16,
            MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: 'Título'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Descripción'),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () async {
                  if (titleCtrl.text.trim().isEmpty || descCtrl.text.trim().isEmpty) return;
                  await controller.addTask(titleCtrl.text.trim(), descCtrl.text.trim());
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: const Text('Guardar offline'),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Kpis extends StatelessWidget {
  const _Kpis({required this.pending, required this.unsynced, required this.total});

  final int pending;
  final int unsynced;
  final int total;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: _KpiCard(label: 'Total', value: '$total', color: Colors.teal)),
        const SizedBox(width: 8),
        Expanded(child: _KpiCard(label: 'Pendientes', value: '$pending', color: Colors.orange)),
        const SizedBox(width: 8),
        Expanded(child: _KpiCard(label: 'Offline', value: '$unsynced', color: Colors.amber.shade900)),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: color)),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

class _TaskCard extends StatelessWidget {
  const _TaskCard({required this.task, required this.onComplete});

  final TaskItem task;
  final VoidCallback? onComplete;

  @override
  Widget build(BuildContext context) {
    final statusColor = task.estado == 'completada' ? Colors.green.shade700 : Colors.orange.shade700;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(task.titulo, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(task.descripcion),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              children: [
                Chip(label: Text(task.estado), side: BorderSide.none, backgroundColor: statusColor.withOpacity(0.12)),
                Chip(
                  label: Text(task.synced ? 'Sincronizada' : 'Pendiente de sync'),
                  side: BorderSide.none,
                  backgroundColor: task.synced ? Colors.teal.withOpacity(0.12) : Colors.amber.withOpacity(0.18),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: onComplete,
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Completar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
