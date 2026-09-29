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

function getConfirmedVolunteers(slots) {
  const rawSlots = Array.isArray(slots) ? slots : [];
  const confirmados = [];
  const seen = new Set();
  for (const s of rawSlots) {
    const trimmed = (s || '').trim();
    if (!trimmed) continue;
    const key = normalizeVolunteerKey(trimmed);
    if (!seen.has(key)) {
      seen.add(key);
      confirmados.push(formatVolunteerDisplayName(trimmed));
    }
  }
  return confirmados;
}

function getSlotStats(slots) {
  const rawSlots = Array.isArray(slots) ? slots : [];
  const confirmados = getConfirmedVolunteers(rawSlots);
  const openCount = rawSlots.filter((s) => !(s || '').trim()).length;
  return { confirmados, openCount, totalSlots: rawSlots.length };
}

function getBrasiliaDateInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const todayStr = `${map.year}-${map.month}-${map.day}`;
  const dateFormatted = `${map.day}/${map.month}/${map.year}`;
  const timeFormatted = `${map.hour}:${map.minute}:${map.second}`;
  return {
    now,
    todayStr,
    dateFormatted,
    timeFormatted,
    day: parseInt(map.day, 10),
    month: parseInt(map.month, 10),
    year: parseInt(map.year, 10),
    yearMonth: `${map.year}-${map.month}`,
    map,
  };
}

function getPortugueseMonthName(monthNum) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthNum - 1] || '';
}

// Busca todos os contatos cadastrados e ativos na conta do Brevo
async function getBrevoRegisteredContacts(brevoKey) {
  if (!brevoKey) return [];
  try {
    const res = await fetch('https://api.brevo.com/v3/contacts?limit=100', {
      method: 'GET',
      headers: {
        'api-key': brevoKey,
        accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`⚠️ Não foi possível listar contatos do Brevo (Status: ${res.status})`);
      return [];
    }
    const data = await res.json();
    const contacts = Array.isArray(data?.contacts) ? data.contacts : [];
    return contacts
      .filter((c) => c.email && !c.emailBlacklisted)
      .map((c) => c.email.trim().toLowerCase());
  } catch (err) {
    console.warn('⚠️ Erro ao consultar contatos do Brevo:', err.message);
    return [];
  }
}

// Consolida os contatos do Brevo com os e-mails configurados no ambiente
async function getAllMonthlyRecipients(brevoKey, rawEnvEmails) {
  const envEmails = (rawEnvEmails || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const brevoEmails = await getBrevoRegisteredContacts(brevoKey);
  const combined = Array.from(new Set([...brevoEmails, ...envEmails]));
  return combined.filter(Boolean);
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
  visitasDeHoje = [],
  proximaVisita = null,
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
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const rawEmails = process.env.REPORT_EMAIL_TO || 'dinizdanfer@gmail.com';
  const toEmails = rawEmails
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (!brevoKey && !resendKey) {
    console.log('ℹ️ Nenhuma chave de e-mail (Brevo ou Resend) configurada. Envio ignorado.');
    return;
  }

  if (toEmails.length === 0) {
    console.log('ℹ️ Nenhum destinatário configurado em REPORT_EMAIL_TO.');
    return;
  }

  const emailSubject = visitasDeHoje && visitasDeHoje.length > 0
    ? `🔔 [HOJE TEM VISITA] Escala de Visitas A.A. — ${dateFormatted}`
    : `📊 Relatório Diário de Visitas A.A. — ${dateFormatted}`;

  const visitasDeHojeHtml = visitasDeHoje && visitasDeHoje.length > 0
    ? `
      <!-- Bloco Destaque: Visitas do Dia -->
      <div style="background-color: #FFFDF5; border: 2px solid #D97706; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.12);">
        <div style="margin-bottom: 12px; border-bottom: 1px solid #FDE68A; padding-bottom: 8px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">
            🚨 VISITAS PROGRAMADAS PARA HOJE (${dateFormatted})
          </h2>
        </div>
        <p style="margin: 0 0 14px 0; font-size: 13px; color: #78350F;">
          Lembrete operacional da escala: temos <strong>${visitasDeHoje.length} visita(s)</strong> programada(s) para o dia de hoje:
        </p>
        ${visitasDeHoje
          .map((v) => {
            const { confirmados, openCount } = getSlotStats(v.slots);
            const statusVagas = openCount > 0
              ? `<div style="font-size: 12px; color: #B45309; font-style: italic; margin-top: 4px;">(${openCount} vaga(s) ainda em aberto)</div>`
              : '';

            return `
              <div style="background-color: #FFFFFF; border: 1px solid #FDE68A; border-left: 4px solid #123C6B; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <div style="font-size: 15px; font-weight: bold; color: #123C6B; margin-bottom: 4px;">
                  🏥 Local: ${v.name}
                </div>
                ${v.addr ? `<div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">📍 Endereço: ${v.addr}</div>` : ''}
                <div style="font-size: 13px; color: #1E2A3F; margin-bottom: 8px;">
                  ⏰ <strong>Horário:</strong> <span style="background-color: #123C6B; color: #F6D269; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; font-size: 13px;">${v.time}</span>
                </div>
                <div style="font-size: 13px; color: #1E2A3F;">
                  👥 <strong>Companheiro(a)s Voluntario(a)s:</strong> ${
                    confirmados.length
                      ? `<span style="color: #15803D; font-weight: bold;">${confirmados.join(', ')}</span>`
                      : `<span style="color: #DC2626; font-weight: bold;">⚠️ NENHUM(A) COMPANHEIRO(A) ESCALADO(A)!</span>`
                  }
                </div>
                ${statusVagas}
              </div>
            `;
          })
          .join('')}
      </div>
    `
    : `
      <!-- Nenhuma Visita Hoje -->
      <div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 14px 18px; margin-bottom: 22px;">
        <div style="font-size: 14px; font-weight: bold; color: #166534; margin-bottom: 4px;">
          ✅ Nenhuma visita da escala programada para hoje (${dateFormatted}).
        </div>
        ${
          proximaVisita
            ? `<div style="font-size: 13px; color: #15803D;">
                📅 <strong>Próxima Visita Agendada:</strong> ${formatBrDate(proximaVisita.date)} às ${proximaVisita.time} — <strong>${proximaVisita.name}</strong>
              </div>`
            : ''
        }
      </div>
    `;

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
          const confirmados = getConfirmedVolunteers(v.slots);

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
  <title>${emailSubject}</title>
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
      ${visitasDeHojeHtml}
      
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
        <a href="https://agenda-visitas-aa.vercel.app" target="_blank" style="display: inline-block; background-color: #123C6B; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
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

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      if (attempts === 1) {
        console.log(`\n✉️ Enviando relatório por e-mail para: ${toEmails.join(', ')}...`);
      } else {
        console.log(`\n🔄 Tentativa ${attempts} de ${maxAttempts} para: ${toEmails.join(', ')}...`);
      }

      if (brevoKey) {
        try {
          const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'henrique.rosa@poli.ufrj.br').trim();
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'Agenda de Visitas A.A.', email: senderEmail },
              to: toEmails.map((email) => ({ email })),
              subject: emailSubject,
              htmlContent: html,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            console.log(`✅ E-mail enviado com sucesso via Brevo para ${toEmails.join(', ')}! (MessageId: ${data.messageId})\n`);
            return;
          } else {
            console.warn('⚠️ Brevo rejeitou envio (IP não autorizado ou erro):', data?.message || data);
            console.log('🔄 Acionando contingência imediata com Resend...');
          }
        } catch (errBrevo) {
          console.warn('⚠️ Falha de conexão com Brevo:', errBrevo.message);
          console.log('🔄 Acionando contingência imediata com Resend...');
        }
      }

      if (resendKey) {
        // No sandbox gratuito do Resend, envia para o e-mail do titular verificado
        const targetRecipients = toEmails.filter((e) => e.includes('henrique.rosa'));
        const recipients = targetRecipients.length > 0 ? targetRecipients : ['henrique.rosa@poli.ufrj.br'];
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Agenda AA <onboarding@resend.dev>',
            to: recipients,
            subject: emailSubject,
            html: html,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          console.log(`✅ E-mail enviado com sucesso via Resend (Contingência) para ${recipients.join(', ')}! (ID: ${data.id})\n`);
          return;
        } else {
          console.error('❌ Resposta do Resend:', data);
        }
      }
    } catch (err) {
      const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : '';
      console.error(`⚠️ Oscilação de rede na tentativa ${attempts}: ${err.message}${cause}`);
      if (attempts < maxAttempts) {
        console.log('⏳ Aguardando 2 segundos para tentar novamente...');
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.error('❌ Todas as tentativas falharam devido à instabilidade na conexão.');
      }
    }
  }
}

async function sendMonthlyCelebrationEmail({
  monthName,
  year,
  dateFormatted,
  totalVisitasMes,
  voluntarioEntriesMes,
  instituicoesMes,
  resumosMes,
  taxaOcupacaoMes,
  totalVagasOfertadasMes,
  totalVagasPreenchidasMes,
}) {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const rawEmails = process.env.REPORT_EMAIL_TO || 'henrique.rosa@poli.ufrj.br, dinizdanfer@gmail.com';

  const toEmails = await getAllMonthlyRecipients(brevoKey, rawEmails);

  if (!brevoKey && !resendKey) {
    console.log('ℹ️ Nenhuma chave de e-mail (Brevo ou Resend) configurada para o e-mail de final de mês.');
    return;
  }

  if (toEmails.length === 0) {
    console.log('ℹ️ Nenhum destinatário encontrado no Brevo ou em REPORT_EMAIL_TO.');
    return;
  }

  const subject = `🎉👏 Agenda do mês (${monthName}) finalizada com sucesso!! Parabéns a todos(as)! 🎊✨`;

  const voluntariosHtml = voluntarioEntriesMes.length
    ? voluntarioEntriesMes
        .sort((a, b) => b[1] - a[1])
        .map(
          ([nome, qtd]) => `
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 10px 14px; font-size: 14px; color: #1E2A3F;">
                👏 <strong>${nome}</strong>
              </td>
              <td style="padding: 10px 14px; font-size: 14px; text-align: right; color: #15803D; font-weight: bold;">
                ${qtd} visita(s) realizada(s) 🏅
              </td>
            </tr>
          `
        )
        .join('')
    : '<tr><td colspan="2" style="padding: 12px; color: #64748B; font-style: italic;">Nenhum voluntário escalado no mês.</td></tr>';

  const instituicoesHtml = instituicoesMes.length
    ? instituicoesMes
        .map(
          (inst) => `
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #123C6B; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; font-size: 13px; color: #1E2A3F;">
              🏥 <strong>${inst}</strong>
            </div>
          `
        )
        .join('')
    : '';

  const resumosHtml = resumosMes.length
    ? `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 14px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📖 Relatos de Amor e Serviço dos Voluntários no Mês:
        </h3>
        ${resumosMes
          .map(
            (r) => `
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px;">
                <div style="font-size: 13px; font-weight: bold; color: #123C6B; margin-bottom: 4px;">
                  🗓️ ${formatBrDate(r.date)} — ${r.name}
                </div>
                <div style="font-size: 13px; color: #334155; font-style: italic; line-height: 1.4;">
                  “${r.visit_summary}”
                </div>
              </div>
            `
          )
          .join('')}
      </div>
    `
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5F9; color: #1E2A3F;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.1); border: 1px solid #CBD5E1;">
    
    <!-- Cabeçalho Oficial AA -->
    <div style="background-color: #123C6B; color: #FFFFFF; padding: 28px 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 21px; font-weight: bold; letter-spacing: 0.5px;">ESCALA DE VISITAS A.A.</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #F6D269; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Grupo de Serviços CTO / CIT</p>
      <div style="margin-top: 12px; display: inline-block; background-color: rgba(255,255,255,0.15); padding: 5px 14px; border-radius: 20px; font-size: 12px; color: #F8FAFC;">
        🌟 Unidade • Serviço • Recuperação
      </div>
    </div>

    <div style="padding: 26px 28px;">
      
      <!-- Banner Festivo Principal de Parabenização -->
      <div style="background: linear-gradient(135deg, #FFFDF5 0%, #FEF3C7 100%); border: 2px solid #F59E0B; border-radius: 12px; padding: 24px 20px; margin-bottom: 26px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.15); text-align: center;">
        <div style="font-size: 30px; margin-bottom: 10px;">🎉 👏 🥳 🎊 🙌 ✨</div>
        <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #92400E; line-height: 1.4;">
          Agenda do mês (${monthName}) finalizada com sucesso!! Parabéns a todos(as) que se dedicaram a levar a msg do 12º Passo!!!
        </h2>
        <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.5;">
          Nossa imensa gratidão a cada companheiro e companheira que doou seu amor, presença, depoimento e mensagem de esperança nas instituições ao longo deste mês! 💙🙏👏
        </p>
      </div>

      <!-- Resumo das Conquistas do Mês -->
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 14px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          📊 1. Conquistas do Mês de ${monthName}/${year}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 8px 0; color: #475569;">🏆 Total de Visitas Realizadas:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #123C6B;">${totalVisitasMes} visita(s)</td>
          </tr>
          <tr style="border-bottom: 1px solid #F1F5F9;">
            <td style="padding: 8px 0; color: #475569;">👥 Vagas de Voluntários Preenchidas:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #15803D;">${totalVagasPreenchidasMes} de ${totalVagasOfertadasMes} (${taxaOcupacaoMes}%)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #475569;">🏥 Instituições Assistidas:</td>
            <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #1E2A3F;">${instituicoesMes.length} locais</td>
          </tr>
        </table>
      </div>

      <!-- Quadro de Honra dos Voluntários -->
      <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 14px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          👏 2. Companheiro(a)s que Serviram no Mês
        </h3>
        <table style="width: 100%; border-collapse: collapse; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          ${voluntariosHtml}
        </table>
      </div>

      <!-- Instituições Atendidas -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 14px 0; color: #123C6B; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
          🏥 3. Instituições que Receberam a Mensagem
        </h3>
        ${instituicoesHtml}
      </div>

      ${resumosHtml}

      <!-- RODAPÉ EM DESTAQUE ESPECIAL (Conforme Solicitado) -->
      <div style="background-color: #123C6B; border: 2px solid #F6D269; border-radius: 12px; padding: 22px 24px; text-align: center; margin: 32px 0 20px 0; box-shadow: 0 4px 15px rgba(18, 60, 107, 0.25);">
        <div style="font-size: 20px; font-weight: bold; color: #F6D269; font-style: italic; font-family: Georgia, 'Times New Roman', serif; line-height: 1.4;">
          “Quando tudo mais falhar, leve a msg, isto funciona!”
        </div>
        <div style="font-size: 12px; color: #E2E8F0; margin-top: 8px; letter-spacing: 0.5px;">
          — Alcoólicos Anônimos (Capítulo 7: Trabalhando com os Outros)
        </div>
      </div>

      <!-- Botão para Escala Online -->
      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <a href="https://agenda-visitas-aa.vercel.app" target="_blank" style="display: inline-block; background-color: #123C6B; color: #FFFFFF; text-decoration: none; padding: 12px 26px; border-radius: 6px; font-weight: bold; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          🔗 Acessar Agenda de Visitas A.A.
        </a>
      </div>

    </div>

    <!-- Rodapé Técnico -->
    <div style="background-color: #F8FAFC; padding: 16px 28px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
      Enviado automaticamente para todas as contas cadastradas no Brevo e servidores da escala.<br>
      Grupo de Serviços CTO / CIT — Alcoólicos Anônimos.
    </div>

  </div>
</body>
</html>
  `;

  console.log(`\n🎉====================================================================`);
  console.log(`   ENVIANDO PARABENIZAÇÃO DE FINAL DE MÊS (${monthName.toUpperCase()})`);
  console.log(`   Destinatários cadastrados no Brevo: ${toEmails.join(', ')}`);
  console.log(`====================================================================`);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      if (attempts === 1) {
        console.log(`✉️ Enviando e-mail comemorativo para ${toEmails.length} destinatário(s)...`);
      } else {
        console.log(`🔄 Tentativa ${attempts} de ${maxAttempts}...`);
      }

      if (brevoKey) {
        try {
          const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'henrique.rosa@poli.ufrj.br').trim();
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'Agenda de Visitas A.A.', email: senderEmail },
              to: toEmails.map((email) => ({ email })),
              subject,
              htmlContent: html,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            console.log(`✅ E-mail comemorativo de final de mês enviado com sucesso via Brevo para ${toEmails.join(', ')}! (MessageId: ${data.messageId})\n`);
            return;
          } else {
            console.warn('⚠️ Brevo rejeitou envio do e-mail comemorativo:', data?.message || data);
            console.log('🔄 Acionando contingência imediata com Resend...');
          }
        } catch (errBrevo) {
          console.warn('⚠️ Falha de conexão com Brevo:', errBrevo.message);
          console.log('🔄 Acionando contingência imediata com Resend...');
        }
      }

      if (resendKey) {
        const targetRecipients = toEmails.filter((e) => e.includes('henrique.rosa'));
        const recipients = targetRecipients.length > 0 ? targetRecipients : ['henrique.rosa@poli.ufrj.br'];
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Agenda AA <onboarding@resend.dev>',
            to: recipients,
            subject,
            html,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          console.log(`✅ E-mail comemorativo enviado com sucesso via Resend para ${recipients.join(', ')}! (ID: ${data.id})\n`);
          return;
        } else {
          console.error('❌ Resposta do Resend:', data);
        }
      }
    } catch (err) {
      console.error(`⚠️ Erro no envio comemorativo (tentativa ${attempts}): ${err.message}`);
      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}

export async function runVisitsAnalysis() {
  const { now, todayStr, dateFormatted, timeFormatted, day, month, year, yearMonth, map } = getBrasiliaDateInfo();

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
  const visitasDeHoje = [];
  const visitasFuturasList = [];

  for (const v of visits) {
    const rawSlots = Array.isArray(v.slots) ? v.slots : [];
    totalVagasOfertadas += rawSlots.length;

    const seenInVisit = new Set();
    for (const rawName of rawSlots) {
      const trimmed = (rawName || '').trim();
      if (trimmed) {
        const key = normalizeVolunteerKey(trimmed);
        if (!seenInVisit.has(key)) {
          seenInVisit.add(key);
          totalVagasPreenchidas++;
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
      visitasDeHoje.push(v);
    } else {
      visitasFuturas++;
      visitasFuturasList.push(v);
    }
  }

  const proximaVisita = visitasFuturasList.length > 0
    ? visitasFuturasList.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0]
    : null;

  const taxaOcupacao =
    totalVagasOfertadas > 0
      ? ((totalVagasPreenchidas / totalVagasOfertadas) * 100).toFixed(1)
      : 0;

  // Destaque Especial: Visitas de Hoje no Terminal
  if (visitasDeHoje.length > 0) {
    console.log(`\n🚨 ====================================================================`);
    console.log(`   🔔 VISITAS PROGRAMADAS PARA HOJE (${dateFormatted}) — ${visitasDeHoje.length} VISITA(S)`);
    console.log(`====================================================================`);
    visitasDeHoje.forEach((v, idx) => {
      const { confirmados, openCount } = getSlotStats(v.slots);
      console.log(`   ${idx + 1}. Local: ${v.name}`);
      if (v.addr) console.log(`      Endereço: ${v.addr}`);
      console.log(`      Horário: ${v.time}`);
      console.log(`      Companheiro(a)s Voluntario(a)s: ${confirmados.length ? confirmados.join(', ') : '⚠️ NENHUM(A) COMPANHEIRO(A) ESCALADO(A)'}`);
      if (openCount > 0) {
        console.log(`      Vagas em aberto: ${openCount} vaga(s)`);
      }
      if (idx < visitasDeHoje.length - 1) {
        console.log('      ' + '-'.repeat(55));
      }
    });
    console.log(`====================================================================`);
  } else {
    console.log(`\n✅ Nenhuma visita da escala programada para hoje (${dateFormatted}).`);
    if (proximaVisita) {
      console.log(`   📅 Próxima visita agendada: ${formatBrDate(proximaVisita.date)} às ${proximaVisita.time} — ${proximaVisita.name}`);
    }
  }

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
      const confirmados = getConfirmedVolunteers(v.slots);

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
  console.log(`  ✅ Análise diária concluída com sucesso.`);
  console.log('='.repeat(68));

  // --- Fechamento e Parabenização de Final de Mês ---
  const currentMonthNum = month;
  const currentYearNum = year;
  const currentDayNum = day;
  const currentMonthName = getPortugueseMonthName(currentMonthNum);
  const currentYearMonth = yearMonth;

  const visitsThisMonth = visits.filter((v) => v.date && v.date.startsWith(currentYearMonth));
  const totalVisitasMes = visitsThisMonth.length;
  let totalVagasOfertadasMes = 0;
  let totalVagasPreenchidasMes = 0;
  const voluntarioMesAgg = {};
  const instituicoesMesSet = new Set();
  const resumosMes = [];
  let visitasPassadasMes = 0;
  let visitasHojeMes = 0;
  let visitasFuturasMes = 0;

  for (const v of visitsThisMonth) {
    if (v.name) instituicoesMesSet.add(v.name);
    const rawSlots = Array.isArray(v.slots) ? v.slots : [];
    totalVagasOfertadasMes += rawSlots.length;
    const seen = new Set();
    for (const rawName of rawSlots) {
      const trimmed = (rawName || '').trim();
      if (trimmed) {
        const key = normalizeVolunteerKey(trimmed);
        if (!seen.has(key)) {
          seen.add(key);
          totalVagasPreenchidasMes++;
          const displayName = formatVolunteerDisplayName(trimmed);
          if (!voluntarioMesAgg[key]) {
            voluntarioMesAgg[key] = { name: displayName, count: 0 };
          }
          voluntarioMesAgg[key].count += 1;
        }
      }
    }
    if (v.date < todayStr) {
      visitasPassadasMes++;
      if (v.visit_summary && v.visit_summary.trim()) {
        resumosMes.push(v);
      }
    } else if (v.date === todayStr) {
      visitasHojeMes++;
    } else {
      visitasFuturasMes++;
    }
  }

  const taxaOcupacaoMes =
    totalVagasOfertadasMes > 0
      ? ((totalVagasPreenchidasMes / totalVagasOfertadasMes) * 100).toFixed(1)
      : 0;

  const voluntarioEntriesMes = Object.values(voluntarioMesAgg).map((item) => [item.name, item.count]);
  const instituicoesMes = Array.from(instituicoesMesSet);

  const lastDayOfCurrentMonth = new Date(currentYearNum, currentMonthNum, 0).getDate();
  const isLastDayOfMonth = currentDayNum === lastDayOfCurrentMonth;
  const todasVisitasMesRealizadas =
    visitsThisMonth.length > 0 &&
    visitasHojeMes === 0 &&
    visitasFuturasMes === 0;

  const isEndOfMonth =
    isLastDayOfMonth ||
    (currentDayNum >= 28 && todasVisitasMesRealizadas) ||
    process.argv.includes('--end-of-month') ||
    process.argv.includes('--fim-de-mes') ||
    process.env.FORCE_MONTH_END === 'true';

  if (isEndOfMonth) {
    console.log(`\n🎉 ====================================================================`);
    console.log(`   🎊 ENCERRAMENTO DO MÊS (${currentMonthName.toUpperCase()}/${currentYearNum}) — 12º PASSO`);
    console.log(`   Agenda do mês (${currentMonthName}) finalizada com sucesso!!`);
    console.log(`   Parabéns a todos(as) que se dedicaram a levar a msg do 12º Passo!!!`);
    console.log(`   "Quando tudo mais falhar, leve a msg, isto funciona!"`);
    console.log(`====================================================================`);
  }

  const fimDeMesMarkdownSection = isEndOfMonth
    ? `
---

## 🎉 Encerramento do Mês de ${currentMonthName}/${currentYearNum} — 12º Passo
> ### **Agenda do mês (${currentMonthName}) finalizada com sucesso!! Parabéns a todos(as) que se dedicaram a levar a msg do 12º Passo!!!** 👏🥳✨
>
> 🏆 **Total de Visitas Realizadas:** ${totalVisitasMes}  
> 👥 **Vagas Preenchidas:** ${totalVagasPreenchidasMes} de ${totalVagasOfertadasMes} (${taxaOcupacaoMes}%)  
> 🏥 **Instituições Assistidas:** ${instituicoesMes.join(', ')}  
>
> ### 👏 Companheiro(a)s que Serviram no Mês:
${
  voluntarioEntriesMes.length
    ? voluntarioEntriesMes
        .sort((a, b) => b[1] - a[1])
        .map(([n, c]) => `> - 👏 **${n}:** ${c} visita(s) realizada(s) 🏅`)
        .join('\n')
    : '> - _Nenhum voluntário no mês._'
}
>
> ---
> ### 🌟 Palavra de Destaque:
> **“Quando tudo mais falhar, leve a msg, isto funciona!”**
`
    : '';

  // Gerar resumo em Markdown persistente
  const reportPath = path.resolve('RELATORIO_VISITAS.md');
  const hojeMarkdownSection = visitasDeHoje.length > 0
    ? `## 🔔 Visitas Programadas para HOJE (${dateFormatted})
${visitasDeHoje.map((v) => {
  const { confirmados, openCount } = getSlotStats(v.slots);
  const statusVagas = openCount > 0 ? `\n  - **Vagas em aberto:** ${openCount} vaga(s)` : '';
  return `- **Local:** ${v.name}\n  - **Horário:** ${v.time}\n  - **Endereço:** ${v.addr || 'Não informado'}\n  - **Companheiro(a)s Voluntario(a)s:** ${confirmados.length ? confirmados.join(', ') : '⚠️ NENHUM(A) COMPANHEIRO(A) ESCALADO(A)'}${statusVagas}`;
}).join('\n\n')}

---
`
    : `## ℹ️ Visitas de Hoje (${dateFormatted})
_Nenhuma visita da escala programada para hoje._
${proximaVisita ? `\n- **Próxima Visita:** ${formatBrDate(proximaVisita.date)} às ${proximaVisita.time} — ${proximaVisita.name}` : ''}

---
`;

  const markdownReport = `# 📊 Relatório Diário de Visitas A.A.
*Gerado em: ${dateFormatted} às ${timeFormatted}*

${hojeMarkdownSection}
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
          const confirmados = getConfirmedVolunteers(v.slots);
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
${fimDeMesMarkdownSection}
`;
  try {
    fs.writeFileSync(reportPath, markdownReport, 'utf-8');
  } catch (e) {}

  const onlyMonthly = process.argv.includes('--only-monthly');

  if (!onlyMonthly) {
    // Enviar e-mail operacional diário via Brevo / Resend
    await sendReportEmail({
      now,
      dateFormatted,
      timeFormatted,
      visitasDeHoje,
      proximaVisita,
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

  if (isEndOfMonth) {
    // Enviar e-mail especial de parabenização para todas as contas cadastradas no Brevo
    await sendMonthlyCelebrationEmail({
      monthName: currentMonthName,
      year: currentYearNum,
      dateFormatted,
      totalVisitasMes,
      voluntarioEntriesMes,
      instituicoesMes,
      resumosMes,
      taxaOcupacaoMes,
      totalVagasOfertadasMes,
      totalVagasPreenchidasMes,
    });
  }
}

runVisitsAnalysis();
