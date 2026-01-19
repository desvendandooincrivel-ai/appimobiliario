
import React, { useMemo } from 'react';
import { Owner, Rental, SortState } from '../types';
import { Edit, Trash2, FileText, DollarSign, FileDown, Percent } from 'lucide-react';
import { FinancialSummary } from './FinancialSummary';
import { IconeMais, SortIcon } from './Icons';
import { getSortValue } from '../utils/helpers';

interface OwnerListProps {
    owners: Owner[];
    onEdit: (owner: Owner) => void;
    onDelete: (id: string) => void;
    onGenerateStatement: (id: string) => void;
    onOpenPixConfig: () => void;
}

export const OwnerList: React.FC<OwnerListProps> = ({ owners, onEdit, onDelete, onGenerateStatement, onOpenPixConfig }) => (
    <div className="overflow-x-auto mt-4 bg-white p-6 rounded-xl shadow-lg">
        <div className="flex justify-end mb-4">
            <button onClick={onOpenPixConfig} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700">
                <DollarSign size={18} className="mr-2" /> Configurar PIX
            </button>
        </div>
        {owners.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {['Nome', 'CPF', 'Taxa Adm. (%)', 'Ações'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {owners.map(owner => (
                        <tr key={owner.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm font-medium border">{owner.name}</td>
                            <td className="px-3 py-2 text-sm border">{owner.cpf}</td>
                            <td className="px-3 py-2 text-sm border">{owner.adminFeePercentage}%</td>
                            <td className="px-3 py-2 text-right text-sm font-medium space-x-2 border">
                                <button onClick={() => onGenerateStatement(owner.id)} className="text-green-600 hover:text-green-900"><FileText size={18} /></button>
                                <button onClick={() => onEdit(owner)} className="text-blue-600 hover:text-blue-900"><Edit size={18} /></button>
                                <button onClick={() => onDelete(owner.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        ) : <p className="text-center text-gray-600 mt-4">Nenhum proprietário cadastrado.</p>}
    </div>
);

interface RentalListProps {
    title: string;
    rentals: Rental[];
    onEdit: (rental: Rental) => void;
    onDelete: (id: string) => void;
    onUpdateRental: (id: string, fields: Partial<Rental>) => void;
    showSummary?: boolean;
    onOpenItemsModal: (config: { rental: Rental; itemType: 'owner' | 'tenant' }) => void;
    onGerarBoleto: (rental: Rental) => void;
    libsLoaded: boolean;
    onAplicarMulta: (rental: Rental) => void;
    sortState: SortState;
    onSort: (col: string) => void;
    owners: Owner[];
    showMessage: (msg: string, type: 'success' | 'error') => void;
}

export const RentalList: React.FC<RentalListProps> = ({
    title, rentals, onEdit, onDelete, onUpdateRental, showSummary = true,
    onOpenItemsModal, onGerarBoleto, libsLoaded, onAplicarMulta, sortState, onSort, owners, showMessage
}) => {
    const sortedRentals = useMemo(() => {
        if (!sortState.column) return rentals;
        return [...rentals].sort((a, b) => {
            const aVal = getSortValue(a, sortState.column);
            const bVal = getSortValue(b, sortState.column);
            if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [rentals, sortState]);

    const copyToClipboard = (text: string) => {
        (navigator as any).clipboard.writeText(text).then(() => showMessage('Copiado!', 'success')).catch(() => showMessage('Erro ao copiar', 'error'));
    };

    const calculateTotals = (rental: Rental) => {
        const otherTotal = (rental.otherItems || []).reduce((s, i) => s + i.amount, 0);
        const ownerTotal = (rental.ownerItems || []).reduce((s, i) => s + i.amount, 0);
        const rent = rental.rentAmount || 0;
        const charges = (rental.waterBill || 0) + (rental.condoFee || 0) + (rental.iptu || 0) + (rental.gasBill || 0);
        const totalGeral = rent + charges + otherTotal;

        const admPct = rental.ownerAdminFeePercentage ?? 10;
        const txAdm = rent * (admPct / 100);
        const bankFee = (rental.otherItems || []).find(i => i.description.toLowerCase().includes('tarifa'))?.amount || 0;

        return {
            totalGeral: totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            txAdm: txAdm.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            totalRepasse: (totalGeral - txAdm - bankFee + ownerTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            totalOutrosInq: otherTotal,
            totalOutrosProp: ownerTotal
        };
    };

    const getStatus = (rental: Rental) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const monthIndex = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].indexOf(rental.month);
        if (monthIndex === -1 || !rental.dueDay) return { text: 'Inválido', badge: 'bg-gray-200', row: '' };

        const due = new Date(rental.year, monthIndex, rental.dueDay);
        if (rental.isTransferred) return { text: 'Repassado', badge: 'bg-gray-200 text-gray-700', row: 'bg-gray-100 text-gray-500' };
        if (rental.isPaid) return { text: 'Pago', badge: 'bg-green-100 text-green-800', row: 'bg-green-50' };
        if (due < today) return { text: 'Atrasado', badge: 'bg-red-100 text-red-800', row: 'bg-red-50' };
        return { text: 'Pendente', badge: 'bg-yellow-100 text-yellow-800', row: 'bg-white text-gray-900' };
    };

    const renderHeader = (label: string, key?: string) => {
        const isSortable = !!key;
        const stickyClass = label === 'REF.' ? 'sticky left-0 bg-gray-50 z-20 shadow-md border-r' : '';
        return (
            <th key={label} className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border ${stickyClass} ${isSortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => key && onSort(key)}>
                <div className="flex items-center group whitespace-nowrap">{label} {isSortable && <SortIcon column={key} sortColumn={sortState.column} sortDirection={sortState.direction} />}</div>
            </th>
        );
    };

    const notTransferredRentals = sortedRentals.filter(r => !r.isTransferred);
    const transferredRentals = sortedRentals.filter(r => r.isTransferred);

    const renderTable = (data: Rental[], tableTitle?: string, bgColor: string = 'bg-white') => {
        if (data.length === 0 && !tableTitle) return <div className="text-center text-gray-500 py-4">Nenhum registro.</div>;
        if (data.length === 0) return null;

        return (
            <div className={`overflow-x-scroll overflow-y-auto max-h-[600px] border-t force-scrollbar-x mb-8 rounded-xl shadow-sm ${bgColor}`}>
                {tableTitle && <h4 className="p-4 font-bold text-lg bg-gray-50 border-b text-gray-700 uppercase tracking-wide">{tableTitle} ({data.length})</h4>}
                <table className="min-w-full divide-y divide-gray-200 table-auto border-separate border-spacing-0">
                    <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
                        <tr>
                            {renderHeader('REF.', 'refNumber')}
                            {renderHeader('Proprietário', 'owner')}
                            {renderHeader('Inquilino', 'tenantName')}
                            {['Endereço', 'Dia Venc.', 'Aluguel', 'Água', 'Cond.', 'IPTU', 'Gás', 'Outros (Inq.)', 'Total Geral', 'Tx Adm.', 'Outros (Prop.)', 'Total Repasse', 'Sinalização', 'Status', 'Ações', 'Copiar'].map(h => renderHeader(h))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {data.map(rental => {
                            const status = getStatus(rental);
                            const totals = calculateTotals(rental);
                            return (
                                <tr key={rental.id} className={`transition-colors duration-200 ${status.row} hover:bg-opacity-80`}>
                                    <td className={`px-3 py-2 text-sm font-medium border-b border-r sticky left-0 z-20 ${status.row} shadow-sm whitespace-nowrap`}>{`LF ${rental.refNumber}`}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap">{rental.owner}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap">{rental.tenantName}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r min-w-[200px]">{rental.propertyName}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r text-center">{rental.dueDay}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span>R$ {rental.rentAmount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            {rental.rentDescription !== 'Aluguel' && <span className="text-xs text-purple-600" title={rental.rentDescription}>{rental.rentDescription?.substring(0, 25)}...</span>}
                                        </div>
                                    </td>
                                    {['waterBill', 'condoFee', 'iptu', 'gasBill'].map(f => (
                                        // @ts-ignore
                                        <td key={f} className="px-3 py-2 text-sm border-b border-r whitespace-nowrap text-right">R$ {(rental[f] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    ))}
                                    <td className="px-3 py-2 text-sm border-b border-r">
                                        <div className="flex items-center space-x-2 whitespace-nowrap">
                                            <button onClick={() => onOpenItemsModal({ rental, itemType: 'tenant' })} className="text-blue-600 hover:bg-blue-100 rounded-full p-1"><IconeMais /></button>
                                            <div className="flex flex-col">
                                                <span className={totals.totalOutrosInq < 0 ? 'text-red-600' : ''}>R$ {totals.totalOutrosInq.toFixed(2).replace('.', ',')}</span>
                                                {rental.otherItems?.length > 0 && <span className="text-xs text-gray-500">({rental.otherItems.length})</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-bold border-b border-r whitespace-nowrap text-right">R$ {totals.totalGeral}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap text-right">R$ {totals.txAdm} ({rental.ownerAdminFeePercentage ?? 10}%)</td>
                                    <td className="px-3 py-2 text-sm border-b border-r">
                                        <div className="flex items-center space-x-2 whitespace-nowrap">
                                            <button onClick={() => onOpenItemsModal({ rental, itemType: 'owner' })} className="text-purple-600 hover:bg-purple-100 rounded-full p-1"><IconeMais /></button>
                                            <div className="flex flex-col">
                                                <span className={totals.totalOutrosProp < 0 ? 'text-red-600' : ''}>R$ {totals.totalOutrosProp.toFixed(2).replace('.', ',')}</span>
                                                {rental.ownerItems?.length > 0 && <span className="text-xs text-gray-500">({rental.ownerItems.length})</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm font-bold text-blue-800 border-b border-r whitespace-nowrap text-right">R$ {totals.totalRepasse}</td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap">
                                        <div className="flex space-x-2">
                                            <label className="flex items-center cursor-pointer"><input type="checkbox" checked={rental.isPaid} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateRental(rental.id, { isPaid: e.currentTarget.checked })} className="h-4 w-4 text-green-600" /><span className="text-xs ml-1">Pago</span></label>
                                            <label className="flex items-center cursor-pointer"><input type="checkbox" checked={rental.isTransferred} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateRental(rental.id, { isTransferred: e.currentTarget.checked })} className="h-4 w-4 text-purple-600" /><span className="text-xs ml-1">Rep.</span></label>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap"><span className={`px-2 rounded-full text-xs font-semibold ${status.badge}`}>{status.text}</span></td>
                                    <td className="px-3 py-2 text-right space-x-1 border-b border-r whitespace-nowrap flex">
                                        <button onClick={() => onGerarBoleto(rental)} disabled={!libsLoaded} className={`p-1 ${!libsLoaded ? 'text-gray-400' : 'text-red-600 hover:text-red-900'}`} title="PDF"><FileDown size={18} /></button>

                                        <button onClick={() => onEdit(rental)} className="p-1 text-blue-600 hover:text-blue-900"><Edit size={18} /></button>
                                        <button onClick={() => onDelete(rental.id)} className="p-1 text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                    </td>
                                    <td className="px-3 py-2 text-sm border-b border-r whitespace-nowrap">
                                        <button onClick={() => copyToClipboard(`Repasse p/ ${rental.owner} (LF ${rental.refNumber} ${rental.tenantName}) R$${totals.totalRepasse}`)} className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">Copiar</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border mb-4 flex flex-col h-full bg-gray-50/50">
            {title && <h3 className="text-2xl font-bold text-gray-800 p-4 bg-white border-b text-center rounded-t-2xl shadow-sm">{title}</h3>}
            {showSummary && <div className="p-4 bg-white"><FinancialSummary rentals={rentals} owners={owners} /></div>}

            <div className="flex-1 p-4 space-y-6">
                {renderTable(notTransferredRentals, 'Pendentes / Não Repassados')}

                {transferredRentals.length > 0 && (
                    <div className="opacity-75 hover:opacity-100 transition-opacity">
                        {renderTable(transferredRentals, 'Já Repassados (Histórico)', 'bg-gray-100')}
                    </div>
                )}
            </div>
        </div>
    );
};
