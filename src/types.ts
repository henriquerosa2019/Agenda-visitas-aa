export interface VisitItem {
  id: string;
  name: string;
  addr: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  slots: string[];
  notes?: string;
  visitSummary?: string; // Resumo da visita registrado pelo visitante
  completedBy?: string; // Nome de quem preencheu o resumo
  completedAt?: string; // Data/hora em que o resumo foi registrado (ISO)
  isCompleted?: boolean; // Se foi marcada como finalizada manualmente ou automaticamente
}

export interface AgendaData {
  groupName: string;
  objective: string;
  visits: VisitItem[];
}

export type VisitStatus = 'today' | 'tomorrow' | 'past' | 'normal';

export const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function getWeekdayName(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return '';
  return DIAS_SEMANA[dateObj.getDay()];
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [, m, d] = parts;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function formatFullDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return '';
  const [y, m, d] = parts;
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}/${mm}/${y}`;
}

export function formatTimeBr(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  if (m === '00' || !m) {
    return `${parseInt(h, 10)}h`;
  }
  return `${parseInt(h, 10)}h${m}`;
}

/**
 * Regra de sinalização solicitada pelo usuário:
 * - Ao finalizar a visita (ou passar a data no mês corrente): o nome do local fica em vermelho forte, riscado e com a mensagem "Já ocorreu"
 * - Quando o compromisso for no mesmo dia: nome do local fica em fontes verdes ("Hoje")
 * - Quando o compromisso for no dia seguinte: nome do local fica em fontes verdes ("Amanhã")
 * - Ao iniciar um novo mês / virar o mês: as visitas do novo mês voltam todas ao normal (azul clássico)
 */
export function getVisitStatus(dateStr: string, isMarkedCompleted?: boolean, referenceDate?: Date): VisitStatus {
  if (!dateStr) return 'normal';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return 'normal';
  const [y, m, d] = parts;
  const visitDate = new Date(y, m - 1, d, 0, 0, 0, 0);

  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 0, 0, 0, 0);

  // Se a visita for de um mês diferente do mês atual de referência:
  // Se for mês futuro em relação à data atual, volta ao normal
  const isDifferentMonth = visitDate.getFullYear() !== today.getFullYear() || visitDate.getMonth() !== today.getMonth();

  if (isMarkedCompleted) {
    return 'past';
  }

  const diffTime = visitDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Se for data anterior
    return 'past'; // Já ocorreu -> Vermelho + riscado + tag "Já ocorreu"
  } else if (diffDays === 0) {
    return 'today'; // Mesmo dia -> Verde ("Hoje")
  } else if (diffDays === 1) {
    return 'tomorrow'; // Dia seguinte -> Verde ("Amanhã")
  } else {
    return 'normal'; // Futuro / início do mês -> Normal (azul)
  }
}

/**
 * Organiza a lista de visitas em ordem crescente de data e horário
 */
export function sortVisitsAscending(visits: VisitItem[]): VisitItem[] {
  return [...visits].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Formata a escala no padrão de texto para WhatsApp com os emojis e dados
 */
export function generateWhatsAppSummary(agenda: AgendaData): string {
  const sortedVisits = sortVisitsAscending(agenda.visits);
  const header = `🗓️ *${agenda.groupName.toUpperCase()}*\n_${agenda.objective}_\n\n*ESCALA DE VISITAS*\n─────────────────────\n`;

  const body = sortedVisits
    .map((v) => {
      const dataBr = formatDateBr(v.date);
      const diaSemana = getWeekdayName(v.date);
      const horaBr = formatTimeBr(v.time);

      const slotsTxt = v.slots.length
        ? v.slots
            .map((slot) => (slot.trim() ? `▪️ ${slot.trim()}` : `▪️ (vaga aberta)`))
            .join('\n')
        : '▪️ (nenhuma vaga definida)';

      return `🗓️ ${dataBr} – ${diaSemana} | ${horaBr}\n\n🏥 ${v.name}\n📍 ${v.addr}\n\nCompanheiro(a)s:\n${slotsTxt}`;
    })
    .join('\n\n─────────────────────\n\n');

  const footer = `\n\n─────────────────────\n📌 *Importante:* Vagas em aberto são preenchidas por companheiro(a)s voluntários. Confirme e desmarque sua presença com antecedência!`;

  return header + body + footer;
}
