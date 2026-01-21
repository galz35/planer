import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { UIProvider, useUI } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';
import { CountryProvider } from './context/CountryContext';
import { RoleRoute } from './components/auth/RoleRoute';

// Pages - Core
import { LoginPage } from './pages/LoginPage';
import { MiDiaPage } from './pages/Hoy/MiDiaPage';
import { ExecutionView } from './pages/Hoy/views/ExecutionView';
import { MatrixView } from './pages/Hoy/views/MatrixView';
import { CalendarView } from './pages/Hoy/views/CalendarView';
import { TimelineView } from './pages/Hoy/views/TimelineView';
import { ExecutiveView } from './pages/Hoy/views/ExecutiveView';
import { PendientesPage } from './pages/Pendientes/PendientesPage';
import { EquipoBloqueosPage } from './pages/Equipo/EquipoBloqueosPage';
import { TeamPlanningPage } from './pages/Planning/TeamPlanningPage';
import { TimelinePage } from './pages/Planning/TimelinePage';
import { RoadmapPage } from './pages/Planning/RoadmapPage';
import { WorkloadPage } from './pages/Planning/WorkloadPage';
import { ArchivePage } from './pages/Archive/ArchivePage';

// Pages - Lazy Loaded (Optimization)
const UsersPage = React.lazy(() => import('./pages/Admin/UsersPage').then(module => ({ default: module.UsersPage })));
const LogsPage = React.lazy(() => import('./pages/Admin/LogsPage').then(module => ({ default: module.LogsPage })));
const AuditLogsPage = React.lazy(() => import('./pages/Admin/Audit/AuditLogsPage').then(module => ({ default: module.AuditLogsPage })));
const RolesPage = React.lazy(() => import('./pages/Admin/Roles/RolesPage').then(module => ({ default: module.RolesPage })));
const ImportPage = React.lazy(() => import('./pages/Admin/Import/ImportPage').then(module => ({ default: module.ImportPage })));

// Acceso Module Pages
const PermisosPage = React.lazy(() => import('./pages/Admin/Acceso/PermisosPage').then(module => ({ default: module.PermisosPage })));
const VisibilidadPage = React.lazy(() => import('./pages/Admin/Acceso/VisibilidadPage').then(module => ({ default: module.VisibilidadPage })));
const SecurityManagementPage = React.lazy(() => import('./pages/Admin/SecurityManagementPage'));

// NEW ALTERNATIVE DASHBOARD
import { ManagerDashboard } from './pages/Equipo/ManagerDashboard';
import { MemberAgendaPage } from './pages/Equipo/MemberAgendaPage';
import { MiEquipoPage } from './pages/Equipo/MiEquipoPage';
import { MeetingNotesPage } from './pages/Notes/MeetingNotesPage';
import { ProjectSimulationPage } from './pages/Planning/ProjectSimulationPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { ApprovalsPage } from './pages/Planning/ApprovalsPage';
import { PlanTrabajoPage } from './pages/Planning/PlanTrabajoPage';
import { ProyectosPage } from './pages/Planning/ProyectosPage';
import { TutorialPage } from './pages/Tutorial/TutorialPage';
import { AlertsView } from './pages/Hoy/views/AlertsView';
import { BlockersView } from './pages/Hoy/views/BlockersView';
import { MetricsView } from './pages/Hoy/views/MetricsView';
import { TeamView } from './pages/Hoy/views/TeamView';
import { VisibilidadView } from './pages/Hoy/views/VisibilidadView';
import { AutomationPage } from './pages/Automation/AutomationPage';

// Components
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CommandPalette } from './components/ui/CommandPalette';
import { OnboardingWizard, useOnboarding } from './components/ui/OnboardingWizard';

// Protected Route Component
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const AppLayout = () => {
  const { isSidebarCollapsed } = useUI();
  const { user } = useAuth();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  return (
    <div className="min-h-screen bg-clarity-bg flex relative">
      <CommandPalette />

      {showOnboarding && user && (
        <OnboardingWizard
          userName={user.nombre || 'Usuario'}
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
        />
      )}

      <Sidebar />
      <main className={`flex-1 transition-all duration-300 pb-20 md:pb-0 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Suspense fallback={<div className="p-8">Cargando módulo...</div>}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CountryProvider>
            <ToastProvider>
              <UIProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/app" element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        <Route path="planning/proyectos" element={<ProyectosPage />} />
                        <Route path="hoy" element={<MiDiaPage />}>
                          <Route index element={<ExecutionView />} />
                          <Route path="matrix" element={<MatrixView />} />
                          <Route path="calendario" element={<CalendarView />} />
                          <Route path="bitacora" element={<TimelineView />} />
                          <Route path="kpis" element={<ExecutiveView />} />
                          <Route path="alertas" element={<AlertsView />} />
                          <Route path="bloqueos" element={<BlockersView />} />
                          <Route path="metricas" element={<MetricsView />} />
                          <Route path="equipo" element={<TeamView />} />
                          <Route path="visibilidad" element={<VisibilidadView />} />
                        </Route>
                        <Route path="pendientes" element={<PendientesPage />} />

                        {/* Rutas de Gerencia */}
                        <Route path="agenda/:userId" element={<MemberAgendaPage />}>
                          <Route index element={<ExecutionView />} />
                          <Route path="matrix" element={<MatrixView />} />
                          <Route path="calendario" element={<CalendarView />} />
                          <Route path="bitacora" element={<TimelineView />} />
                        </Route>

                        <Route path="equipo" element={<ManagerDashboard />} />
                        <Route path="equipo/hoy" element={<ManagerDashboard />} />
                        <Route path="equipo/planning/:userId" element={<TeamPlanningPage />} />
                        <Route path="equipo/bloqueos" element={<EquipoBloqueosPage />} />
                        <Route path="equipo/mi-equipo" element={<MiEquipoPage />} />

                        <Route path="planning/approvals" element={<ApprovalsPage />} />
                        <Route path="planning/timeline" element={<TimelinePage />} />
                        <Route path="planning/roadmap" element={<RoadmapPage />} />
                        <Route path="proyectos/:id" element={<TimelinePage />} />
                        <Route path="planning/carga" element={<WorkloadPage />} />
                        <Route path="planning/simulation" element={<ProjectSimulationPage />} />
                        <Route path="planning/plan-trabajo" element={<PlanTrabajoPage />} />

                        {/* Notas */}
                        <Route path="notas" element={<MeetingNotesPage />} />

                        {/* Reporting & Intelligence */}
                        <Route path="reports" element={<ReportsPage />} />
                        <Route path="help" element={<TutorialPage />} />
                        <Route path="automation" element={<AutomationPage />} />

                        {/* Admin Routes - Protected by RoleGuard */}
                        <Route element={<RoleRoute allowedRoles={['Admin', 'Administrador']} />}>
                          <Route path="admin/users" element={<UsersPage />} />
                          <Route path="admin/roles" element={<RolesPage />} />
                          <Route path="admin/permisos" element={<PermisosPage />} />
                          <Route path="admin/visibilidad" element={<VisibilidadPage />} />
                          <Route path="admin/logs" element={<LogsPage />} />
                          <Route path="admin/audit" element={<AuditLogsPage />} />
                          <Route path="admin/import" element={<ImportPage />} />
                          <Route path="admin/seguridad" element={<SecurityManagementPage />} />
                        </Route>

                        {/* Historial */}
                        <Route path="archivo" element={<ArchivePage />} />

                        <Route path="" element={<Navigate to="hoy" replace />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/app/hoy" replace />} />
                  </Routes>
                </BrowserRouter>
              </UIProvider>
            </ToastProvider>
          </CountryProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
