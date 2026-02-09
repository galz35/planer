import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../agenda/presentation/agenda_screen.dart';
import '../../assignment/presentation/my_assignment_screen.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../notes/presentation/notes_screen.dart';
import '../../pending/presentation/pending_screen.dart';
import '../../projects/presentation/projects_screen.dart';
import '../../reports/presentation/reports_screen.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../sync/presentation/sync_screen.dart';
import '../../tasks/presentation/tasks_screen.dart';
import '../../team/presentation/team_screen.dart';
import '../../team/presentation/team_blockers_screen.dart';

/// ============================================
/// HOME SHELL - Navegación Principal Premium
/// ============================================
/// Estructura principal con bottom nav verde y drawer elegante.

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  final _screens = const [
    TasksScreen(),
    PendingScreen(),
    ProjectsScreen(),
    TeamScreen(),
    ReportsScreen(),
  ];

  final _navItems = const [
    _NavItem(icon: Icons.today_outlined, activeIcon: Icons.today_rounded, label: 'Hoy'),
    _NavItem(icon: Icons.task_alt_outlined, activeIcon: Icons.task_alt_rounded, label: 'Pendientes'),
    _NavItem(icon: Icons.folder_outlined, activeIcon: Icons.folder_rounded, label: 'Proyectos'),
    _NavItem(icon: Icons.groups_outlined, activeIcon: Icons.groups_rounded, label: 'Equipo'),
    _NavItem(icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart_rounded, label: 'Dashboard'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      drawer: _buildDrawer(context),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildBottomNav(context),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: MomentusTheme.slate900.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_navItems.length, (index) {
              final item = _navItems[index];
              final isSelected = _currentIndex == index;
              
              return _buildNavItem(
                item: item,
                isSelected: isSelected,
                onTap: () => setState(() => _currentIndex = index),
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required _NavItem item,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? 16 : 12,
          vertical: 8,
        ),
        decoration: BoxDecoration(
          color: isSelected ? MomentusTheme.green50 : Colors.transparent,
          borderRadius: BorderRadius.circular(MomentusTheme.radiusMd),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              child: Icon(
                isSelected ? item.activeIcon : item.icon,
                key: ValueKey(isSelected),
                color: isSelected ? MomentusTheme.primary : MomentusTheme.slate400,
                size: 24,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.label,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected ? MomentusTheme.primary : MomentusTheme.slate500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final auth = context.read<AuthController>();
    
    return Drawer(
      child: Column(
        children: [
          // Header del Drawer
          Container(
            width: double.infinity,
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 24,
              bottom: 24,
              left: 24,
              right: 24,
            ),
            decoration: const BoxDecoration(
              gradient: MomentusTheme.primaryGradient,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Avatar
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
                  ),
                  child: const Icon(
                    Icons.person_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
                const SizedBox(height: 16),
                
                const Text(
                  'Momentus',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Tu día, organizado',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          
          // Items del menú
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                _buildDrawerItem(
                  icon: Icons.calendar_today_outlined,
                  label: 'Hoy / Agenda',
                  page: const AgendaScreen(),
                ),
                _buildDrawerItem(
                  icon: Icons.note_outlined,
                  label: 'Notas',
                  page: const NotesScreen(),
                ),
                _buildDrawerItem(
                  icon: Icons.assignment_outlined,
                  label: 'Mi Asignación',
                  page: const MyAssignmentScreen(),
                ),
                _buildDrawerItem(
                  icon: Icons.warning_amber_outlined,
                  label: 'Bloqueos del Equipo',
                  page: const TeamBlockersScreen(),
                ),
                
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  child: Divider(),
                ),
                
                _buildDrawerItem(
                  icon: Icons.sync_outlined,
                  label: 'Sincronización',
                  page: const SyncScreen(),
                ),
                _buildDrawerItem(
                  icon: Icons.settings_outlined,
                  label: 'Ajustes',
                  page: const SettingsScreen(),
                ),
              ],
            ),
          ),
          
          // Footer - Cerrar sesión
          Container(
            padding: const EdgeInsets.all(20),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  auth.logout();
                },
                icon: const Icon(Icons.logout_rounded),
                label: const Text('Cerrar Sesión'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: MomentusTheme.error,
                  side: BorderSide(color: MomentusTheme.error.withValues(alpha: 0.5)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String label,
    required Widget page,
  }) {
    return ListTile(
      leading: Icon(icon, color: MomentusTheme.slate600),
      title: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.w500,
          color: MomentusTheme.slate700,
        ),
      ),
      trailing: const Icon(
        Icons.chevron_right_rounded,
        color: MomentusTheme.slate400,
        size: 20,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(MomentusTheme.radiusSm),
      ),
      onTap: () {
        Navigator.pop(context);
        Navigator.push(context, MaterialPageRoute(builder: (_) => page));
      },
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}
