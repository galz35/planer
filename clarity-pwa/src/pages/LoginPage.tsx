
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { ApiResponse } from '../types/api';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validación de formato email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor ingresa un correo válido');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            const { data: response } = await api.post<ApiResponse<any>>('/auth/login', { correo: email, password });
            const { access_token, refresh_token, user } = response.data;
            login(access_token, refresh_token, user);
            navigate('/app/hoy');
        } catch (err: any) {
            console.error('[LOGIN ERROR] Failed to login', err);
            if (err.response) {
                console.error('[LOGIN] Response error data:', err.response.data);
            }
            const msg = err?.response?.data?.message;
            if (msg?.includes('credenciales') || msg?.includes('Credenciales')) {
                setError('Correo o contraseña incorrectos');
            } else {
                setError('Error de conexión. Intenta de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
            {/* LEFT PANEL - BRANDING */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center p-16">
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_50%,rgba(236,72,153,0.15),transparent_50%)]"></div>
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_50%,rgba(249,115,22,0.15),transparent_50%)]"></div>
                </div>

                {/* Decorative grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

                {/* Content */}
                <div className="relative z-10 text-center">
                    {/* ICON + TEXT CONTAINER with overlap effect */}
                    <div className="relative inline-block pb-24">
                        {/* Icon glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-orange-500 blur-3xl opacity-20 hover:opacity-30 transition-opacity duration-500"></div>

                        {/* Icon */}
                        <img
                            src="/momentus-logo2.png"
                            alt="Momentus"
                            className="h-64 w-auto relative z-10 drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                        />

                        {/* Brand name - OVERLAPPING bottom of icon */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-max z-20">
                            <h1 className="text-7xl font-black text-white mb-2 tracking-tight leading-none drop-shadow-2xl uppercase">
                                PLANER-CLARO
                            </h1>
                            <p className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 font-semibold drop-shadow-lg text-center uppercase">
                                es hoy y futuro
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-12">
                        <div className="relative inline-block pb-16">
                            <img
                                src="/momentus-logo2.png"
                                alt="Momentus"
                                className="h-32 w-auto"
                            />
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-max">
                                <h1 className="text-3xl font-black text-slate-900 mb-1 uppercase">PLANER-CLARO</h1>
                                <p className="text-lg text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-600 font-bold uppercase">
                                    es hoy y futuro
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Form card - Premium Refined */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        {/* Subtle brand accent bar */}
                        <div className="h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500"></div>

                        <div className="p-12">
                            {/* Header */}
                            <div className="mb-10 text-center">
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Iniciar Sesión</h2>
                                <p className="text-slate-500 text-sm">Accede a tu cuenta</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Correo Electrónico
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                                            placeholder="tu@claro.com.ni"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Contraseña
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="text-sm font-medium">{error}</p>
                                    </div>
                                )}

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full mt-8 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 px-6 rounded-xl font-semibold hover:from-slate-800 hover:to-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Ingresando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Ingresar</span>
                                                <LogIn className="h-5 w-5" />
                                            </>
                                        )}
                                    </div>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
