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

async function listSupabaseVisits() {
  const { data, error } = await supabase
    .from('aa_visits')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('❌ Erro ao consultar Supabase:', error.message);
    process.exit(1);
  }

  console.log('\n=============================================================');
  console.log(`📊 TOTAL DE VISITAS NO SUPABASE: ${data.length}`);
  console.log('=============================================================\n');

  data.forEach((v, index) => {
    console.log(`[${index + 1}] ID: ${v.id}`);
    console.log(`    🏥 Local:       ${v.name}`);
    console.log(`    📍 Endereço:    ${v.addr}`);
    console.log(`    🗓️ Data / Hora: ${v.date} às ${v.time}`);
    console.log(`    👥 Voluntários: [${(v.slots || []).map(s => s ? `"${s}"` : '(vaga aberta)').join(', ')}]`);
    console.log(`    📝 Resumo:      ${v.visit_summary ? `"${v.visit_summary}"` : '(sem resumo)'}`);
    console.log(`    🕒 Atualizado:  ${v.updated_at || v.created_at || 'N/D'}`);
    console.log('    ' + '-'.repeat(55));
  });
}

listSupabaseVisits();
