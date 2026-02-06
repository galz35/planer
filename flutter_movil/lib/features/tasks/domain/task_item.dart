class TaskItem {
  final int? id;
  final String titulo;
  final String descripcion;
  final String estado;
  final DateTime fechaCreacion;
  final DateTime? fechaActualizacion;
  final bool synced;

  const TaskItem({
    this.id,
    required this.titulo,
    required this.descripcion,
    required this.estado,
    required this.fechaCreacion,
    this.fechaActualizacion,
    this.synced = false,
  });

  TaskItem copyWith({
    int? id,
    String? titulo,
    String? descripcion,
    String? estado,
    DateTime? fechaCreacion,
    DateTime? fechaActualizacion,
    bool? synced,
  }) {
    return TaskItem(
      id: id ?? this.id,
      titulo: titulo ?? this.titulo,
      descripcion: descripcion ?? this.descripcion,
      estado: estado ?? this.estado,
      fechaCreacion: fechaCreacion ?? this.fechaCreacion,
      fechaActualizacion: fechaActualizacion ?? this.fechaActualizacion,
      synced: synced ?? this.synced,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'titulo': titulo,
      'descripcion': descripcion,
      'estado': estado,
      'fecha_creacion': fechaCreacion.toIso8601String(),
      'fecha_actualizacion': fechaActualizacion?.toIso8601String(),
      'synced': synced ? 1 : 0,
    };
  }

  factory TaskItem.fromMap(Map<String, Object?> map) {
    return TaskItem(
      id: map['id'] as int?,
      titulo: map['titulo'] as String,
      descripcion: map['descripcion'] as String,
      estado: map['estado'] as String,
      fechaCreacion: DateTime.parse(map['fecha_creacion'] as String),
      fechaActualizacion: map['fecha_actualizacion'] == null
          ? null
          : DateTime.parse(map['fecha_actualizacion'] as String),
      synced: (map['synced'] as int? ?? 0) == 1,
    );
  }
}
