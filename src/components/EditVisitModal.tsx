import React, { useState, useEffect } from 'react';
import { VisitItem, getWeekdayName } from '../types';
import { HOSPITAL_PRESETS } from '../data/initialData';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Plus,
  Trash2,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

interface EditVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visit: VisitItem) => void;
  initialVisit?: VisitItem | null;
}

export const EditVisitModal: React.FC<EditVisitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialVisit,
}) => {
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [slots, setSlots] = useState<string[]>(['', '', '']);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialVisit) {
      setName(initialVisit.name);
      setAddr(initialVisit.addr);
      setDate(initialVisit.date);
      setTime(initialVisit.time);
      setSlots(initialVisit.slots.length ? [...initialVisit.slots] : ['', '', '']);
      setNotes(initialVisit.notes || '');
    } else {
      // Default new item
      setName('');
      setAddr('');
      const todayStr = new Date().toISOString().slice(0, 10);
      setDate(todayStr);
      setTime('16:00');
      setSlots(['', '', '']);
      setNotes('');
    }
    setError('');
  }, [initialVisit, isOpen]);

  if (!isOpen) return null;

  const weekday = getWeekdayName(date);

  const handleApplyPreset = (preset: { name: string; addr: string }) => {
    setName(preset.name);
    setAddr(preset.addr);
  };

  const handleAddSlot = () => {
    setSlots([...slots, '']);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, val: string) => {
    const next = [...slots];
    next[index] = val;
    setSlots(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe o nome do local/instituição.');
      return;
    }
    if (!addr.trim()) {
      setError('Por favor, informe o endereço do local.');
      return;
    }
    if (!date) {
      setError('Por favor, selecione a data da visita.');
      return;
    }
    if (!time) {
      setError('Por favor, informe o horário da visita.');
      return;
    }

    const newVisit: VisitItem = {
      id: initialVisit ? initialVisit.id : `visit-${Date.now()}`,
      name: name.trim(),
      addr: addr.trim(),
      date,
      time,
      slots: slots.map((s) => s.trim()),
      notes: notes.trim() || undefined,
    };

    onSave(newVisit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FBF9F2] w-full max-w-xl rounded-xl shadow-2xl border border-[#1E2A3F]/20 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#123C6B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#E4C687]" />
            <h3 className="font-serif font-semibold text-lg text-white">
              {initialVisit ? 'Editar Dados do Local de Visita' : 'Novo Local de Visita'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
              ⚠️ {error}
            </div>
          )}

          {/* Quick Presets */}
          {!initialVisit && (
            <div>
              <label className="block text-xs font-mono text-[#A9834C] font-semibold mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Sugestões Rápidas de Unidades de Saúde:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {HOSPITAL_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-[11px] bg-white hover:bg-[#123C6B] text-[#1E2A3F] hover:text-white border border-[#1E2A3F]/15 px-2.5 py-1 rounded transition-colors"
                  >
                    🏥 {preset.name.split('–')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nome do Local */}
          <div>
            <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1 flex items-center gap-1.5">
              <span>🏥</span>
              <span>Nome do Local / Instituição:</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Clínica da Gávea – Unidade Tijuca"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-sm text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
            />
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1 flex items-center gap-1.5">
              <span>📍</span>
              <span>Endereço Completo:</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Rua Dr. Pereira dos Santos, N° 18 – Tijuca"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-sm text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
            />
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#A9834C]" />
                <span>Data da Visita:</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-sm text-[#1E2A3F] font-mono focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
              />
              {weekday && (
                <span className="block text-[11px] text-[#A9834C] font-mono mt-0.5">
                  🗓️ {weekday}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#A9834C]" />
                <span>Horário:</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-sm text-[#1E2A3F] font-mono focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
              />
            </div>
          </div>

          {/* Vagas de Companheiro(a)s */}
          <div className="pt-2 border-t border-dashed border-[#1E2A3F]/15">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono text-[#1E2A3F] font-semibold flex items-center gap-1.5 uppercase tracking-wider text-[#A9834C]">
                <Users className="w-3.5 h-3.5" />
                <span>Vagas de Companheiro(a)s:</span>
              </label>
              <button
                type="button"
                onClick={handleAddSlot}
                className="text-xs font-mono text-[#123C6B] hover:text-[#1E5A9C] font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Adicionar Vaga
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#123C6B] text-white text-xs font-mono flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={`Nome do companheiro(a) ${idx + 1} (ou deixe vazio para vaga aberta)`}
                    value={slot}
                    onChange={(e) => handleSlotChange(idx, e.target.value)}
                    className="flex-1 bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-1.5 text-xs text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
                  />
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remover vaga"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observações / Orientações */}
          <div>
            <label className="block text-xs font-mono text-[#4A5568] font-medium mb-1">
              Observações / Instruções (opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Levar crachá, recepção no 2º andar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/20 rounded-md px-3 py-1.5 text-xs text-[#1E2A3F] focus:outline-none focus:ring-1 focus:ring-[#A9834C]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1E2A3F]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-[#1E2A3F]/30 text-[#1E2A3F] hover:bg-[#1E2A3F]/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded bg-[#123C6B] hover:bg-[#1E5A9C] text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Local</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
