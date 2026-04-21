import React, { useState, useEffect } from 'react';
import { GoogleUser } from '../utils/driveSyncService';

interface LoginScreenProps {
    onLogin: (token: string, user: GoogleUser) => void;
    onContinueOffline: () => void;
    isLoading: boolean;
    error: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onContinueOffline, isLoading, error }) => {
    const [googleReady, setGoogleReady] = useState(false);

    useEffect(() => {
        const check = setInterval(() => {
            if ((window as any).google?.accounts?.oauth2) {
                setGoogleReady(true);
                clearInterval(check);
            }
        }, 200);
        const timeout = setTimeout(() => clearInterval(check), 10000);
        return () => { clearInterval(check); clearTimeout(timeout); };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-center p-6">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-400/5 rounded-full blur-2xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo / Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur rounded-3xl mb-6 shadow-2xl border border-white/20">
                        <span className="text-5xl">🏠</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Jobh Imóveis</h1>
                    <p className="text-indigo-200 mt-2 font-medium text-lg">Gestão Imobiliária Profissional</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-black text-white mb-2">Bem-vindo!</h2>
                        <p className="text-indigo-200 text-sm leading-relaxed">
                            Faça login com sua conta Google para acessar e sincronizar seus dados de qualquer computador.
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-8">
                        {[
                            { icon: '☁️', text: 'Dados sincronizados no Google Drive' },
                            { icon: '🔒', text: 'Acesso seguro em qualquer dispositivo' },
                            { icon: '📁', text: 'Pasta dedicada "Jobh Imóveis Manager"' },
                        ].map((f, i) => (
                            <div key={i} className="flex items-center gap-3 text-indigo-100 text-sm">
                                <span className="text-xl">{f.icon}</span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-4 mb-4 text-sm">
                            <p className="font-bold mb-1">⚠️ {error}</p>
                            {(error.includes('access_denied') || error.includes('403')) && (
                                <p className="text-xs text-red-300 mt-1">
                                    Seu e-mail ainda não foi adicionado como testador no Google Cloud Console.
                                    Por enquanto, use o modo local abaixo.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        onClick={() => onLogin('', { name: '', email: '', picture: '' })}
                        disabled={isLoading || !googleReady}
                        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-black py-4 rounded-2xl text-base shadow-xl hover:bg-gray-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                                <span>Conectando...</span>
                            </>
                        ) : !googleReady ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
                                <span>Carregando API Google...</span>
                            </>
                        ) : (
                            <>
                                {/* Google Logo SVG */}
                                <svg width="20" height="20" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span>Entrar com Google</span>
                            </>
                        )}
                    </button>

                    <p className="text-center text-indigo-300 text-xs mt-4">
                        Seus dados ficam em sua conta Google Drive pessoal.
                    </p>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-indigo-400 text-xs">ou</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Offline mode button */}
                    <button
                        onClick={onContinueOffline}
                        className="w-full py-3 text-sm font-bold text-indigo-200 border border-white/10 rounded-2xl hover:bg-white/5 active:scale-95 transition-all"
                    >
                        💾 Continuar com dados locais
                    </button>
                    <p className="text-center text-indigo-400 text-xs mt-2">
                        Seus dados já salvos neste computador continuarão disponíveis.
                        O backup no Drive não funcionará neste modo.
                    </p>
                </div>

                <p className="text-center text-indigo-400 text-xs mt-6">
                    Jobh Imóveis Manager v0.1.20 • Todos os direitos reservados
                </p>
            </div>
        </div>
    );
};
