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

// 1. Histórico Oficial de Setembro/2026
const SEPTEMBER_HISTORICAL_VISITS = [
  {
    id: 'visit-2026-09-14-10h',
    name: 'Clínica da Gávea – Unidade Tijuca',
    addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
    date: '2026-09-14',
    time: '10:00',
    slots: ['Danilo', 'Marcio Motta'],
    notes: 'Unidade de internação - Recepção principal',
    visit_summary: 'Visita realizada com sucesso na enfermaria da clínica. Pacientes receptivos e reunião produtiva.',
    completed_by: 'Danilo',
    completed_at: '2026-09-14T14:30:00.000Z',

  },
  {
    id: 'visit-2026-09-14-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-09-14',
    time: '16:00',
    slots: ['Marcio Motta', 'Cadu'],
    notes: 'Apresentar documento de identificação na portaria',
    visit_summary: 'Reunião com internos da ala psiquiátrica. Presença de 12 assistidos e boa participação.',
    completed_by: 'Marcio Motta',
    completed_at: '2026-09-14T19:00:00.000Z',

  },
  {
    id: 'visit-2026-09-16-19h30',
    name: 'Hospital Casa Menssana',
    addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
    date: '2026-09-16',
    time: '19:30',
    slots: ['Claudia', 'Pedro H '],
    notes: 'Visita noturna à enfermaria',
    visit_summary: null, // Pendente de resumo conforme relatório
    completed_by: null,
    completed_at: null,

  },
  {
    id: 'visit-2026-09-21-17h',
    name: 'Clínica Evolução',
    addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
    date: '2026-09-21',
    time: '17:00',
    slots: ['Marcio Motta', 'Pedro H '],
    notes: 'Reunião de partilha com pacientes',
    visit_summary: 'Visita bem sucedida, pacientes participativos com depoimentos emocionantes.',
    completed_by: 'Pedro H',
    completed_at: '2026-09-21T20:15:00.000Z',

  },
  {
    id: 'visit-2026-09-28-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-09-28',
    time: '16:00',
    slots: ['Marcio Motta', 'Roberto'],
    notes: 'Encerramento da escala de visitas de setembro',
    visit_summary: 'Excelente visita de encerramento do mês. Grupo unido e mensagem transmitida com força.',
    completed_by: 'Marcio Motta',
    completed_at: '2026-09-28T18:45:00.000Z',

  },
];

// 2. Escala Nova de Outubro/2026 (Vagas Abertas, sem resumos, com novos IDs únicos)
const OCTOBER_NEW_VISITS = [
  {
    id: 'visit-2026-10-05-10h',
    name: 'Clínica da Gávea – Unidade Tijuca',
    addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
    date: '2026-10-05',
    time: '10:00',
    slots: ['', '', ''],
    notes: 'Unidade de internação - Recepção principal',
    visit_summary: null,
    completed_by: null,
    completed_at: null,

  },
  {
    id: 'visit-2026-10-12-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-10-12',
    time: '16:00',
    slots: ['', '', ''],
    notes: 'Apresentar documento de identificação na portaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,

  },
  {
    id: 'visit-2026-10-19-17h',
    name: 'Clínica Evolução',
    addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
    date: '2026-10-19',
    time: '17:00',
    slots: ['', '', ''],
    notes: 'Reunião de partilha com pacientes',
    visit_summary: null,
    completed_by: null,
    completed_at: null,

  },
  {
    id: 'visit-2026-10-21-19h30',
    name: 'Hospital Casa Menssana',
    addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
    date: '2026-10-21',
    time: '19:30',
    slots: ['', '', ''],
    notes: 'Visita noturna à enfermaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,

  },
  {
    id: 'visit-2026-10-26-16h',
    name: 'Hospital São Francisco na Providência de Deus',
    addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
    date: '2026-10-26',
    time: '16:00',
    slots: ['', '', ''],
    notes: 'Apresentar documento de identificação na portaria',
    visit_summary: null,
    completed_by: null,
    completed_at: null,

  },
];

async function migrateData() {
  console.log('🔄 Iniciando migração e preservação histórica no Supabase...');

  // Limpar os IDs antigos/temporários conflitantes
  const obsoleteIds = [
    'sept-14-10h',
    'sept-14-16h',
    'sept-16-19h30',
    'sept-21-17h',
    'sept-28-16h',
    'visit-1790730831757',
    'visit-1790730911555',
    'visit-1790730959460',
    'visit-1790731015895',
  ];

  console.log('🧹 Removendo IDs legados/duplicados transitórios...');
  for (const id of obsoleteIds) {
    await supabase.from('aa_visits').delete().eq('id', id);
  }

  // Gravar Setembro histórico
  console.log('💾 Gravando histórico de Setembro/2026 com voluntários e resumos...');
  const { error: errSep } = await supabase.from('aa_visits').upsert(SEPTEMBER_HISTORICAL_VISITS);
  if (errSep) {
    console.error('❌ Erro ao salvar Setembro:', errSep.message);
  } else {
    console.log('✅ Setembro/2026 preservado com sucesso (5 visitas, voluntários e resumos mantidos)!');
  }

  // Gravar Outubro nova escala
  console.log('💾 Gravando escala de Outubro/2026 (vagas abertas, sem resumos)...');
  const { error: errOct } = await supabase.from('aa_visits').upsert(OCTOBER_NEW_VISITS);
  if (errOct) {
    console.error('❌ Erro ao salvar Outubro:', errOct.message);
  } else {
    console.log('✅ Outubro/2026 cadastrado com sucesso (5 visitas com vagas abertas)!');
  }

  console.log('\n🎉 Migração finalizada! Ambos os meses agora coexistem no banco.');
}

migrateData();
