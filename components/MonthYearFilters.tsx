import React from 'react';
import { X, Plus, Calendar } from 'lucide-react';

interface MonthYearFiltersProps {
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    availableYears: number[];
    selectedMonth: string;
    setSelectedMonth: (month: string) => void;
    availableMonths: string[];
    onAddNewMonth: () => void;
    onDeleteMonth: (month: string, year: number) => void;
    onDeleteYear: (year: number) => void;
}

export const MonthYearFilters: React.FC<MonthYearFiltersProps> = ({
    selectedYear, setSelectedYear, availableYears,
    selectedMonth, setSelectedMonth, availableMonths,
    onAddNewMonth, onDeleteMonth, onDeleteYear
}) => {
    const monthOrder = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    return (
        <div className="flex flex-col gap-4 bg-white/40 backdrop-blur-sm p-2 rounded-[2rem] border border-white/60 shadow-inner">
            {/* Anos: Scroll Horizontal Sleek */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <div className="flex items-center gap-1 bg-gray-100/50 p-1.5 rounded-2xl border border-gray-200/50">
                    <Calendar size={14} className="mx-2 text-gray-400" />
                    {availableYears.map(year => (
                        <div key={year} className="relative group flex items-center">
                            <button
                                onClick={() => setSelectedYear(year)}
                                className={`px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedYear === year ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-gray-500 hover:bg-white hover:text-indigo-600'}`}
                            >
                                {year}
                            </button>
                            <button
                                onClick={() => onDeleteYear(year)}
                                className="absolute -right-1 -top-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white shadow-sm"
                            >
                                <X size={8} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Meses: Compact Segments */}
            <div className="flex flex-wrap items-center gap-1.5">
                {(availableMonths.length > 0 ? availableMonths : [selectedMonth]).map(month => (
                    <div key={month} className="relative group flex items-center">
                        <button
                            onClick={() => setSelectedMonth(month)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all border ${selectedMonth === month ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            {month}
                        </button>
                        <button
                            onClick={() => onDeleteMonth(month, selectedYear)}
                            className="absolute -right-1 -top-1 p-0.5 bg-red-400 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 border border-white"
                        >
                            <X size={8} />
                        </button>
                    </div>
                ))}

                <button
                    onClick={onAddNewMonth}
                    className="ml-2 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                    title="Copiar para o Próximo Mês"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
};
