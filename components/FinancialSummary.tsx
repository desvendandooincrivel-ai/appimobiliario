
import React from 'react';
import { Rental, Owner } from '../types';

interface FinancialSummaryProps {
    rentals: Rental[];
    owners?: Owner[]; // Optional for fallback lookups
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({ rentals, owners = [] }) => {
    const summary = rentals.reduce((acc, rental) => {
        const rent = rental.rentAmount || 0;
        // Lookup owner for default percentage if rental doesn't have it explicitly set
        const adminFeePercentage = rental.ownerAdminFeePercentage !== undefined 
            ? rental.ownerAdminFeePercentage 
            : (owners.find(o => o.id === rental.ownerId)?.adminFeePercentage || 10);
        
        const itensQueCompoemBaseTxAdm = (rental.otherItems || []).reduce((sum, item) => {
            if (item.amount > 0 && !item.description.toLowerCase().includes('tarifa')) {
                return sum + item.amount;
            }
            return sum;
        }, 0);
        
        const baseTxAdm = rent + itensQueCompoemBaseTxAdm;
        const txAdm = baseTxAdm * (adminFeePercentage / 100);
        
        const otherItemsTotal = (rental.otherItems || []).reduce((sum, item) => sum + item.amount, 0);
        const totalReceived = rent + (rental.waterBill || 0) + (rental.condoFee || 0) + (rental.iptu || 0) + (rental.gasBill || 0) + otherItemsTotal;
        
        if (rental.isPaid) { 
            acc.totalPaid += totalReceived; 
            acc.totalAdminFee += txAdm; 
        }
        
        if (rental.isTransferred) { 
            const bankFee = (rental.otherItems || []).find(item => item.description.toLowerCase().includes('tarifa'))?.amount || 0;
            const ownerItemsTotal = (rental.ownerItems || []).reduce((sum, item) => sum + item.amount, 0);
            
            const totalToTransfer = totalReceived - txAdm - bankFee + ownerItemsTotal;
            acc.totalTransferred += totalToTransfer; 
        }
        return acc;
    }, { totalPaid: 0, totalTransferred: 0, totalAdminFee: 0 });

    const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg my-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase">Total Recebido (Pago)</h4>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase">Total Repassado</h4>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(summary.totalTransferred)}</p>
            </div>
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase">Lucro (Taxa Adm.)</h4>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.totalAdminFee)}</p>
            </div>
        </div>
    );
};
