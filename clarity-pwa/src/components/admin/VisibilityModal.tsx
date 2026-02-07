import React, { useState, useEffect } from 'react';
import type { Usuario } from '../../types/modelos';
import { alerts } from '../../utils/alerts';
import { clarityService } from '../../services/clarity.service';
import { X, Shield, Users, Plus, Search, Globe, Trash2 } from 'lucide-react';

interface Props {
    user: Usuario;
    onClose: () => void;
}

export const VisibilityModal: React.FC<Props> = ({ user, onClose }) => {
    const [actionType, setActionType] = useState<'ALLOW' | 'DENY'>('ALLOW');
    const [activeTab, setActiveTab] = useState<'areas' | 'people' | 'effective'>('areas');
    const [loading, setLoading] = useState(false);

    // Data states
    const [areas, setAreas] = useState<any[]>([]);
    const [people, setPeople] = useState<any[]>([]);
    const [effectiveUsers, setEffectiveUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchPermissions = async () => {
        if (!user.carnet && activeTab !== 'effective') return;
        setLoading(true);
        try {
            if (activeTab === 'effective') {
                const effective = await clarityService.getVisibilidadEfectiva(user.idUsuario);
                setEffectiveUsers((effective as any[]) || []);
            } else {
                const [pAreas, pPeople] = await Promise.all([
                    clarityService.getPermisosArea(user.carnet!),
                    clarityService.getPermisosEmpleado(user.carnet!)
                ]);
                setAreas((pAreas as any[]) || []);
                setPeople((pPeople as any[]) || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, [activeTab, user]);

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            if (activeTab === 'areas') {
                const res = await clarityService.buscarNodosAcceso(q);
                setSearchResults((res as any[]) || []);
            } else {
                const res = await clarityService.buscarEmpleadosAcceso(q);
                setSearchResults((res as any[]) || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAdd = async (item: any) => {
        if (!user.carnet) return;

        if (activeTab === 'people' && !item.carnet) {
            alerts.error('Carnet inválido', 'La persona seleccionada no tiene un carnet válido.');
            return;
        }
        if (activeTab === 'areas' && !item.idOrg) {
            alerts.error('ID inválido', 'El área seleccionada no tiene un ID válido.');
            return;
        }

        try {
            if (activeTab === 'areas') {
                await clarityService.crearPermisoArea({
                    carnetRecibe: user.carnet,
                    idOrgRaiz: item.idOrg,
                    alcance: 'SUBARBOL',
                    tipoAcceso: actionType
                });
            } else {
                await clarityService.crearPermisoEmpleado({
                    carnetRecibe: user.carnet,
                    carnetObjetivo: item.carnet,
                    tipoAcceso: actionType
                });
            }
            setSearchQuery('');
            setSearchResults([]);
            fetchPermissions();
            alerts.success('Agregado', 'Permiso configurado correctamente.');
        } catch (error) {
            console.error(error);
            alerts.error('Error', 'Error al agregar permiso/restricción');
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await alerts.confirm('¿Revocar acceso?', '¿Estás seguro de quitar este permiso/restricción?'))) return;
        try {
            if (activeTab === 'areas') {
                await clarityService.eliminarPermisoArea(id);
            } else {
                await clarityService.eliminarPermisoEmpleado(id);
            }
            fetchPermissions();
            alerts.success('Revocado', 'Registro eliminado exitosamente.');
        } catch (error) {
            console.error(error);
            alerts.error('Error', 'No se pudo eliminar el registro.');
        }
    };

    const renderEffectiveContent = () => {
        if (effectiveUsers.length === 0) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-amber-50 text-amber-200">
                        <Shield size={32} />
                    </div>
                    <p className="font-bold text-slate-500">Sin visibilidad efectiva</p>
                    <p className="text-xs max-w-[200px] text-center mt-2 opacity-70">
                        Este usuario no tiene acceso a visualizar a ningún otro colaborador.
                    </p>
                </div>
            );
        }

        return (
            <>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Personas Visibles Efectivas</p>
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        {effectiveUsers.length}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {effectiveUsers.map((u: any) => (
                        <div key={u.idUsuario} className="p-4 rounded-2xl border shadow-sm flex items-center justify-between group bg-white border-slate-200 hover:border-amber-300 hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600 font-bold text-lg">
                                    {(u.nombreCompleto || u.nombre || 'U').charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{u.nombreCompleto || u.nombre}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border bg-amber-50 border-amber-100 text-amber-600">
                                            {u.cargo || 'Colaborador'}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {u.departamento || u.gerencia || 'Sin Depto'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    const renderRulesContent = () => {
        const data = activeTab === 'areas' ? areas : people;
        const filtered = data.filter((p: any) => p.activo !== false);

        if (filtered.length === 0) {
            return (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${activeTab === 'areas' ? 'bg-emerald-50 text-emerald-200' : 'bg-indigo-50 text-indigo-200'}`}>
                        {activeTab === 'areas' ? <Globe size={32} /> : <Users size={32} />}
                    </div>
                    <p className="font-bold text-slate-500">Sin reglas asignadas</p>
                    <p className="text-xs max-w-[200px] text-center mt-2 opacity-70">
                        Utilice la barra de búsqueda superior para configurar la visibilidad.
                    </p>
                </div>
            );
        }

        return (
            <>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reglas Activas</p>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        {filtered.length}
                    </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map((p: any) => (
                        <div key={p.id} className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between group transition-all ${p.tipoAcceso === 'DENY'
                            ? 'bg-red-50/50 border-red-100 hover:border-red-200'
                            : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.tipoAcceso === 'DENY'
                                    ? 'bg-red-100 text-red-600'
                                    : activeTab === 'areas' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                                    }`}>
                                    {p.tipoAcceso === 'DENY'
                                        ? <Shield size={20} className="fill-current opacity-20" />
                                        : activeTab === 'areas' ? <Globe size={20} /> : <Users size={20} />
                                    }
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${p.tipoAcceso === 'DENY' ? 'text-red-800' : 'text-slate-800'}`}>
                                        {activeTab === 'areas'
                                            ? (p.nodoRaiz?.descripcion || 'Área Desconocida')
                                            : (p.empleadoObjetivo?.nombreCompleto || p.empleadoObjetivo?.nombre || 'Desconocido')
                                        }
                                        {p.tipoAcceso === 'DENY' && <span className="ml-2 text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded uppercase tracking-wider">Bloqueado</span>}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border ${p.tipoAcceso === 'DENY'
                                            ? 'bg-red-100 text-red-700 border-red-200'
                                            : activeTab === 'areas' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                            }`}>
                                            {activeTab === 'areas' ? 'Subárbol Completo' : (p.empleadoObjetivo?.cargo || 'Colaborador')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            {new Date(p.creadoEn).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDelete(p.id)}
                                className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                title="Revocar Regla"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in-up border border-white/20 flex flex-col md:flex-row h-[80vh]">

                {/* Left Panel: Navigation & Context */}
                <div className="bg-slate-800 md:w-1/3 p-6 flex flex-col justify-between text-white shrink-0">
                    <div>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                <Shield size={24} className="text-emerald-400" />
                                Visibilidad
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors md:hidden">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="mb-8">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Usuario Seleccionado</p>
                            <div className="flex items-center gap-3 bg-slate-700/50 p-3 rounded-xl border border-slate-600/50">
                                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-lg">
                                    {(user.nombre || 'U').charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-sm truncate">{user.nombre}</h4>
                                    <p className="text-xs text-slate-400 truncate">{user.carnet || 'Sin Carnet'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Vertical Tabs */}
                        <div className="space-y-2">
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Categorías de Acceso</p>
                            <button
                                onClick={() => { setActiveTab('areas'); setActionType('ALLOW'); setSearchQuery(''); setSearchResults([]); }}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'areas'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 font-bold'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                <Globe size={18} />
                                <div>
                                    <p className="text-sm">Áreas y Deptos.</p>
                                    <p className={`text-[10px] ${activeTab === 'areas' ? 'text-emerald-100' : 'text-slate-500'}`}>Ver nodos completos</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setActiveTab('people'); setSearchQuery(''); setSearchResults([]); }}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'people'
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 font-bold'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                <Users size={18} />
                                <div>
                                    <p className="text-sm">Personas Específicas</p>
                                    <p className={`text-[10px] ${activeTab === 'people' ? 'text-indigo-100' : 'text-slate-500'}`}>Ver dashboard individual</p>
                                </div>
                            </button>

                            <button
                                onClick={() => { setActiveTab('effective'); setSearchQuery(''); setSearchResults([]); }}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === 'effective'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20 font-bold'
                                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                <Shield size={18} />
                                <div>
                                    <p className="text-sm">Visibilidad Efectiva</p>
                                    <p className={`text-[10px] ${activeTab === 'effective' ? 'text-amber-100' : 'text-slate-500'}`}>¿Qué ve realmente?</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 md:mt-0">
                        <button
                            onClick={onClose}
                            className="hidden md:flex w-full py-3 items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors text-sm font-bold"
                        >
                            <X size={16} />
                            Cerrar Ventana
                        </button>
                    </div>
                </div>

                {/* Right Panel: Content */}
                <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">

                    {/* Search / Add Header - Only for areas/people tabs */}
                    {activeTab !== 'effective' && (
                        <div className="p-6 bg-white border-b border-slate-100 z-10 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800">
                                    {activeTab === 'areas' ? 'Gestionar Acceso a Áreas' : 'Gestionar Acceso a Personas'}
                                </h2>

                                {activeTab === 'people' && (
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setActionType('ALLOW')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${actionType === 'ALLOW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-500'}`}
                                        >
                                            Permitir
                                        </button>
                                        <button
                                            onClick={() => setActionType('DENY')}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${actionType === 'DENY' ? 'bg-red-50 text-red-600 shadow-sm ring-1 ring-red-100' : 'text-slate-500 hover:text-red-500'}`}
                                        >
                                            Denegar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder={
                                        activeTab === 'areas'
                                            ? "Buscar por nombre de área..."
                                            : actionType === 'ALLOW' ? "Buscar colaborador para PERMITIR..." : "Buscar colaborador para BLOQUEAR..."
                                    }
                                    className={`w-full pl-12 pr-4 py-3 bg-slate-50 border rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 transition-all shadow-sm ${actionType === 'DENY'
                                        ? 'border-red-100 focus:ring-red-500/20 focus:border-red-500'
                                        : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                                        }`}
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    disabled={!user.carnet}
                                />
                                {isSearching && (
                                    <div className="absolute right-4 top-3.5 animate-spin text-indigo-500">
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-[8rem] left-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[50vh] overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        Resultados de búsqueda ({searchResults.length})
                                    </div>
                                    {searchResults.map((item: any) => (
                                        <button
                                            key={activeTab === 'areas' ? `area-${item.idOrg}` : `emp-${item.carnet}`}
                                            onClick={() => handleAdd(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'areas' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {activeTab === 'areas' ? <Globe size={18} /> : <Users size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700">{item.descripcion || item.nombreCompleto || item.nombre}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{item.tipo || item.cargo || 'Entidad'}</p>
                                                </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs ${actionType === 'DENY' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                {actionType === 'DENY' ? <Shield size={14} /> : <Plus size={14} />}
                                                {actionType === 'DENY' ? 'Bloquear' : 'Agregar'}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Header for Effective Tab */}
                    {activeTab === 'effective' && (
                        <div className="p-6 bg-white border-b border-slate-100 z-10 shrink-0">
                            <h2 className="text-lg font-bold text-slate-800">Visibilidad Efectiva</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Lista consolidada de todas las personas que este usuario puede ver (basado en jerarquía + permisos manuales).
                            </p>
                        </div>
                    )}

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                                <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="text-sm font-medium animate-pulse">Sincronizando permisos...</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeTab === 'effective' ? renderEffectiveContent() : renderRulesContent()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
