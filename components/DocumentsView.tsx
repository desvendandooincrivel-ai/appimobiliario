import React, { useState } from 'react';
import { Search, Folder, File, ExternalLink, RefreshCw, Cloud, HardDrive, Filter, Download } from 'lucide-react';

interface DocumentsViewProps {
    driveToken: string | null;
    onLogin: () => void;
    onLogout: () => void;
}

export const DocumentsView = ({ driveToken, onLogin, onLogout }: DocumentsViewProps) => {
    const [mode, setMode] = useState<'cloud' | 'local'>('cloud');
    const [searchTerm, setSearchTerm] = useState('');
    const isConnected = !!driveToken;

    // Mock de arquivos do Drive
    const mockFiles = [
        { id: '1', name: 'Contrato_Aluguel_Apartamento_101.pdf', type: 'pdf', folder: 'Contratos', updated: '12/01/2026' },
        { id: '2', name: 'Vistoria_Entrada_Casa_Verde.zip', type: 'zip', folder: 'Vistorias', updated: '10/01/2026' },
        { id: '3', name: 'Comprovante_Deposito_Proprietario_Silva.png', type: 'image', folder: 'Financeiro', updated: '13/01/2026' },
        { id: '4', name: 'Regimento_Interno_Condominio.docx', type: 'word', folder: 'Documentos', updated: '01/01/2026' },
    ];

    const filteredFiles = mockFiles.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-white rounded-[2rem] shadow-sm overflow-hidden border border-gray-100">
            {/* Top Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-black text-indigo-900 flex items-center gap-2">
                        <Cloud className="text-indigo-600" size={24} />
                        Documentação Cloud
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-white/80 p-1 rounded-xl shadow-sm border border-indigo-100/50">
                        <button
                            onClick={() => setMode('cloud')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'cloud' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Google Drive
                        </button>
                        <button
                            onClick={() => setMode('local')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'local' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            Drive Local
                        </button>
                    </div>
                    {isConnected && (
                        <button onClick={onLogout} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Sair</button>
                    )}
                </div>
            </div>

            {!isConnected ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                        <Cloud size={40} className="text-indigo-400" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Acesso ao Google Drive</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm font-medium">
                        Conecte sua conta Google para buscar contratos, vistorias e fotos direto das suas pastas na nuvem.
                    </p>

                    <button
                        onClick={onLogin}
                        className="flex items-center gap-3 bg-indigo-600 px-8 py-4 rounded-2xl text-white font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
                    >
                        <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="w-6 h-6 bg-white rounded-full p-0.5" alt="Google" />
                        ENTRAR COM GOOGLE
                    </button>

                    <p className="mt-6 text-[9px] uppercase tracking-widest text-gray-400 font-bold leading-relaxed">
                        🔐 Conexão Segura via OAuth2<br />
                        <span className="text-[8px] normal-case font-normal">Sincronização automática de dados habilitada</span>
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 border-b flex gap-3 items-center bg-gray-50/50">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar arquivos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>
                        <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-500 hover:text-indigo-600"><RefreshCw size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="col-span-full border-b pb-2 mb-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">Pastas</h4>
                            </div>

                            {['Contratos', 'Vistorias', 'Recibos'].map(folder => (
                                <div key={folder} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group cursor-pointer shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600"><Folder size={20} fill="currentColor" opacity={0.3} /></div>
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-900 group-hover:text-indigo-700">{folder}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Google Drive Folder</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="col-span-full border-b pb-2 mb-2 mt-4">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">Recentes</h4>
                            </div>

                            {filteredFiles.map(file => (
                                <div key={file.id} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 transition-all group shadow-sm flex flex-col">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-indigo-500"><File size={16} /></div>
                                        <div className="flex-1">
                                            <div className="font-black text-xs text-gray-800 leading-tight group-hover:text-indigo-700">{file.name}</div>
                                            <div className="text-[8px] font-bold text-indigo-400 mt-1 uppercase tracking-widest">{file.type}</div>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-3 border-t flex justify-between items-center text-[9px] font-bold">
                                        <span className="text-gray-400">{file.updated}</span>
                                        <button className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"><Download size={10} /> Abrir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
