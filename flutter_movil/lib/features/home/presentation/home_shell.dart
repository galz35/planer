import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../agenda/presentation/agenda_screen.dart';
import '../../../assignment/presentation/my_assignment_screen.dart';
import '../../../auth/presentation/auth_controller.dart';
import '../../../notes/presentation/notes_screen.dart';
import '../../../pending/presentation/pending_screen.dart';
import '../../../projects/presentation/projects_screen.dart';
import '../../../reports/presentation/reports_screen.dart';
import '../../../settings/presentation/settings_screen.dart';
import '../../../sync/presentation/sync_screen.dart';
import '../../../tasks/presentation/tasks_screen.dart';
import '../../../team/presentation/team_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  final _tabs = const [
    TasksScreen(),
    PendingScreen(),
    ProjectsScreen(),
    TeamScreen(),
    ReportsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Color(0xFF1B8D59)),
              child: Text('Menú móvil', style: TextStyle(color: Colors.white, fontSize: 20)),
            ),
            _drawerItem('Hoy / Agenda', const AgendaScreen()),
            _drawerItem('Notas', const NotesScreen()),
            _drawerItem('Mi Asignación', const MyAssignmentScreen()),
            _drawerItem('Sincronización', const SyncScreen()),
            _drawerItem('Ajustes', const SettingsScreen()),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text('Cerrar sesión'),
              onTap: () {
                Navigator.pop(context);
                context.read<AuthController>().logout();
              },
            ),
          ],
        ),
      ),
      body: _tabs[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.today_rounded), label: 'Hoy'),
          NavigationDestination(icon: Icon(Icons.task_alt), label: 'Pendientes'),
          NavigationDestination(icon: Icon(Icons.folder_copy_rounded), label: 'Proyectos'),
          NavigationDestination(icon: Icon(Icons.groups_2_rounded), label: 'Equipos'),
          NavigationDestination(icon: Icon(Icons.bar_chart_rounded), label: 'Dashboard'),
        ],
      ),
    );
  }

  ListTile _drawerItem(String text, Widget page) {
    return ListTile(
      leading: const Icon(Icons.chevron_right),
      title: Text(text),
      onTap: () {
        Navigator.pop(context);
        Navigator.push(context, MaterialPageRoute(builder: (_) => page));
      },
    );
  }
}
