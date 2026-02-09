
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

class TasksRemoteDataSource {
  final Dio _dio;

  TasksRemoteDataSource({Dio? dio}) : _dio = dio ?? ApiClient.dio;

  Future<void> createTask({
    required String title,
    DateTime? date,
    String? description,
    int? assignedToUserId, // ID numérico del usuario
  }) async {
    try {
      final data = {
        'titulo': title,
        if (date != null) 'fechaObjetivo': date.toIso8601String(),
        if (description != null) 'descripcion': description,
        if (assignedToUserId != null) 'idResponsable': assignedToUserId,
        'prioridad': 'Media', // Default
        'esfuerzo': 'M', // Default
      };

      await _dio.post('/tasks', data: data);
    } catch (e) {
      if (e is DioException) {
        throw Exception('Error al crear tarea: ${e.message}');
      }
      rethrow;
    }
  }
}
