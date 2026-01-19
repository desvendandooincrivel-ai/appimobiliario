
import { Rental, Owner, PixConfig } from '../types';
import { DEFAULT_COMPANY_NAME, DEFAULT_COMPANY_DOC } from './constants';
import { formatBRL } from './helpers';

export function generateRepasseListHTML(selectedRentals: Rental[], allOwners: Owner[], month: string, year: number) {
    const groupedByOwner = selectedRentals.reduce((acc, rental) => {
        if (!acc[rental.ownerId]) {
            acc[rental.ownerId] = {
                ownerData: allOwners.find(o => o.id === rental.ownerId),
                rentals: []
            };
        }
        acc[rental.ownerId].rentals.push(rental);
        return acc;
    }, {} as Record<string, { ownerData: Owner | undefined, rentals: Rental[] }>);

    let grandTotalRepasse = 0;
    let grandTotalAluguel = 0;
    let grandTotalEncargos = 0;
    let grandTotalGeral = 0;
    let grandTotalTxAdm = 0;
    let tablesHTML = '';

    for (const ownerId in groupedByOwner) {
        const group = groupedByOwner[ownerId];
        const owner = group.ownerData || { name: 'Proprietário Desconhecido', bankDetails: '', pixKey: '' } as Owner;

        let ownerTotalAluguel = 0;
        let ownerTotalEncargos = 0;
        let ownerTotalGeral = 0;
        let ownerTotalTxAdm = 0;
        let ownerTotalRepasse = 0;

        const rentalRowsHTML = group.rentals.map(rental => {
            const otherItemsTotal = (rental.otherItems || []).reduce((sum, item) => sum + item.amount, 0);
            const encargos = (rental.waterBill || 0) + (rental.condoFee || 0) + (rental.iptu || 0) + (rental.gasBill || 0) + otherItemsTotal;
            const rent = rental.rentAmount || 0;
            const totalGeral = rent + encargos;

            const adminFeePercentage = rental.ownerAdminFeePercentage !== undefined ? rental.ownerAdminFeePercentage : (owner.adminFeePercentage || 10);

            const itensQueCompoemBaseTxAdm = (rental.otherItems || []).reduce((sum, item) => {
                if (item.amount > 0 && !item.description.toLowerCase().includes('tarifa')) {
                    return sum + item.amount;
                }
                return sum;
            }, 0);

            const baseTxAdm = rent + itensQueCompoemBaseTxAdm;
            const txAdm = baseTxAdm * (adminFeePercentage / 100);

            const bankFee = (rental.otherItems || []).find(item => item.description.toLowerCase().includes('tarifa'))?.amount || 0;
            const ownerItemsTotal = (rental.ownerItems || []).reduce((sum, item) => sum + item.amount, 0);

            const totalRepasse = totalGeral - txAdm - bankFee + ownerItemsTotal;

            ownerTotalAluguel += rent;
            ownerTotalEncargos += encargos;
            ownerTotalGeral += totalGeral;
            ownerTotalTxAdm += txAdm;
            ownerTotalRepasse += totalRepasse;

            return `
                <tr>
                    <td>LF ${rental.refNumber}</td>
                    <td>${rental.tenantName}</td>
                    <td>${formatBRL(rent)}</td>
                    <td>${formatBRL(encargos)}</td>
                    <td>${formatBRL(totalGeral)}</td>
                    <td>${formatBRL(txAdm)}</td>
                    <td>${formatBRL(totalRepasse)}</td>
                </tr>
            `;
        }).join('');

        grandTotalAluguel += ownerTotalAluguel;
        grandTotalEncargos += ownerTotalEncargos;
        grandTotalGeral += ownerTotalGeral;
        grandTotalTxAdm += ownerTotalTxAdm;
        grandTotalRepasse += ownerTotalRepasse;

        tablesHTML += `
            <div class="owner-group">
                <div class="owner-header">
                    <h3>${owner.name}</h3>
                    <div class="owner-details">
                        <span><strong>Dados Bancários:</strong> ${owner.bankDetails || 'N/A'}</span>
                        <span><strong>Chave PIX:</strong> ${owner.pixKey || 'N/A'}</span>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Ref.</th>
                            <th>Inquilino</th>
                            <th>Aluguel</th>
                            <th>Encargos (Inclui Outros Itens Inquilino)</th>
                            <th>Total Geral</th>
                            <th>Tx. Adm.</th>
                            <th>Total Repasse</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rentalRowsHTML}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" class="text-right total-label">Total Proprietário:</td>
                            <td>${formatBRL(ownerTotalAluguel)}</td>
                            <td>${formatBRL(ownerTotalEncargos)}</td>
                            <td>${formatBRL(ownerTotalGeral)}</td>
                            <td>${formatBRL(ownerTotalTxAdm)}</td>
                            <td>${formatBRL(ownerTotalRepasse)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Lista de Repasse - ${month} ${year}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9f9f9; font-size: 10pt; }
                .container { max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                h1 { text-align: center; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
                .owner-group { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
                .owner-header { background-color: #f5f5f5; padding: 10px 15px; border-bottom: 1px solid #ddd; }
                .owner-header h3 { margin: 0; font-size: 14pt; color: #003366; }
                .owner-details { display: flex; justify-content: space-between; font-size: 9pt; color: #555; padding-top: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 0; }
                th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                th { background-color: #fafafa; font-size: 9pt; text-transform: uppercase; }
                td { vertical-align: top; }
                tbody tr:nth-child(even) { background-color: #fdfdfd; }
                tfoot tr { background-color: #f0f0f0; font-weight: bold; }
                tfoot td { font-size: 11pt; }
                .total-label { text-align: right; font-weight: bold; }
                .grand-total { margin-top: 20px; padding: 15px; background-color: #003366; color: white; border-radius: 8px; }
                .grand-total h2 { margin: 0; text-align: center; font-size: 16pt; }
                .grand-total-details { display: flex; justify-content: space-around; margin-top: 10px; font-size: 12pt; }
                .text-right { text-align: right; }
                .print-button { display: block; margin: 20px auto; padding: 10px 20px; font-size: 14px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; }
                @media print {
                    .no-print { display: none; }
                    body { margin: 0.5in; background-color: #fff; }
                    .container { box-shadow: none; margin: 0; padding: 0; }
                    .owner-group { border: 1px solid #ccc; page-break-inside: avoid; }
                    th, td { font-size: 9pt; padding: 4px 6px; }
                    tfoot td { font-size: 10pt; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <button class="no-print print-button" onclick="window.print()">Imprimir Lista</button>
                <h1>Lista de Repasse - ${month} ${year}</h1>
                ${tablesHTML}
                <div class="grand-total">
                    <h2>Total Geral do Repasse: ${formatBRL(grandTotalRepasse)}</h2>
                    <div class="grand-total-details">
                        <span><strong>Total Aluguéis:</strong> ${formatBRL(grandTotalAluguel)}</span>
                        <span><strong>Total Encargos:</strong> ${formatBRL(grandTotalEncargos)}</span>
                        <span><strong>Total Geral:</strong> ${formatBRL(grandTotalGeral)}</span>
                        <span><strong>Total Tx. Adm.:</strong> ${formatBRL(grandTotalTxAdm)}</span>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

export function generateConsolidatedStatementHTML(groupedRentals: Record<string, Rental[]>, allOwners: Owner[], month: string, year: number, pixConfig: PixConfig, statementNotes: string) {
    let fullHtml = '';

    const companyName = pixConfig?.name || DEFAULT_COMPANY_NAME;
    const companyDoc = pixConfig?.doc || DEFAULT_COMPANY_DOC;

    for (const ownerId in groupedRentals) {
        const owner = allOwners.find(o => o.id === ownerId);

        if (!owner) {
            console.warn(`Proprietário com ID ${ownerId} não encontrado. Ignorando.`);
            continue;
        }

        const adminFeePercentage = owner.adminFeePercentage || 0;
        const rentalsForOwner = groupedRentals[ownerId];
        let totalGrossReceipts = 0;
        let totalAdminFees = 0;
        let totalOwnerAdjustments = 0;
        let totalTenantDiscounts = 0;

        const propertyCardsAndBreaks = rentalsForOwner.map((rental, index) => {
            const rentalAdminFeePercentage = rental.ownerAdminFeePercentage !== undefined ? rental.ownerAdminFeePercentage : (owner?.adminFeePercentage || 10);

            const baseRent = rental.rentAmount || 0;
            const baseCharges = (rental.waterBill || 0) + (rental.condoFee || 0) + (rental.iptu || 0) + (rental.gasBill || 0);

            let ownerItemsHTML = '';
            let rentalOtherItemsTotal = 0;
            let itensQueCompoemBaseTxAdm = 0;
            let tarifas = 0;

            (rental.otherItems || []).forEach(item => {
                rentalOtherItemsTotal += item.amount;
                if (item.amount > 0 && !item.description.toLowerCase().includes('tarifa')) {
                    itensQueCompoemBaseTxAdm += item.amount;
                } else if (item.description.toLowerCase().includes('tarifa')) {
                    tarifas += item.amount;
                }
            });

            totalTenantDiscounts += tarifas;

            let rentalOwnerItemsTotal = 0;
            (rental.ownerItems || []).forEach(item => {
                rentalOwnerItemsTotal += item.amount;
                ownerItemsHTML += `
                    <div class="report-detail-row">
                        <span>${item.description} (Proprietário)</span> 
                        <span style="${item.amount < 0 ? 'color: red;' : ''}">${formatBRL(item.amount)}</span>
                    </div>`;
            });

            const baseTxAdm = baseRent + itensQueCompoemBaseTxAdm;
            const adminFeeTotal = baseTxAdm * (rentalAdminFeePercentage / 100);

            const totalInquilinoPago = baseRent + baseCharges + rentalOtherItemsTotal;
            const subTotal = totalInquilinoPago - adminFeeTotal + rentalOwnerItemsTotal - tarifas;

            totalGrossReceipts += baseRent + baseCharges + itensQueCompoemBaseTxAdm;
            const totalGrossReceiptsCurrent = baseRent + baseCharges + itensQueCompoemBaseTxAdm;
            totalAdminFees += adminFeeTotal;
            totalOwnerAdjustments += rentalOwnerItemsTotal;

            const rentLabel = rental.rentDescription || 'Aluguel Recebido';

            const cardHTML = `
                <div class="report-property-card">
                    <p class="report-card-header"><strong>Imóvel:</strong> LF ${rental.refNumber} - ${rental.propertyName}</p>
                    <p class="report-card-subheader"><strong>Inquilino:</strong> ${rental.tenantName}</p>
                    <hr class="report-card-divider" />
                    
                    <div class="section-title">Créditos e Receitas</div>
                    <div class="report-detail-row"><span>${rentLabel}</span> <span>${formatBRL(baseRent)}</span></div>
                    ${(rental.waterBill || 0) > 0 ? `<div class="report-detail-row"><span>Água</span> <span>${formatBRL(rental.waterBill)}</span></div>` : ''}
                    ${(rental.condoFee || 0) > 0 ? `<div class="report-detail-row"><span>Condomínio</span> <span>${formatBRL(rental.condoFee)}</span></div>` : ''}
                    ${(rental.iptu || 0) > 0 ? `<div class="report-detail-row"><span>IPTU</span> <span>${formatBRL(rental.iptu)}</span></div>` : ''}
                    ${(rental.gasBill || 0) > 0 ? `<div class="report-detail-row"><span>Gás</span> <span>${formatBRL(rental.gasBill)}</span></div>` : ''}
                    
                    ${(rental.otherItems || []).filter(item => !item.description.toLowerCase().includes('tarifa')).map(item => `
                        <div class="report-detail-row">
                           <span>${item.description}</span>
                           <span style="${item.amount < 0 ? 'color: red;' : ''}">${formatBRL(item.amount)}</span>
                        </div>
                    `).join('')}
                    
                    <div class="report-detail-row" style="border-top: 1px dotted #ccc; margin-top: 4px; padding-top: 2px;">
                        <strong>Total Créditos</strong>
                        <strong>${formatBRL(totalGrossReceiptsCurrent)}</strong>
                    </div>

                    <div class="section-title deduction-title">Deduções e Débitos</div>
                    
                    <div class="report-detail-row">
                        <span>Taxa de Administração (${rentalAdminFeePercentage}%)</span> 
                        <span style="color: red;">-${formatBRL(adminFeeTotal)}</span>
                    </div>
                    
                    ${(rental.otherItems || []).filter(item => item.description.toLowerCase().includes('tarifa')).map(item => `
                        <div class="report-detail-row"><span>${item.description}</span> <span style="color: red;">${formatBRL(item.amount)}</span></div>
                    `).join('')}
                    
                    ${rentalOwnerItemsTotal !== 0 ? `
                        <div class="section-title adjustment-title">Ajustes / Outros</div>
                        ${ownerItemsHTML}
                    ` : ''}
                    
                    <div class="report-subtotal-line"></div>
                    <div class="report-detail-row report-subtotal">
                        <strong>Líquido do Imóvel</strong>
                        <strong>${formatBRL(subTotal)}</strong>
                    </div>
                </div>
            `;

            if ((index + 1) % 8 === 0 && (index + 1) < rentalsForOwner.length) {
                return cardHTML + '<div class="page-break"></div>';
            }
            return cardHTML;
        }).join('');

        const totalBalance = totalGrossReceipts + totalTenantDiscounts - totalAdminFees + totalOwnerAdjustments;

        fullHtml += `
            <div class="report-main-container">
                <table class="report-header-table">
                    <tr>
                        <td style="width:60%;">
                            <div class="company-logo-report">${companyName}</div>
                            <div>${companyDoc}</div>
                        </td>
                        <td style="width:40%; text-align:right;">
                            <div>Emissão: ${new Date().toLocaleString('pt-BR')}</div>
                            <div style="background-color:#e9e9e9; padding: 4px 6px; margin-top:5px; display:inline-block; border-radius:3px; font-weight:bold;">${month.substring(0, 3).toUpperCase()}-${year.toString().substring(2)}</div>
                        </td>
                    </tr>
                    <tr><td colspan="2" style="padding-top:12px;">Proprietário: <span style="font-weight:bold;">${owner.name || 'N/A'}</span></td></tr>
                </table>
                <div class="document-main-title-report">Demonstrativo de Prestação de Contas</div>
                
                <div class="report-cards-area-single-column">${propertyCardsAndBreaks}</div> 
                
                <div class="report-sub-total-section">
                    <h3 class="sub-total-title-report">Total Consolidado do Período</h3>
                    <div class="report-detail-row"> 
                        <span>Total de Receitas Brutas (Aluguéis + Encargos + Multas/Juros)</span>
                        <span>${formatBRL(totalGrossReceipts)}</span>
                    </div>
                    <div class="report-detail-row">
                        <span>Total de Descontos/Tarifas Inquilino</span>
                        <span style="color: red;">${formatBRL(totalTenantDiscounts)}</span>
                    </div>
                    <div class="report-detail-row">
                        <span>Total Taxa de Administração (${adminFeePercentage}%)</span>
                        <span style="color: red;">-${formatBRL(totalAdminFees)}</span>
                    </div>
                    <div class="report-detail-row">
                        <span>Total Ajustes Repasse Proprietário</span>
                        <span style="${totalOwnerAdjustments < 0 ? 'color: red;' : ''}">${formatBRL(totalOwnerAdjustments)}</span>
                    </div>
                </div>
                <table class="report-footer-summary">
                    <tr>
                        <td class="total-geral-label-report">SALDO PROPRIETÁRIO (Total Geral a Repassar)</td>
                        <td class="total-geral-value-report">${formatBRL(totalBalance)}</td>
                    </tr>
                </table>
                
                <div class="report-transfer-details-section">
                    <h3 class="transfer-title">Detalhes para Repasse</h3>
                    <div class="report-detail-row">
                        <span><strong>Conta Bancária:</strong></span>
                        <span style="text-align:right;">${owner.bankDetails || 'Não informado'}</span>
                    </div>
                    <div class="report-detail-row">
                        <span><strong>Chave PIX:</strong></span>
                        <span style="text-align:right;">${owner.pixKey || 'Não informado'}</span>
                    </div>
                </div>
                
                ${statementNotes ? `
                    <div class="report-notes-section">
                        <h3 class="notes-title">OBSERVAÇÕES</h3>
                        <p class="notes-content">${statementNotes.replace(/\n/g, '<br>')}</p>
                    </div>
                ` : ''}
                <div class="generation-timestamp">Gerado em ${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}</div>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Prestação de Contas Consolidada</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; background-color: #f4f4f4; color: #333; }
                .report-main-container { max-width: 800px; margin: 20px auto; padding: 20px; background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .report-header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; } 
                .report-header-table td { padding: 1px; font-size: 8pt; vertical-align: top; } 
                .company-logo-report { font-size: 14pt; font-weight: bold; color: #003366; font-family: 'Georgia', serif; } 
                .document-main-title-report { font-size: 12pt; font-weight: bold; text-align:center; margin: 15px 0; text-transform: uppercase; color: #333; border-bottom: 2px solid #333; padding-bottom: 4px;}
                .report-cards-area-single-column { columns: 1; column-gap: 0; } 
                .report-property-card { border: 1px solid #e0e0e0; padding: 5px; margin-bottom: 10px; border-radius: 4px; background-color: #fafafa; break-inside: avoid; }
                .report-card-header { font-size: 8pt; font-weight:bold; margin: 0 0 2px 0; color: #003366; }
                .report-card-subheader { font-size: 8pt; margin: 0 0 4px 0; }
                .report-card-divider { margin: 4px 0; border: 0; border-top: 1px solid #eee; }
                .report-detail-row { display: flex; justify-content: space-between; font-size: 8pt; line-height: 1.2; padding: 1px 0; }
                .section-title { font-size: 9pt; font-weight: bold; margin-top: 6px; margin-bottom: 2px; border-bottom: 1px dashed #ccc; color: #555; }
                .deduction-title { color: #880000; border-bottom: 1px dashed #fcc; }
                .adjustment-title { color: #006600; border-bottom: 1px dashed #ccf; }
                .report-subtotal-line { width: 45%; margin-left: auto; margin-right: 0; border-top: 2px solid #003366; margin-top: 4px; margin-bottom: 2px; }
                .report-subtotal strong { font-weight: bold; font-size: 9pt; color: #003366; }
                .report-sub-total-section { margin-top: 15px; padding: 8px; font-size: 9pt; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; background-color: #f9f9f9;}
                .sub-total-title-report { font-size: 10pt; font-weight: bold; margin-bottom: 5px; }
                .report-footer-summary { width: 100%; margin-top: 10px; border-top: 2px solid #333; padding-top: 8px; }
                .report-footer-summary td { padding: 4px; font-size: 9pt; }
                .total-geral-label-report { font-weight: bold; text-align: right; }
                .total-geral-value-report { font-size: 11pt; font-weight: bold; background-color: #f0f0f0; text-align: right; }
                .report-transfer-details-section { margin-top: 15px; padding: 10px; border: 1px solid #003366; border-radius: 4px; background-color: #e6f0ff; }
                .transfer-title { font-size: 10pt; font-weight: bold; margin-bottom: 5px; border-bottom: 1px dashed #003366; padding-bottom: 3px; color: #003366; }
                .report-notes-section { margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background-color: #fcfcfc; }
                .notes-title { font-size: 10pt; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 3px; }
                .notes-content { font-size: 9pt; line-height: 1.4; white-space: pre-wrap; }
                .generation-timestamp { margin-top: 15px; font-size: 7pt; text-align: center; color: #888; }
                .print-button { display: block; margin: 20px auto; padding: 10px 20px; font-size: 14px; cursor: pointer; background-color: #4CAF50; color: white; border: none; border-radius: 5px; }
                .page-break { page-break-after: always; }
                @media print {
                    .no-print { display: none; }
                    body { margin: 0.5in; background-color: #fff; }
                    .report-main-container { box-shadow: none; margin: 0; }
                    .report-cards-area-single-column { columns: 1 !important; }
                }
            </style>
        </head>
        <body>
            <button class="no-print print-button" onclick="window.print()">Imprimir</button>
            ${fullHtml}
        </body>
        </html>
    `;
}
