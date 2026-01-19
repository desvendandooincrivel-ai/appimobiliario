import { Rental, Owner, PixConfig } from '../types';
import { formatBRL } from './helpers';

export const DEFAULT_COMPANY_NAME = 'Jobh Imóveis';
export const DEFAULT_COMPANY_DOC = 'CRECI-RJ: 31.387';
export const DEFAULT_COMPANY_PIX_KEY = 'jobh.adm@gmail.com';

function calculateCrc16(payload: string) {
  const polynomial = 0x1021;
  let crc = 0xFFFF;

  for (let i = 0; i < payload.length; i++) {
    let charCode = payload.charCodeAt(i);
    if (charCode > 255) {
      console.error("Caractere não-ASCII detectado no payload:", payload[i]);
    }
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = (crc << 1);
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPixPayload(rental: Rental, total: number, pixConfig: PixConfig) {
  if (pixConfig?.pixPayload) {
    // FIX: Only remove carriage returns and newlines, preserve spaces for names in PIX copy/paste
    let customPayload = pixConfig.pixPayload.toString().replace(/[\r\n\t]+/g, '').trim();
    if (customPayload.length === 0) return '';
    if (customPayload.startsWith('000201') && !customPayload.includes('6304')) {
      const payloadStart = customPayload + '6304';
      const crc16 = calculateCrc16(payloadStart);
      return payloadStart + crc16;
    } else if (customPayload.startsWith('000201') && customPayload.length > 4 && customPayload.substring(customPayload.length - 4).match(/^[0-9A-F]{4}$/)) {
      return customPayload;
    }
    return customPayload;
  }
  return '';
}

export function gerarDocumentoPDF(rental: Rental, owners: Owner[], monthOrder: string[], pixConfig: PixConfig) {
  if (!window.jspdf || !window.qrcode) {
    throw new Error('Bibliotecas de PDF/QR não carregadas.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Constants & Colors ---
  const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  const colorPrimary = '#1e40af'; // Blue 800
  const colorSecondary = '#f3f4f6'; // Gray 100
  const colorText = '#1f2937'; // Gray 800
  const colorDanger = '#dc2626'; // Red 600
  const colorBorder = '#e5e7eb'; // Gray 200

  // --- Helpers ---
  const drawLine = (y: number) => {
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // --- Header ---
  doc.setFillColor(colorPrimary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Demonstrativo de Aluguel', margin, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const nomeImobiliaria = pixConfig?.name || DEFAULT_COMPANY_NAME;
  doc.text(nomeImobiliaria, margin, 28);
  doc.text(pixConfig?.doc || DEFAULT_COMPANY_DOC, margin, 33);

  // Ref & Date Header
  doc.setFont('helvetica', 'bold');
  doc.text(`REF: LF ${rental.refNumber}`, pageWidth - margin, 20, { align: 'right' });

  const monthIndex = monthOrder.indexOf(rental.month);
  const dataVencimento = new Date(rental.year, monthIndex, rental.dueDay);
  const dataVencStr = dataVencimento.toLocaleDateString('pt-BR');

  doc.setFontSize(12);
  doc.text(`Vencimento: ${dataVencStr}`, pageWidth - margin, 28, { align: 'right' });

  // --- Info Boxes (Payer/Beneficiary) ---
  let y = 55;

  // Box 1: Beneficiário
  doc.setDrawColor(colorBorder);
  doc.setFillColor(colorSecondary);
  doc.roundedRect(margin, y, (contentWidth / 2) - 5, 35, 3, 3, 'F');
  doc.roundedRect(margin, y, (contentWidth / 2) - 5, 35, 3, 3, 'S');

  doc.setTextColor(colorPrimary);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BENEFICIÁRIO', margin + 5, y + 8);

  doc.setTextColor(colorText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(nomeImobiliaria, margin + 5, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(pixConfig?.doc || DEFAULT_COMPANY_DOC, margin + 5, y + 22);

  // Box 2: Pagador
  const xBox2 = margin + (contentWidth / 2) + 5;
  doc.setFillColor(colorSecondary);
  doc.roundedRect(xBox2, y, (contentWidth / 2) - 5, 35, 3, 3, 'F');
  doc.roundedRect(xBox2, y, (contentWidth / 2) - 5, 35, 3, 3, 'S');

  doc.setTextColor(colorPrimary);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGADOR (INQUILINO)', xBox2 + 5, y + 8);

  doc.setTextColor(colorText);
  doc.setFontSize(10);
  doc.text(rental.tenantName, xBox2 + 5, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (rental.tenantCpf) doc.text(`CPF: ${rental.tenantCpf}`, xBox2 + 5, y + 22);
  doc.text(rental.propertyName, xBox2 + 5, y + (rental.tenantCpf ? 28 : 22), { maxWidth: (contentWidth / 2) - 15 });

  y += 45;

  // --- Financial Details Table ---
  doc.setFontSize(12);
  doc.setTextColor(colorPrimary);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhamento de Valores', margin, y);

  y += 5;

  // Table Header
  doc.setFillColor('#e0e7ff'); // Light Indigo
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setTextColor(colorText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', margin + 5, y + 5.5);
  doc.text('VALOR (R$)', pageWidth - margin - 5, y + 5.5, { align: 'right' });

  y += 8;

  // Items Logic
  let total = 0;
  const addItem = (description: string, amount: number, isDiscount = false) => {
    if (amount === 0) return;

    // Zebra striping
    if (y % 16 !== 0) { // Simple logic for striping based on Y position roughly
      // doc.setFillColor('#fafafa');
      // doc.rect(margin, y, contentWidth, 8, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorText);
    doc.text(description, margin + 5, y + 5.5);

    doc.setFont('helvetica', 'bold');
    if (amount < 0 || isDiscount) doc.setTextColor(colorDanger);
    else doc.setTextColor(colorText);

    doc.text(formatBRL(amount).replace('R$', '').trim(), pageWidth - margin - 5, y + 5.5, { align: 'right' });

    // Bottom line
    doc.setDrawColor('#f3f4f6');
    doc.line(margin, y + 8, pageWidth - margin, y + 8);

    y += 8;
    total += amount;
  };

  // 1. Rent
  const rentDesc = rental.rentDescription && rental.rentDescription !== 'Aluguel'
    ? rental.rentDescription
    : `Aluguel Ref. ${rental.month}/${rental.year}`;
  addItem(rentDesc, rental.rentAmount);

  // 2. Fixed Bills
  if (rental.waterBill > 0) addItem('Conta de Água', rental.waterBill);
  if (rental.condoFee > 0) addItem('Taxa de Condomínio', rental.condoFee);
  if (rental.iptu > 0) addItem('IPTU', rental.iptu);
  if (rental.gasBill > 0) addItem('Conta de Gás', rental.gasBill);

  // 3. Tenant Extra Items (The fix for "não saiu descrito")
  // We need to verify if 'otherItems' exists and iterate
  if (rental.otherItems && Array.isArray(rental.otherItems)) {
    rental.otherItems.forEach(item => {
      // If description is generic, try to be specific, otherwise use item description
      addItem(item.description, item.amount);
    });
  }

  // --- Total Row ---
  y += 2;
  doc.setFillColor(colorPrimary);
  doc.rect(margin, y, contentWidth, 12, 'F');

  doc.setTextColor('#FFFFFF');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL A PAGAR', margin + 5, y + 8);
  doc.setFontSize(14);
  doc.text(formatBRL(total), pageWidth - margin - 5, y + 8, { align: 'right' });

  y += 25;

  // --- PIX Section ---
  const pixChave = pixConfig?.pixKey || DEFAULT_COMPANY_PIX_KEY;
  const pixPayload = gerarPixPayload(rental, total, pixConfig);
  const qrCodeBase64 = pixConfig?.qrCodeBase64;

  // Container for PIX
  doc.setDrawColor(colorBorder);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 90, 3, 3, 'S');

  // Header within PIX box
  doc.setFillColor('#f9fafb');
  doc.roundedRect(margin + 0.5, y + 0.5, contentWidth - 1, 10, 3, 3, 'F'); // Background for title
  doc.setTextColor(colorPrimary);
  doc.setFontSize(10);
  doc.text('PAGAMENTO VIA PIX', margin + (contentWidth / 2), y + 7, { align: 'center' });

  y += 20;

  // QR Code
  const qrSize = 45;
  const qrX = margin + 10;

  let qrCodeDataUrl = null;
  if (qrCodeBase64) {
    qrCodeDataUrl = qrCodeBase64;
  } else if (pixPayload) {
    try {
      const qr = window.qrcode(0, 'M');
      qr.addData(pixPayload);
      qr.make();
      qrCodeDataUrl = qr.createDataURL(4);
    } catch (e) {
      console.warn("Error generating QR", e);
    }
  }

  if (qrCodeDataUrl) {
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, y, qrSize, qrSize);
  } else {
    doc.rect(qrX, y, qrSize, qrSize);
    doc.setFontSize(8);
    doc.text('QR Code Indisponível', qrX + 2, y + 20);
  }

  // Instructions (Right side of QR)
  const textX = qrX + qrSize + 15;
  doc.setTextColor(colorText);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Chave PIX:', textX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(pixChave, textX, y + 12);

  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text([
    '1. Abra o app do seu banco.',
    '2. Escolha "Pagar com PIX".',
    '3. Escaneie o QR Code ao lado ou',
    '4. Use o "Copia e Cola" abaixo.'
  ], textX, y + 22);

  y += 55;

  // Copia e Cola Box
  if (pixPayload) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colorText);
    doc.text('Código PIX Copia e Cola:', margin + 5, y - 2);

    doc.setFillColor('#f3f4f6');
    doc.rect(margin + 5, y, contentWidth - 10, 15, 'F');

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#374151');

    // Split text to fit width
    const splitPayload = doc.splitTextToSize(pixPayload, contentWidth - 15);
    // We only show first 2-3 lines to fit visually if it's huge, user copies via button usually
    // But for print, we print as much as fits in the box
    doc.text(splitPayload, margin + 8, y + 4);
  } else {
    doc.setFontSize(9);
    doc.setTextColor(colorDanger);
    doc.text('Código Copia e Cola não configurado.', margin + 5, y + 5);
  }

  // --- Footer ---
  const footerY = pageHeight - 15;
  doc.setDrawColor(colorBorder);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor('#9ca3af');
  const now = new Date().toLocaleString('pt-BR');
  doc.text(`Documento gerado em ${now} por ${nomeImobiliaria}`, margin, footerY + 5);
  doc.text('Página 1/1', pageWidth - margin, footerY + 5, { align: 'right' });

  // Inject JS for Copy Button functionality (Browser only)
  // This works mainly in browser PDF viewers, not always in embedded ones, but is safe to add.
  const jsCopyCode = `
      function copyPixPayload() {
          try {
              var payload = "${pixPayload}";
              var textArea = document.createElement("textarea");
              textArea.value = payload;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand("copy");
              document.body.removeChild(textArea);
              app.alert("Código PIX Copiado!");
          } catch (e) {
              app.alert("Erro ao copiar.");
          }
      }
  `;
  try {
    doc.addJS(jsCopyCode);
  } catch (e) {
    console.warn("Could not add JS to PDF");
  }

  return doc;
}

export function gerarDemonstrativoProprietario(owner: Owner, rentals: Rental[], month: string, year: number, notes: string) {
  if (!window.jspdf) throw new Error('PDF Lib not loaded');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Configs & Colors ---
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  const colorPrimary = '#1e40af'; // Indigo 800
  const colorLight = '#eff6ff'; // Indigo 50
  const colorText = '#1f2937'; // Gray 800
  const colorGray = '#9ca3af'; // Gray 400
  const colorDanger = '#dc2626';
  const colorSuccess = '#16a34a';

  let y = 0;

  // --- 1. Header Hero Section ---
  doc.setFillColor(colorPrimary);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Logo / Company Name
  doc.setTextColor('#ffffff');
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('EXTRATO MENSAL', margin, 32);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(DEFAULT_COMPANY_NAME, pageWidth - margin, 25, { align: 'right' });
  doc.text(DEFAULT_COMPANY_DOC, pageWidth - margin, 30, { align: 'right' });
  doc.text(`Ref: ${month}/${year}`, pageWidth - margin, 38, { align: 'right' });

  y = 65;

  // --- 2. Owner & Abstract Info ---
  // Left: Owner Details
  doc.setTextColor(colorText);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPRIETÁRIO', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(owner.name.toUpperCase(), margin, y + 6);

  doc.setFontSize(9);
  doc.setTextColor('#4b5563');
  doc.text(`CPF: ${owner.cpf}`, margin, y + 12);
  if (owner.pixKey) doc.text(`Chave PIX: ${owner.pixKey}`, margin, y + 17);
  if (owner.bankDetails) doc.text(`Banco: ${owner.bankDetails}`, margin, y + 22);

  // Right: Summary Box
  const sumBoxWidth = 80;
  const sumBoxX = pageWidth - margin - sumBoxWidth;

  // Calculate Totals First
  let totalGross = 0;
  let totalFees = 0;
  let totalExpenses = 0;
  let totalNet = 0;

  rentals.forEach(r => {
    const rent = r.rentAmount || 0;
    const otherTotal = (r.otherItems || []).reduce((s, it) => s + it.amount, 0);
    const ownerTotal = (r.ownerItems || []).reduce((s, it) => s + it.amount, 0);
    const charges = (r.waterBill || 0) + (r.condoFee || 0) + (r.iptu || 0) + (r.gasBill || 0);

    const grossItem = rent + charges + otherTotal;

    const admPct = r.ownerAdminFeePercentage ?? 10;
    const txAdm = rent * (admPct / 100);
    const bankFee = (r.otherItems || []).find(it => it.description.toLowerCase().includes('tarifa'))?.amount || 0;

    // Effective Adjustments (Owner Costs/Credits)
    const adjustments = ownerTotal - bankFee;

    const netItem = grossItem - txAdm + adjustments;

    totalGross += grossItem;
    totalFees += txAdm;
    totalExpenses += adjustments;
    totalNet += netItem;
  });

  // Draw Summary Box
  doc.setFillColor(colorLight);
  doc.roundedRect(sumBoxX, y - 5, sumBoxWidth, 35, 3, 3, 'F');
  doc.setDrawColor(colorPrimary);
  doc.setLineWidth(0.5);
  doc.roundedRect(sumBoxX, y - 5, sumBoxWidth, 35, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setTextColor(colorText);
  doc.text('TOTAL A REPASSAR', sumBoxX + 10, y + 5);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colorPrimary);
  doc.text(formatBRL(totalNet), sumBoxX + 10, y + 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colorGray);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, sumBoxX + 10, y + 24);

  y += 45;

  // --- 3. Detailed Table ---

  // Table Header
  const col1 = margin + 2; // Imóvel/Inq
  const col2 = pageWidth - margin - 90; // Valor Bruto
  const col3 = pageWidth - margin - 60; // Tx Adm
  const col4 = pageWidth - margin - 30; // Outros
  const col5 = pageWidth - margin - 2;  // Líquido

  doc.setFillColor('#f8fafc');
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setDrawColor('#e2e8f0');
  doc.line(margin, y + 10, pageWidth - margin, y + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#64748b');
  doc.text('IMÓVEL / INQUILINO', col1, y + 6);
  doc.text('V. BRUTO', col2, y + 6, { align: 'right' });
  doc.text('TX ADM', col3, y + 6, { align: 'right' });
  doc.text('AJUSTES', col4, y + 6, { align: 'right' });
  doc.text('LÍQUIDO', col5, y + 6, { align: 'right' });

  y += 14;

  // Data Rows
  rentals.forEach((r, i) => {
    // Recalculate per item for display
    const rent = r.rentAmount || 0;
    const otherTotal = (r.otherItems || []).reduce((s, it) => s + it.amount, 0);
    const ownerTotal = (r.ownerItems || []).reduce((s, it) => s + it.amount, 0);
    const charges = (r.waterBill || 0) + (r.condoFee || 0) + (r.iptu || 0) + (r.gasBill || 0);
    const grossItem = rent + charges + otherTotal;
    const admPct = r.ownerAdminFeePercentage ?? 10;
    const txAdm = rent * (admPct / 100);
    const bankFee = (r.otherItems || []).find(it => it.description.toLowerCase().includes('tarifa'))?.amount || 0;
    const adjustments = ownerTotal - bankFee;
    const netItem = grossItem - txAdm + adjustments;

    // Background Striping
    if (i % 2 !== 0) {
      doc.setFillColor('#f8fafc');
      doc.rect(margin, y - 4, contentWidth, 18, 'F');
    }

    // Row Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(colorText);
    doc.text(r.tenantName.substring(0, 28), col1, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor('#64748b');
    doc.text(r.propertyName.substring(0, 35), col1, y + 4);

    // Show Breakdown details in small text if space allows
    let details = `Aluguel: ${formatBRL(rent)}`;
    if (charges > 0) details += ` + Encargos: ${formatBRL(charges)}`;
    doc.setFontSize(7);
    doc.setTextColor('#94a3b8');
    doc.text(details, col1, y + 8);

    // Values
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorText);
    doc.text(formatBRL(grossItem), col2, y + 3, { align: 'right' });

    doc.setTextColor(colorDanger);
    doc.text(`-${formatBRL(txAdm)}`, col3, y + 3, { align: 'right' });

    if (adjustments !== 0) {
      doc.setTextColor(adjustments > 0 ? colorSuccess : colorDanger);
      doc.text(formatBRL(adjustments), col4, y + 3, { align: 'right' });
    } else {
      doc.setTextColor(colorGray);
      doc.text('-', col4, y + 3, { align: 'right' });
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorPrimary);
    doc.text(formatBRL(netItem), col5, y + 3, { align: 'right' });

    y += 18;

    // Page break check (simple)
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
  });

  // --- 4. Totals Summary Table ---
  y += 10;

  // Draw line
  doc.setDrawColor(colorGray);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const summaryX = pageWidth - margin - 100;

  const drawSummaryRow = (label: string, value: number, isBold = false, color = colorText) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(colorText);
    doc.text(label, summaryX, y);

    doc.setTextColor(color);
    doc.text(formatBRL(value), pageWidth - margin, y, { align: 'right' });
    y += 7;
  };

  drawSummaryRow('Total Bruto (Aluguéis + Encargos)', totalGross);
  drawSummaryRow('(-) Taxas Administrativas', -totalFees, false, colorDanger);
  drawSummaryRow('(+/-) Outros Ajustes', totalExpenses, false, totalExpenses >= 0 ? colorSuccess : colorDanger);

  y += 2;
  doc.setDrawColor(colorGray);
  doc.line(summaryX, y, pageWidth - margin, y);
  y += 8;

  drawSummaryRow('LÍQUIDO TOTAL', totalNet, true, colorPrimary);

  // --- 5. Notes ---
  if (notes) {
    y += 15;
    doc.setFillColor('#fff7ed'); // Orange 50
    doc.rect(margin, y, contentWidth, 25, 'F');
    doc.setDrawColor('#fdba74');
    doc.rect(margin, y, contentWidth, 25, 'S');

    doc.setFontSize(9);
    doc.setTextColor('#c2410c'); // Orange 700
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#431407');
    const splitNotes = doc.splitTextToSize(notes, contentWidth - 8);
    doc.text(splitNotes, margin + 4, y + 12);

    y += 30; // Move Y past notes
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor('#94a3b8');
  doc.text('Documento gerado eletronicamente pelo sistema Jobh Imóveis.', margin, footerY);
  doc.text('Página 1 of 1', pageWidth - margin, footerY, { align: 'right' });

  return doc;
}