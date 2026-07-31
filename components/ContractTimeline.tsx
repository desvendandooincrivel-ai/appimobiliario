import React, { useState } from 'react';
import { ContractEvent, ContractEventType, TimelineEventView } from '../types';
import { Modal } from './Modals';
import { Clock, User, Tag, FileText, Paperclip, Plus, Download } from 'lucide-react';
import { formatBRL } from '../utils/helpers';

interface ContractTimelineProps {
    isOpen: boolean;
    onClose: () => void;
    events: ContractEvent[];
    contractRef: string; // Used as title
    onAddEvent: (event: Partial<ContractEvent>) => Promise<void> | void;
    ownerMode?: boolean;
    ownerRentals?: { id: string; refNumber: string; tenantName: string }[];
    eventView?: TimelineEventView;
    title?: string;
    emptyText?: string;
}

export const ContractTimeline: React.FC<ContractTimelineProps> = ({ isOpen, onClose, events, contractRef, onAddEvent, ownerMode, ownerRentals, eventView = 'tenant', title, emptyText }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState<{type: ContractEventType, description: string, attachments: any[], contract_id?: string}>({ type: 'COMUNICACAO_IMPORTANTE', description: '', attachments: [] });
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const getEventDescription = (event: ContractEvent) => event.related_descriptions?.[eventView] || event.description;
    const timelineTitle = title || (eventView === 'property' ? `Prontuário do Imóvel (${contractRef})` : ownerMode ? `Prontuário do Proprietário (${contractRef})` : `Prontuário do Contrato (LF ${contractRef})`);

    const filteredEvents = events.filter(e => 
        getEventDescription(e).toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        e.type.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newEvent.description) {
            setIsUploading(true);
            await onAddEvent(newEvent);
            setIsAddingEvent(false);
            setNewEvent({ type: 'COMUNICACAO_IMPORTANTE', description: '', attachments: [], contract_id: ownerMode ? '' : undefined });
            setIsUploading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        setIsUploading(true);
        const newAttachments: any[] = [];
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                newAttachments.push({
                    id: Date.now().toString() + Math.random(),
                    file_url: ev.target?.result as string,
                    file_type: file.type,
                    description: file.name,
                    created_at: new Date().toISOString(),
                    rawFile: file
                });
                
                if (newAttachments.length === files.length) {
                    setNewEvent(prev => ({...prev, attachments: [...prev.attachments, ...newAttachments]}));
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const getTypeColor = (type: ContractEventType) => {
        switch (type) {
            case 'REAJUSTE_ALUGUEL': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'ACORDO_VALOR': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'REPASSE_DIVERGENTE': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'PAGAMENTO_REGISTRADO': return 'bg-green-100 text-green-800 border-green-200';
            case 'OBRA_REALIZADA': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'COMUNICACAO_IMPORTANTE': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatValue = (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number') return formatBRL(val);
        return val;
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={timelineTitle}>
            <div className="flex flex-col h-[70vh]">
                <div className="flex justify-between items-center mb-6 gap-4 border-b pb-4">
                    <input 
                        type="text" 
                        placeholder="Buscar palavra-chave (ex: desconto, acordo)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                        onClick={() => setIsAddingEvent(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                        <Plus size={18} /> Novo Evento
                    </button>
                </div>

                {isAddingEvent && (
                    <form onSubmit={handleAddSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
                        <h3 className="font-bold text-gray-800">Registrar Novo Evento Manual</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Tipo de Evento</label>
                                <select 
                                    value={newEvent.type} 
                                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as ContractEventType })}
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="COMUNICACAO_IMPORTANTE">Comunicação Importante</option>
                                    <option value="ACORDO_VALOR">Acordo de Valor</option>
                                    <option value="OBRA_REALIZADA">Obra Realizada</option>
                                    <option value="OUTRO">Outro</option>
                                </select>
                            </div>
                            {ownerMode && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Propriedade / Contrato</label>
                                    <select 
                                        value={newEvent.contract_id || ''} 
                                        onChange={(e) => setNewEvent({ ...newEvent, contract_id: e.target.value })}
                                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    >
                                        <option value="">Selecione o Inquilino...</option>
                                        {ownerRentals?.map(r => (
                                            <option key={r.id} value={r.refNumber}>LF{r.refNumber} - {r.tenantName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className={ownerMode ? 'md:col-span-2' : ''}>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Descrição Detalhada</label>
                                <textarea 
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    rows={3}
                                    required
                                    placeholder="Descreva os detalhes importantes..."
                                />
                                <div className="mt-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Anexar Arquivos (PDF, Imagens)</label>
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="w-full text-xs"
                                    />
                                    {isUploading && <span className="text-xs text-indigo-500">Processando anexos...</span>}
                                    {newEvent.attachments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {newEvent.attachments.map(att => (
                                                <span key={att.id} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                                                    {att.description}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2">
                            <button type="button" onClick={() => setIsAddingEvent(false)} className="px-4 py-2 bg-white border text-gray-600 rounded-lg text-sm font-bold">Cancelar</button>
                            <button type="submit" disabled={isUploading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md disabled:bg-gray-400">Salvar Evento</button>
                        </div>
                    </form>
                )}

                <div className="flex-1 overflow-y-auto pr-2 relative">
                    <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    <div className="space-y-6 relative">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center text-gray-500 py-10 italic">{emptyText || 'Nenhum evento encontrado neste prontuário.'}</div>
                        ) : (
                            filteredEvents.map(event => (
                                <div key={event.id} className="relative pl-14">
                                    <div className="absolute left-4 top-1 w-5 h-5 bg-white border-4 border-indigo-500 rounded-full z-10 shadow-sm"></div>
                                    <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getTypeColor(event.type)}`}>
                                                        {event.type.replace('_', ' ')}
                                                    </span>
                                                    {ownerMode && (
                                                        <span className="px-2 py-1 rounded-md bg-gray-200 text-gray-600 text-[10px] font-bold">
                                                            LF{event.contract_id}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-400 gap-1 font-bold">
                                                    <Clock size={12} /> {new Date(event.created_at).toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg">
                                                <User size={12} /> {event.created_by}
                                            </div>
                                        </div>
                                        
                                        <p className="text-gray-800 mt-3 whitespace-pre-wrap">{getEventDescription(event)}</p>
                                        
                                        {(event.old_value !== undefined || event.new_value !== undefined) && (
                                            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
                                                {event.old_value !== undefined && event.old_value !== null && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400">Valor Anterior</span>
                                                        <span className="text-sm font-black text-gray-600 line-through">{formatValue(event.old_value)}</span>
                                                    </div>
                                                )}
                                                {event.old_value !== undefined && event.new_value !== undefined && <span className="text-gray-300 font-bold">➔</span>}
                                                {event.new_value !== undefined && event.new_value !== null && (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase font-bold text-indigo-400">Novo Valor</span>
                                                        <span className="text-sm font-black text-indigo-700">{formatValue(event.new_value)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {event.attachments && event.attachments.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                                                {event.attachments.map(att => (
                                                    <button 
                                                        key={att.id} 
                                                        onClick={() => setPreviewUrl(att.file_url.includes('/view') ? att.file_url.replace('/view', '/preview') : att.file_url)} 
                                                        className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <Paperclip size={14} /> {att.description || 'Anexo'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {previewUrl && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-2 relative max-w-5xl w-full h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center mb-2 px-4 py-2 border-b">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-indigo-600"/> Visualização do Documento</h3>
                            <button onClick={() => setPreviewUrl(null)} className="text-gray-500 hover:text-red-500 bg-gray-100 px-3 py-1 font-bold rounded-lg transition-colors">
                                FECHAR X
                            </button>
                        </div>
                        <iframe 
                            src={previewUrl} 
                            className="w-full flex-1 border-0 rounded-b-lg bg-gray-50" 
                            title="Document Preview"
                            allow="autoplay"
                        />
                    </div>
                </div>
            )}
        </Modal>
    );
};
