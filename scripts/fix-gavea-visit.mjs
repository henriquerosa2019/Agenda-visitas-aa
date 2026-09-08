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

async function fixGaveaVisit() {
  console.log('🔄 Atualizando visita da Clínica da Gávea (sept-14-10h) no Supabase...');

  const { data, error } = await supabase
    .from('aa_visits')
    .update({
      slots: ['Danilo', 'Marcio Motta'],
      visit_summary: null,
      completed_by: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'sept-14-10h')
    .select();

  if (error) {
    console.error('❌ Erro ao atualizar visita no Supabase:', error.message);
    process.exit(1);
  }

  console.log('✅ Visita atualizada com sucesso no Supabase!');
  console.log(JSON.stringify(data, null, 2));
}

fixGaveaVisit();
