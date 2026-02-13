import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/services/team_cache_service.dart';
import '../../../core/theme/app_theme.dart';

/// ============================================
/// TASK DETAIL SHEET - Modal de Detalle de Tarea (V2)
/// ============================================
/// Rediseñado para paridad visual con React TaskDetailModalV2.
class TaskDetailSheet extends StatefulWidget {
  final Map<String, dynamic> task;
  final VoidCallback? onUpdated;

  const TaskDetailSheet({
    super.key,
    required this.task,
    this.onUpdated,
  });

  static Future<bool?> show(BuildContext context, Map<String, dynamic> task,
      {VoidCallback? onUpdated}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.95,
        minChildSize: 0.6,
        maxChildSize: 0.98,
        builder: (context, scrollController) => TaskDetailSheet(
          task: task,
          onUpdated: onUpdated,
        ),
      ),
    );
  }

  @override
  State<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends State<TaskDetailSheet> {
  // Datos
  late Map<String, dynamic> _taskData;
  bool _isLoadingFull = true;
  bool _saving = false;
  bool _hasChanges = false;

  // Controllers
  late TextEditingController _tituloCtrl;
  late TextEditingController _descripcionCtrl;
  late TextEditingController _comentarioCtrl;
  late TextEditingController _evidenciaCtrl;

  // State vars
  String _estado = 'Pendiente';
  String _prioridad = 'Media';
  int _progreso = 0;
  DateTime? _fechaObjetivo;
  DateTime? _fechaInicio;

  // Asignación
  List<dynamic> _teamMembers = [];
  String? _assignedId;
  String _assignedName = 'Sin asignar';

  @override
  void initState() {
    super.initState();
    _taskData = Map.from(widget.task); // Copia local inicial

    // Init vars from initial props
    _initForm();

    // Fetch full details
    _loadFullTask();
  }

  void _initForm() {
    // Compatibilidad: titulo/nombre, progreso/porcentaje
    final titulo = _taskData['titulo']?.toString() ??
        _taskData['nombre']?.toString() ??
        '';
    final progreso = (_taskData['progreso'] ?? _taskData['porcentaje'] ?? 0);

    _tituloCtrl = TextEditingController(text: titulo);
    _descripcionCtrl =
        TextEditingController(text: _taskData['descripcion']?.toString() ?? '');
    _evidenciaCtrl = TextEditingController(
        text: _taskData['linkEvidencia']?.toString() ?? '');
    _comentarioCtrl =
        TextEditingController(); // Nuevo comentario siempre vacío al inicio

    _estado = _taskData['estado']?.toString() ?? 'Pendiente';
    _prioridad = _taskData['prioridad']?.toString() ?? 'Media';
    _progreso = (progreso is num) ? progreso.toInt() : 0;

    _assignedId = _taskData['idResponsable']?.toString() ??
        _taskData['usuarioId']?.toString() ??
        _taskData['asignadoId']?.toString();
    _assignedName = _taskData['responsableNombre']?.toString() ??
        _taskData['asignadoNombre']?.toString() ??
        _taskData['nombreCompleto']?.toString() ??
        'Sin asignar';

    debugPrint(
        '📝 TaskDetailSheet initForm: titulo="$titulo", estado=$_estado, progreso=$_progreso');
  }

  Future<void> _loadFullTask() async {
    // También cargar el equipo para asignación
    _loadTeam();

    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      if (id == null) {
        debugPrint('⚠️ TaskDetailSheet: No se encontró ID de tarea');
        setState(() => _isLoadingFull = false);
        return;
      }

      debugPrint('📋 Cargando tarea completa: $id');
      final response = await ApiClient.dio.get('tareas/$id');

      if (mounted && response.data != null) {
        dynamic data = response.data;

        // Unwrap respuesta del backend
        if (data is Map && data.containsKey('data')) {
          data = data['data'];
        }

        debugPrint('✅ Tarea cargada: ${data['titulo'] ?? data['nombre']}');

        setState(() {
          // Merge de datos
          if (data is Map<String, dynamic>) {
            _taskData = {..._taskData, ...data};
          }
          _isLoadingFull = false;

          // Actualizar datos de asignación (priorizar responsable del SP)
          if (data['idResponsable'] != null ||
              data['usuarioId'] != null ||
              data['asignadoId'] != null) {
            _assignedId = (data['idResponsable'] ??
                    data['usuarioId'] ??
                    data['asignadoId'])
                .toString();
          }
          if (data['responsableNombre'] != null) {
            _assignedName = data['responsableNombre'].toString();
          } else if (data['asignadoNombre'] != null) {
            _assignedName = data['asignadoNombre'].toString();
          }

          // Refresh controllers if user hasn't edited yet
          if (!_hasChanges) {
            _descripcionCtrl.text = data['descripcion']?.toString() ?? '';
            _evidenciaCtrl.text = data['linkEvidencia']?.toString() ?? '';
            // También refrescar título si viene más completo
            if (data['titulo'] != null || data['nombre'] != null) {
              _tituloCtrl.text =
                  (data['titulo'] ?? data['nombre'])?.toString() ??
                      _tituloCtrl.text;
            }
            // Fechas
            if (data['fechaObjetivo'] != null) {
              _fechaObjetivo =
                  DateTime.tryParse(data['fechaObjetivo'].toString());
            }
            if (data['fechaInicioPlanificada'] != null) {
              _fechaInicio =
                  DateTime.tryParse(data['fechaInicioPlanificada'].toString());
            }
            // Estado y progreso
            if (data['estado'] != null) {
              _estado = data['estado'].toString();
            }
            if (data['progreso'] != null || data['porcentaje'] != null) {
              _progreso = (data['progreso'] ?? data['porcentaje'] ?? 0) as int;
            }
          }
        });
      } else {
        debugPrint('⚠️ Respuesta vacía para tarea $id');
        setState(() => _isLoadingFull = false);
      }
    } catch (e) {
      debugPrint('❌ Error loading full task: $e');
      if (mounted) {
        setState(() => _isLoadingFull = false);
        // Mostrar error pero no cerrar el modal
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Error cargando detalles: ${e.toString().substring(0, e.toString().length.clamp(0, 50))}'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    }
  }

  @override
  void dispose() {
    _tituloCtrl.dispose();
    _descripcionCtrl.dispose();
    _comentarioCtrl.dispose();
    _evidenciaCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final id = _taskData['idTarea'] ?? _taskData['id'];
      final payload = <String, dynamic>{
        'titulo': _tituloCtrl.text.trim(),
        'descripcion': _descripcionCtrl.text.trim(),
        'linkEvidencia': _evidenciaCtrl.text.trim(),
        'estado': _estado,
        'prioridad': _prioridad,
        'progreso': _progreso,
        'fechaObjetivo': _fechaObjetivo?.toIso8601String(),
        'fechaInicioPlanificada': _fechaInicio?.toIso8601String(),
        if (_assignedId != null) 'idResponsable': _assignedId,
      };

      if (_comentarioCtrl.text.trim().isNotEmpty) {
        payload['comentario'] = _comentarioCtrl.text.trim();
      }

      await ApiClient.dio.patch('tareas/$id', data: payload);

      if (mounted) {
        widget.onUpdated?.call();
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Guardado correctamente'),
              backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  Future<void> _pickDate(bool isStart) async {
    final initial = isStart ? _fechaInicio : _fechaObjetivo;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime.now(),
      firstDate: DateTime(2024),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _fechaInicio = picked;
        } else {
          _fechaObjetivo = picked;
        }
        _hasChanges = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Paridad visual: Background blanco, bordes redondeados, estilo limpio.
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Header Drag
          const SizedBox(height: 12),
          Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2))),

          // Header Title & Actions
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Checkbox gigante o Estado visual
                // React Header tiene Título editable grande.
                Expanded(
                  child: TextField(
                    controller: _tituloCtrl,
                    onChanged: (_) => _hasChanges = true,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                    maxLines: null,
                    decoration: const InputDecoration.collapsed(
                        hintText: 'Título de la tarea'),
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                  visualDensity: VisualDensity.compact,
                )
              ],
            ),
          ),

          const Divider(height: 1),

          // Scrollable Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (_isLoadingFull)
                  const Padding(
                      padding: EdgeInsets.only(bottom: 20),
                      child: LinearProgressIndicator(minHeight: 2)),

                // 1. Panel Planificación (Grisáceo)
                _buildSectionHeader('PLANIFICACIÓN Y FECHAS'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: _buildDateInput(
                                'Inicio', _fechaInicio, () => _pickDate(true)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: _buildDateInput('Objetivo', _fechaObjetivo,
                                () => _pickDate(false)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 16),
                      _buildPrioritySelector(),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Asignación
                _buildSectionHeader('RESPONSABLE'),
                _buildAssigneeSelector(),

                const SizedBox(height: 24),

                // 2. Panel Ejecución
                _buildSectionHeader('EJECUCIÓN'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _buildStatusSelector(),
                      const SizedBox(height: 20),
                      _buildProgressSlider(),
                      const SizedBox(height: 20),
                      const Divider(height: 1),
                      const SizedBox(height: 20),

                      // Descripción
                      const Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Descripción',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B)))),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _descripcionCtrl,
                        onChanged: (_) => _hasChanges = true,
                        maxLines: 4,
                        style: const TextStyle(
                            fontSize: 14,
                            fontFamily: 'Inter',
                            color: Color(0xFF334155)),
                        decoration: _cleanInputDeco('Añadir detalles...'),
                      ),

                      const SizedBox(height: 16),
                      // Evidencia
                      const Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Link Evidencia',
                              style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF64748B)))),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _evidenciaCtrl,
                        onChanged: (_) => _hasChanges = true,
                        style: const TextStyle(
                            fontSize: 14,
                            fontFamily: 'Inter',
                            color: Color(0xFF2563EB)),
                        decoration: _cleanInputDeco('https://...'),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // 3. Comentarios / Bitácora
                _buildSectionHeader('BITÁCORA / COMENTARIOS'),
                Container(
                  decoration: _panelDecoration(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      if (_taskData['comentarios'] != null &&
                          (_taskData['comentarios'] as List).isNotEmpty)
                        ...(_taskData['comentarios'] as List)
                            .map((c) => _buildCommentItem(c)),
                      TextField(
                        controller: _comentarioCtrl,
                        onChanged: (_) => _hasChanges = true,
                        maxLines: 2,
                        decoration: _cleanInputDeco(
                                'Escribe un nuevo comentario o actualización...')
                            .copyWith(
                          suffixIcon: const Icon(Icons.send_rounded,
                              size: 18, color: Colors.grey),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 40),
              ],
            ),
          ),

          // Footer Fijo (React Style: Black Button)
          Container(
            padding: EdgeInsets.fromLTRB(
                20, 16, 20, 16 + MediaQuery.of(context).padding.bottom),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -4))
              ],
              border: const Border(top: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      const Color(0xFF0F172A), // Slate 900 (Black-ish)
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                  elevation: 4,
                  shadowColor: const Color(0xFF0F172A).withValues(alpha: 0.3),
                ),
                child: _saving
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2))
                    : const Text('Guardar y Finalizar',
                        style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Inter')),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, left: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w900,
          color: Color(0xFF94A3B8), // Slate 400
          letterSpacing: 1.2,
          fontFamily: 'Inter',
        ),
      ),
    );
  }

  BoxDecoration _panelDecoration() {
    return BoxDecoration(
      color: const Color(0xFFF8FAFC), // Slate 50
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFE2E8F0)), // Slate 200
    );
  }

  InputDecoration _cleanInputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.all(12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none, // Clean
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF3B82F6)),
      ),
    );
  }

  Widget _buildDateInput(String label, DateTime? value, VoidCallback onTap) {
    final text = value == null
        ? 'Seleccionar'
        : DateFormat('d MMM yyyy', 'es').format(value);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_rounded,
                    size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(text,
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF334155)))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPrioritySelector() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text('Prioridad',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Color(0xFF475569))),
        Row(
          children: ['Baja', 'Media', 'Alta'].map((p) {
            final isSelected = _prioridad == p;
            Color color;
            if (p == 'Alta') {
              color = const Color(0xFFEF4444);
            } else if (p == 'Media') {
              color = const Color(0xFFF59E0B);
            } else {
              color = const Color(
                  0xFF10B981); // Baja green or blue? Usually Green/Blue
            }

            return GestureDetector(
              onTap: () => setState(() {
                _prioridad = p;
                _hasChanges = true;
              }),
              child: Container(
                margin: const EdgeInsets.only(left: 8),
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color:
                      isSelected ? color.withValues(alpha: 0.1) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: isSelected ? color : const Color(0xFFE2E8F0)),
                ),
                child: Text(
                  p,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? color : const Color(0xFF94A3B8),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStatusSelector() {
    final statuses = ['Pendiente', 'EnCurso', 'Hecha', 'Bloqueada'];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: LayoutBuilder(builder: (context, constraints) {
        final width = (constraints.maxWidth - 8) / 4;
        return Row(
          children: statuses.map((s) {
            final isSelected = _estado == s;
            // Map display names if needed (EnCurso -> En Curso)
            final display = s == 'EnCurso' ? 'En Curso' : s;

            Color activeColor;
            if (s == 'Hecha') {
              activeColor = const Color(0xFF10B981);
            } else if (s == 'Bloqueada') {
              activeColor = const Color(0xFFEF4444);
            } else if (s == 'EnCurso') {
              activeColor = const Color(0xFF3B82F6);
            } else {
              activeColor = const Color(0xFF64748B);
            }

            return GestureDetector(
              onTap: () => setState(() {
                _estado = s;
                _hasChanges = true;
                if (s == 'Hecha' && _progreso < 100) _progreso = 100;
                if (s == 'Pendiente') _progreso = 0;
              }),
              child: Container(
                width: width,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected
                      ? activeColor.withValues(alpha: 0.1)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    Icon(_getStatusIcon(s),
                        size: 16,
                        color:
                            isSelected ? activeColor : const Color(0xFF94A3B8)),
                    const SizedBox(height: 4),
                    Text(
                      display,
                      style: TextStyle(
                        fontSize: 9, // Small text
                        fontWeight: FontWeight.bold,
                        color:
                            isSelected ? activeColor : const Color(0xFF94A3B8),
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        );
      }),
    );
  }

  IconData _getStatusIcon(String s) {
    switch (s) {
      case 'Hecha':
        return Icons.check_circle_outline;
      case 'EnCurso':
        return Icons.timelapse;
      case 'Bloqueada':
        return Icons.block;
      default:
        return Icons.radio_button_unchecked;
    }
  }

  Widget _buildProgressSlider() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Progreso',
                style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF64748B))),
            Text('$_progreso%',
                style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF3B82F6))),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 6,
            activeTrackColor: const Color(0xFF3B82F6),
            inactiveTrackColor: const Color(0xFFE2E8F0),
            thumbColor: Colors.white,
            thumbShape: const RoundSliderThumbShape(
                enabledThumbRadius: 10, elevation: 2),
            overlayColor: const Color(0xFF3B82F6).withValues(alpha: 0.2),
          ),
          child: Slider(
            value: _progreso.toDouble(),
            min: 0,
            max: 100,
            divisions: 100,
            onChanged: (v) => setState(() {
              _progreso = v.toInt();
              _hasChanges = true;
              if (_progreso == 100 && _estado != 'Hecha') {
                _estado = 'Hecha';
              }
              if (_progreso < 100 && _estado == 'Hecha') {
                _estado = 'EnCurso';
              }
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildCommentItem(dynamic c) {
    // c is Map: { mensaje, fecha, usuarioNombre ... }
    final msg = c['mensaje'] ?? '';
    final date = c['fecha'] != null
        ? DateFormat('d MMM HH:mm', 'es')
            .format(DateTime.parse(c['fecha'].toString()))
        : '';
    final author = c['usuarioNombre'] ?? 'Usuario';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(author,
                  style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF475569))),
              Text(date,
                  style:
                      const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
            ],
          ),
          const SizedBox(height: 4),
          Text(msg,
              style: const TextStyle(fontSize: 13, color: Color(0xFF334155))),
        ],
      ),
    );
  }

  Future<void> _loadTeam() async {
    // Usar cache pre-cargado al login (instantáneo + offline)
    final cached = TeamCacheService.instance.members;
    if (cached.isNotEmpty) {
      if (mounted) {
        setState(() => _teamMembers = cached);
      }
      return;
    }

    // Fallback: cargar desde API si cache vacío
    try {
      final response = await ApiClient.dio.get('planning/team');
      if (mounted) {
        setState(() {
          _teamMembers = unwrapApiList(response.data);
        });
      }
    } catch (e) {
      debugPrint('Error loading team: $e');
    }
  }

  Widget _buildAssigneeSelector() {
    return GestureDetector(
      onTap: _showAssigneeModal,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: _panelDecoration().copyWith(color: Colors.white),
        child: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor: _assignedId != null
                  ? MomentusTheme.primary
                  : Colors.grey[200],
              child: Text(
                _assignedName.isNotEmpty ? _assignedName[0].toUpperCase() : '?',
                style: TextStyle(
                    color: _assignedId != null ? Colors.white : Colors.grey,
                    fontWeight: FontWeight.bold,
                    fontSize: 14),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_assignedName,
                      style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF1E293B))),
                  if (_assignedId == null)
                    const Text('Toque para asignar',
                        style: TextStyle(fontSize: 11, color: Colors.grey))
                ],
              ),
            ),
            const Icon(Icons.edit, size: 20, color: Color(0xFF94A3B8)),
          ],
        ),
      ),
    );
  }

  void _showAssigneeModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.65,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          children: [
            const SizedBox(height: 12),
            Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2))),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Asignar a',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
            Expanded(
                child: _teamMembers.isEmpty
                    ? const Center(child: Text('Cargando equipo...'))
                    : ListView.builder(
                        itemCount: _teamMembers.length,
                        itemBuilder: (ctx, i) {
                          final u = _teamMembers[i];
                          final name =
                              u['nombre'] ?? u['nombreCompleto'] ?? 'Usuario';
                          final id = (u['idUsuario'] ?? u['id']).toString();
                          final isSelected = id == _assignedId;

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Colors.grey[200],
                              child: Text(name[0],
                                  style: const TextStyle(color: Colors.black)),
                            ),
                            title: Text(name),
                            trailing: isSelected
                                ? const Icon(Icons.check,
                                    color: MomentusTheme.primary)
                                : null,
                            onTap: () {
                              setState(() {
                                _assignedId = id;
                                _assignedName = name;
                                _hasChanges = true;
                              });
                              Navigator.pop(context);
                            },
                          );
                        },
                      ))
          ],
        ),
      ),
    );
  }
}
