import 'package:flutter/foundation.dart';

import '../data/repositories/task_repository.dart';
import '../domain/task_item.dart';

enum TaskFilter { all, pending, completed, unsynced }

class TaskController extends ChangeNotifier {
  TaskController({TaskRepository? repository}) : _repository = repository ?? TaskRepository();

  final TaskRepository _repository;

  List<TaskItem> tasks = [];
  bool loading = false;
  String? error;
  int lastSyncCount = 0;
  DateTime? lastSyncAt;
  String? lastSyncError;
  String query = '';
  TaskFilter filter = TaskFilter.all;

  int get pendingCount => tasks.where((t) => t.estado != 'completada').length;
  int get unsyncedCount => tasks.where((t) => !t.synced).length;

  List<TaskItem> get visibleTasks {
    Iterable<TaskItem> data = tasks;

    switch (filter) {
      case TaskFilter.pending:
        data = data.where((t) => t.estado != 'completada');
        break;
      case TaskFilter.completed:
        data = data.where((t) => t.estado == 'completada');
        break;
      case TaskFilter.unsynced:
        data = data.where((t) => !t.synced);
        break;
      case TaskFilter.all:
        break;
    }

    final q = query.trim().toLowerCase();
    if (q.isNotEmpty) {
      data = data.where((t) =>
          t.titulo.toLowerCase().contains(q) || t.descripcion.toLowerCase().contains(q));
    }

    return data.toList();
  }

  void setQuery(String value) {
    query = value;
    notifyListeners();
  }

  void setFilter(TaskFilter value) {
    filter = value;
    notifyListeners();
  }

  Future<void> loadTasks() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      tasks = await _repository.getTasks();
    } catch (e) {
      error = 'No se pudieron cargar las tareas: $e';
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> addTask(String titulo, String descripcion) async {
    await _repository.createTask(titulo: titulo, descripcion: descripcion);
    await loadTasks();
  }

  Future<void> markDone(TaskItem task) async {
    await _repository.completeTask(task);
    await loadTasks();
  }

  Future<void> syncNow() async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      lastSyncCount = await _repository.syncPendingEvents();
      lastSyncAt = DateTime.now();
      lastSyncError = null;
      await loadTasks();
    } catch (e) {
      final message = 'Error de sincronización: $e';
      error = message;
      lastSyncError = message;
      loading = false;
      notifyListeners();
    }
  }
}
