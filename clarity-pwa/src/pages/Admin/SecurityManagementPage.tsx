import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Search, Users, User, Settings, X, RefreshCw } from 'lucide-react';
import { adminService, type UserAccessInfo } from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

const ProfileBadge: React.FC<{ type: UserAccessInfo['menuType'] }> = ({ type }) => {
    const styles = {
        ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
        LEADER: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        EMPLOYEE: 'bg-slate-100 text-slate-600 border-slate-200',
        CUSTOM: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    const icons = {
        ADMIN: <Shield size={12} />,
        LEADER: <Users size={12} />,
        EMPLOYEE: <User size={12} />,
        CUSTOM: <Settings size={12} />
    };
    const labels = {
        ADMIN: 'Admin',
        LEADER: 'Líder',
        EMPLOYEE: 'Empleado',
        CUSTOM: 'Personalizado'
    };

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[type]}`}>
            {icons[type]}
            {labels[type]}
        </span>
    );
};

const SecurityManagementPage: React.FC = () => {
    const [users, setUsers] = useState<UserAccessInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('ALL');
    const [selectedUser, setSelectedUser] = useState<UserAccessInfo | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const { showToast } = useToast();

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsersAccess();
            setUsers(data);
        } catch (error) {
            showToast('Error al cargar usuarios', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch =
                u.nombre.toLowerCase().includes(search.toLowerCase()) ||
                u.carnet.toLowerCase().includes(search.toLowerCase()) ||
                u.cargo.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filterType === 'ALL' || u.menuType === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [users, search, filterType]);

    const stats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.menuType === 'ADMIN').length,
        leaders: users.filter(u => u.menuType === 'LEADER').length,
        employees: users.filter(u => u.menuType === 'EMPLOYEE').length,
        custom: users.filter(u => u.menuType === 'CUSTOM').length
    }), [users]);

    const handleResetToAuto = async (userId: number) => {
        try {
            await adminService.removeCustomMenu(userId);
            showToast('Menú restablecido a automático', 'success');
            fetchUsers();
        } catch {
            showToast('Error al restablecer menú', 'error');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-100 rounded-xl">
                        <Shield className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Gestión de Seguridad y Accesos</h1>
                        <p className="text-sm text-slate-500">Administra menús y permisos de usuarios</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Total</p>
                    <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 font-semibold uppercase">Admins</p>
                    <p className="text-2xl font-black text-blue-700">{stats.admins}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-semibold uppercase">Líderes</p>
                    <p className="text-2xl font-black text-emerald-700">{stats.leaders}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Empleados</p>
                    <p className="text-2xl font-black text-slate-700">{stats.employees}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <p className="text-xs text-purple-600 font-semibold uppercase">Custom</p>
                    <p className="text-2xl font-black text-purple-700">{stats.custom}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm mb-6">
                <div className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, carnet o cargo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">Todos los tipos</option>
                        <option value="ADMIN">Solo Admins</option>
                        <option value="LEADER">Solo Líderes</option>
                        <option value="EMPLOYEE">Solo Empleados</option>
                        <option value="CUSTOM">Solo Personalizados</option>
                    </select>
                    <button
                        onClick={fetchUsers}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 text-slate-600 transition-colors"
                    >
                        <RefreshCw size={16} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <p className="text-slate-500">Cargando usuarios...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden md:table-cell">Cargo</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase hidden lg:table-cell">Departamento</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Subordinados</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo Menú</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredUsers.map(user => (
                                    <tr key={user.idUsuario} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-semibold text-slate-900">{user.nombre}</p>
                                                <p className="text-xs text-slate-500">{user.carnet}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{user.cargo}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">{user.departamento}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${user.subordinateCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {user.subordinateCount}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <ProfileBadge type={user.menuType} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {user.menuType === 'CUSTOM' ? (
                                                <button
                                                    onClick={() => handleResetToAuto(user.idUsuario)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                                                >
                                                    Resetear
                                                </button>
                                            ) : user.menuType !== 'ADMIN' ? (
                                                <button
                                                    onClick={() => { setSelectedUser(user); setModalOpen(true); }}
                                                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                                >
                                                    Personalizar
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Info */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-sm text-slate-500">
                    Mostrando {filteredUsers.length} de {users.length} usuarios
                </div>
            </div>

            {/* Modal placeholder - can be expanded later */}
            {modalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">Personalizar Menú</h2>
                                <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-4">
                                Configurando menú para: <strong>{selectedUser.nombre}</strong>
                            </p>
                            <p className="text-sm text-slate-500">
                                Funcionalidad en desarrollo. Por ahora, puedes asignar menús directamente desde la base de datos en la tabla <code>p_UsuariosConfig</code>.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityManagementPage;
