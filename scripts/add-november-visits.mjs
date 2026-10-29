import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
}

const supabaseUrl = normalizeUrl(process.env.VITE_SUPABASE_URL);
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const NOVEMBER_VISITS = [
  {
    id: 'visit-2026-11-09-10h',
    name: 'Clínica da Gávea – Unidade Tijuca',
    addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
    date: '2026-11-09',
    time: '10:00',
    slots: ['Danilo', '', ''],
    notes: 'Unidade de internação - Recepção principal',
    visit_summary: null,
    completed_by: null,
    completed_at: null,
  },
  {
    id: 'visit-2026-11-09-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-11-09',
    time: '16:00',
    slots: ['', '', ''],
    notes: 'Apresentar documento de identificação na portaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,
  },
  {
    id: 'visit-2026-11-16-17h',
    name: 'Clínica Evolução',
    addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
    date: '2026-11-16',
    time: '17:00',
    slots: ['', '', ''],
    notes: 'Reunião de partilha com pacientes',
    visit_summary: null,
    completed_by: null,
    completed_at: null,
  },
  {
    id: 'visit-2026-11-18-19h30',
    name: 'Hospital Casa Menssana',
    addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
    date: '2026-11-18',
    time: '19:30',
    slots: ['', '', ''],
    notes: 'Visita noturna à enfermaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,
  },
  {
    id: 'visit-2026-11-23-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-11-23',
    time: '16:00',
    slots: ['', '', ''],
    notes: 'Apresentar documento de identificação na portaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,
  },
];

async function addNovemberVisits() {
  console.log('🔄 Cadastrando escala de Novembro/2026 no Supabase...');

  const { data, error } = await supabase
    .from('aa_visits')
    .upsert(NOVEMBER_VISITS, { onConflict: 'id' });

  if (error) {
    console.error('❌ Erro ao inserir visitas de Novembro no Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ 5 visitas de Novembro/2026 inseridas/atualizadas com sucesso no Supabase!');
}

addNovemberVisits();
