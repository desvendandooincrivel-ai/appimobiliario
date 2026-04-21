import React, { useState, useRef } from 'react';
import { Upload, X, FileImage, FileText, CheckCircle, ExternalLink, Loader } from 'lucide-react';
import { Modal } from './Modals';
import { Rental } from '../types';
import { formatBRL } from '../utils/helpers';

export type ComprovanteType = 'pagamento' | 'repasse';

interface ModalAnexarComprovanteProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (file: File | null) => void;
    isUploading: boolean;
    uploadedUrl?: string | null;
    rental: Rental | null;
    type: ComprovanteType;
    ownerName?: string;
}

export const ModalAnexarComprovante: React.FC<ModalAnexarComprovanteProps> = ({
    isOpen, onClose, onConfirm, isUploading, uploadedUrl, rental, type, ownerName
}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleClose = () => {
        setSelectedFile(null);
        setPreview(null);
        onClose();
    };

    if (!isOpen || !rental) return null;

    const isPagamento = type === 'pagamento';
    const valor = isPagamento ? rental.rentAmount : null;
    const titulo = isPagamento
        ? `Comprovante de Pagamento`
        : `Comprovante de Repasse`;
    const pessoa = isPagamento ? rental.tenantName : (ownerName || rental.owner);
    const pastaDrive = isPagamento
        ? `... / LF${rental.refNumber} - ${rental.tenantName} / Comprovantes de Pagamento / ${rental.year} / 📄 ${rental.month}.pdf`
        : `... / ${ownerName || rental.owner} / Comprovantes de Repasse / ${rental.year} / ${rental.month} / 📄 LF${rental.refNumber} ${rental.tenantName}.pdf`;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={titulo}>
            <div className="space-y-5">

                {/* Context info */}
                <div className={`rounded-2xl p-4 border flex items-start gap-3 ${isPagamento ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                    <span className="text-3xl">{isPagamento ? '💵' : '🏦'}</span>
                    <div>
                        <p className="font-black text-gray-800">{pessoa}</p>
                        <p className="text-sm text-gray-600">
                            {isPagamento ? 'Aluguel' : 'Repasse'} — {rental.month}/{rental.year}
                            {valor ? ` — ${formatBRL(valor)}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <span>📁</span> {pastaDrive}
                        </p>
                    </div>
                </div>

                {/* Upload zone */}
                {!uploadedUrl ? (
                    <>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' :
                                selectedFile ? 'border-green-400 bg-green-50' :
                                'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />

                            {selectedFile ? (
                                <div className="space-y-2">
                                    {preview ? (
                                        <img src={preview} alt="preview" className="max-h-32 mx-auto rounded-xl object-contain shadow-md" />
                                    ) : (
                                        <FileText size={40} className="mx-auto text-indigo-500" />
                                    )}
                                    <p className="font-bold text-gray-700 text-sm">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreview(null); }}
                                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1"
                                    >
                                        <X size={12} /> Remover
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-center">
                                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                            <Upload size={24} className="text-indigo-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-700">Arraste ou clique para selecionar</p>
                                        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG até 10MB</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // Success state
                    <div className="flex flex-col items-center gap-3 py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle size={32} className="text-green-500" />
                        </div>
                        <p className="font-black text-green-700">Comprovante enviado com sucesso!</p>
                        <a
                            href={uploadedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-indigo-600 text-sm font-bold hover:underline"
                        >
                            <ExternalLink size={14} /> Ver no Google Drive
                        </a>
                    </div>
                )}

                {/* Actions */}
                {!uploadedUrl && (
                    <div className="flex gap-3 pt-2 border-t">
                        <button
                            onClick={() => onConfirm(null)}
                            disabled={isUploading}
                            className="flex-1 py-3 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            Pular (sem comprovante)
                        </button>
                        <button
                            onClick={() => onConfirm(selectedFile)}
                            disabled={isUploading || !selectedFile}
                            className="flex-1 py-3 text-sm font-black text-white bg-indigo-600 rounded-xl shadow-md hover:bg-indigo-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Loader size={16} className="animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Enviar para Drive
                                </>
                            )}
                        </button>
                    </div>
                )}
                {uploadedUrl && (
                    <div className="flex justify-center pt-2">
                        <button onClick={handleClose} className="px-8 py-3 bg-green-600 text-white font-black rounded-xl shadow-md">
                            Concluir ✓
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};
