import assert from 'assert';

function normalizeVolunteerName(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeVenueName(name) {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isDuplicateVolunteer(candidateName, currentSlotIndex, currentVisit, allVisits) {
  const normCandidate = normalizeVolunteerName(candidateName);
  if (!normCandidate) return false;

  const currentVenueNorm = normalizeVenueName(currentVisit.name);
  const currentDate = currentVisit.date;

  if (Array.isArray(currentVisit.slots)) {
    for (let i = 0; i < currentVisit.slots.length; i++) {
      if (i === currentSlotIndex) continue;
      const otherName = currentVisit.slots[i];
      if (normalizeVolunteerName(otherName) === normCandidate) {
        return true;
      }
    }
  }

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

function sanitizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  const seen = new Set();

  return slots.map((s) => {
    const trimmed = (s || '').trim();
    if (!trimmed) return '';

    const norm = normalizeVolunteerName(trimmed);
    if (seen.has(norm)) {
      return '';
    }

    seen.add(norm);
    return trimmed;
  });
}

console.log('🧪 Executando testes unitários do módulo de validação...');

// 1. Normalização
assert.strictEqual(normalizeVolunteerName('Roberto'), 'roberto');
assert.strictEqual(normalizeVolunteerName('  ROBERTO  '), 'roberto');
assert.strictEqual(normalizeVolunteerName('Márcio Motta'), 'marcio motta');
assert.strictEqual(normalizeVolunteerName('Marcio.Motta'), 'marcio motta');
assert.strictEqual(normalizeVolunteerName('Marcio - Motta'), 'marcio motta');
assert.strictEqual(normalizeVolunteerName(''), '');

console.log('✅ 1. Testes de normalização passaram!');

// 2. Sanitização de slots
const rawSlots = ['Marcio Motta', 'Roberto', 'roberto', '', 'Roberto '];
const cleaned = sanitizeSlots(rawSlots);
assert.deepStrictEqual(cleaned, ['Marcio Motta', 'Roberto', '', '', '']);
console.log('✅ 2. Testes de sanitização de slots passaram!');

// 3. Validação de duplicidade no mesmo local e dia
const mockVisit = {
  id: 'visit-1',
  name: 'Hospital São Francisco',
  addr: 'Rua Conde de Bonfim',
  date: '2026-09-28',
  time: '16:00',
  slots: ['Marcio Motta', 'Roberto', ''],
};

const allVisits = [
  mockVisit,
  {
    id: 'visit-2',
    name: 'Hospital São Francisco',
    addr: 'Rua Conde de Bonfim',
    date: '2026-09-28',
    time: '18:00',
    slots: ['Claudia', ''],
  },
  {
    id: 'visit-3',
    name: 'Clínica da Gávea',
    addr: 'Rua Pereira dos Santos',
    date: '2026-09-28',
    time: '10:00',
    slots: ['Danilo', ''],
  },
];

assert.strictEqual(isDuplicateVolunteer('Roberto', 2, mockVisit, allVisits), true);
assert.strictEqual(isDuplicateVolunteer('roberto', 2, mockVisit, allVisits), true);
assert.strictEqual(isDuplicateVolunteer('ROBERTO', 2, mockVisit, allVisits), true);
assert.strictEqual(isDuplicateVolunteer(' Roberto ', 2, mockVisit, allVisits), true);

assert.strictEqual(isDuplicateVolunteer('Claudia', 2, mockVisit, allVisits), true);
assert.strictEqual(isDuplicateVolunteer('Danilo', 2, mockVisit, allVisits), false);
assert.strictEqual(isDuplicateVolunteer('Henrique', 2, mockVisit, allVisits), false);
assert.strictEqual(isDuplicateVolunteer('Roberto', 1, mockVisit, allVisits), false);

console.log('✅ 3. Todos os cenários de detecção de duplicidade foram validados com 100% de sucesso!');
