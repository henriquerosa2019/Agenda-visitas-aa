import React, { useState } from 'react';
import { Database, Copy, Check, ExternalLink, X, AlertCircle } from 'lucide-react';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (url: string, key: string) => void;
  currentUrl?: string;
  currentKey?: string;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onSaveConfig,
  currentUrl = '',
  currentKey = '',
}) => {
  const [url, setUrl] = useState(currentUrl);
  const [key, setKey] = useState(currentKey);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(url.trim(), key.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FBF9F2] w-full max-w-2xl rounded-xl shadow-2xl border border-[#1E2A3F]/20 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#123C6B] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#E4C687]" />
            <h3 className="font-serif font-semibold text-lg text-white">
              Integração com Supabase (Banco de Dados em Nuvem)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Instruções */}
          <div className="bg-white border border-[#1E2A3F]/15 p-4 rounded-lg space-y-2 text-xs text-[#1E2A3F] leading-relaxed">
            <div className="font-semibold text-sm text-[#123C6B] flex items-center gap-1.5">
              <span>⚡ Como criar a tabela no seu painel do Supabase:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#4A5568]">
              <li>Acesse o seu projeto no <b>Supabase Dashboard</b>.</li>
              <li>Vá no menu lateral esquerdo em <b>SQL Editor</b>.</li>
              <li>Clique em <b>New Query</b>, cole o script SQL abaixo e clique no botão <b>Run</b>.</li>
            </ol>
          </div>

          {/* Código SQL com botão de cópia */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono font-bold text-[#1E2A3F] uppercase tracking-wider">
                Script SQL para criação da tabela (<code className="text-[#A9834C]">aa_visits</code>):
              </label>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-xs font-mono bg-[#123C6B] hover:bg-[#1E5A9C] text-white px-2.5 py-1 rounded shadow-xs cursor-pointer transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Copy className="w-3.5 h-3.5 text-[#E4C687]" />}
                <span>{copied ? 'Copiado!' : 'Copiar Código SQL'}</span>
              </button>
            </div>

            <pre className="bg-[#1E2A3F] text-[#FBF9F2] p-3.5 rounded-lg text-xs font-mono overflow-x-auto max-h-48 leading-relaxed border border-black/30 select-all">
              {SUPABASE_SQL_SCHEMA.trim()}
            </pre>
          </div>

          {/* Formulário de Configuração das Chaves */}
          <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-[#1E2A3F]/15">
            <div className="text-xs font-mono font-bold text-[#A9834C] uppercase tracking-wider">
              Conectar Chaves do seu Projeto Supabase:
            </div>

            <div>
              <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1">
                Project URL (ex: https://xyzcompany.supabase.co):
              </label>
              <input
                type="url"
                placeholder="https://sua-url.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-xs text-[#1E2A3F] font-mono focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#1E2A3F] font-semibold mb-1">
                Anon Public Key (chave pública do Supabase):
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-white border border-[#1E2A3F]/25 rounded-md px-3 py-2 text-xs text-[#1E2A3F] font-mono focus:outline-none focus:ring-2 focus:ring-[#A9834C]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider rounded border border-[#1E2A3F]/30 text-[#1E2A3F] hover:bg-[#1E2A3F]/5 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded bg-[#123C6B] hover:bg-[#1E5A9C] text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 text-[#E4C687]" />
                <span>Salvar e Conectar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
