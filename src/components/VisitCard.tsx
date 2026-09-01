import React from 'react';
import {
  VisitItem,
  VisitStatus,
  getVisitStatus,
  getWeekdayName,
  formatDateBr,
  formatTimeBr,
} from '../types';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  Edit3,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from 'lucide-react';

interface VisitCardProps {
  visit: VisitItem;
  index: number;
  referenceDate?: Date;
  onEdit: (visit: VisitItem) => void;
  onDelete: (id: string) => void;
  onUpdateSlots: (id: string, slots: string[]) => void;
  onDuplicate: (visit: VisitItem) => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  index,
  referenceDate,
  onEdit,
  onDelete,
  onUpdateSlots,
  onDuplicate,
}) => {
  const status: VisitStatus = getVisitStatus(visit.date, referenceDate);
  const weekday = getWeekdayName(visit.date);
  const dateFormatted = formatDateBr(visit.date);
  const timeFormatted = formatTimeBr(visit.time);

  // Styling based on status rule:
  // - today / tomorrow: Green font
  // - past: Strong Red font
  // - normal / future: Classic AA Navy Blue font
  let venueNameColorClass = 'text-[#29166F]';
  let statusBadge = null;
  let cardBorderClass = 'border-[#1E2A3F]/15';
  let cardBgClass = 'bg-white';

  if (status === 'today') {
    venueNameColorClass = 'text-emerald-700';
    cardBorderClass = 'border-emerald-400/80 ring-1 ring-emerald-300';
    cardBgClass = 'bg-emerald-50/20';
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
        Hoje
      </span>
    );
  } else if (status === 'tomorrow') {
    venueNameColorClass = 'text-emerald-700';
    cardBorderClass = 'border-emerald-300';
    cardBgClass = 'bg-emerald-50/15';
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
        <Clock3 className="w-3 h-3 text-emerald-600" />
        Amanhã
      </span>
    );
  } else if (status === 'past') {
    venueNameColorClass = 'text-red-700';
    cardBorderClass = 'border-red-300';
    cardBgClass = 'bg-red-50/15';
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300 shadow-xs">
        <CheckCircle2 className="w-3 h-3 text-red-600" />
        Concluído
      </span>
    );
  } else {
    statusBadge = (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#123C6B]/10 text-[#123C6B]">
        Programado
      </span>
    );
  }

  const handleSlotNameChange = (slotIndex: number, newName: string) => {
    const updated = [...visit.slots];
    updated[slotIndex] = newName;
    onUpdateSlots(visit.id, updated);
  };

  const handleAddSlot = () => {
    const updated = [...visit.slots, ''];
    onUpdateSlots(visit.id, updated);
  };

  const handleRemoveSlot = (slotIndex: number) => {
    const updated = visit.slots.filter((_, i) => i !== slotIndex);
    onUpdateSlots(visit.id, updated);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${visit.name}, ${visit.addr}`
  )}`;

  const copySingleVisit = () => {
    const slotsTxt = visit.slots.length
      ? visit.slots
          .map((s) => (s.trim() ? `▪️ ${s.trim()}` : `▪️ (vaga aberta)`))
          .join('\n')
      : '▪️ (nenhuma vaga)';

    const text = `🗓️ ${dateFormatted} – ${weekday} | ${timeFormatted}\n\n🏥 ${visit.name}\n📍 ${visit.addr}\n\nCompanheiro(a)s:\n${slotsTxt}`;

    navigator.clipboard.writeText(text);
    alert('Informações desta visita copiadas!');
  };

  const filledCount = visit.slots.filter((s) => s.trim().length > 0).length;
  const openCount = visit.slots.length - filledCount;

  return (
    <section
      className={`${cardBgClass} border ${cardBorderClass} rounded-lg mb-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden relative`}
    >
      {/* Top Header Row with Date, Time, Badges, and Quick Action buttons */}
      <div className="bg-[#FAF8F2] px-5 py-3 border-b border-[#1E2A3F]/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Data e Hora com ícones */}
          <div className="flex items-center gap-1.5 font-mono font-semibold text-sm text-[#1E2A3F] bg-white px-2.5 py-1 rounded border border-[#1E2A3F]/15 shadow-xs">
            <Calendar className="w-4 h-4 text-[#A9834C]" />
            <span>{dateFormatted}</span>
            <span className="text-[#4A5568] font-normal">({weekday})</span>
            <span className="text-[#A9834C] mx-1">|</span>
            <Clock className="w-3.5 h-3.5 text-[#A9834C]" />
            <span className="text-[#A9834C]">{timeFormatted}</span>
          </div>

          {/* Status Badge (Hoje, Amanhã, Concluído, Programado) */}
          {statusBadge}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={copySingleVisit}
            title="Copiar texto desta visita"
            className="p-1.5 rounded hover:bg-white text-[#4A5568] hover:text-[#123C6B] transition-colors border border-transparent hover:border-[#1E2A3F]/10"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(visit)}
            title="Editar todos os dados deste local"
            className="flex items-center gap-1 text-xs font-mono font-medium px-2.5 py-1 bg-white hover:bg-[#123C6B] text-[#123C6B] hover:text-white border border-[#123C6B]/30 rounded transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Local</span>
          </button>
          <button
            onClick={() => onDelete(visit.id)}
            title="Remover esta visita"
            className="p-1.5 rounded hover:bg-red-50 text-[#4A5568] hover:text-red-600 transition-colors border border-transparent hover:border-red-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5">
        {/* Local do Hospital/Clínica com ícone 🏥 e cor dinâmica conforme o status */}
        <div className="mb-3">
          <div className="flex items-start gap-2.5">
            <span className="text-xl leading-none flex-shrink-0 mt-0.5 select-none" title="Hospital / Clínica">
              🏥
            </span>
            <div>
              <h2
                className={`text-xl sm:text-2xl font-serif font-bold tracking-tight ${venueNameColorClass} transition-colors duration-150`}
              >
                {visit.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Endereço com ícone 📍 e link para Google Maps */}
        <div className="mb-5 flex items-start gap-2.5 text-xs sm:text-sm text-[#4A5568] font-mono pl-0.5">
          <span className="text-base leading-none flex-shrink-0 select-none" title="Endereço">
            📍
          </span>
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <span>{visit.addr}</span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-[#1E5A9C] hover:underline font-sans"
              title="Abrir rota no Google Maps"
            >
              <span>ver mapa</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {visit.notes && (
          <div className="mb-4 text-xs italic text-[#4A5568] bg-[#FBF9F2] px-3 py-1.5 rounded border border-[#1E2A3F]/10">
            💬 {visit.notes}
          </div>
        )}

        {/* Companheiro(a)s / Vagas */}
        <div className="pt-3 border-t border-dashed border-[#1E2A3F]/15">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#A9834C]">
              <Users className="w-3.5 h-3.5" />
              <span>Companheiro(a)s voluntários:</span>
            </div>
            <div className="text-xs text-[#4A5568] font-mono">
              <span className="text-emerald-700 font-bold">{filledCount} preenchida(s)</span>
              {openCount > 0 && (
                <span className="text-red-700 font-bold ml-1.5">({openCount} aberta{openCount > 1 ? 's' : ''})</span>
              )}
            </div>
          </div>

          {/* Slots List */}
          <div className="flex flex-wrap items-center gap-2.5">
            {visit.slots.map((slotName, slotIdx) => {
              const isOpen = !slotName || slotName.trim() === '';
              return (
                <div
                  key={slotIdx}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-xs border ${
                    isOpen
                      ? 'bg-red-50 text-red-700 border-dashed border-red-300 hover:border-red-400'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full text-[10.5px] font-mono font-bold flex items-center justify-center text-white flex-shrink-0 ${
                      isOpen ? 'bg-red-600' : 'bg-emerald-700'
                    }`}
                  >
                    {slotIdx + 1}
                  </span>

                  <input
                    type="text"
                    value={slotName}
                    placeholder="vaga aberta (digite o nome)"
                    onChange={(e) => handleSlotNameChange(slotIdx, e.target.value)}
                    className={`bg-transparent outline-none min-w-[130px] sm:min-w-[150px] font-sans text-xs ${
                      isOpen
                        ? 'placeholder:text-red-400 placeholder:italic text-red-700'
                        : 'text-emerald-950 font-semibold'
                    }`}
                  />

                  <button
                    onClick={() => handleRemoveSlot(slotIdx)}
                    title="Remover esta vaga"
                    className="text-inherit opacity-40 hover:opacity-100 p-0.5 rounded-full hover:bg-black/5 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Adicionar Vaga Button */}
            <button
              onClick={handleAddSlot}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono border border-dashed border-[#A9834C] text-[#A9834C] hover:bg-[#A9834C]/10 transition-colors"
              title="Adicionar mais uma vaga para companheiro voluntário"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Vaga</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
