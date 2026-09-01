import React from 'react';
import { Calendar, CheckCircle2, Clock, Sparkles, RefreshCw } from 'lucide-react';

interface StatusLegendProps {
  referenceDate: string; // YYYY-MM-DD
  onReferenceDateChange: (date: string) => void;
  onResetToToday: () => void;
  isSimulated: boolean;
}

export const StatusLegend: React.FC<StatusLegendProps> = ({
  referenceDate,
  onReferenceDateChange,
  onResetToToday,
  isSimulated,
}) => {
  return (
    <div className="bg-[#F2EFE3] border border-[#1E2A3F]/15 rounded-lg p-4 mb-6 text-sm text-[#1E2A3F]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#1E2A3F]/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A9834C]" />
          <span className="font-semibold text-xs tracking-wider uppercase font-mono text-[#A9834C]">
            Sinalização Automática de Datas
          </span>
        </div>

        {/* Simulador de Data de Referência */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#4A5568] flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            Data de referência:
          </span>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => onReferenceDateChange(e.target.value)}
            className="bg-white border border-[#1E2A3F]/20 rounded px-2 py-1 text-xs font-mono text-[#1E2A3F] focus:outline-none focus:ring-1 focus:ring-[#A9834C]"
            title="Escolha uma data para visualizar o status das visitas naquele dia"
          />
          {isSimulated && (
            <button
              onClick={onResetToToday}
              className="flex items-center gap-1 text-[11px] bg-[#123C6B] text-white px-2 py-1 rounded hover:bg-[#1E5A9C] transition-colors"
              title="Voltar para a data real de hoje"
            >
              <RefreshCw className="w-3 h-3" />
              Hoje Real
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
        {/* Status Verde */}
        <div className="flex items-center gap-2 p-2 rounded bg-emerald-50 border border-emerald-200/70">
          <span className="w-3 h-3 rounded-full bg-emerald-600 flex-shrink-0 shadow-sm animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-emerald-800">Fonte Verde</span>
            <span className="text-emerald-700 block text-[11px]">
              Compromisso <b>hoje</b> ou no <b>dia seguinte</b> (amanhã)
            </span>
          </div>
        </div>

        {/* Status Vermelho */}
        <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200/70">
          <span className="w-3 h-3 rounded-full bg-red-600 flex-shrink-0 shadow-sm" />
          <div className="text-xs">
            <span className="font-bold text-red-800">Vermelho Forte</span>
            <span className="text-red-700 block text-[11px]">
              Dia <b>concluído</b> / visita já realizada
            </span>
          </div>
        </div>

        {/* Status Normal */}
        <div className="flex items-center gap-2 p-2 rounded bg-blue-50/60 border border-blue-200/70">
          <span className="w-3 h-3 rounded-full bg-[#29166F] flex-shrink-0 shadow-sm" />
          <div className="text-xs">
            <span className="font-bold text-[#29166F]">Fonte Normal (Azul)</span>
            <span className="text-[#4A5568] block text-[11px]">
              Visitas futuras ao longo do mês / início do mês
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
