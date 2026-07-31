import React, { useEffect, useMemo, useState } from 'react';
import { Building2, DoorOpen, Edit, History, Plus, UserCheck, Wrench } from 'lucide-react';
import { ContractEvent, ManagedProperty, ManagedPropertyStatus, Owner, Rental } from '../types';
import { Modal } from './Modals';

type MaintenancePayload = {
    title: string;
    date: string;
    reason: string;
    ownerAuthorized: boolean;
};

interface PropertiesPanelProps {
    properties: ManagedProperty[];
    owners: Owner[];
    rentals: Rental[];
    events: ContractEvent[];
    selectedMonth: string;
    selectedYear: number;
    onSaveProperty: (property: Partial<ManagedProperty>) => void;
    onVacateProperty: (property: ManagedProperty, rental?: Rental) => void;
    onOpenTimeline: (property: ManagedProperty) => void;
    onRegisterMaintenance: (property: ManagedProperty, payload: MaintenancePayload, rental?: Rental) => void;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const normalize = (value: string | undefined) => (value || '').trim().toLowerCase();
const formatMoney = (value?: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const matchesProperty = (rental: Rental, property: ManagedProperty) => {
    if (rental.propertyId && rental.propertyId === property.id) return true;
    return rental.ownerId === property.ownerId && normalize(rental.propertyName) === normalize(property.address);
};

const sortRentalsByPeriodDesc = (a: Rental, b: Rental) => {
    if (b.year !== a.year) return b.year - a.year;
    return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
};

const statusLabel: Record<ManagedPropertyStatus | 'effective_vacant', string> = {
    occupied: 'Ocupado',
    vacant: 'Vago',
    maintenance: 'Manutenção',
    effective_vacant: 'Vago',
};

const statusClass: Record<ManagedPropertyStatus | 'effective_vacant', string> = {
    occupied: 'bg-green-100 text-green-700 border-green-200',
    vacant: 'bg-amber-100 text-amber-700 border-amber-200',
    maintenance: 'bg-blue-100 text-blue-700 border-blue-200',
    effective_vacant: 'bg-amber-100 text-amber-700 border-amber-200',
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    properties,
    owners,
    rentals,
    events,
    selectedMonth,
    selectedYear,
    onSaveProperty,
    onVacateProperty,
    onOpenTimeline,
    onRegisterMaintenance,
}) => {
    const [editingProperty, setEditingProperty] = useState<ManagedProperty | null>(null);
    const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
    const [maintenanceContext, setMaintenanceContext] = useState<{ property: ManagedProperty; rental?: Rental } | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | ManagedPropertyStatus | 'effective_vacant'>('all');

    const enrichedProperties = useMemo(() => {
        return properties.map(property => {
            const propertyRentals = rentals.filter(rental => matchesProperty(rental, property));
            const currentRental = propertyRentals.find(rental => rental.month === selectedMonth && rental.year === selectedYear);
            const latestRental = [...propertyRentals].sort(sortRentalsByPeriodDesc)[0];
            const displayRental = currentRental || latestRental;
            const relatedEvents = events.filter(event => {
                if (event.property_id === property.id) return true;
                return propertyRentals.some(rental => rental.refNumber === event.contract_id);
            });
            const lastEvent = [...relatedEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            const effectiveStatus: ManagedPropertyStatus | 'effective_vacant' =
                property.status === 'maintenance' ? 'maintenance' :
                property.status === 'vacant' ? 'vacant' :
                currentRental ? 'occupied' : 'effective_vacant';

            return { property, currentRental, latestRental, displayRental, lastEvent, effectiveStatus };
        });
    }, [properties, rentals, events, selectedMonth, selectedYear]);

    const counts = useMemo(() => {
        return enrichedProperties.reduce((acc, item) => {
            if (item.effectiveStatus === 'occupied') acc.occupied += 1;
            if (item.effectiveStatus === 'maintenance') acc.maintenance += 1;
            if (item.effectiveStatus === 'vacant' || item.effectiveStatus === 'effective_vacant') acc.vacant += 1;
            return acc;
        }, { occupied: 0, vacant: 0, maintenance: 0 });
    }, [enrichedProperties]);

    const visibleProperties = enrichedProperties.filter(item => {
        const owner = owners.find(o => o.id === item.property.ownerId);
        const text = `${item.property.name} ${item.property.address} ${owner?.name || ''} ${item.displayRental?.tenantName || ''}`.toLowerCase();
        const matchesSearch = !search || text.includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || item.effectiveStatus === filter || (filter === 'effective_vacant' && (item.effectiveStatus === 'vacant' || item.effectiveStatus === 'effective_vacant'));
        return matchesSearch && matchesFilter;
    });

    const openNewProperty = () => {
        setEditingProperty(null);
        setIsPropertyFormOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Imóveis</h2>
                    <p className="text-sm font-bold text-gray-400">{selectedMonth}/{selectedYear}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        placeholder="Buscar imóvel, proprietário ou inquilino"
                        className="w-80 max-w-full px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                    />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.currentTarget.value as any)}
                        className="px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-bold outline-none"
                    >
                        <option value="all">Todos</option>
                        <option value="occupied">Ocupados</option>
                        <option value="effective_vacant">Vagos</option>
                        <option value="maintenance">Manutenção</option>
                    </select>
                    <button type="button" onClick={openNewProperty} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-lg font-black text-xs uppercase shadow-lg shadow-indigo-100">
                        <Plus size={16} /> Novo imóvel
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryTile icon={<UserCheck size={20} />} label="Ocupados" value={counts.occupied} className="text-green-700 bg-green-50 border-green-100" />
                <SummaryTile icon={<DoorOpen size={20} />} label="Vagos" value={counts.vacant} className="text-amber-700 bg-amber-50 border-amber-100" />
                <SummaryTile icon={<Wrench size={20} />} label="Manutenção" value={counts.maintenance} className="text-blue-700 bg-blue-50 border-blue-100" />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-[1280px] w-full border-separate border-spacing-0">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {['Status', 'Proprietário', 'Inquilino', 'Endereço', 'Dia Venc.', 'Aluguel', 'Água', 'Cond.', 'IPTU', 'Gás', 'Último prontuário', 'Ações'].map(header => (
                                    <th key={header} className="px-3 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {visibleProperties.map(({ property, currentRental, displayRental, lastEvent, effectiveStatus }) => {
                                const owner = owners.find(o => o.id === property.ownerId);
                                const isOccupied = effectiveStatus === 'occupied';
                                return (
                                    <tr key={property.id} className="hover:bg-indigo-50/40 transition-colors">
                                        <td className="px-3 py-3 align-top">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusClass[effectiveStatus]}`}>
                                                {statusLabel[effectiveStatus]}
                                            </span>
                                            {property.lastVacancyDate && (
                                                <div className="text-[10px] font-bold text-gray-400 mt-1">desde {new Date(property.lastVacancyDate).toLocaleDateString('pt-BR')}</div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 align-top text-sm font-bold text-gray-800 whitespace-nowrap">{owner?.name || 'Sem proprietário'}</td>
                                        <td className="px-3 py-3 align-top text-sm font-bold text-gray-700 whitespace-nowrap">
                                            {isOccupied && currentRental ? currentRental.tenantName : 'Imóvel vago'}
                                            {displayRental && !isOccupied && <div className="text-[10px] text-gray-400 font-bold">último: {displayRental.tenantName}</div>}
                                        </td>
                                        <td className="px-3 py-3 align-top min-w-[260px]">
                                            <div className="flex items-start gap-2">
                                                <Building2 size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black text-gray-900 truncate" title={property.address}>{property.address}</div>
                                                    {displayRental?.refNumber && <div className="text-[10px] font-bold text-gray-400">LF {displayRental.refNumber}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 align-top text-sm text-center font-bold text-gray-700">{displayRental?.dueDay || '-'}</td>
                                        <td className="px-3 py-3 align-top text-sm font-black text-gray-900 whitespace-nowrap">{displayRental ? formatMoney(displayRental.rentAmount) : '-'}</td>
                                        <td className="px-3 py-3 align-top text-sm text-right whitespace-nowrap">{displayRental ? formatMoney(displayRental.waterBill) : '-'}</td>
                                        <td className="px-3 py-3 align-top text-sm text-right whitespace-nowrap">{displayRental ? formatMoney(displayRental.condoFee) : '-'}</td>
                                        <td className="px-3 py-3 align-top text-sm text-right whitespace-nowrap">{displayRental ? formatMoney(displayRental.iptu) : '-'}</td>
                                        <td className="px-3 py-3 align-top text-sm text-right whitespace-nowrap">{displayRental ? formatMoney(displayRental.gasBill) : '-'}</td>
                                        <td className="px-3 py-3 align-top min-w-[220px] max-w-[280px]">
                                            <p className="text-xs text-gray-600 line-clamp-2">{lastEvent ? (lastEvent.related_descriptions?.property || lastEvent.description) : 'Sem eventos'}</p>
                                        </td>
                                        <td className="px-3 py-3 align-top">
                                            <div className="flex flex-wrap gap-1.5 min-w-[250px]">
                                                <button type="button" onClick={() => onOpenTimeline(property)} className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase">
                                                    <History size={13} /> Prontuário
                                                </button>
                                                <button type="button" onClick={() => setMaintenanceContext({ property, rental: currentRental })} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase">
                                                    <Wrench size={13} /> Obra
                                                </button>
                                                {isOccupied && (
                                                    <button type="button" onClick={() => onVacateProperty(property, currentRental)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase">
                                                        <DoorOpen size={13} /> Desocupar
                                                    </button>
                                                )}
                                                <button type="button" onClick={() => { setEditingProperty(property); setIsPropertyFormOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">
                                                    <Edit size={13} /> Editar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {visibleProperties.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-gray-500 font-bold">
                    Nenhum imóvel encontrado.
                </div>
            )}

            <PropertyFormModal
                isOpen={isPropertyFormOpen}
                owners={owners}
                initialData={editingProperty}
                onClose={() => { setIsPropertyFormOpen(false); setEditingProperty(null); }}
                onSubmit={(property) => {
                    onSaveProperty(property);
                    setIsPropertyFormOpen(false);
                    setEditingProperty(null);
                }}
            />

            <MaintenanceEventModal
                context={maintenanceContext}
                onClose={() => setMaintenanceContext(null)}
                onSubmit={(payload) => {
                    if (!maintenanceContext) return;
                    onRegisterMaintenance(maintenanceContext.property, payload, maintenanceContext.rental);
                    setMaintenanceContext(null);
                }}
            />
        </div>
    );
};

const SummaryTile = ({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: number; className: string }) => (
    <div className={`border rounded-lg p-5 flex items-center justify-between ${className}`}>
        <div>
            <p className="text-xs font-black uppercase opacity-70">{label}</p>
            <p className="text-3xl font-black">{value}</p>
        </div>
        {icon}
    </div>
);

const PropertyFormModal = ({
    isOpen,
    owners,
    initialData,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    owners: Owner[];
    initialData: ManagedProperty | null;
    onClose: () => void;
    onSubmit: (property: Partial<ManagedProperty>) => void;
}) => {
    const [ownerId, setOwnerId] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<ManagedPropertyStatus>('occupied');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        setOwnerId(initialData?.ownerId || '');
        setName(initialData?.name || '');
        setAddress(initialData?.address || '');
        setStatus(initialData?.status || 'occupied');
        setNotes(initialData?.notes || '');
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!ownerId || !address.trim()) return;
        onSubmit({
            id: initialData?.id,
            ownerId,
            name: name.trim() || address.trim(),
            address: address.trim(),
            status,
            notes: notes.trim(),
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Imóvel' : 'Novo Imóvel'}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Proprietário</label>
                    <select value={ownerId} onChange={(e) => setOwnerId(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-lg bg-white font-bold" required>
                        <option value="">Selecione</option>
                        {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.currentTarget.value as ManagedPropertyStatus)} className="w-full p-3 border border-gray-200 rounded-lg bg-white font-bold">
                        <option value="occupied">Ocupado</option>
                        <option value="vacant">Vago</option>
                        <option value="maintenance">Manutenção</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nome curto</label>
                    <input value={name} onChange={(e) => setName(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-lg font-bold" placeholder="Ex: Apto 101 Rua A" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Endereço</label>
                    <input value={address} onChange={(e) => setAddress(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-lg font-bold" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Observações</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} rows={3} className="w-full p-3 border border-gray-200 rounded-lg" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-lg font-black text-xs uppercase">Cancelar</button>
                    <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-black text-xs uppercase">Salvar</button>
                </div>
            </form>
        </Modal>
    );
};

const MaintenanceEventModal = ({
    context,
    onClose,
    onSubmit,
}: {
    context: { property: ManagedProperty; rental?: Rental } | null;
    onClose: () => void;
    onSubmit: (payload: MaintenancePayload) => void;
}) => {
    const [title, setTitle] = useState('Pintura');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [ownerAuthorized, setOwnerAuthorized] = useState(true);

    useEffect(() => {
        if (context) {
            setTitle('Pintura');
            setDate(new Date().toISOString().split('T')[0]);
            setReason('');
            setOwnerAuthorized(true);
        }
    }, [context]);

    if (!context) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !reason.trim()) return;
        onSubmit({ title: title.trim(), date, reason: reason.trim(), ownerAuthorized });
    };

    return (
        <Modal isOpen={!!context} onClose={onClose} title="Registrar Obra Conectada">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <p className="text-xs font-black uppercase text-indigo-400">Imóvel</p>
                    <p className="font-black text-indigo-900">{context.property.name || context.property.address}</p>
                    <p className="text-sm font-bold text-indigo-600">{context.rental ? `Inquilino atual: ${context.rental.tenantName}` : 'Sem inquilino ativo neste mês'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Serviço</label>
                        <input value={title} onChange={(e) => setTitle(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-lg font-bold" required />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Data</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} className="w-full p-3 border border-gray-200 rounded-lg font-bold" required />
                    </div>
                </div>
                <label className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-3 font-bold text-sm">
                    <input type="checkbox" checked={ownerAuthorized} onChange={(e) => setOwnerAuthorized(e.currentTarget.checked)} className="w-4 h-4" />
                    Proprietário autorizou
                </label>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Motivo</label>
                    <textarea value={reason} onChange={(e) => setReason(e.currentTarget.value)} rows={4} className="w-full p-3 border border-gray-200 rounded-lg" required placeholder="Ex: solicitação do inquilino por desgaste na parede da sala" />
                </div>
                <div className="flex justify-end gap-2 border-t pt-4">
                    <button type="button" onClick={onClose} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-lg font-black text-xs uppercase">Cancelar</button>
                    <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-black text-xs uppercase">Registrar</button>
                </div>
            </form>
        </Modal>
    );
};
