// Vercel Serverless Function: Envio de Notificações em Tempo Real via Brevo / Resend
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

    let venue = body.venue || '';
    let date = body.date || '';
    let time = body.time || '';
    let added = Array.isArray(body.added) ? body.added.map(s => (s || '').trim()).filter(Boolean) : [];
    let removed = Array.isArray(body.removed) ? body.removed.map(s => (s || '').trim()).filter(Boolean) : [];

    // Suporte adicional para payloads automáticos de Webhook do Supabase (Database Webhook)
    if (body.record && (!venue || !date)) {
      const rec = body.record;
      const oldRec = body.old_record || {};
      venue = rec.name || venue;
      date = rec.date || date;
      time = rec.time || time;

      const newSlots = Array.isArray(rec.slots) ? rec.slots.map(s => (s || '').trim()).filter(Boolean) : [];
      const oldSlots = Array.isArray(oldRec.slots) ? oldRec.slots.map(s => (s || '').trim()).filter(Boolean) : [];

      added = newSlots.filter(s => !oldSlots.includes(s));
      removed = oldSlots.filter(s => !newSlots.includes(s));
    }

    if (added.length === 0 && removed.length === 0) {
      return res.status(200).json({ success: true, message: 'Nenhuma alteração de voluntários para notificar.' });
    }

    // Formatar data para DD/MM/AAAA
    let dateBr = date;
    if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        dateBr = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const brevoKey = (process.env.BREVO_API_KEY || '').trim();
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'henrique.rosa@poli.ufrj.br').trim();
    const rawEmails = process.env.REPORT_EMAIL_TO || 'henrique.rosa@poli.ufrj.br, dinizdanfer@gmail.com';
    const toEmails = rawEmails.split(',').map(e => ({ email: e.trim() })).filter(e => e.email);

    const emailDispatches = [];

    // Cenário 1: Novo(s) voluntário(s) adicionado(s)
    if (added.length > 0) {
      const subject = `🎉 Novo Voluntário Confirmado: ${venue} (${dateBr})`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #1E2A3F; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;">
          <h2 style="color: #123C6B; border-bottom: 2px solid #E4C687; padding-bottom: 8px; margin-top: 0;">
            🤝 Presença Confirmada na Escala A.A.
          </h2>
          <p style="font-size: 15px; color: #334155;">
            Um companheiro confirmou presença na escala de visitas:
          </p>
          <div style="background-color: #F8FAFC; border-left: 4px solid #16A34A; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>🏥 Local:</strong> ${venue}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>🗓️ Data e Hora:</strong> ${dateBr} às ${time}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>👥 Voluntário(s) Confirmado(s):</strong> <span style="color: #15803D; font-weight: bold;">${added.join(', ')}</span></p>
          </div>
          <p style="margin-top: 24px;">
            <a href="https://agenda-visitas-aa.vercel.app" style="display: inline-block; background-color: #123C6B; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
              🔗 Abrir Agenda de Visitas Online
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin-top: 24px;" />
          <p style="font-size: 11px; color: #94A3B8; margin-bottom: 0;">
            Notificação automática da Escala de Visitas A.A. — Grupo de Serviços CTO / CIT.
          </p>
        </div>
      `;
      emailDispatches.push({ subject, htmlContent });
    }

    // Cenário 2: Voluntário(s) retirou o nome (vaga reaberta)
    if (removed.length > 0) {
      const subject = `⚠️ Atenção: Vaga Reaberta em ${venue} (${dateBr})`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #1E2A3F; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px;">
          <h2 style="color: #B91C1C; border-bottom: 2px solid #FECACA; padding-bottom: 8px; margin-top: 0;">
            ⚠️ Retirada de Nome / Vaga Reaberta
          </h2>
          <p style="font-size: 15px; color: #334155;">
            Um companheiro desmarcou ou retirou o nome da escala de visitas:
          </p>
          <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>🏥 Local:</strong> ${venue}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>🗓️ Data e Hora:</strong> ${dateBr} às ${time}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>👥 Voluntário(s) que desmarcou:</strong> <span style="color: #B91C1C; font-weight: bold;">${removed.join(', ')}</span></p>
          </div>
          <p style="font-size: 13px; color: #B45309; font-style: italic;">
            A vaga está novamente aberta para outros companheiros preencherem.
          </p>
          <p style="margin-top: 24px;">
            <a href="https://agenda-visitas-aa.vercel.app" style="display: inline-block; background-color: #123C6B; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">
              🔗 Abrir Agenda de Visitas Online
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin-top: 24px;" />
          <p style="font-size: 11px; color: #94A3B8; margin-bottom: 0;">
            Notificação automática da Escala de Visitas A.A. — Grupo de Serviços CTO / CIT.
          </p>
        </div>
      `;
      emailDispatches.push({ subject, htmlContent });
    }

    const results = [];

    for (const item of emailDispatches) {
      let sent = false;

      // 1. Tentar Brevo API
      if (brevoKey) {
        try {
          const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'Agenda de Visitas A.A.', email: senderEmail },
              to: toEmails,
              subject: item.subject,
              htmlContent: item.htmlContent,
            }),
          });
          const data = await resp.json();
          if (resp.ok) {
            results.push({ provider: 'brevo', messageId: data.messageId, status: resp.status });
            sent = true;
          } else {
            console.warn('⚠️ Brevo rejeitou:', data);
          }
        } catch (errB) {
          console.warn('⚠️ Erro de conexão Brevo:', errB.message);
        }
      }

      // 2. Contingência Resend
      if (!sent && resendKey) {
        try {
          const recipients = toEmails.map(e => e.email).filter(e => e.includes('henrique.rosa'));
          const targetRecipients = recipients.length > 0 ? recipients : ['henrique.rosa@poli.ufrj.br'];
          const respResend = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Agenda AA <onboarding@resend.dev>',
              to: targetRecipients,
              subject: item.subject,
              html: item.htmlContent,
            }),
          });
          const dataResend = await respResend.json();
          if (respResend.ok) {
            results.push({ provider: 'resend', id: dataResend.id, status: respResend.status });
            sent = true;
          }
        } catch (errR) {
          console.error('❌ Erro de contingência Resend:', errR.message);
        }
      }
    }

    return res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('❌ Erro interno em notify-volunteer:', err);
    return res.status(500).json({ error: err.message });
  }
}
