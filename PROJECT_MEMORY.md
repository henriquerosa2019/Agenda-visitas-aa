# 📌 Memória do Projeto — Escala de Visitas A.A. (CTO / CIT)

Este documento registra todas as decisões de design, regras de negócio, arquitetura e histórico de implementações realizadas no projeto.

---

## 🗂️ Dados e Links do Projeto
- **Nome do Projeto:** Escala de Visitas AA — Grupo de Serviços CTO/CIT
- **Repositório GitHub:** [https://github.com/henriquerosa2019/Agenda-visitas-aa](https://github.com/henriquerosa2019/Agenda-visitas-aa)
- **Hospedagem & Deploys Oficial:** Vercel — [https://agenda-visitas-aa.vercel.app](https://agenda-visitas-aa.vercel.app) (conectado automaticamente ao GitHub `main`)
- **Site Anterior Descontinuado:** Netlify (`agenda-visitas-aa.netlify.app` - pausado)
- **Stack Tecnológica:** 
  - **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React (ícones), Vercel Analytics
  - **PWA:** `manifest.json`, `sw.js` para suporte a app instalável
  - **Persistência & Sincronização em Nuvem:** Supabase (`aa_visits`) com Postgres Realtime e cache local de contingência (`localStorage` `escala_visitas_aa_data_v9`).
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
- **Regra de Unicidade (Anti-Duplicidade):** Não é permitido o lançamento do mesmo voluntário (comparações normalizadas insensíveis a maiúsculas, espaços e acentos) para o mesmo local na mesma data. Tentativas de preenchimento duplicado são bloqueadas com alerta visual (Toast / Erro no Modal) e a vaga permanece aberta, garantindo integridade dos dados e relatórios diários precisos.

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

# Enviar atualizações para o GitHub (que dispara o deploy contínuo na Vercel)
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
- **Prevenção de Inatividade do Supabase:** A execução diária do cron do GitHub Actions às 08:00 faz uma leitura no Supabase que mantém o projeto ativo, evitando que ele pause por inatividade no plano Free.

---

## 📧 Arquitetura de Notificações e Relatórios (Brevo & Supabase)

### 1. Destinatários Oficiais
- **Henrique Rosa:** `henrique.rosa@poli.ufrj.br`
- **Danilo Diniz:** `dinizdanfer@gmail.com`

### 2. Notificações em Tempo Real (Supabase ➔ Brevo API)
- **Gatilho no Banco:** Trigger PostgreSQL `on_volunteer_change` na tabela `public.aa_visits` (executa a função `public.tr_notify_volunteer_changes()`).
- **Extensão Utilizada:** `pg_net` executando chamadas HTTP assíncronas no schema `net` (`net.http_post`) para a API REST v3 do Brevo (`https://api.brevo.com/v3/smtp/email`).
- **Cenários Cobertos:**
  1. **Novo Voluntário Cadastrado:** Detecta novos nomes inseridos nas vagas e envia e-mail comemorativo/informativo com presença confirmada.
  2. **Voluntário Retirou o Nome:** Detecta nomes apagados/removidos e envia e-mail de atenção informando a desistência e que a vaga reabriu.
- **Remetente Autorizado:** `henrique.rosa@poli.ufrj.br` (exibido como *"Agenda de Visitas A.A."*, Verificado no Brevo).
- **Regra de Ouro no Brevo (IPs Autorizados):**
  - **IMPORTANTE:** A opção de segurança *"Bloquear endereços IP não autorizados para Chaves API"* em `https://app.brevo.com/security/authorised_ips` **DEVE PERMANECER DESATIVADA**.
  - **Motivo:** O Supabase roda na nuvem da AWS com IPs dinâmicos (ex: IPv6 `2600:1f16:...`). Se a trava de IP estiver ligada, o Brevo rejeita as chamadas do banco com `status_code: 401 (unauthorized)`. Com a trava desativada, o Brevo aceita as requisições autenticadas exclusivamente pela chave secreta da API com `status_code: 200/201`.
- **Auditoria Técnica do Disparo:** As respostas HTTP de cada disparo do gatilho ficam registradas no banco e podem ser consultadas no SQL Editor via:
  ```sql
  select id, status_code, content, created from net._http_response order by created desc limit 5;
  ```

### 3. Relatório Periódico Consolidado (GitHub Actions ➔ Brevo API)
- **Despertador / Cron:** `.github/workflows/daily-analysis.yml`
  - **Todos os dias às 08:00 BRT** (`0 11 * * *`)
  - **Execução manual sob demanda:** Botão *Run workflow* no GitHub Actions ou clique duplo no arquivo `executar-analise-agora.bat` na raiz do projeto.
- **Processamento:** `scripts/analyze-visits.mjs`
  - **Garantia de Envio no Dia da Visita:** Como a automação roda diariamente às 08:00 BRT, **sempre no dia em que houver visita agendada** o sistema identifica a data (`todayStr`), compila os Locais, Horários, Endereços e `Companheiro(a)s Voluntario(a)s:`, altera o assunto para alerta máximo (`🔔 [HOJE TEM VISITA]`) e dispara o e-mail automaticamente via Brevo para Henrique e Danilo.
  - Estrutura completa do relatório:
    1. **🚨 Visitas Programadas para HOJE:** Bloco nobre no topo com Local, Horário, `Companheiro(a)s Voluntario(a)s:` escalados, vagas em aberto (se houver) e Endereço (ou mensagem amigável com a próxima visita agendada quando não houver escala no dia).
    2. **Assunto Dinâmico do E-mail:** `🔔 [HOJE TEM VISITA] Escala de Visitas A.A. — DD/MM/AAAA` em dias de visita, e `📊 Relatório Diário de Visitas A.A. — DD/MM/AAAA` nos demais dias.
    3. **Resumo Geral das Escalas:** Total de visitas, realizadas, hoje e futuras.
    4. **Status das Vagas de Voluntários:** Total ofertadas, preenchidas e abertas (% de ocupação).
    5. **Voluntários Agendados:** Unificação de grafias (ex: `Marcio.Motta` e `Marcio Motta`) ordenados por número de visitas.
    6. **Locais Agendados:** Todas as visitas futuras com dia, hora e nomes confirmados.
    7. **Status dos Resumos de Visita:** Visitas passadas pendentes de relato.
  - Diagrama o e-mail em HTML nas cores oficiais de A.A. e envia via Brevo para Henrique e Danilo (com contingência para Resend).

### 4. Resolução de Rede & IP Dinâmico
- **Forçar IPv4:** Configurado `--dns-result-order=ipv4first` no script `analyze` do `package.json` e no arquivo batch `scripts/run-daily-analysis.bat` para garantir conectividade direta via IPv4 homologado no Brevo.
- **Retentativas Automáticas & Fallback:** O script `scripts/analyze-visits.mjs` possui retry automático (até 3 tentativas) e chave de contingência automática para o **Resend** caso o Brevo oscile.

### 5. Integridade do Código do App
- O código da aplicação em `src/` permanece **100% puro e intacto**: sem lógicas de disparo de e-mail no navegador do cliente, preservando leveza, velocidade e segurança.
- **Resolução de Bug Crítico de Salvamento:** Foi identificado e removido um resquício da função obsoleta `notifyVolunteerScheduling` em `src/App.tsx:204` que gerava `ReferenceError` ao salvar novos voluntários via modal, impedindo o salvamento e o fechamento do modal. O salvamento agora ocorre de forma atômica e robusta via `persistVisit` e `bulkUpsertVisits`.
- **Feedback Visual (Toast):** Adicionado componente flutuante de confirmação com mensagens claras ("✅ Alterações da agenda salvas com sucesso!") ao clicar em "💾 Salvar" ou ao salvar dados do local.
- **Testes Automatizados (Playwright):** Criada suíte completa em `tests/e2e-agenda.spec.ts` com o script de 1 clique `executar-testes-playwright.bat` para verificação de uso contínua.

---

## 🛡️ Integridade de Dados, Anti-Duplicidade & Arquitetura de Sincronização

### 1. Regra de Unicidade e Anti-Duplicidade de Voluntários
- **Princípio:** Um voluntário **não pode ser escalado mais de uma vez para o mesmo local na mesma data**, mesmo que em horários ou vagas diferentes da mesma instituição.
- **Normalização Inteligente (`src/lib/validation.ts`):** 
  - Comparações insensíveis a maiúsculas/minúsculas, múltiplos espaços, acentuações e caracteres separadores (pontos, hifens). Ex: `Roberto`, `roberto`, `ROBERTO `, `Roberto.` e `Márcio Motta` / `Marcio.Motta` são detectados como o mesmo voluntário.
  - Vagas abertas (`""`) são ignoradas pela validação, permitindo qualquer quantidade de vagas abertas.
- **Validação na Digitação em Tempo Real (`src/App.tsx`):**
  - Ao digitar e perder o foco (`onBlur` / `Enter`), se o nome for duplicado no mesmo local e dia, o sistema:
    1. Emite alerta flutuante (*Toast*): `"⚠️ O voluntário '[Nome]' já está escalado para este local nesta data! Não é permitido duplicidade."`
    2. Reseta a vaga em questão para vazia (`""` - vaga aberta).
    3. Persiste o estado sanitizado.
  - No debounce de digitação (600ms): verifica duplicidade antes de disparar o salvamento em segundo plano para o Supabase.
- **Validação no Modal de Edição (`src/components/EditVisitModal.tsx`):**
  - O formulário bloqueia a submissão com aviso de erro em destaque caso haja nomes repetidos entre as vagas.
- **Deduplicação Defensiva nos Relatórios (`scripts/analyze-visits.mjs`):**
  - A contagem de voluntários e vagas preenchidas, assim como a listagem por instituição no e-mail e no `RELATORIO_VISITAS.md`, aplicam deduplicação defensiva via `getConfirmedVolunteers()`.

### 2. Arquitetura de Sincronização (Nuvem vs. Cache Local)
- **Autoridade Central do Supabase:**
  - O banco de dados Supabase é a **única fonte da verdade** para as visitas existentes na escala.
  - **Eliminação do "Efeito Bumerangue" de Cache:**
    - No passado, a função `mergeLocalAndRemoteVisits` preenchia slots remotos vazios com valores legados do `localStorage` do aparelho e disparava `bulkUpsertVisits` automaticamente durante a inicialização (`syncFromSupabase`). Isso causava a "ressurreição" de voluntários deletados ou duplicados sempre que um aparelho com cache antigo abria o app.
    - **Regra Definitiva:** `syncFromSupabase()` atua **estritamente como leitura**. Ao abrir a página, ele baixa os dados da nuvem, sanitiza duplicatas e renderiza na tela. **Jamais reenvia dados automaticamente para o banco na carga inicial**.
    - `mergeLocalAndRemoteVisits` preserva a prioridade absoluta dos slots do Supabase. Apenas novos locais criados 100% offline no aparelho são enviados para a nuvem.
- **Controle de Versão de Cache (`v9`) e PWA (`v3`):**
  - A chave de contingência do navegador foi promovida para `escala_visitas_aa_data_v9`, e todas as chaves obsoletas (`v8`, `v7`, `v6`, `v5`) são deletadas do `localStorage` na inicialização do app.
  - O Service Worker PWA foi promovido para `aa-agenda-cache-v3` e configurado com `reg.update()` em `src/main.tsx` para forçar a atualização imediata do código nos dispositivos móveis dos voluntários.

### 3. Histórico do Caso "Roberto" (28/09 às 16h - Hospital São Francisco)
- **Origem:** No commit `7f7deb4`, o arquivo `initialData.ts` continha `['Marcio Motta', '', 'Roberto']` (vaga 2 aberta). Um usuário digitou "Roberto" na vaga aberta 2. Devido à ausência de validação na época, o banco salvou `["Marcio Motta", "Roberto", "Roberto"]`.
- **Resolução:** O banco Supabase foi corrigido para `["Marcio Motta", "Roberto", ""]` (com a 3ª vaga aberta), a suíte de testes unitários foi adicionada em `tests/validation.test.mjs`, o relatório diário foi recalculado para 1 visita confirmada de Roberto e o deploy foi homologado e publicado na Vercel.


