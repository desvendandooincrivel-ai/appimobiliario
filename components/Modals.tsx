import React, { useState, useEffect, useRef } from 'react';
import { IconeFechar, IconeMais, IconeLixeira } from './Icons';
import { Plus } from 'lucide-react';
import { formatBRL } from '../utils/helpers';
import { generateRepasseListHTML } from '../utils/reportHelper';
import { Rental, Owner, StatementData, Item, PixConfig, ContractEvent } from '../types';
import { DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_DOC, DEFAULT_COMPANY_PIX_KEY } from '../utils/constants';

// --- Generic Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title?: string }> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-40 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 relative max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"><IconeFechar /></button>
                {title && <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">{title}</h2>}
                {children}
            </div>
        </div>
    );
};

// --- Confirmation Modal ---
export const ConfirmationModal: React.FC<{ isOpen: boolean; message: string; onConfirm: () => void; onCancel: () => void }> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                <p className="mb-4 text-lg font-semibold text-gray-800">{message}</p>
                <div className="flex justify-center space-x-3 mt-4">
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">Confirmar</button>
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400">Cancelar</button>
                </div>
            </div>
        </div>
    );
};

// --- Business Modals ---

export const ModalAplicarMulta: React.FC<{ rental: Rental; onClose: () => void; onSaveMulta: (id: string, items: Item[]) => void }> = ({ rental, onClose, onSaveMulta }) => {
    const itensCobranca = [
        { key: 'rentAmount', nome: 'Aluguel', valor: rental.rentAmount || 0 },
        { key: 'waterBill', nome: 'Água', valor: rental.waterBill || 0 },
        { key: 'condoFee', nome: 'Condomínio', valor: rental.condoFee || 0 },
        { key: 'iptu', nome: 'IPTU', valor: rental.iptu || 0 },
        { key: 'gasBill', nome: 'Gás', valor: rental.gasBill || 0 },
    ].filter(item => item.valor > 0);

    // Default select Rent only initially
    const [itensSelecionados, setItensSelecionados] = useState(
        itensCobranca.reduce((acc, item) => ({ ...acc, [item.key]: item.key === 'rentAmount' }), {} as Record<string, boolean>)
    );

    const baseMultaAluguel = itensSelecionados['rentAmount'] ? (rental.rentAmount || 0) : 0;
    const baseMultaOutros = itensCobranca.reduce((acc, item) => (item.key !== 'rentAmount' && itensSelecionados[item.key]) ? acc + item.valor : acc, 0);

    const valorMultaTotal = (baseMultaAluguel + baseMultaOutros) * 0.10;

    const handleSave = () => {
        const outrosItensSemMulta = (rental.otherItems || []).filter(item => !item.description.toLowerCase().startsWith('multa 10%'));
        let novosItens = [...outrosItensSemMulta];
        if (baseMultaAluguel > 0) novosItens.push({ id: `multa-aluguel-${Date.now()}-1`, description: 'Multa 10% (Aluguel)', amount: parseFloat((baseMultaAluguel * 0.10).toFixed(2)) });
        if (baseMultaOutros > 0) novosItens.push({ id: `multa-outros-${Date.now()}-2`, description: 'Multa 10% (Encargos)', amount: parseFloat((baseMultaOutros * 0.10).toFixed(2)) });
        onSaveMulta(rental.id, novosItens); onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Aplicar Multa (10%)">
            <div className="space-y-3">
                <p className="font-medium">Selecione os itens para cálculo:</p>
                <div className="border rounded-lg p-4 space-y-2">
                    {itensCobranca.map(item => (
                        <label key={item.key} className="flex justify-between p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <span className="flex items-center">
                                <input type="checkbox" checked={itensSelecionados[item.key] || false} onChange={() => setItensSelecionados(prev => ({ ...prev, [item.key]: !prev[item.key] }))} className="h-5 w-5" />
                                <span className="ml-3">{item.nome}</span>
                            </span>
                            <span>{formatBRL(item.valor)}</span>
                        </label>
                    ))}
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between font-bold text-blue-800">
                    <span>Valor da Multa (10%):</span><span>{formatBRL(valorMultaTotal)}</span>
                </div>
                <div className="flex justify-end space-x-3 pt-4"><button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button><button onClick={handleSave} disabled={valorMultaTotal === 0} className="px-5 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">Aplicar</button></div>
            </div>
        </Modal>
    );
};

export const ModalAplicarReajuste: React.FC<{ rental: Rental; onClose: () => void; onSaveReajuste: (id: string, amount: number, label: string, year: number) => void; selectedYear: number }> = ({ rental, onClose, onSaveReajuste, selectedYear }) => {
    const [percent, setPercent] = useState('');
    const [fixedAmount, setFixedAmount] = useState('');
    const [adjustmentAmount, setAdjustmentAmount] = useState(0);
    const [newRentAmount, setNewRentAmount] = useState(rental.rentAmount);
    const [adjustmentLabel, setAdjustmentLabel] = useState('');

    const handlePercentChange = (value: string) => {
        setPercent(value); setFixedAmount('');
        const p = parseFloat(value.replace(',', '.'));
        if (p > 0) {
            const adj = (rental.rentAmount * p) / 100;
            setAdjustmentAmount(adj); setNewRentAmount(rental.rentAmount + adj); setAdjustmentLabel(`Reajuste (${value}%)`);
        }
    };
    const handleFixedChange = (value: string) => {
        setFixedAmount(value); setPercent('');
        const f = parseFloat(value.replace(',', '.'));
        if (f > 0) {
            setAdjustmentAmount(f); setNewRentAmount(rental.rentAmount + f); setAdjustmentLabel(`Reajuste (${formatBRL(f)})`);
        }
    };
    const handleSave = () => { if (adjustmentAmount > 0) { onSaveReajuste(rental.id, newRentAmount, adjustmentLabel, selectedYear); onClose(); } };

    return (
        <Modal isOpen={true} onClose={onClose} title="Aplicar Reajuste">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium">Reajuste (%)</label><input type="text" value={percent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePercentChange(e.currentTarget.value)} className="w-full p-2 border rounded" placeholder="10,5" /></div>
                    <div><label className="block text-sm font-medium">Fixo (R$)</label><input type="text" value={fixedAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFixedChange(e.currentTarget.value)} className="w-full p-2 border rounded" placeholder="150,00" /></div>
                </div>
                <div className="bg-green-50 p-4 rounded border-green-200 flex justify-between font-bold text-green-800">
                    <span>Novo Aluguel:</span><span>{formatBRL(newRentAmount)}</span>
                </div>
                <div className="flex justify-end space-x-3"><button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancelar</button><button onClick={handleSave} disabled={adjustmentAmount === 0} className="px-5 py-2 bg-green-600 text-white rounded">Salvar</button></div>
            </div>
        </Modal>
    );
};

export const ModalOtherItems: React.FC<{ config: { rental: Rental; itemType: 'owner' | 'tenant' }; onClose: () => void; onSave: (id: string, items: Item[], type: 'owner' | 'tenant') => void }> = ({ config, onClose, onSave }) => {
    const [items, setItems] = useState<Item[]>(config.itemType === 'owner' ? (config.rental.ownerItems || []) : (config.rental.otherItems || []));
    const [description, setDescription] = useState('');
    const [amountText, setAmountText] = useState('');
    const [type, setType] = useState<'unique' | 'permanent' | 'installment'>('unique');
    const [totalInstallments, setTotalInstallments] = useState('2');

    const handleAdd = () => {
        const amount = parseFloat(amountText.replace(',', '.'));
        if (description && !isNaN(amount)) {
            let finalDescription = description;
            if (type === 'installment') {
                finalDescription = `${description} (1 de ${totalInstallments})`;
            }
            const newItem: Item = {
                id: Date.now().toString(),
                description: finalDescription,
                amount,
                type,
                totalInstallments: type === 'installment' ? parseInt(totalInstallments) : undefined,
                currentInstallment: type === 'installment' ? 1 : undefined
            };
            setItems([...items, newItem]);
            setDescription(''); setAmountText(''); setType('unique');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={config.itemType === 'owner' ? 'Ajustes de Repasse' : 'Itens Adicionais'}>
            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Descrição</label>
                            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Ex: Pintura, Conserto..." />
                        </div>
                        <div className="w-32">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Valor (R$)</label>
                            <input value={amountText} onChange={(e) => setAmountText(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="-50,00" />
                        </div>
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Tipo de Cobrança</label>
                            <select value={type} onChange={(e) => setType(e.target.value as any)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                                <option value="unique">Único (Só este mês)</option>
                                <option value="permanent">Permanente (Todo mês)</option>
                                <option value="installment">Parcelado (Dividido)</option>
                            </select>
                        </div>
                        {type === 'installment' && (
                            <div className="w-24">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Parcelas</label>
                                <input type="number" min="2" value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} className="w-full p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                        )}
                        <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl shadow-lg shadow-indigo-100 transition-all transform active:scale-95">
                            <IconeMais />
                        </button>
                    </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl overflow-hidden shadow-inner bg-white">
                    <ul className="divide-y divide-gray-50">
                        {items.map(item => (
                            <li key={item.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-700">{item.description}</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">
                                        {item.type === 'permanent' ? '• Permanente' : 
                                         item.type === 'installment' ? `• Parcela ${item.currentInstallment} de ${item.totalInstallments}` : 
                                         '• Único'}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <span className={`font-black ${item.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {formatBRL(item.amount)}
                                    </span>
                                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                        <IconeLixeira />
                                    </button>
                                </div>
                            </li>
                        ))}
                        {items.length === 0 && (
                            <li className="p-10 text-center flex flex-col items-center gap-2">
                                <span className="text-gray-300 font-bold uppercase text-xs">Nenhum item adicionado</span>
                            </li>
                        )}
                    </ul>
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-gray-400">Total Ajustes</span>
                        <span className="text-2xl font-black text-gray-800">{formatBRL(items.reduce((acc, i) => acc + i.amount, 0))}</span>
                    </div>
                    <button onClick={() => { onSave(config.rental.id, items, config.itemType); onClose(); }} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 transition-all transform hover:scale-105 active:scale-95">
                        SALVAR
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export const StatementSelectionModal: React.FC<{ isOpen: boolean; data: StatementData; owners: Owner[]; selectedMonth: string; selectedYear: number; onClose: () => void; showMessage: (msg: string, type: 'success' | 'error') => void; onGenerateStatementWithNotes: (id: string, rentals: Rental[], notes: string) => void; pixConfig: PixConfig }> = ({ isOpen, data, owners, selectedMonth, selectedYear, onClose, showMessage, onGenerateStatementWithNotes, pixConfig }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState(pixConfig?.statementNotes || '');

    useEffect(() => { 
        if (data.rentals) {
            const today = new Date().toISOString().split('T')[0];
            const transferredTodayIds = data.rentals.filter(r => r.transferDate && r.transferDate.startsWith(today)).map(r => r.id);
            setSelectedIds(transferredTodayIds);
        }
        setNotes(pixConfig?.statementNotes || ''); 
    }, [data, pixConfig]);

    const handleSelectAll = () => {
        if (selectedIds.length === data.rentals.length) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(data.rentals.map(r => r.id)); // Select all
        }
    };

    const handleGenerate = () => {
        const selected = data.rentals.filter(r => selectedIds.includes(r.id));
        if (selected.length === 0) { showMessage('Selecione ao menos um item.', 'error'); return; }
        if (data.ownerId) onGenerateStatementWithNotes(data.ownerId, selected, notes);
        onClose();
    };

    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gerar Prestação de Contas">
            <div className="p-2 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium">Selecione os repasses ({selectedMonth}/{selectedYear}):</h4>
                    <button onClick={handleSelectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold border border-indigo-200 px-2 py-1 rounded-md">
                        {selectedIds.length === data.rentals.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded">
                    {data.rentals.map(r => (
                        <label key={r.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])} className="h-4 w-4" />
                            <span className="ml-3 text-sm">{`LF ${r.refNumber} - ${r.tenantName}`}</span>
                        </label>
                    ))}
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Observações</label>
                    <textarea value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.currentTarget.value)} rows={3} className="w-full p-2 border rounded text-sm" />
                </div>
                <div className="flex justify-end"><button onClick={handleGenerate} className="px-5 py-2 bg-green-600 text-white rounded">Gerar</button></div>
            </div>
        </Modal>
    );
};

export const ModalListaRepasse: React.FC<{ isOpen: boolean; onClose: () => void; rentalsPessoais: Rental[]; owners: Owner[]; selectedMonth: string; selectedYear: number; showMessage: (msg: string, type: 'error') => void }> = ({ isOpen, onClose, rentalsPessoais, owners, selectedMonth, selectedYear, showMessage }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    useEffect(() => { 
        if (rentalsPessoais) {
            const today = new Date().toISOString().split('T')[0];
            const transferredTodayIds = rentalsPessoais.filter(r => r.transferDate && r.transferDate.startsWith(today)).map(r => r.id);
            setSelectedIds(transferredTodayIds);
        }
    }, [rentalsPessoais]);

    const handleSelectAll = () => {
        if (selectedIds.length === rentalsPessoais.length) {
            setSelectedIds([]); // Deselect all
        } else {
            setSelectedIds(rentalsPessoais.map(r => r.id)); // Select all
        }
    };

    const handleGenerate = () => {
        const selected = rentalsPessoais.filter(r => selectedIds.includes(r.id));
        if (selected.length === 0) { showMessage('Selecione ao menos um repasse.', 'error'); return; }
        const html = generateRepasseListHTML(selected, owners, selectedMonth, selectedYear);
        const win = (window as any).open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
        onClose();
    };

    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lista de Repasse">
            <div className="p-2 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-medium">Selecione os repasses ({selectedMonth}/{selectedYear}):</h4>
                    <button onClick={handleSelectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold border border-indigo-200 px-2 py-1 rounded-md">
                        {selectedIds.length === rentalsPessoais.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto border p-2 rounded">
                    {rentalsPessoais.map(r => (
                        <label key={r.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => setSelectedIds(prev => prev.includes(r.id) ? prev.filter(i => i !== r.id) : [...prev, r.id])} className="h-4 w-4" />
                            <span className="ml-3 text-sm">{`LF ${r.refNumber} - ${r.tenantName} (${r.owner})`}</span>
                        </label>
                    ))}
                </div>
                <div className="flex justify-end"><button onClick={handleGenerate} className="px-5 py-2 bg-green-600 text-white rounded">Gerar Lista</button></div>
            </div>
        </Modal>
    );
};

export const ModalConfiguracaoPix: React.FC<{ isOpen: boolean; onClose: () => void; pixConfig: PixConfig; setPixConfig: (c: PixConfig) => void; showMessage: (msg: string, type: 'success' | 'error' | 'info') => void }> = ({ isOpen, onClose, pixConfig, setPixConfig, showMessage }) => {
    const [name, setName] = useState(pixConfig?.name || DEFAULT_COMPANY_NAME);
    const [doc, setDoc] = useState(pixConfig?.doc || DEFAULT_COMPANY_DOC);
    const [pixKey, setPixKey] = useState(pixConfig?.pixKey || DEFAULT_COMPANY_PIX_KEY);
    const [qrCodeBase64, setQrCodeBase64] = useState(pixConfig?.qrCodeBase64 || '');
    const [pixPayload, setPixPayload] = useState(pixConfig?.pixPayload || '');
    const [statementNotes, setStatementNotes] = useState(pixConfig?.statementNotes || '');
    const [occurrenceContact, setOccurrenceContact] = useState(pixConfig?.occurrenceContact || '');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (!name || !doc) { showMessage('Nome e Documento obrigatórios.', 'error'); return; }
        setPixConfig({ name, doc, pixKey, qrCodeBase64, pixPayload, statementNotes, occurrenceContact });
        showMessage('Configuração salva!', 'success'); onClose();
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.currentTarget.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (typeof ev.target?.result === 'string') setQrCodeBase64(ev.target.result); };
            reader.readAsDataURL(e.currentTarget.files[0]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Configuração PIX Padrão">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div><label>Nome</label><input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.currentTarget.value)} className="w-full p-2 border rounded" /></div>
                    <div><label>Documento</label><input value={doc} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDoc(e.currentTarget.value)} className="w-full p-2 border rounded" /></div>
                </div>
                <div><label>Chave PIX (Auto)</label><input value={pixKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPixKey(e.currentTarget.value)} className="w-full p-2 border rounded" /></div>

                <div className="border-t pt-2">
                    <h4 className="font-bold mb-2">Customizado (Opcional)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <button onClick={() => (fileRef.current as any)?.click()} className="w-full p-2 bg-blue-50 border text-blue-600 rounded flex items-center justify-center"><Plus size={16} /> QR Code Imagem</button>
                            <input type="file" ref={fileRef} onChange={handleFile} className="hidden" accept="image/*" />
                            {qrCodeBase64 && <img src={qrCodeBase64} alt="QR" className="h-20 mt-2 mx-auto" />}
                        </div>
                        <div><textarea value={pixPayload} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPixPayload(e.currentTarget.value)} rows={3} placeholder="Payload Copia e Cola" className="w-full p-2 border rounded text-xs" /></div>
                    </div>
                </div>
                <div><label>Notas Padrão (Demonstrativo)</label><textarea value={statementNotes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStatementNotes(e.currentTarget.value)} rows={3} className="w-full p-2 border rounded" /></div>
                <div><label>Contato para Chamados (ex: 552299999999)</label><input value={occurrenceContact} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOccurrenceContact(e.currentTarget.value)} className="w-full p-2 border rounded" placeholder="Apenas números, com DDI e DDD" /></div>
                <div className="flex justify-end pt-2"><button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button></div>
            </div>
        </Modal>
    );
};

export const ModalMotivoAlteracao: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (description: string) => void; descriptionBase: string; title?: string }> = ({ isOpen, onClose, onSave, descriptionBase, title = "Motivo da Alteração" }) => {
    const [reason, setReason] = useState('');

    const handleSave = () => {
        if (reason.trim().length < 5) {
            alert('Por favor, informe um motivo válido (mínimo de 5 caracteres).');
            return;
        }
        onSave(reason);
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <div className="bg-orange-50 text-orange-800 p-4 rounded-xl border border-orange-200 text-sm font-medium">
                    {descriptionBase}
                </div>
                <div>
                    <label className="block text-sm font-black text-gray-700 mb-2">Descreva o motivo desta alteração financeira: *</label>
                    <textarea 
                        value={reason} 
                        onChange={(e) => setReason(e.target.value)} 
                        className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none" 
                        rows={4}
                        placeholder="Ex: Acordo feito via WhatsApp no dia 10/10 para desconto temporário..."
                        required
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 transition-colors">Confirmar Alteração</button>
                </div>
            </div>
        </Modal>
    );
};

export const LongTermReportModal: React.FC<{ isOpen: boolean; onClose: () => void; rentals: Rental[]; events: ContractEvent[] }> = ({ isOpen, onClose, rentals, events }) => {
    
    // Group contracts by refNumber
    const uniqueContracts = Array.from(new Set(rentals.map(r => r.refNumber)));
    
    const contractsData = uniqueContracts.map(ref => {
        const contractRentals = rentals.filter(r => r.refNumber === ref);
        const latestRental = contractRentals[contractRentals.length - 1]; // Just to get tenant name
        
        let startDate = new Date();
        const dates = contractRentals.map(r => r.contractDate ? new Date(r.contractDate) : new Date(r.year, ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].indexOf(r.month), 1)).filter(d => !isNaN(d.getTime()));
        
        if (dates.length > 0) {
            startDate = new Date(Math.min(...dates.map(d => d.getTime())));
        }

        const ageInYears = (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        
        const contractEvts = events.filter(e => e.contract_id === ref);
        const eventCount = contractEvts.length;
        const valueChanges = contractEvts.filter(e => e.old_value !== undefined && e.new_value !== undefined).length;
        const agreementsCount = contractEvts.filter(e => e.type === 'ACORDO_VALOR').length;
        const totalAttachments = contractEvts.reduce((sum, e) => sum + (e.attachments ? e.attachments.length : 0), 0);

        return {
            refNumber: ref,
            tenantName: latestRental?.tenantName || 'Desconhecido',
            ageInYears,
            eventCount,
            valueChanges,
            agreementsCount,
            totalAttachments
        };
    }).filter(c => c.ageInYears >= 5).sort((a, b) => b.ageInYears - a.ageInYears);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Relatório de Contratos de Longo Prazo (> 5 anos)">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                {contractsData.length === 0 ? (
                    <div className="text-center p-10 text-gray-500 font-bold">
                        Nenhum contrato com mais de 5 anos encontrado.
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">REF / Inquilino</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Tempo (Anos)</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Eventos</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Alt. Financeira</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Acordos</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Anexos</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {contractsData.map(c => (
                                <tr key={c.refNumber} className="hover:bg-gray-50">
                                    <td className="px-3 py-3 text-sm font-bold text-gray-800">LF {c.refNumber} - {c.tenantName}</td>
                                    <td className="px-3 py-3 text-sm text-center font-bold text-indigo-600">{c.ageInYears.toFixed(1)}</td>
                                    <td className="px-3 py-3 text-sm text-center">{c.eventCount}</td>
                                    <td className="px-3 py-3 text-sm text-center text-orange-600 font-medium">{c.valueChanges}</td>
                                    <td className="px-3 py-3 text-sm text-center text-purple-600 font-medium">{c.agreementsCount}</td>
                                    <td className="px-3 py-3 text-sm text-center">{c.totalAttachments}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="px-6 py-2 bg-gray-100 font-bold rounded-xl text-gray-700">Fechar</button>
            </div>
        </Modal>
    );
};