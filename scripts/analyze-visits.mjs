import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  return rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/, '');
}

function formatBrDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

// Chave única para agregação (remove pontos, traços, múltiplos espaços e acentos)
function normalizeVolunteerKey(name) {
  if (!name) return '';
  return name
    .trim()
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Nome limpo e padronizado para exibição (ex: "Marcio Motta")
function formatVolunteerDisplayName(name) {
  if (!name) return '';
  const cleaned = name
    .trim()
    .replace(/[._\-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return cleaned
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

const supabaseUrl = normalizeUrl(process.env.VITE_SUPABASE_URL);
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no arquivo .env!\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendReportEmail({
  now,
  dateFormatted,
  timeFormatted,
  totalVisitas,
  visitasPassadas,
  visitasHoje,
  visitasFuturas,
  totalVagasOfertadas,
  totalVagasPreenchidas,
  totalVagasAbertas,
  taxaOcupacao,
  voluntarioEntries,
  visits,
  visitasComResumo,
  visitasSemResumo,
}) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const rawEmails = process.env.REPORT_EMAIL_TO || 'henrique.rosa@poli.ufrj.br';
  const toEmails = rawEmails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!apiKey) {
    console.log('ℹ️ RESEND_API_KEY não configurada. Envio de e-mail ignorado.');
    return;
  }

  if (toEmails.length === 0) {
    console.log('ℹ️ Nenhum destinatário configurado em REPORT_EMAIL_TO.');
    return;
  }

  const voluntariosHtml = voluntarioEntries.length
    ? voluntarioEntries
        .sort((a, b) => b[1] - a[1])
        .map(
          ([nome, qtd]) =>
            `<li style="margin-bottom: 6px; font-size: 14px; color: #1E2A3F;"><strong>${nome}:</strong> ${qtd} visita(s) confirmada(s)</li>`
        )
        .join('')
    : '<li style="color: #64748B; font-style: italic;">Nenhum voluntário agendado no momento.</li>';

  const visitasComVoluntarios = visits.filter((v) => {
    const slots = Array.isArray(v.slots) ? v.slots : [];
    return slots.some((s) => (s || '').trim());
  });

  const locaisAgendadosHtml = visitasComVoluntarios.length
    ? visitasComVoluntarios
        .map((v) => {
          const slots = Array.isArray(v.slots) ? v.slots : [];
          const confirmados = slots
            .filter((s) => (s || '').trim())
            .map((s) => formatVolunteerDisplayName(s));

          return `
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">
              <div style="font-size: 14px; font-weight: bold; color: #123C6B; margin-bottom: 4px;">
                <strong>Local:</strong> ${v.name}
              </div>
              <div style="font-size: 13px; color: #475569; margin-bottom: 4px;">
                <span><strong>Dia:</strong> ${formatBrDate(v.date)}</span>
                <span style="display: inline-block; width: 40px;"></span>
                <span><strong>Hora:</strong> ${v.time}</span>
              </div>
              <div style="font-size: 13px; color: #1E2A3F;">
                <strong>Voluntários:</strong> ${confirmados.join(', ')}
              </div>
            </div>
          `;
        })
        .join('')
    : '<p style="color: #64748B; font-style: italic;">Nenhum local com agendamento confirmado no momento.</p>';

  const pendenciasHtml = visitasSemResumo.length
    ? `<div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin-top: 10px; border-radius: 4px;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #B91C1C; font-size: 13px;">⚠️ Visitas pendentes de relato:</p>
        <ul style="margin: 0; padding-left: 20px; color: #7F1D1D; font-size: 13px;">
          ${visitasSemResumo.map((v) => `<li>[${formatBrDate(v.date)} às ${v.time}] ${v.name}</li>`).join('')}
        </ul>
      </div>`
    : `<p style="margin: 6px 0 0 0; color: #15803D; font-size: 13px; font-weight: 500;">✅ Nenhuma pendência de resumo no momento.</p>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Relatório Diário de Visitas A.A.</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #1E2A3F;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #E2E8F0;">
    
    <!-- Cabeçalho -->
    <div style="background-color: #123C6B; color: #FFFFFF; padding: 24px 28px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">ESCALA DE VISITAS A.A.</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #E4C687; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">Grupo de Serviços CTO / CIT</p>
      <div style="margin-top: 12px; display: inline-block; background-color: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #F8FAFC;">
        📅 Relatório Diário — ${dateFormatted} às ${timeFormatted}
      </div>
    </div>

    <div style="padding: 24px 28px;">
      
      <!-- Seção 1: Resumo Geral -->
      <div style="margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 12px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📌 1. Resumo Geral das Escalas
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #475569;">Total de visitas cadastradas:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1E2A3F;">${totalVisitas}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Visitas já realizadas (passado):</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1E2A3F;">${visitasPassadas}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Visitas agendadas para <strong>HOJE</strong>:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #15803D;">${visitasHoje}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Visitas futuras no calendário:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #1E2A3F;">${visitasFuturas}</td>
          </tr>
        </table>
      </div>

      <!-- Seção 2: Status das Vagas -->
      <div style="margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 12px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          👥 2. Status das Vagas de Voluntários
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #475569;">Total de vagas ofertadas:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right;">${totalVagasOfertadas}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Vagas confirmadas / preenchidas:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #15803D;">${totalVagasPreenchidas} (${taxaOcupacao}%)</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Vagas ainda em aberto:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #B91C1C;">${totalVagasAbertas}</td>
          </tr>
        </table>
      </div>

      <!-- Seção 3: Voluntários Agendados -->
      <div style="margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 12px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          🤝 3. Voluntários Agendados
        </h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${voluntariosHtml}
        </ul>
      </div>

      <!-- Seção 4: Locais Agendados -->
      <div style="margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 14px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          🏥 4. Locais Agendados
        </h3>
        ${locaisAgendadosHtml}
      </div>

      <!-- Seção 5: Status dos Resumos -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📝 5. Status dos Resumos de Visitas
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #475569;">Visitas passadas com relato registrado:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #15803D;">${visitasComResumo.length}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #475569;">Visitas passadas com relato pendente:</td>
            <td style="padding: 6px 0; font-weight: bold; text-align: right; color: ${visitasSemResumo.length ? '#B91C1C' : '#475569'};">${visitasSemResumo.length}</td>
          </tr>
        </table>
        ${pendenciasHtml}
      </div>

      <!-- Botão de Ação -->
      <div style="text-align: center; margin-top: 28px; padding-top: 18px; border-top: 1px solid #E2E8F0;">
        <a href="https://agenda-visitas-aa.netlify.app" target="_blank" style="display: inline-block; background-color: #123C6B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
          🔗 Acessar Agenda de Visitas Online
        </a>
      </div>

    </div>

    <!-- Rodapé -->
    <div style="background-color: #F8FAFC; padding: 16px 28px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
      Este relatório é gerado e enviado automaticamente todos os dias às 08:00.<br>
      Escala de Serviços AA — Unidade, Serviço e Recuperação.
    </div>

  </div>
</body>
</html>
  `;

  try {
    console.log(`\n✉️ Enviando relatório por e-mail para: ${toEmails.join(', ')}...`);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Agenda AA <onboarding@resend.dev>',
        to: toEmails,
        subject: `📊 Relatório Diário de Visitas A.A. — ${dateFormatted}`,
        html: html,
      }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log(`✅ E-mail enviado com sucesso para ${toEmails.join(', ')}! (ID: ${data.id})\n`);
    } else {
      console.error('❌ Falha na resposta do Resend:', data);
    }
  } catch (err) {
    console.error('❌ Falha de rede ao conectar com Resend:', err.message);
  }
}

export async function runVisitsAnalysis() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR');

  console.log('\n' + '='.repeat(68));
  console.log(`  📊 RELATÓRIO DIÁRIO DE VISITAS A.A. — ${dateFormatted} ${timeFormatted}`);
  console.log('='.repeat(68));

  const { data: visits, error } = await supabase
    .from('aa_visits')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  if (error) {
    console.error('❌ Erro ao consultar Supabase:', error.message);
    return;
  }

  if (!visits || visits.length === 0) {
    console.log('\n⚠️ Nenhuma visita cadastrada no banco de dados atualmente.');
    return;
  }

  // Métricas
  const totalVisitas = visits.length;
  let visitasPassadas = 0;
  let visitasHoje = 0;
  let visitasFuturas = 0;

  let totalVagasOfertadas = 0;
  let totalVagasPreenchidas = 0;
  let totalVagasAbertas = 0;

  // Agrupamento e agregação inteligente de voluntários
  const voluntarioAgg = {};
  const visitasSemResumo = [];
  const visitasComResumo = [];

  for (const v of visits) {
    const slots = Array.isArray(v.slots) ? v.slots : [];
    totalVagasOfertadas += slots.length;

    for (const rawName of slots) {
      const trimmed = (rawName || '').trim();
      if (trimmed) {
        totalVagasPreenchidas++;
        const key = normalizeVolunteerKey(trimmed);
        const displayName = formatVolunteerDisplayName(trimmed);

        if (!voluntarioAgg[key]) {
          voluntarioAgg[key] = {
            name: displayName,
            count: 0,
          };
        }
        voluntarioAgg[key].count += 1;
      } else {
        totalVagasAbertas++;
      }
    }

    // Status temporal
    if (v.date < todayStr) {
      visitasPassadas++;
      if (v.visit_summary && v.visit_summary.trim()) {
        visitasComResumo.push(v);
      } else {
        visitasSemResumo.push(v);
      }
    } else if (v.date === todayStr) {
      visitasHoje++;
    } else {
      visitasFuturas++;
    }
  }

  const taxaOcupacao =
    totalVagasOfertadas > 0
      ? ((totalVagasPreenchidas / totalVagasOfertadas) * 100).toFixed(1)
      : 0;

  console.log(`\n📌 1. RESUMO GERAL DAS ESCALAS:`);
  console.log(`   • Total de visitas cadastradas:    ${totalVisitas}`);
  console.log(`   • Visitas já realizadas (passado): ${visitasPassadas}`);
  console.log(`   • Visitas agendadas para HOJE:     ${visitasHoje}`);
  console.log(`   • Visitas futuras no calendário:   ${visitasFuturas}`);

  console.log(`\n👥 2. STATUS DAS VAGAS DE VOLUNTÁRIOS:`);
  console.log(`   • Total de vagas disponibilizadas: ${totalVagasOfertadas}`);
  console.log(`   • Vagas confirmadas/preenchidas:   ${totalVagasPreenchidas} (${taxaOcupacao}%)`);
  console.log(`   • Vagas ainda em aberto:           ${totalVagasAbertas}`);

  console.log(`\n🤝 3. VOLUNTÁRIOS AGENDADOS:`);
  const voluntarioEntries = Object.values(voluntarioAgg).map((item) => [item.name, item.count]);

  if (voluntarioEntries.length === 0) {
    console.log(`   (Nenhum voluntário agendado no momento)`);
  } else {
    voluntarioEntries
      .sort((a, b) => b[1] - a[1])
      .forEach(([nome, count]) => {
        console.log(`   • ${nome.padEnd(25)} : ${count} visita(s)`);
      });
  }

  // Filtrar locais que possuem pelo menos 1 voluntário agendado
  const visitasComVoluntarios = visits.filter((v) => {
    const slots = Array.isArray(v.slots) ? v.slots : [];
    return slots.some((s) => (s || '').trim());
  });

  console.log(`\n🏥 4. LOCAIS AGENDADOS:`);
  if (visitasComVoluntarios.length === 0) {
    console.log(`   (Nenhum local com agendamento confirmado no momento)`);
  } else {
    visitasComVoluntarios.forEach((v, idx) => {
      const slots = Array.isArray(v.slots) ? v.slots : [];
      const confirmados = slots
        .filter((s) => (s || '').trim())
        .map((s) => formatVolunteerDisplayName(s));

      console.log(`   ${idx + 1}. Local: ${v.name}`);
      console.log(`      Dia: ${formatBrDate(v.date)}             Hora: ${v.time}`);
      console.log(`      Voluntários: ${confirmados.join(', ')}`);
      if (idx < visitasComVoluntarios.length - 1) {
        console.log('      ' + '-'.repeat(55));
      }
    });
  }

  console.log(`\n📝 5. STATUS DOS RESUMOS DE VISITAS REALIZADAS:`);
  console.log(`   • Visitas passadas com resumo registrado: ${visitasComResumo.length}`);
  console.log(`   • Visitas passadas com resumo PENDENTE:    ${visitasSemResumo.length}`);
  if (visitasSemResumo.length > 0) {
    console.log(`     ⚠️ Pendências de relato:`);
    visitasSemResumo.forEach((v) => {
      console.log(`       - [${formatBrDate(v.date)} às ${v.time}] ${v.name}`);
    });
  }

  console.log('\n' + '='.repeat(68));
  console.log(`  ✅ Análise concluída com sucesso.`);
  console.log('='.repeat(68));

  // Gerar resumo em Markdown persistente
  const reportPath = path.resolve('RELATORIO_VISITAS.md');
  const markdownReport = `# 📊 Relatório Diário de Visitas A.A.
*Gerado em: ${dateFormatted} às ${timeFormatted}*

## 📈 1. Resumo Geral das Escalas
- **Total de Visitas Cadastradas:** ${totalVisitas}
- **Visitas Já Realizadas (Passado):** ${visitasPassadas}
- **Visitas Agendadas para HOJE:** ${visitasHoje}
- **Visitas Futuras no Calendário:** ${visitasFuturas}

## 👥 2. Status das Vagas de Voluntários
- **Total de Vagas Disponibilizadas:** ${totalVagasOfertadas}
- **Vagas Confirmadas/Preenchidas:** ${totalVagasPreenchidas} (${taxaOcupacao}%)
- **Vagas Ainda em Aberto:** ${totalVagasAbertas}

## 🤝 3. Voluntários Agendados
${
  voluntarioEntries.length
    ? voluntarioEntries
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `- **${n}:** ${c} visita(s)`)
        .join('\n')
    : '_Nenhum voluntário agendado no momento._'
}

## 🏥 4. Locais Agendados
${
  visitasComVoluntarios.length
    ? visitasComVoluntarios
        .map((v) => {
          const slots = Array.isArray(v.slots) ? v.slots : [];
          const confirmados = slots
            .filter((s) => (s || '').trim())
            .map((s) => formatVolunteerDisplayName(s));
          return `- **Local:** ${v.name}\n  - **Dia:** ${formatBrDate(v.date)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Hora:** ${v.time}\n  - **Voluntários:** ${confirmados.join(', ')}`;
        })
        .join('\n\n')
    : '_Nenhum local com agendamento confirmado no momento._'
}

## 📝 5. Status dos Resumos de Visitas Realizadas
- **Com Resumo Registrado:** ${visitasComResumo.length}
- **Com Resumo Pendente:** ${visitasSemResumo.length}
${
  visitasSemResumo.length
    ? visitasSemResumo.map((v) => `  - ⚠️ *[${formatBrDate(v.date)} às ${v.time}]* ${v.name}`).join('\n')
    : ''
}
`;
  try {
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  } catch (e) {}

  // Enviar e-mail via Resend
  await sendReportEmail({
    now,
    dateFormatted,
    timeFormatted,
    totalVisitas,
    visitasPassadas,
    visitasHoje,
    visitasFuturas,
    totalVagasOfertadas,
    totalVagasPreenchidas,
    totalVagasAbertas,
    taxaOcupacao,
    voluntarioEntries,
    visits,
    visitasComResumo,
    visitasSemResumo,
  });
}

runVisitsAnalysis();
