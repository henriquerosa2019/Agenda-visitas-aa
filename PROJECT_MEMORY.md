# 📌 Memória do Projeto — Escala de Visitas A.A. (CTO / CIT)

Este documento registra todas as decisões de design, regras de negócio, arquitetura e histórico de implementações realizadas no projeto.

---

## 🗂️ Dados e Links do Projeto
- **Nome do Projeto:** Escala de Visitas AA — Grupo de Serviços CTO/CIT
- **Repositório GitHub:** [https://github.com/henriquerosa2019/Agenda-visitas-aa](https://github.com/henriquerosa2019/Agenda-visitas-aa)
- **Site Público no Ar (Netlify):** [https://agenda-visitas-aa.netlify.app](https://agenda-visitas-aa.netlify.app)
- **Painel de Deploys (Netlify):** [https://app.netlify.com/projects/agenda-visitas-aa/deploys](https://app.netlify.com/projects/agenda-visitas-aa/deploys)
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

# Gerar build de produção
npm run build

# Enviar atualizações para o GitHub (que dispara o deploy no Netlify)
git add .
git commit -m "Descrição da alteração"
git push origin main
```
