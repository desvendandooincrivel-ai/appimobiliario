export interface Item {
  id: string;
  description: string;
  amount: number;
  type?: 'unique' | 'permanent' | 'installment';
  totalInstallments?: number;
  currentInstallment?: number;
}

export interface Owner {
  id: string;
  name: string;
  cpf: string;
  rgCnh?: string;
  adminFeePercentage: number;
  pixKey?: string;
  bankDetails?: string;
  phone?: string;
}

export interface Rental {
  id: string;
  ownerId: string;
  owner: string;
  ownerAdminFeePercentage?: number;
  refNumber: string;
  tenantName: string;
  tenantCpf?: string;
  tenantRgCnh?: string;
  propertyName: string;
  dueDay: number;
  month: string;
  year: number;
  isPaid: boolean;
  paymentDate?: string;
  isTransferred: boolean;
  transferDate?: string;
  waterBill: number;
  condoFee: number;
  iptu: number;
  gasBill: number;
  otherItems: Item[]; // Items for Tenant (add/deduct)
  ownerItems: Item[]; // Items for Owner (adjustments)
  contractDate?: string;
  lastAdjustmentYear?: number | null;
  rentDescription?: string;
  rentAmount: number;
  phone?: string;
}

export interface PixConfig {
  name: string;
  doc: string;
  pixKey: string;
  qrCodeBase64?: string;
  pixPayload?: string;
  statementNotes?: string;
  occurrenceContact?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

export interface StatementData {
  ownerId: string | null;
  rentals: Rental[];
}

export type ConfirmActionType = 'rental' | 'owner' | 'import' | 'cloneMonth' | 'deleteMonth' | 'deleteYear' | null;

export interface ConfirmAction {
  type: ConfirmActionType;
  id: string | null;
  data: any;
}

export interface Occurrence {
  id: string;
  date: string;
  senderId: string; // ID do Inquilino ou Proprietário
  senderType: 'tenant' | 'owner';
  type: 'maintenance' | 'financial' | 'general';
  description: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'resolved' | 'in_progress';
  aiResponseDraft?: string;
}

// Global Window Extensions for External Libraries
declare global {
  interface Window {
    jspdf: any;
    qrcode: any;
    JSZip: any;
    saveAs: any;
    isElectron: boolean;
  }
}

export type ContractEventType = 
  | 'REAJUSTE_ALUGUEL'
  | 'ACORDO_VALOR'
  | 'REPASSE_DIVERGENTE'
  | 'PAGAMENTO_REGISTRADO'
  | 'OBRA_REALIZADA'
  | 'COMUNICACAO_IMPORTANTE'
  | 'OUTRO';

export interface EventAttachment {
  id: string;
  event_id: string;
  file_url: string;
  file_type: string;
  description?: string;
  created_at: string;
  rawFile?: File;
}

export interface ContractEvent {
  id: string;
  contract_id: string; // Will store refNumber
  tenant_id?: string;
  type: ContractEventType;
  description: string;
  old_value?: number | string | null;
  new_value?: number | string | null;
  created_by: string;
  created_at: string;
  attachments?: EventAttachment[];
}

export type CaucaoType = 'recibo' | 'sem_caucao' | 'seguro_fianca' | 'fiador';

export interface TenantDocumentFile {
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
  driveFileId?: string;
  webViewLink?: string;
}

export interface TenantDocuments {
  contract_id: string; // refNumber
  contratoAluguel?: TenantDocumentFile;
  entregaChaves?: TenantDocumentFile;
  laudoVistoria?: TenantDocumentFile;
  caucao?: {
    type: CaucaoType;
    file?: TenantDocumentFile;
  };
}