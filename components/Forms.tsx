import React, { useState, useEffect } from 'react';
import { Owner, Rental } from '../types';
import { Modal } from './Modals';

interface OwnerFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (owner: Partial<Owner>) => void;
    initialData: Owner | null;
    showMessage: (msg: string, type: 'success' | 'error') => void;
}

export const OwnerForm: React.FC<OwnerFormProps> = ({ isOpen, onClose, onSubmit, initialData, showMessage }) => {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [rgCnh, setRgCnh] = useState('');
    const [bankDetails, setBankDetails] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [adminFeePercentageText, setAdminFeePercentageText] = useState('10');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setCpf(initialData.cpf || '');
            setRgCnh(initialData.rgCnh || '');
            setBankDetails(initialData.bankDetails || '');
            setPixKey(initialData.pixKey || '');
            setAdminFeePercentageText((initialData.adminFeePercentage || 10).toString().replace('.', ','));
        } else {
            setName(''); setCpf(''); setRgCnh(''); setBankDetails(''); setPixKey(''); setAdminFeePercentageText('10');
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const adminFeePercentage = parseFloat(adminFeePercentageText.replace(',', '.'));
        if (!name || !cpf || isNaN(adminFeePercentage)) {
            showMessage('Nome, CPF e Taxa de Adm. são obrigatórios.', 'error'); return;
        }
        onSubmit({
            id: initialData?.id,
            name, cpf, rgCnh, bankDetails, pixKey,
            adminFeePercentage: adminFeePercentage
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Proprietário' : 'Novo Proprietário'}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl shadow-inner max-h-[70vh] overflow-y-auto">
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Nome</label><input type="text" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" required /></div>
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">CPF</label><input type="text" value={cpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCpf(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" required /></div>
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">RG/CNH</label><input type="text" value={rgCnh} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRgCnh(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" /></div>
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Dados Bancários</label><input type="text" value={bankDetails} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBankDetails(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" /></div>
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Chave PIX</label><input type="text" value={pixKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPixKey(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" /></div>
                <div><label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-1">Taxa de Adm. (%)</label><input type="text" value={adminFeePercentageText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminFeePercentageText(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" placeholder="10,0" required /></div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-8 py-3 bg-white border border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-indigo-100 hover:scale-105 transition-all">{initialData ? 'Atualizar' : 'Adicionar'}</button>
                </div>
            </form>
        </Modal>
    );
};

interface RentalFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rental: Partial<Rental>) => void;
    initialData: Rental | null;
    owners: Owner[];
    showMessage: (msg: string, type: 'success' | 'error') => void;
}

export const RentalForm: React.FC<RentalFormProps> = ({ isOpen, onClose, onSubmit, initialData, owners, showMessage }) => {
    const [ownerId, setOwnerId] = useState('');
    const [tenantName, setTenantName] = useState('');
    const [tenantCpf, setTenantCpf] = useState('');
    const [tenantRgCnh, setTenantRgCnh] = useState('');
    const [propertyName, setPropertyName] = useState('');
    const [rentAmountText, setRentAmountText] = useState('');
    const [dueDay, setDueDay] = useState('');
    const [contractDate, setContractDate] = useState('');
    const [refNumber, setRefNumber] = useState('');
    const [waterBillText, setWaterBillText] = useState('0');
    const [condoFeeText, setCondoFeeText] = useState('0');
    const [iptuText, setIptuText] = useState('0');
    const [gasBillText, setGasBillText] = useState('0');
    const [rentDescription, setRentDescription] = useState('Aluguel');

    useEffect(() => {
        if (initialData) {
            setOwnerId(initialData.ownerId || '');
            setTenantName(initialData.tenantName || '');
            setTenantCpf(initialData.tenantCpf || '');
            setTenantRgCnh(initialData.tenantRgCnh || '');
            setPropertyName(initialData.propertyName || '');
            setRentAmountText((initialData.rentAmount || '').toString().replace('.', ','));
            setDueDay(initialData.dueDay?.toString() || '');
            setContractDate(initialData.contractDate || '');
            setRefNumber(initialData.refNumber || '');
            setWaterBillText((initialData.waterBill || 0).toString().replace('.', ','));
            setCondoFeeText((initialData.condoFee || 0).toString().replace('.', ','));
            setIptuText((initialData.iptu || 0).toString().replace('.', ','));
            setGasBillText((initialData.gasBill || 0).toString().replace('.', ','));
            setRentDescription(initialData.rentDescription || 'Aluguel');
        } else {
            setOwnerId(''); setTenantName(''); setTenantCpf(''); setTenantRgCnh(''); setPropertyName('');
            setRentAmountText(''); setDueDay(''); setContractDate(''); setRefNumber('');
            setWaterBillText('0'); setCondoFeeText('0'); setIptuText('0'); setGasBillText('0'); setRentDescription('Aluguel');
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const rentAmount = parseFloat(rentAmountText.replace(',', '.'));
        const waterBill = parseFloat(waterBillText.replace(',', '.')) || 0;
        const condoFee = parseFloat(condoFeeText.replace(',', '.')) || 0;
        const iptu = parseFloat(iptuText.replace(',', '.')) || 0;
        const gasBill = parseFloat(gasBillText.replace(',', '.')) || 0;

        if (!ownerId || !refNumber || !tenantName || !propertyName || isNaN(rentAmount) || rentAmount <= 0 || !dueDay) {
            showMessage('Preencha campos obrigatórios e valor de aluguel válido.', 'error'); return;
        }

        const selectedOwner = owners.find(o => o.id === ownerId);
        if (!selectedOwner) return;

        onSubmit({
            id: initialData?.id,
            ownerId,
            owner: selectedOwner.name,
            ownerAdminFeePercentage: selectedOwner.adminFeePercentage,
            tenantName, tenantCpf, tenantRgCnh, propertyName,
            rentAmount, dueDay: parseInt(dueDay), contractDate, refNumber,
            waterBill, condoFee, iptu, gasBill,
            otherItems: initialData?.otherItems || [],
            ownerItems: initialData?.ownerItems || [],
            lastAdjustmentYear: initialData?.lastAdjustmentYear || null,
            rentDescription: rentDescription || 'Aluguel'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Aluguel' : 'Novo Aluguel'}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gray-50 p-6 rounded-2xl shadow-inner max-h-[70vh] overflow-y-auto">
                <div className="md:col-span-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">REF.</label><input type="text" value={refNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefNumber(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" required /></div>
                <div className="md:col-span-3"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Proprietário</label><select value={ownerId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOwnerId(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none bg-white" required><option value="">Selecione</option>{owners.map(owner => (<option key={owner.id} value={owner.id}>{owner.name}</option>))}</select></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Inquilino</label><input type="text" value={tenantName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantName(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" required /></div>
                <div className="md:col-span-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CPF Inquilino</label><input type="text" value={tenantCpf} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantCpf(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" /></div>
                <div className="md:col-span-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">RG/CNH</label><input type="text" value={tenantRgCnh} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTenantRgCnh(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" /></div>
                <div className="md:col-span-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereço</label><input type="text" value={propertyName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyName(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none" required /></div>
                <div className="md:col-span-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Descrição</label><input type="text" value={rentDescription} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentDescription(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-indigo-700" /></div>
                <div className="md:col-span-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venc.</label><select value={dueDay} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDueDay(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none bg-white font-bold" required> <option value="">Dia</option>{Array.from({ length: 31 }, (_, i) => i + 1).map(day => (<option key={day} value={day}>{day}</option>))}</select></div>
                <div className="md:col-span-1"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Data Contrato</label><input type="date" value={contractDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContractDate(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 outline-none bg-white" /></div>
                <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Aluguel (R$)</label><input type="text" value={rentAmountText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRentAmountText(e.currentTarget.value)} className="w-full p-3 border border-indigo-200 bg-indigo-50 rounded-xl outline-none font-black text-indigo-700 text-lg" placeholder="2500,00" required /></div>
                <div className="md:col-span-1 border-t pt-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Água</label><input type="text" value={waterBillText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWaterBillText(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none" /></div>
                <div className="md:col-span-1 border-t pt-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cond.</label><input type="text" value={condoFeeText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCondoFeeText(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none" /></div>
                <div className="md:col-span-1 border-t pt-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">IPTU</label><input type="text" value={iptuText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIptuText(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none" /></div>
                <div className="md:col-span-1 border-t pt-4"><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">GÁS</label><input type="text" value={gasBillText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGasBillText(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-xl outline-none" /></div>
                <div className="md:col-span-4 flex justify-end gap-3 mt-4 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-8 py-3 bg-white border border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-gray-50 transition-all">Cancelar</button>
                    <button type="submit" className="px-8 py-3 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-indigo-100 hover:scale-105 transition-all">Confirmar e Salvar</button>
                </div>
            </form>
        </Modal>
    );
};