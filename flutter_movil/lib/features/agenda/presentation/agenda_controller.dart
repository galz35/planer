import 'package:flutter/material.dart';
import '../data/agenda_repository.dart';
import '../domain/agenda_models.dart';

class AgendaController extends ChangeNotifier {
  final AgendaRepository _repository;

  AgendaController({AgendaRepository? repository})
      : _repository = repository ?? AgendaRepository();

  bool loading = false;
  String? error;
  AgendaResponse? data;

  // Fecha seleccionada
  DateTime currentDate = DateTime.now();

  Future<void> loadAgenda([DateTime? date]) async {
    final targetDate = date ?? currentDate;
    currentDate = targetDate;

    // Formato YYYY-MM-DD para la API
    final fechaStr =
        "${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}";

    loading = true;
    error = null;
    notifyListeners();

    try {
      data = await _repository.getMiDia(fechaStr);
    } catch (e) {
      error = 'Error al cargar agenda: $e';
      data = null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  // Estado de Selección para Planificación (Unificado: Solo Foco)
  Set<int> selectedMainTaskIds = {};
  bool startDayLoading = false;

  void toggleTask(int id) {
    if (selectedMainTaskIds.contains(id)) {
      selectedMainTaskIds.remove(id);
    } else {
      selectedMainTaskIds.add(id);
    }
    notifyListeners();
  }

  Future<void> saveCheckin(int userId) async {
    if (selectedMainTaskIds.isEmpty) {
      error = "Selecciona al menos una tarea para iniciar tu día.";
      notifyListeners();
      return;
    }

    startDayLoading = true;
    notifyListeners();

    try {
      final fechaStr =
          "${currentDate.year}-${currentDate.month.toString().padLeft(2, '0')}-${currentDate.day.toString().padLeft(2, '0')}";

      final checkinPayload = {
        "idUsuario": userId,
        "fecha": fechaStr,
        "entregableTexto": "Objetivo del día",
        "entrego": selectedMainTaskIds.toList(),
        "avanzo": [], // Unificado: Todo es Foco/Entrego
        "extras": [],
        "estadoAnimo": "Normal"
      };

      await _repository.saveCheckin(checkinPayload);

      // Recargar para obtener el nuevo estado (Plan Activo)
      await loadAgenda();

      // Limpiar selección
      selectedMainTaskIds.clear();
    } catch (e) {
      error = 'Error al guardar plan: $e';
    } finally {
      startDayLoading = false;
      notifyListeners();
    }
  }

  Future<void> completeTask(int taskId) async {
    try {
      await _repository.completeTask(taskId);
      await loadAgenda();
    } catch (e) {
      error = "Error al completar tarea: $e";
      notifyListeners();
    }
  }

  void nextDay() {
    loadAgenda(currentDate.add(const Duration(days: 1)));
  }

  void prevDay() {
    loadAgenda(currentDate.subtract(const Duration(days: 1)));
  }
}
