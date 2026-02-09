
import 'tasks_remote_data_source.dart';

class TasksRepository {
  final TasksRemoteDataSource _remote;

  TasksRepository({TasksRemoteDataSource? remote}) 
      : _remote = remote ?? TasksRemoteDataSource();

  Future<void> createTask({
    required String title,
    DateTime? date,
    String? description,
    int? assignedToUserId, // Añadir si tengo el ID
  }) {
    return _remote.createTask(
      title: title,
      date: date,
      description: description,
      assignedToUserId: assignedToUserId,
    );
  }
}
