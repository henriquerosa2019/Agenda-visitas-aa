import React, { useState, useEffect } from 'react';
import { X, Check, FileText } from 'lucide-react';

interface EditGroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  objective: string;
  onSave: (groupName: string, objective: string) => void;
}

export const EditGroupInfoModal: React.FC<EditGroupInfoModalProps> = ({
  isOpen,
  onClose,
  groupName: initialGroupName,
  objective: initialObjective,
  onSave,
}) => {
  const [groupName, setGroupName] = useState(initialGroupName);
  const [objective, setObjective] = useState(initialObjective);

  useEffect(() => {
    setGroupName(initialGroupName);
    setObjective(initialObjective);
  }, [initialGroupName, initialObjective, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(groupName.trim() || 'Grupo de Serviços AA', objective.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] w-full max-w-md rounded-xl shadow-2xl border border-[#1E2A3F]/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#123C6B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E4C687]" />
            <h3 className="font-serif font-semibold text-lg text-white">
              Editar Cabeçalho da Escala
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1">
              Nome do Grupo de Serviços:
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-sm text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1">
              Objetivo / Propósito do Grupo:
            </label>
            <textarea
              rows={3}
              required
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-xs text-[#1E2A3F] focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1E2A3F]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase rounded border border-[#1E2A3F]/30 text-[#1E2A3F] hover:bg-[#1E2A3F]/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded bg-[#123C6B] hover:bg-[#1E5A9C] text-white shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Cabeçalho</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
