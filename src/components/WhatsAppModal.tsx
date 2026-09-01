import React, { useState } from 'react';
import { AgendaData, generateWhatsAppSummary } from '../types';
import { MessageSquare, Copy, Check, X } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  agenda: AgendaData;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  agenda,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const text = generateWhatsAppSummary(agenda);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FBF9F2] w-full max-w-lg rounded-xl shadow-2xl border border-[#1E2A3F]/20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-[#075E54] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
            <h3 className="font-serif font-semibold text-lg">
              Compartilhar Escala no WhatsApp
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-[#4A5568] mb-3">
            O texto abaixo está pronto e formatado com todos os emojis para colar diretamente no grupo de WhatsApp:
          </p>

          <div className="bg-white p-3.5 rounded-lg border border-[#1E2A3F]/15 font-mono text-xs text-[#1E2A3F] max-h-72 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed shadow-inner">
            {text}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase rounded border border-[#1E2A3F]/20 text-[#1E2A3F] hover:bg-[#1E2A3F]/5"
            >
              Fechar
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded bg-[#25D366] hover:bg-[#1ebd59] text-white shadow-md flex items-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
