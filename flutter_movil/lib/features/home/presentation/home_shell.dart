
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

// Iconos adicionales
import 'package:flutter/cupertino.dart';

import '../../agenda/presentation/agenda_screen.dart';
import '../../assignment/presentation/my_assignment_screen.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../notes/presentation/notes_screen.dart';
import '../../pending/presentation/pending_screen.dart';
import '../../projects/presentation/projects_screen.dart';
import '../../reports/presentation/reports_screen.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../sync/presentation/sync_screen.dart';
import '../../team/presentation/team_screen.dart';
import '../../team/presentation/team_blockers_screen.dart';
import '../../tasks/presentation/quick_create_task_sheet.dart';

/// ============================================
/// HOME SHELL - Navegación Principal Premium
/// ============================================
/// Estructura principal con bottom nav y drawer elegante.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  static final GlobalKey<ScaffoldState> scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  // Pantallas principales accesibles desde BottomNav
  static const _screens = [
    AgendaScreen(), // Hoy / Agenda
    PendingScreen(), // Pendientes
    ProjectsScreen(), // Proyectos
    TeamScreen(), // Equipo
    ReportsScreen(), // Dashboard
  ];

  static const _navItems = [
    _NavItem(icon: CupertinoIcons.calendar_today, activeIcon: CupertinoIcons.calendar, label: 'Hoy'),
    _NavItem(icon: CupertinoIcons.check_mark_circled, activeIcon: CupertinoIcons.check_mark_circled_solid, label: 'Pendientes'),
    _NavItem(icon: CupertinoIcons.folder, activeIcon: CupertinoIcons.folder_solid, label: 'Proyectos'),
    _NavItem(icon: CupertinoIcons.group, activeIcon: CupertinoIcons.group_solid, label: 'Equipo'),
    _NavItem(icon: CupertinoIcons.chart_bar, activeIcon: CupertinoIcons.chart_bar_fill, label: 'Dashboard'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: HomeShell.scaffoldKey, // Asignar la key estática
      backgroundColor: const Color(0xFFF8FAFC), // Slate 50
      drawer: _buildDrawer(context),
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: _buildBottomNav(context),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showQuickCreateTask(context),
        backgroundColor: const Color(0xFF0F172A), // Slate 900
        elevation: 4,
        child: const Icon(CupertinoIcons.add, color: Colors.white),
      ),
    );
  }

  void _showQuickCreateTask(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true, // Para que suba con el teclado
      backgroundColor: Colors.transparent,
      builder: (context) => const Padding(
        padding: EdgeInsets.only(top: 100), // Espacio superior
        child: QuickCreateTaskSheet(),
      ),
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Container(
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_navItems.length, (index) {
              final item = _navItems[index];
              final isSelected = _currentIndex == index;
              
              return InkWell(
                onTap: () => setState(() => _currentIndex = index),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFFECFDF5) : Colors.transparent, // Emerald 50
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        isSelected ? item.activeIcon : item.icon,
                        color: isSelected ? const Color(0xFF059669) : const Color(0xFF94A3B8), // Emerald 600 vs Slate 400
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                          color: isSelected ? const Color(0xFF059669) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final auth = context.read<AuthController>();
    final user = auth.user;
    
    return Drawer(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.horizontal(right: Radius.circular(0)), // Recto
      ),
      child: SafeArea(
        child: Column(
          children: [
            // === HEADER PLANNER-EF ===
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Row(
                children: [
                 Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF059669), // Emerald 600
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'P',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        fontSize: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'PLANNER-EF',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                      letterSpacing: -0.5,
                      color: Color(0xFF0F172A), // Slate 900
                    ),
                  ),
                ],
              ),
            ),

            const Divider(height: 1, color: Color(0xFFE2E8F0)),

            // === MENU ITEMS ===
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                children: [
                  const _SectionTitle('MI ESPACIO'),
                  ListTile(
                    onTap: () {
                      setState(() => _currentIndex = 0);
                      Navigator.pop(context);
                    },
                    dense: true,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    tileColor: _currentIndex == 0 ? const Color(0xFFECFDF5) : Colors.transparent,
                    leading: Icon(
                      CupertinoIcons.calendar,
                      size: 20,
                      color: _currentIndex == 0 ? const Color(0xFF059669) : const Color(0xFF64748B),
                    ),
                    title: Text(
                      'Mi Agenda',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontWeight: _currentIndex == 0 ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 14,
                        color: _currentIndex == 0 ? const Color(0xFF059669) : const Color(0xFF64748B),
                      ),
                    ),
                  ),
                  _buildDrawerItem(
                    icon: CupertinoIcons.doc_text,
                    label: 'Mis Notas',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NotesScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    icon: CupertinoIcons.person_crop_circle_badge_checkmark,
                    label: 'Mi Asignación',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const MyAssignmentScreen()));
                    },
                  ),

                  const SizedBox(height: 24),
                  const _SectionTitle('GESTIÓN EQUIPO'),
                   _buildDrawerItem(
                    icon: CupertinoIcons.exclamationmark_shield,
                    label: 'Bloqueos Activos',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const TeamBlockersScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    icon: CupertinoIcons.arrow_2_circlepath,
                    label: 'Sincronización',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SyncScreen()));
                    },
                  ),

                  const SizedBox(height: 24),
                  const _SectionTitle('SISTEMA'),
                   _buildDrawerItem(
                    icon: CupertinoIcons.settings,
                    label: 'Configuración',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                    },
                  ),
                ],
              ),
            ),

            // === FOOTER USER PROFILE (Estilo Pill React) ===
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      // Avatar con Iniciales
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: const Color(0xFF059669),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF059669).withValues(alpha: 0.2),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          user?.nombre.isNotEmpty == true ? user!.nombre[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.nombre ?? 'Usuario',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              user?.correo ?? 'Sin correo',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 11,
                                color: Color(0xFF64748B),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                       // Flag NI
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('🇳🇮', style: TextStyle(fontSize: 16)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  
                  // Botones de acción rápida
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {},
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF059669),
                            side: const BorderSide(color: Color(0xFF059669)),
                            padding: const EdgeInsets.symmetric(vertical: 0, horizontal: 8),
                            minimumSize: const Size(0, 32),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(CupertinoIcons.shield_fill, size: 14),
                              SizedBox(width: 4),
                              Text('Seguridad', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () {
                            Navigator.pop(context);
                            auth.logout();
                          },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFEF4444), // Rose
                            side: const BorderSide(color: Color(0xFFFECACA)),
                            padding: const EdgeInsets.symmetric(vertical: 0, horizontal: 8),
                            backgroundColor: const Color(0xFFFEF2F2),
                            minimumSize: const Size(0, 32),
                             shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.logout, size: 14),
                              SizedBox(width: 4),
                              Text('Salir', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        onTap: onTap,
        dense: true,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        leading: Icon(
          icon,
          size: 20,
          color: const Color(0xFF64748B),
        ),
        title: Text(
          label,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: Color(0xFF64748B),
          ),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 0, 0, 8),
      child: Text(
        title,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
          color: Color(0xFF94A3B8), // Slate 400
        ),
      ),
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
