import 'package:flutter/material.dart';
import '../../common/data/user_repository.dart';
import '../../common/domain/empleado.dart';
import 'package:provider/provider.dart';
import '../../auth/presentation/auth_controller.dart';

class UserSearchSheet extends StatefulWidget {
  final Function(Empleado) onSelected;

  const UserSearchSheet({super.key, required this.onSelected});

  static Future<Empleado?> show(BuildContext context) {
    return showModalBottomSheet<Empleado>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.9,
        builder: (context, scrollController) => UserSearchSheet(
          onSelected: (e) => Navigator.pop(context, e),
        ),
      ),
    );
  }

  @override
  State<UserSearchSheet> createState() => _UserSearchSheetState();
}

class _UserSearchSheetState extends State<UserSearchSheet> {
  final _repo = UserRepository();
  final _searchCtrl = TextEditingController();
  List<Empleado> _results = [];
  bool _loading = false;
  bool _showingRecents = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  void _loadInitialData() async {
    setState(() => _loading = true);

    // 1. Recientes
    final recents = await _repo.getRecents();

    // 2. Gerencia
    List<Empleado> combined = [...recents];
    try {
      if (!mounted) return;
      final auth = context.read<AuthController>();
      final user = auth.user;
      if (user != null) {
        // Buscar gerencia o departamento
        final g = user.gerencia.isNotEmpty
            ? user.gerencia
            : (user.departamento.isNotEmpty ? user.departamento : '');

        if (g.isNotEmpty) {
          final mUsers = await _repo.getEmployeesByDepartment(g);
          // Merge without duplicates
          final existingIds = recents.map((e) => e.idUsuario).toSet();
          for (final u in mUsers) {
            if (!existingIds.contains(u.idUsuario)) {
              combined.add(u);
            }
          }
        }
      }
    } catch (e) {
      debugPrint('Error loading management users: $e');
    }

    if (mounted && _searchCtrl.text.isEmpty) {
      setState(() {
        _results = combined;
        _showingRecents = true;
        _loading = false;
      });
    }
  }

  void _onSearch(String query) async {
    if (query.length < 2) {
      _loadInitialData();
      return;
    }

    setState(() {
      _loading = true;
      _showingRecents = false;
    });

    final results = await _repo.search(query);
    if (mounted) {
      setState(() {
        _results = results;
        _loading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2)),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchCtrl,
              autofocus: true,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: 'Buscar persona...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none),
              ),
            ),
          ),

          if (_showingRecents && _results.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.people, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 8),
                  Text('Sugeridos (Mi Gerencia)',
                      style: TextStyle(
                          color: Colors.grey[600],
                          fontWeight: FontWeight.bold)),
                ],
              ),
            ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _results.isEmpty
                    ? Center(
                        child: Text(_searchCtrl.text.length < 2
                            ? 'Escribe para buscar'
                            : 'No se encontraron resultados'))
                    : ListView.builder(
                        itemCount: _results.length,
                        itemBuilder: (context, index) {
                          final user = _results[index];
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: _showingRecents
                                  ? Colors.grey[200]
                                  : Colors.blue[100],
                              child: Text(
                                user.nombreCompleto.isNotEmpty
                                    ? user.nombreCompleto[0].toUpperCase()
                                    : '?',
                                style: TextStyle(
                                    color: _showingRecents
                                        ? Colors.grey[700]
                                        : Colors.blue[900]),
                              ),
                            ),
                            title: Text(user.nombreCompleto),
                            subtitle: Text(
                                '${user.cargo ?? 'Sin cargo'} • ${user.area ?? 'Sin área'}'),
                            onTap: () {
                              _repo.saveRecent(user);
                              widget.onSelected(user);
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
