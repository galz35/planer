import 'package:flutter/material.dart';

import '../../tasks/data/local/local_database.dart';

class NotesScreen extends StatefulWidget {
  const NotesScreen({super.key});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  List<Map<String, Object?>> notes = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final db = await LocalDatabase.instance.database;
    final rows = await db.query('notes', orderBy: 'fecha_actualizacion DESC');
    if (!mounted) return;
    setState(() => notes = rows);
  }

  Future<void> _createOrEdit({Map<String, Object?>? note}) async {
    final titleCtrl = TextEditingController(text: (note?['titulo'] ?? '').toString());
    final contentCtrl = TextEditingController(text: (note?['contenido'] ?? '').toString());

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Título')),
              const SizedBox(height: 10),
              TextField(controller: contentCtrl, maxLines: 5, decoration: const InputDecoration(labelText: 'Contenido')),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () async {
                  final db = await LocalDatabase.instance.database;
                  final data = {
                    'titulo': titleCtrl.text.trim().isEmpty ? 'Nota' : titleCtrl.text.trim(),
                    'contenido': contentCtrl.text.trim(),
                    'fecha_actualizacion': DateTime.now().toIso8601String(),
                  };

                  if (note == null) {
                    await db.insert('notes', data);
                  } else {
                    await db.update('notes', data, where: 'id = ?', whereArgs: [note['id']]);
                  }

                  if (ctx.mounted) Navigator.pop(ctx);
                  await _load();
                },
                child: const Text('Guardar'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _delete(int id) async {
    final db = await LocalDatabase.instance.database;
    await db.delete('notes', where: 'id = ?', whereArgs: [id]);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notas')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createOrEdit(),
        icon: const Icon(Icons.note_add),
        label: const Text('Nueva nota'),
      ),
      body: notes.isEmpty
          ? const Center(child: Text('Sin notas guardadas.'))
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 90),
              itemCount: notes.length,
              itemBuilder: (_, i) {
                final note = notes[i];
                return Card(
                  child: ListTile(
                    title: Text((note['titulo'] ?? '').toString()),
                    subtitle: Text((note['contenido'] ?? '').toString(), maxLines: 2, overflow: TextOverflow.ellipsis),
                    onTap: () => _createOrEdit(note: note),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => _delete((note['id'] as int?) ?? 0),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
