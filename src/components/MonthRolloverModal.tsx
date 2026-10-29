import React, { useState, useEffect } from 'react';
import { VisitItem, formatMonthYearBr, getWeekdayName, getNextYearMonth } from '../types';
import { HOSPITAL_PRESETS } from '../data/initialData';
import {
  CalendarDays,
  Plus,
  Trash2,
  X,
  Check,
  Building2,
  Clock,
  Calendar,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';

interface MonthRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newVisits: VisitItem[], targetYearMonth: string) => void;
  currentYearMonth: string;
  existingVisits: VisitItem[];
}

interface VenueDraft {
  name: string;
  addr: string;
  date: string;
  time: string;
  slotCount: number;
  notes?: string;
}

export const MonthRolloverModal: React.FC<MonthRolloverModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentYearMonth,
  existingVisits,
}) => {
  const nextMonthDefault = getNextYearMonth(currentYearMonth || new Date().toISOString().slice(0, 7));
  const [targetYearMonth, setTargetYearMonth] = useState<string>(nextMonthDefault);
  const [venues, setVenues] = useState<VenueDraft[]>([]);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializa a lista de locais sugeridos quando o modal abre, replicando o mês anterior
  useEffect(() => {
    if (!isOpen) {
      setError('');
      return;
    }

    const [tYear, tMonth] = targetYearMonth.split('-').map(Number);
    
    // Procura visitas do mês anterior para replicar os locais habituais
    const prevVisits = existingVisits.filter((v) => v.date && v.date.startsWith(currentYearMonth));

    let drafts: VenueDraft[] = [];

    if (prevVisits.length > 0) {
      // Replicar os locais do mês anterior ajustando para as mesmas semanas/dias se possível
      drafts = prevVisits.map((v) => {
        const oldDay = parseInt(v.date.slice(8, 10), 10);
        const lastDayOfTarget = new Date(tYear, tMonth, 0).getDate();
        const safeDay = Math.min(oldDay, lastDayOfTarget);
        const dayStr = String(safeDay).padStart(2, '0');
        const newDate = `${targetYearMonth}-${dayStr}`;

        return {
          name: v.name,
          addr: v.addr,
          date: newDate,
          time: v.time || '10:00',
          slotCount: Math.max(v.slots ? v.slots.length : 3, 2),
          notes: v.notes || '',
        };
      });
    } else {
      // Caso não haja visitas no mês anterior, usa os presets de hospitais com datas distribuídas
      const defaultTimes = ['10:00', '16:00', '19:30', '17:00'];
      const defaultDays = ['05', '12', '19', '21'];
      drafts = HOSPITAL_PRESETS.map((p, idx) => ({
        name: p.name,
        addr: p.addr,
        date: `${targetYearMonth}-${defaultDays[idx] || '10'}`,
        time: defaultTimes[idx] || '16:00',
        slotCount: 3,
        notes: '',
      }));
    }

    setVenues(drafts);
    setError('');
  }, [isOpen, targetYearMonth, currentYearMonth, existingVisits]);

  if (!isOpen) return null;

  const handleYearMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val && val.length === 7) {
      setTargetYearMonth(val);
      // Atualizar as datas dos locais existentes para o novo ano-mês
      setVenues((prev) =>
        prev.map((v) => {
          const oldDay = v.date.slice(8, 10) || '05';
          return {
            ...v,
            date: `${val}-${oldDay}`,
          };
        })
      );
    }
  };

  const handleVenueChange = (index: number, field: keyof VenueDraft, val: any) => {
    setVenues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleApplyPreset = (index: number, preset: { name: string; addr: string }) => {
    setVenues((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name: preset.name, addr: preset.addr };
      return next;
    });
  };

  const handleAddVenue = () => {
    setVenues((prev) => [
      ...prev,
      {
        name: '',
        addr: '',
        date: `${targetYearMonth}-15`,
        time: '16:00',
        slotCount: 3,
        notes: '',
      },
    ]);
  };

  const handleRemoveVenue = (index: number) => {
    if (venues.length <= 1) {
      setError('A escala deve conter ao menos um local de visita.');
      return;
    }
    setVenues((prev) => prev.filter((_, i) => i !== index));
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetYearMonth) {
      setError('Por favor, selecione o mês e ano da nova escala.');
      return;
    }

    // Validar se todos os locais possuem nome, endereço e data válida
    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      if (!v.name.trim()) {
        setError(`O local #${i + 1} precisa ter um nome preenchido.`);
        return;
      }
      if (!v.addr.trim()) {
        setError(`O local "${v.name}" precisa ter um endereço informado.`);
        return;
      }
      if (!v.date || !v.date.startsWith(targetYearMonth)) {
        setError(`A data do local "${v.name}" deve pertencer ao mês ${formatMonthYearBr(targetYearMonth)}.`);
        return;
      }
    }

    setIsSubmitting(true);

    // Gerar os novos registros com IDs únicos para o mês, vagas abertas e resumos limpos
    const nowTs = Date.now();
    const newVisitItems: VisitItem[] = venues.map((v, index) => {
      const timeClean = v.time ? v.time.replace(':', 'h') : '10h';
      const uniqueId = `visit-${v.date}-${timeClean}-${nowTs + index}`;

      // Cria as vagas de voluntários totalmente limpas / abertas
      const cleanSlots = Array(Math.max(v.slotCount, 1)).fill('');

      return {
        id: uniqueId,
        name: v.name.trim(),
        addr: v.addr.trim(),
        date: v.date,
        time: v.time || '10:00',
        slots: cleanSlots,
        notes: v.notes?.trim() || undefined,
        visitSummary: undefined,
        completedBy: undefined,
        completedAt: undefined,
        isCompleted: false,
      };
    });

    onConfirm(newVisitItems, targetYearMonth);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FBF9F2] w-full max-w-2xl rounded-2xl shadow-2xl border-2 border-[#123C6B]/20 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 text-[#1E2A3F]">
        {/* Cabeçalho do Modal */}
        <div className="bg-[#123C6B] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="w-5 h-5 text-[#F6D269]" />
            <div>
              <h3 className="font-serif font-bold text-lg text-white leading-tight">
                Virada de Mês — Nova Escala de Visitas
              </h3>
              <p className="text-[11px] font-mono text-[#F6D269]">
                Planejar escala com dados e resumos limpos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Banner Informativo sobre a Regra de Ouro */}
          <div className="bg-[#123C6B]/10 border border-[#123C6B]/20 rounded-xl p-3.5 text-xs text-[#123C6B] flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-[#123C6B] flex-shrink-0 mt-0.5" />
            <div>
              <strong>Regra de Preservação e Limpeza:</strong> Ao virar o mês, a nova escala inicia com <strong>todas as vagas abertas</strong> e os <strong>resumos de visita em branco na tela</strong>. As visitas dos meses anteriores permanecem gravadas permanentemente no banco de dados para consulta a qualquer momento.
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleção do Mês de Destino */}
          <div className="bg-white p-4 rounded-xl border border-[#1E2A3F]/15 shadow-2xs">
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#123C6B] mb-1.5">
              📅 Mês e Ano da Nova Escala:
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="month"
                value={targetYearMonth}
                onChange={handleYearMonthChange}
                required
                className="bg-[#FBF9F2] border border-[#A9834C]/50 rounded-lg px-3 py-2 text-sm font-mono font-bold text-[#123C6B] outline-none cursor-pointer focus:border-[#123C6B] shadow-2xs"
              />
              <span className="font-serif italic text-base text-[#123C6B] font-semibold">
                {formatMonthYearBr(targetYearMonth)}
              </span>
            </div>
          </div>

          {/* Lista de Locais para o Novo Mês */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-base text-[#123C6B] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#A9834C]" />
                <span>Locais e Horários da Escala ({venues.length})</span>
              </h4>
              <button
                type="button"
                onClick={handleAddVenue}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-[#123C6B] text-[#123C6B] font-mono text-xs font-semibold hover:bg-[#123C6B]/10 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Local</span>
              </button>
            </div>

            {venues.map((venue, idx) => {
              const weekday = getWeekdayName(venue.date);

              return (
                <div
                  key={idx}
                  className="bg-white border border-[#1E2A3F]/15 rounded-xl p-3.5 sm:p-4 shadow-2xs relative space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-dashed border-[#1E2A3F]/15 pb-2">
                    <span className="font-mono text-xs font-bold text-[#123C6B] bg-[#FBF9F2] px-2 py-0.5 rounded border border-[#123C6B]/20">
                      #{idx + 1}
                    </span>

                    {/* Sugestões Rápidas de Hospitais */}
                    <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] sm:max-w-none py-0.5">
                      <span className="text-[10px] font-mono text-[#A9834C] whitespace-nowrap flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> Preencher:
                      </span>
                      {HOSPITAL_PRESETS.map((p, pi) => (
                        <button
                          key={pi}
                          type="button"
                          onClick={() => handleApplyPreset(idx, p)}
                          className="text-[10px] font-mono bg-[#FBF9F2] hover:bg-[#123C6B] hover:text-white border border-[#A9834C]/30 px-1.5 py-0.5 rounded text-[#123C6B] whitespace-nowrap transition-colors cursor-pointer"
                          title={p.name}
                        >
                          {p.name.split('–')[0].replace('Hospital ', '').replace('Clínica ', '').trim()}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveVenue(idx)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 cursor-pointer transition-colors"
                      title="Remover este local"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#1E2A3F]/70 mb-1 font-semibold">
                        Nome da Instituição:
                      </label>
                      <input
                        type="text"
                        value={venue.name}
                        onChange={(e) => handleVenueChange(idx, 'name', e.target.value)}
                        placeholder="Ex: Clínica da Gávea"
                        required
                        className="w-full bg-[#FBF9F2] border border-[#1E2A3F]/20 rounded px-2.5 py-1.5 text-xs font-serif font-bold text-[#123C6B] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#1E2A3F]/70 mb-1 font-semibold">
                        Endereço Completo:
                      </label>
                      <input
                        type="text"
                        value={venue.addr}
                        onChange={(e) => handleVenueChange(idx, 'addr', e.target.value)}
                        placeholder="Rua, Número e Bairro"
                        required
                        className="w-full bg-[#FBF9F2] border border-[#1E2A3F]/20 rounded px-2.5 py-1.5 text-xs font-mono text-[#4A5568] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#1E2A3F]/70 mb-1 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#123C6B]" />
                        <span>Data ({weekday || 'Dia'}):</span>
                      </label>
                      <input
                        type="date"
                        value={venue.date}
                        onChange={(e) => handleVenueChange(idx, 'date', e.target.value)}
                        required
                        className="w-full bg-[#FBF9F2] border border-[#A9834C]/40 rounded px-2 py-1.5 text-xs font-mono font-bold text-[#123C6B] outline-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#1E2A3F]/70 mb-1 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#123C6B]" />
                        <span>Horário:</span>
                      </label>
                      <input
                        type="time"
                        value={venue.time}
                        onChange={(e) => handleVenueChange(idx, 'time', e.target.value)}
                        required
                        className="w-full bg-[#FBF9F2] border border-[#A9834C]/40 rounded px-2 py-1.5 text-xs font-mono font-bold text-[#123C6B] outline-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-[#1E2A3F]/70 mb-1 font-semibold">
                        Vagas Abertas:
                      </label>
                      <select
                        value={venue.slotCount}
                        onChange={(e) => handleVenueChange(idx, 'slotCount', parseInt(e.target.value, 10))}
                        className="w-full bg-[#FBF9F2] border border-[#1E2A3F]/20 rounded px-2 py-1.5 text-xs font-mono font-medium text-[#1E2A3F] outline-none cursor-pointer"
                      >
                        <option value={2}>2 vagas abertas</option>
                        <option value={3}>3 vagas abertas</option>
                        <option value={4}>4 vagas abertas</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botões de Ação do Rodapé */}
          <div className="pt-4 border-t border-[#1E2A3F]/15 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full font-mono text-xs font-semibold text-[#4A5568] hover:bg-black/5 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs font-bold uppercase tracking-wider bg-gradient-to-br from-[#E4C687] to-[#C7A25C] text-[#2A1F0A] border border-[#8A6A38] shadow-md hover:brightness-105 cursor-pointer transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-[#2A1F0A]" />
              <span>Confirmar e Iniciar Escala de {formatMonthYearBr(targetYearMonth)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
