import React, { useState, useEffect } from 'react';
import { VisitItem, formatFullDateBr, formatTimeBr } from '../types';
import { FileText, CheckCircle, X, Save, Clock, User } from 'lucide-react';

interface VisitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSummary: (visitId: string, summary: string, completedBy: string, isCompleted: boolean) => void;
  visit: VisitItem | null;
}

export const VisitSummaryModal: React.FC<VisitSummaryModalProps> = ({
  isOpen,
  onClose,
  onSaveSummary,
  visit,
}) => {
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [markCompleted, setMarkCompleted] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visit) {
      setSummary(visit.visitSummary || '');
      setAuthor(visit.completedBy || (visit.slots.find((s) => s.trim()) || ''));
      setMarkCompleted(visit.isCompleted !== undefined ? visit.isCompleted : true);
    }
  }, [visit, isOpen]);

  if (!isOpen || !visit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onSaveSummary(visit.id, summary.trim(), author.trim(), markCompleted);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FBF9F2] w-full max-w-lg rounded-xl shadow-2xl border border-[#1E2A3F]/20 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#123C6B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E4C687]" />
            <h3 className="font-serif font-semibold text-lg text-white">
              Resumo da Visita
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informações da Visita */}
        <div className="bg-[#123C6B]/5 border-b border-[#1E2A3F]/10 px-6 py-3">
          <div className="font-serif font-bold text-base text-[#1E2A3F]">
            🏥 {visit.name}
          </div>
          <div className="text-xs font-mono text-[#4A5568] flex items-center gap-2 mt-1">
            <span>🗓️ {formatFullDateBr(visit.date)}</span>
            <span>•</span>
            <span>⏰ {formatTimeBr(visit.time)}</span>
          </div>
          <div className="text-xs font-mono text-[#4A5568] mt-0.5">
            📍 {visit.addr}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Como foi a visita (servidores, nº de internos; etc) */}
          <div>
            <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#A9834C]" />
              <span>Como foi a visita (servidores, nº de internos; etc):</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Descreva servidores presentes, nº de internos alcançados, como transcorreu a reunião, etc."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/25 rounded-md p-3 text-sm text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C] leading-relaxed"
            />
          </div>

          {/* Checkbox de Finalização */}
          <div className="bg-white border border-[#1E2A3F]/15 p-3 rounded-md flex items-start gap-2.5">
            <input
              type="checkbox"
              id="markCompletedCheck"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-[#123C6B] rounded border-gray-300 focus:ring-[#A9834C] cursor-pointer"
            />
            <label htmlFor="markCompletedCheck" className="text-xs text-[#1E2A3F] cursor-pointer leading-tight">
              <span className="font-semibold block">Marcar visita como "Já ocorreu"</span>
              <span className="text-[11px] text-[#4A5568]">
                O nome do local ficará em vermelho, riscado e com a etiqueta "Já ocorreu".
              </span>
            </label>
          </div>

          {/* Data de Registro Anterior (se houver) */}
          {visit.completedAt && (
            <div className="text-[11px] font-mono text-[#4A5568] flex items-center gap-1.5 bg-[#DEE9E2]/50 px-3 py-1.5 rounded border border-[#3E6B5C]/20">
              <Clock className="w-3.5 h-3.5 text-[#3E6B5C]" />
              <span>
                Última atualização: {new Date(visit.completedAt).toLocaleString('pt-BR')} por <b>{visit.completedBy || 'Visitante'}</b>
              </span>
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E2A3F]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-[#1E2A3F]/30 text-[#1E2A3F] hover:bg-[#1E2A3F]/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded bg-[#123C6B] hover:bg-[#1E5A9C] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-[#E4C687]" />
              <span>Salvar Resumo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
