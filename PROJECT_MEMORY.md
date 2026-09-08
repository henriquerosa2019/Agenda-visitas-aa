# 📌 Memória do Projeto — Escala de Visitas A.A. (CTO / CIT)

Este documento registra todas as decisões de design, regras de negócio, arquitetura e histórico de implementações realizadas no projeto.

---

## 🗂️ Dados e Links do Projeto
- **Nome do Projeto:** Escala de Visitas AA — Grupo de Serviços CTO/CIT
- **Repositório GitHub:** [https://github.com/henriquerosa2019/Agenda-visitas-aa](https://github.com/henriquerosa2019/Agenda-visitas-aa)
- **Hospedagem & Deploys:** Vercel (conectado ao GitHub `main`)
- **Site de Contingência Anterior:** Netlify (`agenda-visitas-aa.netlify.app` - pausado por créditos)
- **Stack Tecnológica:** 
  - **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (ícones)
  - **PWA:** `manifest.json`, `sw.js` para suporte a app instalável
  - **Persistência & Sincronização em Nuvem:** Supabase (`aa_visits`) com Postgres Realtime e cache local de contingência (`localStorage` `escala_visitas_aa_data_v8`).
  - **Credenciais Supabase:** Configuração via variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) ou via interface com modal de configuração (`SupabaseConfigModal`).
---

## 🎨 Identidade Visual & Regras de Layout

### 1. Folha Timbrada Clássica de Serviços
- **Fundo da Página:** Azul Marinho Oficial (`#123C6B`)
- **Fundo da Folha/Sheet:** Creme Pergaminho (`#FBF9F2`) com cantos arredondados e sombra suave
- **Logotipo Oficial AA:** Componente SVG responsivo com o lema *Unidade, Serviço, Recuperação*
- **Tipografia:** Serifada clássica (`Fraunces` / `serif`) para cabeçalhos e nomes de locais; Monospaçada (`IBM Plex Mono`) para datas, horários e badges; Sem serifa para textos corridos.

### 2. Formatação da Linha de Data e Horário
- **📅 Ícone de Calendário:** Presente ao lado de todas as datas (ex: `📅 14/09/2026`).
- **<u>Dia da Semana</u>:** Em caixa alta, fonte monospaçada e com **sublinhado forte** em destaque (`underline decoration-[#123C6B] decoration-2`).
- **⏰ Horário:** Destacado com **fundo azul oficial da paleta (`#123C6B`)**, **fontes amarelas/douradas (`#F6D269`)** e ícone de relógio correspondente.

### 3. Sistema de Cores e Sinalização de Status
- **Hoje / Amanhã:** Nome do local em verde forte (`text-green-700`) com tag verde de status (*Hoje* / *Amanhã*).
- **Já Ocorreu (Passado ou Finalizado):** Nome do local em vermelho forte, **tachado (line-through)** e com tag de status (*Já ocorreu*).
- **Virada do Mês:** As visitas do novo mês voltam automaticamente à cor padrão azul da escala.

### 4. Vagas de Companheiro(a)s Voluntários
- **Vaga Aberta:** Pílula com fundo vermelho/rosa suave (`#F4E2DE`), borda tracejada e texto *"vaga aberta"*.
- **Vaga Preenchida:** Pílula com fundo verde suave (`#DEE9E2`) e nome do companheiro voluntário.
- **Flexibilidade:** Botão `+ vaga` permite adicionar novas vagas dinamicamente para cada instituição.

### 5. Barra Superior e Ações
- Botão alinhado à direita com degradê dourado: **`✎ Editar agenda`** / **`💾 Salvar`**.
- Modal de **Resumo da Visita** (`VisitSummaryModal`) para relato detalhado de voluntários e internos.
- Modal de **Edição Completa do Local** (`EditVisitModal`) para ajuste de endereço, data, horário e sugestões rápidas de hospitais.

---

## 📱 Responsividade (iPhone & Android)
- Layout 100% responsivo e testado em emulação de iPhone (12/14/15/SE) e dispositivos Android.
- Ajustes de padding e larguras mínimas para que nomes de locais, endereços e inputs de voluntários não estourem a tela em celulares compactos (360px a 430px).

---

## 🚀 Comandos Rápidos de Desenvolvimento & Deploy

```bash
# Rodar localmente
npm run dev

# Rodar a análise diária dos agendamentos no Supabase
npm run analyze

# Gerar build de produção
npm run build

# Enviar atualizações para o GitHub (que dispara o deploy no Netlify)
git add .
git commit -m "Descrição da alteração"
git push origin main
```

---

## ⏰ Diretriz Permanente do Agendador de Tarefas do Assistente
- **Autonomia Total:** Sempre que qualquer tarefa for agendada pelo assistente no projeto, ela deve ser configurada e executada de forma **100% autônoma**, sem requerer intervenção manual, confirmação ou cliques do usuário.
- **Horário e Formato Definidos:** A execução ocorre periodicamente: **Todos os dias às 08:00** (horário de Brasília) via GitHub Actions e Agendador de Tarefas do Windows, com o escopo completo: 1. Resumo Geral, 2. Status das Vagas, 3. Voluntários Agendados (unificados), 4. Locais Agendados (apenas agendados com dia/hora), 5. Status dos Resumos.
- **Persistência de Histórico:** Resultados automáticos são gravados em `RELATORIO_VISITAS.md`.
- **Disparo em Tempo Real pelo Supabase:** A inclusão e desmarcação de voluntários dispara e-mails imediatamente via Trigger SQL no Supabase. O relatório geral completo é disparado diariamente às 08:00 (e sob demanda ao clicar na tarefa).

---

## 📧 Arquitetura de Notificações e Relatórios (Brevo & Supabase)

### 1. Destinatários Oficiais
- **Henrique Rosa:** `henrique.rosa@poli.ufrj.br`
- **Danilo Diniz:** `dinizdanfer@gmail.com`

### 2. Notificações em Tempo Real (Supabase ➔ Brevo API)
- **Gatilho no Banco:** Trigger PostgreSQL `on_volunteer_change` na tabela `public.aa_visits` (executa a função `public.tr_notify_volunteer_changes()`).
- **Extensão Utilizada:** `pg_net` executando chamadas HTTP assíncronas para a API REST v3 do Brevo (`https://api.brevo.com/v3/smtp/email`).
- **Cenários Cobertos:**
  1. **Novo Voluntário Cadastrado:** Detecta novos nomes inseridos nas vagas e envia e-mail comemorativo/informativo com presença confirmada.
  2. **Voluntário Retirou o Nome:** Detecta nomes apagados/removidos e envia e-mail de atenção informando a desistência e que a vaga reabriu.
- **Remetente Autorizado:** `henrique.rosa@poli.ufrj.br` (exibido como *"Agenda de Visitas A.A."*, agora **Verificado** no Brevo).

### 3. Relatório Periódico Consolidado (GitHub Actions ➔ Brevo API)
- **Despertador / Cron:** `.github/workflows/daily-analysis.yml`
  - **Todos os dias às 08:00 BRT** (`0 11 * * *`)
  - **Execução manual sob demanda:** Botão *Run workflow* no GitHub Actions ou clique no Agendador de Tarefas.
- **Processamento:** `scripts/analyze-visits.mjs`
  - Consulta o Supabase e compila os 5 itens: Resumo Geral, Status das Vagas, Voluntários Agendados (com unificação de grafias como `Marcio.Motta` e `Marcio Motta`), Locais Agendados (apenas instituições com agendamento ativo, contendo Local, Dia, Hora e Nomes) e Status dos Resumos de Visita.
  - Diagrama o e-mail em HTML nas cores oficiais de A.A. e envia via Brevo para Henrique e Danilo.

### 4. Resolução de Rede & IP Dinâmico
- **Forçar IPv4:** Configurado `--dns-result-order=ipv4first` no script `analyze` do `package.json` e no arquivo batch `scripts/run-daily-analysis.bat` para garantir conectividade direta via IPv4 homologado no Brevo.
- **Retentativas Automáticas:** O script `scripts/analyze-visits.mjs` possui retry automático (até 3 tentativas) para tolerar oscilações momentâneas de conexão.

### 5. Integridade do Código do App
- O código da aplicação em `src/` permanece **100% puro e intacto**: sem lógicas de disparo de e-mail no navegador do cliente, preservando leveza, velocidade e segurança.
- **Resolução de Bug Crítico de Salvamento:** Foi identificado e removido um resquício da função obsoleta `notifyVolunteerScheduling` em `src/App.tsx:204` que gerava `ReferenceError` ao salvar novos voluntários via modal, impedindo o salvamento e o fechamento do modal. O salvamento agora ocorre de forma atômica e robusta via `persistVisit` e `bulkUpsertVisits`.
- **Feedback Visual (Toast):** Adicionado componente flutuante de confirmação com mensagens claras ("✅ Alterações da agenda salvas com sucesso!") ao clicar em "💾 Salvar" ou ao salvar dados do local.
- **Testes Automatizados (Playwright):** Criada suíte completa em `tests/e2e-agenda.spec.ts` com o script de 1 clique `executar-testes-playwright.bat` para verificação de uso contínua.

