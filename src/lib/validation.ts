import { VisitItem } from '../types';

/**
 * Normaliza o nome do voluntário para comparação insensível a maiúsculas,
 * acentos, múltiplos espaços e caracteres especiais (pontos, traços).
 */
export function normalizeVolunteerName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza o nome do local/instituição para agrupar locais iguais.
 */
export function normalizeVenueName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Verifica se um voluntário já está agendado para o mesmo local no mesmo dia.
 * Retorna true se houver duplicidade em outro slot da mesma visita ou em outra
 * visita agendada para o mesmo local na mesma data.
 */
export function isDuplicateVolunteer(
  candidateName: string,
  currentSlotIndex: number,
  currentVisit: VisitItem,
  allVisits: VisitItem[]
): boolean {
  const normCandidate = normalizeVolunteerName(candidateName);
  if (!normCandidate) return false;

  const currentVenueNorm = normalizeVenueName(currentVisit.name);
  const currentDate = currentVisit.date;

  // 1. Verificar outros slots da mesma visita
  if (Array.isArray(currentVisit.slots)) {
    for (let i = 0; i < currentVisit.slots.length; i++) {
      if (i === currentSlotIndex) continue;
      const otherName = currentVisit.slots[i];
      if (normalizeVolunteerName(otherName) === normCandidate) {
        return true;
      }
    }
  }

  // 2. Verificar outras visitas agendadas para o mesmo local no mesmo dia
  for (const otherVisit of allVisits) {
    if (otherVisit.id === currentVisit.id) continue;
    if (
      otherVisit.date === currentDate &&
      normalizeVenueName(otherVisit.name) === currentVenueNorm
    ) {
      if (Array.isArray(otherVisit.slots)) {
        for (const slotName of otherVisit.slots) {
          if (normalizeVolunteerName(slotName) === normCandidate) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Remove nomes duplicados de uma lista de slots, mantendo apenas a primeira
 * ocorrência de cada voluntário e convertendo repetições em vagas abertas ("").
 */
export function sanitizeSlots(slots: string[]): string[] {
  if (!Array.isArray(slots)) return [];
  const seen = new Set<string>();

  return slots.map((s) => {
    const trimmed = (s || '').trim();
    if (!trimmed) return '';

    const norm = normalizeVolunteerName(trimmed);
    if (seen.has(norm)) {
      return ''; // Converte duplicata em vaga aberta
    }

    seen.add(norm);
    return trimmed;
  });
}
