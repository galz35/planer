
import 'package:flutter/material.dart';
import '../../projects/data/projects_repository.dart';

class CreateProjectSheet extends StatefulWidget {
  final VoidCallback? onCreated;
  final Map<String, dynamic>? project;

  const CreateProjectSheet({super.key, this.onCreated, this.project});

  static Future<void> show(BuildContext context, {VoidCallback? onCreated, Map<String, dynamic>? project}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => CreateProjectSheet(
          onCreated: onCreated,
          project: project,
        ),
      ),
    );
  }

  @override
  State<CreateProjectSheet> createState() => _CreateProjectSheetState();
}

class _CreateProjectSheetState extends State<CreateProjectSheet> {
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _repo = ProjectsRepository();
  
  final _tipos = ['Administrativo', 'Logistica', 'Estrategico', 'AMX', 'Otros'];
  String _tipo = 'Administrativo';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.project != null) {
      _nameCtrl.text = widget.project!['nombre']?.toString() ?? '';
      _descCtrl.text = widget.project!['descripcion']?.toString() ?? '';
      var t = widget.project!['tipo']?.toString();
      if (t != null && _tipos.contains(t)) {
        _tipo = t;
      }
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('El nombre es obligatorio'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _saving = true);

    try {
      if (widget.project != null) {
        // Update
        final id = widget.project!['idProyecto'] ?? widget.project!['id'];
        await _repo.updateProject(id, {
          'nombre': _nameCtrl.text.trim(),
          'descripcion': _descCtrl.text.trim(),
          'tipo': _tipo,
        });
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Proyecto actualizado'), backgroundColor: Colors.green),
          );
        }
      } else {
        // Create
        await _repo.createProject(
          nombre: _nameCtrl.text.trim(),
          descripcion: _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
          tipo: _tipo,
        );
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Proyecto creado con éxito!'), backgroundColor: Colors.green),
          );
        }
      }

      if (mounted) {
        widget.onCreated?.call();
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.project != null;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40, 
                height: 4, 
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 20),

            Text(
              isEditing ? 'Editar Proyecto' : 'Nuevo Proyecto',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, fontFamily: 'Inter'),
            ),
            const SizedBox(height: 24),

            // Nombre
            const Text('Nombre del Proyecto *', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 8),
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                hintText: 'Ej. Implementación Q1',
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),

            // Tipo
            const Text('Tipo', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _tipo,
                  isExpanded: true,
                  items: _tipos
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: (val) => setState(() => _tipo = val!),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Descripción
            const Text('Descripción', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey)),
            const SizedBox(height: 8),
            TextField(
              controller: _descCtrl,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Detalles opcionales...',
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 32),

            // Botón Guardar
            ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _saving 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(isEditing ? 'GUARDAR CAMBIOS' : 'CREAR PROYECTO', style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
