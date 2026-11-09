import 'dotenv/config';

const brevoKey = (process.env.BREVO_API_KEY || '').trim();
const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'henrique.rosa@poli.ufrj.br').trim();
const rawEmails = process.env.REPORT_EMAIL_TO || 'henrique.rosa@poli.ufrj.br, dinizdanfer@gmail.com';
const toEmails = rawEmails.split(',').map((e) => ({ email: e.trim() })).filter((e) => e.email);

async function notify(venue, date, time, vols) {
  const subject = `🎉 Novo Voluntário Confirmado: ${venue} (${date})`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1E2A3F; padding: 20px;">
      <h2 style="color: #123C6B;">🤝 Presença Confirmada na Escala A.A.</h2>
      <p>Um novo companheiro confirmou presença na escala de visitas:</p>
      <ul>
        <li><strong>Local:</strong> ${venue}</li>
        <li><strong>Data e Hora:</strong> ${date} às ${time}</li>
        <li><strong>Voluntário(s) adicionado(s):</strong> <span style="color: #15803D; font-weight: bold;">${vols.join(', ')}</span></li>
      </ul>
      <p style="margin-top: 20px;">
        <a href="https://agenda-visitas-aa.vercel.app" style="background-color: #123C6B; color: #FFFFFF; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">Abrir Agenda de Visitas</a>
      </p>
    </div>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': brevoKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Agenda de Visitas A.A.', email: senderEmail },
      to: toEmails,
      subject,
      htmlContent: html,
    }),
  });

  const data = await res.json();
  console.log(`Disparo [${venue}]: status ${res.status}`, data);
}

async function main() {
  await notify('Hospital São Francisco na Providência de Deus', '09/11/2026', '16:00', ['Henrique R.']);
  await notify('Hospital Casa Menssana', '18/11/2026', '19:30', ['Henrique R.']);
  console.log('✅ Ambos os e-mails dos agendamentos de hoje foram disparados com sucesso!');
}

main();
