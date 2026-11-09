# Regras e Diretrizes do Projeto — Escala de Visitas A.A. (CTO / CIT)

## 🔔 Monitoramento Diário do Gatilho e Notificações (Supabase & Brevo)
- **Obrigatoriedade de Monitoramento:** O gatilho de notificações em tempo real e a integridade do pipeline Supabase ➔ Brevo API DEVEM ser monitorados e auditados diariamente.
- **Auditoria Automática das 08:00:** A análise periódica diária (executada via Windows Task Scheduler e GitHub Actions por `scripts/analyze-visits.mjs`) DEVE sempre executar o health check da conexão com a tabela `public.aa_visits` do Supabase e da autenticação na API do Brevo (`/v3/account`), gravando o status na Seção 6 do `RELATORIO_VISITAS.md`, nos logs de execução (`analise_execucao.log`) e no e-mail diário.
- **Alerta Imediato aos Coordenadores:** Caso seja detectada qualquer falha de autenticação (HTTP 401), oscilação de rede ou bloqueio de IP, o sistema deve registrar o alerta em destaque e sinalizar o assunto do e-mail com `⚠️ [ALERTA GATILHO/BREVO]`.
- **Integridade das Notificações em Tempo Real:** Todo e qualquer voluntário cadastrado ou desmarcado no aplicativo web dispara e-mail imediatamente via `/api/notify-volunteer` para `henrique.rosa@poli.ufrj.br` e `dinizdanfer@gmail.com`.
