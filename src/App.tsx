import React, { useState, useEffect, useRef } from 'react';
import {
  AgendaData,
  VisitItem,
  sortVisitsAscending,
  getWeekdayName,
  getVisitStatus,
  formatFullDateBr,
  formatTimeBr,
} from './types';
import { INITIAL_AGENDA } from './data/initialData';
import { AALogo } from './components/AALogo';
import { EditVisitModal } from './components/EditVisitModal';
import { VisitSummaryModal } from './components/VisitSummaryModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import {
  getSupabaseClient,
  getSupabaseConfig,
  saveSupabaseConfig,
  fetchVisitsFromSupabase,
  upsertVisitToSupabase,
  bulkUpsertVisits,
  deleteVisitFromSupabase,
  subscribeToVisitsChanges,
  mergeLocalAndRemoteVisits,
} from './lib/supabase';
import {
  FileText,
  CheckCircle2,
  MessageSquareText,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Database,
} from 'lucide-react';

const CURRENT_STORAGE_KEY = 'escala_visitas_aa_data_v8';

type SyncStatus = 'idle' | 'syncing' | 'connected' | 'error' | 'offline';

export default function App() {
  const [state, setState] = useState<AgendaData>(() => {
    // Limpeza de chaves antigas de teste do navegador
    try {
      localStorage.removeItem('escala_visitas_aa_data_v5');
      localStorage.removeItem('escala_visitas_aa_data_v6');
      localStorage.removeItem('escala_visitas_aa_data_v7');
    } catch (e) {}

    try {
      const saved = localStorage.getItem(CURRENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.visits) && parsed.visits.length > 0) {
          const cleanedVisits = parsed.visits.map((v: VisitItem) => {
            if (v.id === 'sept-14-10h' || v.name.toLowerCase().includes('gávea')) {
              return {
                ...v,
                visitSummary: undefined,
                completedBy: undefined,
                completedAt: undefined,
                isCompleted: false,
              };
            }
            return v;
          });
          return {
            groupName: parsed.groupName || INITIAL_AGENDA.groupName,
            objective: parsed.objective || INITIAL_AGENDA.objective,
            visits: sortVisitsAscending(cleanedVisits),
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_AGENDA;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitItem | null>(null);

  // Modal de Resumo da Visita
  const [summaryModalOpen, setSummaryModalOpen] = useState<boolean>(false);
  const [summaryVisit, setSummaryVisit] = useState<VisitItem | null>(null);

  // Modal de Configuração do Supabase
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // Debounce timers para digitação de voluntários
  const debounceTimers = useRef<{ [key: string]: any }>({});

  // Salvar no LocalStorage como cache offline de segurança
  useEffect(() => {
    try {
      localStorage.setItem(CURRENT_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  }, [state]);

  // Função para sincronizar dados com o Supabase
  const syncFromSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    try {
      const remoteVisits = await fetchVisitsFromSupabase();

      if (remoteVisits === null) {
        setSyncStatus('error');
        return;
      }

      if (remoteVisits.length === 0) {
        // Banco está vazio: subir a lista de visitas atual para popular a nuvem
        if (state.visits && state.visits.length > 0) {
          await bulkUpsertVisits(state.visits);
        }
        setSyncStatus('connected');
      } else {
        // Mesclar visitas do banco com preenchimentos que já estavam salvos no aparelho do usuário
        const { merged, hasLocalChanges } = mergeLocalAndRemoteVisits(state.visits, remoteVisits);

        setState((prev) => ({
          ...prev,
          visits: sortVisitsAscending(merged),
        }));

        // Se o celular do usuário continha voluntários nas vagas que ainda não estavam no banco, envia para o Supabase!
        if (hasLocalChanges) {
          await bulkUpsertVisits(merged);
        }

        setSyncStatus('connected');
      }
    } catch (err) {
      console.error('[Sync] Falha ao sincronizar com Supabase:', err);
      setSyncStatus('error');
    }
  };

  // Carregamento inicial e assinatura em Tempo Real (Realtime)
  useEffect(() => {
    syncFromSupabase();

    // Ouvir alterações em tempo real de outros usuários
    const unsubscribe = subscribeToVisitsChanges(async () => {
      const updated = await fetchVisitsFromSupabase();
      if (updated && updated.length > 0) {
        setState((prev) => ({
          ...prev,
          visits: sortVisitsAscending(updated),
        }));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper para persistir visita no Supabase
  const persistVisit = async (visit: VisitItem) => {
    const client = getSupabaseClient();
    if (!client) return;

    setSyncStatus('syncing');
    const success = await upsertVisitToSupabase(visit);
    setSyncStatus(success ? 'connected' : 'error');
  };

  const sortedVisits = sortVisitsAscending(state.visits);

  const toggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  const handleOpenNewVenue = () => {
    setSelectedVisit(null);
    setModalOpen(true);
  };

  const handleEditVenue = (visit: VisitItem) => {
    setSelectedVisit(visit);
    setModalOpen(true);
  };

  const handleOpenSummary = (visit: VisitItem) => {
    setSummaryVisit(visit);
    setSummaryModalOpen(true);
  };

  const handleSaveModalVisit = (visit: VisitItem) => {
    setState((prev) => {
      const exists = prev.visits.some((v) => v.id === visit.id);
      let updated: VisitItem[];
      if (exists) {
        updated = prev.visits.map((v) => (v.id === visit.id ? visit : v));
      } else {
        updated = [...prev.visits, visit];
      }
      return {
        ...prev,
        visits: sortVisitsAscending(updated),
      };
    });

    // Gravar no Supabase
    persistVisit(visit);
  };

  const handleSaveVisitSummary = (
    visitId: string,
    summary: string,
    completedBy: string,
    isCompleted: boolean
  ) => {
    const completedAt = new Date().toISOString();
    let updatedTarget: VisitItem | undefined;

    setState((prev) => {
      const newVisits = prev.visits.map((v) => {
        if (v.id !== visitId) return v;
        updatedTarget = {
          ...v,
          visitSummary: summary ? summary : undefined,
          completedBy: completedBy || undefined,
          completedAt: summary ? completedAt : undefined,
          isCompleted: isCompleted ? true : false,
        };
        return updatedTarget;
      });
      return {
        ...prev,
        visits: newVisits,
      };
    });

    if (updatedTarget) {
      persistVisit(updatedTarget);
    }
  };

  const handleRemoveVisit = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}" e sua visita da agenda?`)) return;
    setState((prev) => ({
      ...prev,
      visits: prev.visits.filter((v) => v.id !== id),
    }));

    const client = getSupabaseClient();
    if (client) {
      setSyncStatus('syncing');
      const success = await deleteVisitFromSupabase(id);
      setSyncStatus(success ? 'connected' : 'error');
    }
  };

  const handleDateChange = (id: string, newDate: string) => {
    let updatedTarget: VisitItem | undefined;
    setState((prev) => {
      const updated = prev.visits.map((v) => {
        if (v.id === id) {
          updatedTarget = { ...v, date: newDate };
          return updatedTarget;
        }
        return v;
      });
      return {
        ...prev,
        visits: sortVisitsAscending(updated),
      };
    });

    if (updatedTarget) {
      persistVisit(updatedTarget);
    }
  };

  const handleTimeChange = (id: string, newTime: string) => {
    let updatedTarget: VisitItem | undefined;
    setState((prev) => {
      const updated = prev.visits.map((v) => {
        if (v.id === id) {
          updatedTarget = { ...v, time: newTime };
          return updatedTarget;
        }
        return v;
      });
      return {
        ...prev,
        visits: sortVisitsAscending(updated),
      };
    });

    if (updatedTarget) {
      persistVisit(updatedTarget);
    }
  };

  const handleSlotChange = (visitId: string, slotIdx: number, val: string) => {
    let updatedTarget: VisitItem | undefined;
    setState((prev) => {
      const updatedVisits = prev.visits.map((v) => {
        if (v.id !== visitId) return v;
        const newSlots = [...v.slots];
        newSlots[slotIdx] = val;
        updatedTarget = { ...v, slots: newSlots };
        return updatedTarget;
      });
      return {
        ...prev,
        visits: updatedVisits,
      };
    });

    // Salvar com debounce de 600ms para aguardar término da digitação
    if (updatedTarget) {
      if (debounceTimers.current[visitId]) {
        clearTimeout(debounceTimers.current[visitId]);
      }
      const targetToSave = { ...updatedTarget };
      debounceTimers.current[visitId] = setTimeout(() => {
        persistVisit(targetToSave);
      }, 600);
    }
  };

  const handleRemoveSlot = (visitId: string, slotIdx: number) => {
    let updatedTarget: VisitItem | undefined;
    setState((prev) => {
      const updatedVisits = prev.visits.map((v) => {
        if (v.id !== visitId) return v;
        const newSlots = v.slots.filter((_, i) => i !== slotIdx);
        updatedTarget = { ...v, slots: newSlots };
        return updatedTarget;
      });
      return {
        ...prev,
        visits: updatedVisits,
      };
    });

    if (updatedTarget) {
      persistVisit(updatedTarget);
    }
  };

  const handleAddSlot = (visitId: string) => {
    let updatedTarget: VisitItem | undefined;
    setState((prev) => {
      const updatedVisits = prev.visits.map((v) => {
        if (v.id !== visitId) return v;
        updatedTarget = { ...v, slots: [...v.slots, ''] };
        return updatedTarget;
      });
      return {
        ...prev,
        visits: updatedVisits,
      };
    });

    if (updatedTarget) {
      persistVisit(updatedTarget);
    }
  };

  return (
    <div className="min-h-screen bg-[#123C6B] text-[#1E2A3F] font-sans py-4 sm:py-10 px-2.5 sm:px-6">
      {/* Barra de Ações Superior */}
      <div className="max-w-[840px] mx-auto mb-3 flex items-center justify-between px-1 flex-wrap gap-2">
        {/* Status de Sincronização com Supabase */}
        <div className="flex items-center gap-2">
          {syncStatus === 'connected' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-xs"
                title="Supabase Conectado - Clique para ver configurações"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Nuvem Conectada</span>
              </button>
              <button
                type="button"
                onClick={syncFromSupabase}
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Recarregar dados da nuvem agora"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {syncStatus === 'syncing' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium bg-amber-400/20 text-amber-200 border border-amber-400/40 shadow-xs">
              <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
              <span>Salvando na nuvem...</span>
            </div>
          )}

          {syncStatus === 'error' && (
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium bg-red-500/20 text-red-200 border border-red-400/40 hover:bg-red-500/30 transition-all cursor-pointer shadow-xs"
              title="Erro ao sincronizar. Clique para verificar as chaves"
            >
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span>Erro na Nuvem</span>
            </button>
          )}

          {(syncStatus === 'offline' || syncStatus === 'idle') && (
            <button
              type="button"
              onClick={() => setConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-medium bg-white/10 hover:bg-white/20 text-white/80 border border-white/20 transition-all cursor-pointer shadow-xs"
              title="Conectar com o Supabase"
            >
              <Database className="w-3.5 h-3.5 text-[#E4C687]" />
              <span>Conectar Nuvem</span>
            </button>
          )}
        </div>

        <button
          onClick={toggleEdit}
          id="editBtn"
          className="font-mono text-xs uppercase tracking-wider font-semibold px-4 py-2 rounded-full border border-[#8A6A38] bg-gradient-to-br from-[#E4C687] to-[#C7A25C] text-[#2A1F0A] shadow-md hover:brightness-105 transition-all cursor-pointer"
        >
          {isEditing ? '💾 Salvar' : '✎ Editar agenda'}
        </button>
      </div>

      {/* Sheet Principal - Folha Timbrada */}
      <div className="max-w-[840px] mx-auto bg-[#FBF9F2] rounded-xl p-4 sm:p-10 shadow-[0_20px_50px_rgba(6,22,42,0.45)] relative border border-[#1E2A3F]/10">
        {/* Cabeçalho */}
        <header className="text-center pb-5 sm:pb-6 border-b-2 border-[#1E2A3F] mb-6 sm:mb-8 relative">
          <div className="w-28 sm:w-36 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
            <AALogo size={110} />
          </div>

          <h1
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              const text = e.currentTarget.textContent?.trim();
              if (text) setState((p) => ({ ...p, groupName: text }));
            }}
            className={`font-serif font-bold text-2xl sm:text-4xl text-[#29166F] mb-1.5 sm:mb-2 tracking-tight ${
              isEditing ? 'hover:bg-black/5 focus:bg-white rounded px-2 outline-none' : ''
            }`}
          >
            {state.groupName}
          </h1>

          <div className="font-mono text-[10px] sm:text-[11px] tracking-[2.5px] sm:tracking-[3px] uppercase text-[#A9834C] mb-2 font-semibold">
            Escala de Serviços
          </div>

          <p
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={(e) => {
              const text = e.currentTarget.textContent?.trim();
              if (text) setState((p) => ({ ...p, objective: text }));
            }}
            className={`font-serif italic font-medium text-xs sm:text-base text-[#4A5568] max-w-[520px] mx-auto leading-relaxed ${
              isEditing ? 'hover:bg-black/5 focus:bg-white rounded px-2 outline-none' : ''
            }`}
          >
            {state.objective}
          </p>
        </header>

        {/* Lista de Locais e Visitas */}
        <main className="space-y-5 sm:space-y-6">
          {sortedVisits.map((visit) => {
            const status = getVisitStatus(visit.date, visit.isCompleted);
            const isPast = status === 'past';

            let nameClasses = 'text-[#29166F]';
            let statusTag = null;

            if (status === 'today') {
              nameClasses = 'text-green-700 font-bold';
              statusTag = (
                <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded border border-green-300 inline-block shadow-2xs">
                  Hoje
                </span>
              );
            } else if (status === 'tomorrow') {
              nameClasses = 'text-green-700 font-bold';
              statusTag = (
                <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded border border-green-300 inline-block shadow-2xs">
                  Amanhã
                </span>
              );
            } else if (isPast) {
              nameClasses = 'text-red-700 font-bold line-through decoration-red-600/80 decoration-2';
              statusTag = (
                <span className="text-[10.5px] sm:text-[11px] font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded border border-red-300 inline-block shadow-2xs">
                  Já ocorreu
                </span>
              );
            }

            const weekday = getWeekdayName(visit.date);

            return (
              <section
                key={visit.id}
                className={`bg-white border rounded-lg overflow-hidden shadow-xs hover:shadow-sm transition-all ${
                  isPast
                    ? 'border-red-200 bg-red-50/10'
                    : 'border-[#1E2A3F]/15'
                }`}
              >
                {/* Cabeçalho do Local */}
                <div className="p-3.5 sm:p-5 border-b border-dashed border-[#1E2A3F]/15">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5 sm:gap-3">
                    <div className="flex-1">
                      {/* Nome do Local + Tag de Status */}
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-lg sm:text-xl select-none leading-none flex-shrink-0 mt-0.5">🏥</span>
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <h2
                              className={`font-serif font-semibold text-base sm:text-xl leading-snug ${nameClasses} transition-all`}
                            >
                              {visit.name}
                            </h2>
                            {statusTag}
                          </div>

                          {/* Endereço */}
                          <div className="flex items-center gap-1.5 font-mono text-xs sm:text-[13px] text-[#4A5568] mt-1">
                            <span className="text-xs sm:text-sm select-none leading-none flex-shrink-0">📍</span>
                            <span className="break-words">{visit.addr}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botões: Resumo + Editar */}
                    <div className="flex items-center flex-wrap gap-2 justify-start sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-[#1E2A3F]/15">
                      {/* Botão Resumo da Visita */}
                      <button
                        type="button"
                        onClick={() => handleOpenSummary(visit)}
                        className={`text-xs font-mono font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 border transition-all cursor-pointer ${
                          visit.visitSummary
                            ? 'bg-[#DEE9E2] text-[#2B5446] border-[#3E6B5C]/30 hover:bg-[#cde0d3]'
                            : 'bg-[#FBF9F2] text-[#123C6B] border-[#123C6B]/30 hover:bg-[#123C6B] hover:text-white'
                        }`}
                        title="Registrar ou visualizar o resumo de como foi a visita"
                      >
                        {visit.visitSummary ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#3E6B5C]" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#A9834C]" />
                        )}
                        <span>{visit.visitSummary ? 'Ver Resumo' : '+ Resumo da Visita'}</span>
                      </button>

                      {/* Botão editar todos os dados */}
                      <button
                        type="button"
                        onClick={() => handleEditVenue(visit)}
                        className="text-xs font-mono text-[#123C6B] hover:text-[#1E5A9C] font-semibold underline underline-offset-2 cursor-pointer px-1 py-1"
                        title="Editar todos os dados deste local"
                      >
                        editar dados
                      </button>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleRemoveVisit(visit.id, visit.name)}
                          className="text-xs font-mono text-red-600 hover:text-red-800 cursor-pointer px-1 py-1"
                          title="Remover este local"
                        >
                          remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Linha da Visita (Data, Horário e Vagas) */}
                <div className="flex flex-col sm:flex-row border-b border-dashed border-[#1E2A3F]/15 last:border-b-0">
                  {/* Data e Horário */}
                  <div className="p-3 sm:p-4 sm:w-[200px] sm:min-w-[200px] border-b sm:border-b-0 sm:border-r border-dashed border-[#1E2A3F]/15 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-start gap-1 sm:gap-1.5 bg-[#FBF9F2]/40">
                    {isEditing ? (
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-[#123C6B] flex-shrink-0" />
                          <input
                            type="date"
                            value={visit.date}
                            onChange={(e) => handleDateChange(visit.id, e.target.value)}
                            className="font-mono font-semibold text-xs sm:text-sm bg-white border border-[#A9834C]/50 rounded px-2 py-1 text-[#1E2A3F] outline-none w-full cursor-pointer shadow-xs"
                          />
                        </div>
                        <div className="font-mono text-[10px] uppercase text-[#1E2A3F] tracking-wider font-bold underline underline-offset-2 decoration-[#123C6B]">
                          {weekday}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#123C6B] flex-shrink-0" />
                          <input
                            type="time"
                            value={visit.time}
                            onChange={(e) => handleTimeChange(visit.id, e.target.value)}
                            className="font-mono font-medium text-xs bg-white border border-[#A9834C]/50 rounded px-2 py-1 text-[#123C6B] outline-none w-full cursor-pointer shadow-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:block gap-0.5">
                          {/* Data com Ícone de Calendário */}
                          <div className="font-serif font-bold text-base sm:text-lg text-[#1E2A3F] tracking-tight whitespace-nowrap flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#123C6B] flex-shrink-0" />
                            <span>{formatFullDateBr(visit.date)}</span>
                          </div>

                          {/* Dia da Semana Sublinhado para Destacar */}
                          <div className="font-mono text-[11px] sm:text-[11.5px] uppercase text-[#1E2A3F] tracking-wider font-bold underline underline-offset-3 decoration-[#123C6B] decoration-2 pl-5.5 sm:pl-0 mt-0.5">
                            {weekday}
                          </div>
                        </div>

                        {/* Horário com Fundo Azul da Paleta e Fontes Amarelas */}
                        <div className="font-mono font-bold text-xs sm:text-sm text-[#F6D269] bg-[#123C6B] px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1.5 border border-[#1E5A9C]/40">
                          <Clock className="w-3.5 h-3.5 text-[#F6D269] flex-shrink-0" />
                          <span>{formatTimeBr(visit.time)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Vagas de Companheiro(a)s */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-wrap items-center gap-2">
                    {visit.slots.map((name, ni) => {
                      const isOpen = !name || name.trim() === '';
                      return (
                        <div
                          key={ni}
                          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium border transition-colors ${
                            isOpen
                              ? 'bg-[#F4E2DE] text-[#B23A2E] border-dashed border-[#B23A2E]'
                              : 'bg-[#DEE9E2] text-[#3E6B5C] border-transparent'
                          }`}
                        >
                          <span
                            className={`font-mono text-[10px] w-4 h-4 rounded-full text-white flex items-center justify-center flex-shrink-0 ${
                              isOpen ? 'bg-[#B23A2E]' : 'bg-[#3E6B5C]'
                            }`}
                          >
                            {ni + 1}
                          </span>

                          <input
                            type="text"
                            value={name}
                            placeholder="vaga aberta"
                            onChange={(e) => handleSlotChange(visit.id, ni, e.target.value)}
                            className={`bg-transparent outline-none w-[105px] sm:w-[130px] text-xs ${
                              isOpen ? 'placeholder:text-[#B23A2E] placeholder:italic text-[#B23A2E]' : 'text-[#3E6B5C] font-medium'
                            }`}
                          />

                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(visit.id, ni)}
                              className="text-inherit opacity-60 hover:opacity-100 text-sm leading-none cursor-pointer pl-0.5"
                              title="Remover esta vaga"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Adicionar Vaga */}
                    <button
                      type="button"
                      onClick={() => handleAddSlot(visit.id)}
                      className="flex items-center gap-1 py-1 px-2.5 rounded-full border border-dashed border-[#C7A25C] text-[#A9834C] font-mono text-xs hover:bg-[#A9834C]/10 cursor-pointer transition-colors"
                      title="Adicionar vaga para voluntário"
                    >
                      <Plus className="w-3 h-3" />
                      <span>vaga</span>
                    </button>
                  </div>
                </div>

                {/* Resumo da Visita */}
                {visit.visitSummary && (
                  <div className="bg-[#FBF9F2] p-3.5 sm:p-4 border-t border-[#1E2A3F]/10 text-xs">
                    <div className="flex items-center justify-between gap-2 mb-1.5 text-[#123C6B] font-mono font-bold uppercase tracking-wider text-[11px] sm:text-xs">
                      <span className="flex items-center gap-1.5">
                        <MessageSquareText className="w-3.5 h-3.5 text-[#A9834C] flex-shrink-0" />
                        <span>Como foi a visita (servidores, nº de internos; etc):</span>
                      </span>
                    </div>
                    <p className="text-[#1E2A3F] font-serif italic whitespace-pre-wrap leading-relaxed bg-white p-2.5 sm:p-3 rounded border border-[#1E2A3F]/15">
                      "{visit.visitSummary}"
                    </p>
                  </div>
                )}
              </section>
            );
          })}
        </main>

        {/* Botão Novo Local de Visita */}
        <div className="mt-6 mb-8">
          <button
            type="button"
            onClick={handleOpenNewVenue}
            className="flex items-center gap-2 py-2.5 px-4 rounded-full border border-dashed border-[#C7A25C] text-[#A9834C] hover:text-[#8A6A38] font-mono text-xs font-semibold hover:bg-[#A9834C]/10 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>novo local de visita</span>
          </button>
        </div>

        {/* Rodapé e Orientações */}
        <footer className="pt-5 border-t border-[#1E2A3F]/15 text-center">
          <p className="font-mono text-[10.5px] sm:text-[11px] text-[#29166F] font-bold tracking-wide">
            Vagas em aberto são preenchidas por companheiro(a)s voluntários —{' '}
            <u>Confirme e Desmarque sua presença com antecedência</u>.
          </p>

          <div className="font-sans text-xs text-[#4A5568] leading-relaxed mt-3.5 max-w-[540px] mx-auto text-left">
            <p>
              <b>✎ Editar</b> — clique para inserir seu nome nas vagas e ajustar datas/horários. Ao clicar em <b>"editar dados"</b> ou <b>"+ novo local de visita"</b>, abrem-se todos os campos para edição completa.
            </p>
            <p className="mt-1">
              <b>📝 Resumo da Visita:</b> Clique no botão <b>"+ Resumo da Visita"</b> para registrar como foi a experiência e observações.
            </p>
          </div>
        </footer>
      </div>

      {/* Modal para Editar Todos os Dados do Local */}
      <EditVisitModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModalVisit}
        initialVisit={selectedVisit}
      />

      {/* Modal para Resumo da Visita */}
      <VisitSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        onSaveSummary={handleSaveVisitSummary}
        visit={summaryVisit}
      />

      {/* Modal de Configuração do Supabase */}
      <SupabaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onSaveConfig={(url, key) => {
          saveSupabaseConfig(url, key);
          syncFromSupabase();
        }}
        currentUrl={getSupabaseConfig().url}
        currentKey={getSupabaseConfig().key}
      />
    </div>
  );
}
