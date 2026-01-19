import React, { useState, useEffect, useRef } from 'react';
import { IconeFechar, IconeMais, IconeLixeira } from './Icons';
import { Plus } from 'lucide-react';
import { formatBRL } from '../utils/helpers';
import { generateRepasseListHTML } from '../utils/reportHelper';
import { Rental, Owner, StatementData, Item, PixConfig } from '../types';
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
    const [items, setItems] = useState(config.itemType === 'owner' ? config.rental.ownerItems : config.rental.otherItems);
    const [description, setDescription] = useState('');
    const [amountText, setAmountText] = useState('');

    const handleAdd = () => {
        const amount = parseFloat(amountText.replace(',', '.'));
        if (description && !isNaN(amount)) {
            setItems([...items, { id: Date.now().toString(), description, amount }]);
            setDescription(''); setAmountText('');
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={config.itemType === 'owner' ? 'Ajustes de Repasse' : 'Itens Adicionais'}>
            <div className="space-y-4">
                <div className="flex gap-2 items-end">
                    <div className="flex-1"><label className="text-xs">Descrição</label><input value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.currentTarget.value)} className="w-full p-2 border rounded" /></div>
                    <div className="w-32"><label className="text-xs">Valor (R$)</label><input value={amountText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountText(e.currentTarget.value)} className="w-full p-2 border rounded" placeholder="-50,00" /></div>
                    <button onClick={handleAdd} className="bg-blue-600 text-white p-2 rounded"><IconeMais /></button>
                </div>
                <ul className="divide-y border rounded">
                    {items.map(item => (
                        <li key={item.id} className="flex justify-between p-3">
                            <span>{item.description}</span>
                            <div className="flex items-center space-x-3">
                                <span className={item.amount < 0 ? 'text-red-600' : 'text-green-600'}>{formatBRL(item.amount)}</span>
                                <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-red-500"><IconeLixeira /></button>
                            </div>
                        </li>
                    ))}
                    {items.length === 0 && <li className="p-3 text-center text-gray-500">Nenhum item.</li>}
                </ul>
                <div className="flex justify-between pt-4 border-t items-center">
                    <span className="font-bold">Total: {formatBRL(items.reduce((acc, i) => acc + i.amount, 0))}</span>
                    <button onClick={() => { onSave(config.rental.id, items, config.itemType); onClose(); }} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
                </div>
            </div>
        </Modal>
    );
};

export const StatementSelectionModal: React.FC<{ isOpen: boolean; data: StatementData; owners: Owner[]; selectedMonth: string; selectedYear: number; onClose: () => void; showMessage: (msg: string, type: 'success' | 'error') => void; onGenerateStatementWithNotes: (id: string, rentals: Rental[], notes: string) => void; pixConfig: PixConfig }> = ({ isOpen, data, owners, selectedMonth, selectedYear, onClose, showMessage, onGenerateStatementWithNotes, pixConfig }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [notes, setNotes] = useState(pixConfig?.statementNotes || '');

    useEffect(() => { if (data.rentals) setSelectedIds(data.rentals.map(r => r.id)); setNotes(pixConfig?.statementNotes || ''); }, [data, pixConfig]);

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
                <h4 className="font-medium">Selecione os repasses ({selectedMonth}/{selectedYear}):</h4>
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
    useEffect(() => { if (rentalsPessoais) setSelectedIds(rentalsPessoais.map(r => r.id)); }, [rentalsPessoais]);

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
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (!name || !doc) { showMessage('Nome e Documento obrigatórios.', 'error'); return; }
        setPixConfig({ name, doc, pixKey, qrCodeBase64, pixPayload, statementNotes });
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
                <div className="flex justify-end pt-2"><button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button></div>
            </div>
        </Modal>
    );
};