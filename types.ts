export interface Item {
  id: string;
  description: string;
  amount: number;
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
  isTransferred: boolean;
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