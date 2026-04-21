import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, ExternalLink, Loader, X, FileText, Shield, Key, ClipboardList, FileSignature } from 'lucide-react';
import { Modal } from './Modals';
import { Rental } from '../types';
import { CaucaoType, TenantDocuments, TenantDocumentFile } from '../types';

interface ModalDocumentosContratoProps {
    isOpen: boolean;
    onClose: () => void;
    rental: Rental | null;
    documents: TenantDocuments | null;
    onUploadDocument: (
        docType: keyof Omit<TenantDocuments, 'contract_id' | 'caucao'> | 'caucaoFile',
        file: File,
        caucaoType?: CaucaoType
    ) => Promise<void>;
    onSetCaucaoType: (type: CaucaoType) => void;
    isUploading: string | null; // which doc type is uploading
}

const CAUCAO_OPTIONS: { value: CaucaoType; label: string; icon: string }[] = [
    { value: 'recibo', label: 'Recibo de Caução', icon: '💰' },
    { value: 'seguro_fianca', label: 'Seguro Fiança', icon: '🛡️' },
    { value: 'fiador', label: 'Fiador', icon: '🤝' },
    { value: 'sem_caucao', label: 'Sem Caução', icon: '🚫' },
];

const CAUCAO_LABELS: Record<CaucaoType, string> = {
    recibo: 'Recibo de Caução',
    seguro_fianca: 'Seguro Fiança',
    fiador: 'Fiador',
    sem_caucao: 'Sem Caução',
};

interface DocRowProps {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    file?: TenantDocumentFile;
    isUploading: boolean;
    onUpload: (file: File) => void;
    optional?: boolean;
}

const DocRow: React.FC<DocRowProps> = ({ icon, label, sublabel, file, isUploading, onUpload, optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0 text-indigo-600">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-gray-800">{label}</p>
                    {optional && <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">Opcional</span>}
                </div>
                {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
                {file && (
                    <a href={file.webViewLink || file.fileUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5">
                        <ExternalLink size={10} /> {file.fileName}
                    </a>
                )}
            </div>
            <div className="flex-shrink-0">
                {file ? (
                    <div className="flex items-center gap-1">
                        <CheckCircle size={18} className="text-green-500" />
                        <button onClick={() => inputRef.current?.click()} title="Substituir arquivo"
                            className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                            <Upload size={12} />
                        </button>
                    </div>
                ) : isUploading ? (
                    <Loader size={18} className="text-indigo-500 animate-spin" />
                ) : (
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Upload size={12} /> Anexar
                    </button>
                )}
                <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </div>
        </div>
    );
};

export const ModalDocumentosContrato: React.FC<ModalDocumentosContratoProps> = ({
    isOpen, onClose, rental, documents, onUploadDocument, onSetCaucaoType, isUploading
}) => {
    const [selectedCaucaoType, setSelectedCaucaoType] = useState<CaucaoType | null>(
        documents?.caucao?.type || null
    );
    const caucaoFileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen || !rental) return null;

    const caucaoType = documents?.caucao?.type || selectedCaucaoType;
    const caucaoFile = documents?.caucao?.file;

    const handleCaucaoTypeSelect = (type: CaucaoType) => {
        setSelectedCaucaoType(type);
        onSetCaucaoType(type);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Documentos do Contrato">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

                {/* Header info */}
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">
                        LF{rental.refNumber}
                    </div>
                    <div>
                        <p className="font-black text-gray-800">{rental.tenantName}</p>
                        <p className="text-xs text-gray-500">
                            📁 Inquilinos / LF{rental.refNumber} - {rental.tenantName} / Documentos do Contrato
                        </p>
                    </div>
                </div>

                {/* Docs section */}
                <div className="space-y-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider px-1">Documentos Obrigatórios</p>

                    <DocRow
                        icon={<FileSignature size={18} />}
                        label="Contrato de Aluguel"
                        sublabel="Scan ou PDF assinado digitalmente"
                        file={documents?.contratoAluguel}
                        isUploading={isUploading === 'contratoAluguel'}
                        onUpload={(f) => onUploadDocument('contratoAluguel', f)}
                    />
                    <DocRow
                        icon={<Key size={18} />}
                        label="Entrega de Chaves"
                        sublabel="Termo assinado pelas partes"
                        file={documents?.entregaChaves}
                        isUploading={isUploading === 'entregaChaves'}
                        onUpload={(f) => onUploadDocument('entregaChaves', f)}
                    />
                    <DocRow
                        icon={<ClipboardList size={18} />}
                        label="Laudo de Vistoria"
                        sublabel="Vistoria de entrada assinada"
                        file={documents?.laudoVistoria}
                        isUploading={isUploading === 'laudoVistoria'}
                        onUpload={(f) => onUploadDocument('laudoVistoria', f)}
                    />
                </div>

                {/* Caução section */}
                <div className="space-y-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider px-1">Garantia / Caução</p>

                    {!caucaoType ? (
                        <div className="grid grid-cols-2 gap-2">
                            {CAUCAO_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleCaucaoTypeSelect(opt.value)}
                                    className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 text-sm font-bold text-gray-600 transition-all"
                                >
                                    <span className="text-xl">{opt.icon}</span>
                                    <span>{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{CAUCAO_OPTIONS.find(o => o.value === caucaoType)?.icon}</span>
                                    <div>
                                        <p className="font-black text-sm text-gray-800">{CAUCAO_LABELS[caucaoType]}</p>
                                        {caucaoType === 'sem_caucao' && (
                                            <p className="text-xs text-gray-400">Sem garantia registrada</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedCaucaoType(null); onSetCaucaoType(null as any); }}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                    title="Alterar tipo"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {caucaoType !== 'sem_caucao' && (
                                caucaoFile ? (
                                    <div className="flex items-center gap-2 mt-2">
                                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                                        <a href={caucaoFile.webViewLink || caucaoFile.fileUrl} target="_blank" rel="noreferrer"
                                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                            <ExternalLink size={10} /> {caucaoFile.fileName}
                                        </a>
                                        <button onClick={() => caucaoFileInputRef.current?.click()}
                                            className="ml-auto text-xs text-gray-400 hover:text-indigo-600">
                                            <Upload size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => caucaoFileInputRef.current?.click()}
                                        disabled={isUploading === 'caucaoFile'}
                                        className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
                                    >
                                        {isUploading === 'caucaoFile' ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
                                        Anexar Comprovante de {CAUCAO_LABELS[caucaoType]}
                                    </button>
                                )
                            )}
                            <input ref={caucaoFileInputRef} type="file" accept="image/*,application/pdf" hidden
                                onChange={(e) => e.target.files?.[0] && onUploadDocument('caucaoFile', e.target.files[0], caucaoType)} />
                        </div>
                    )}
                </div>

                {/* Status summary */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Status do Dossiê</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                        {[
                            { label: 'Contrato', ok: !!documents?.contratoAluguel },
                            { label: 'Chaves', ok: !!documents?.entregaChaves },
                            { label: 'Vistoria', ok: !!documents?.laudoVistoria },
                            { label: 'Garantia', ok: !!documents?.caucao },
                        ].map(s => (
                            <div key={s.label} className="flex items-center gap-1">
                                <span className={s.ok ? 'text-green-500' : 'text-gray-300'}>
                                    {s.ok ? '✓' : '○'}
                                </span>
                                <span className={s.ok ? 'text-gray-700 font-bold' : 'text-gray-400'}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
