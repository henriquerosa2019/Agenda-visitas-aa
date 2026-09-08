import { test, expect } from '@playwright/test';

test.describe('Agenda de Visitas A.A. — Testes de Utilização e Edição de Voluntários', () => {
  test.beforeEach(async ({ page }) => {
    // Coleta logs e erros de console para garantir ausência de ReferenceError ou exceções não tratadas
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Intercepta chamadas do Supabase para NÃO alterar o banco de dados de produção durante os testes
    await page.route('**/rest/v1/**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'sept-14-10h',
              name: 'Clínica da Gávea – Unidade Tijuca',
              addr: 'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
              date: '2026-09-14',
              time: '10:00',
              slots: ['Danilo', 'Marcio Motta'],
              notes: 'Unidade de internação - Recepção principal',
              visit_summary: null,
              completed_by: null,
              completed_at: null,
              updated_at: new Date().toISOString(),
            },
            {
              id: 'sept-14-16h',
              name: 'Hospital São Francisco na Providência de Deus',
              addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
              date: '2026-09-14',
              time: '16:00',
              slots: ['Marcio Motta', '', ''],
              notes: 'Apresentar documento de identificação na portaria',
              visit_summary: null,
              completed_by: null,
              completed_at: null,
              updated_at: new Date().toISOString(),
            },
            {
              id: 'sept-16-19h30',
              name: 'Hospital Casa Menssana',
              addr: 'Rua Marechal Jofre, N° 30 – Grajaú',
              date: '2026-09-16',
              time: '19:30',
              slots: ['', '', ''],
              notes: 'Visita noturna à enfermaria',
              visit_summary: null,
              completed_by: null,
              completed_at: null,
              updated_at: new Date().toISOString(),
            },
            {
              id: 'sept-21-17h',
              name: 'Clínica Evolução',
              addr: 'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
              date: '2026-09-21',
              time: '17:00',
              slots: ['', '', ''],
              notes: 'Reunião de partilha com pacientes',
              visit_summary: null,
              completed_by: null,
              completed_at: null,
              updated_at: new Date().toISOString(),
            },
            {
              id: 'sept-28-16h',
              name: 'Hospital São Francisco na Providência de Deus',
              addr: 'Rua Conde de Bonfim, N° 1030 – Tijuca',
              date: '2026-09-28',
              time: '16:00',
              slots: ['Marcio Motta', '', 'Roberto'],
              notes: 'Encerramento da escala de visitas de setembro',
              visit_summary: null,
              completed_by: null,
              completed_at: null,
              updated_at: new Date().toISOString(),
            },
          ]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    // Acessa a aplicação local ou em produção
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl);
  });

  test('Deve carregar a página principal com folha timbrada e cabeçalho oficial', async ({ page }) => {
    await expect(page.locator('text=Escala de Serviços')).toBeVisible();
    await expect(page.locator('#editBtn')).toBeVisible();
  });

  test('Deve alternar modo de edição e salvar alterações sem erros', async ({ page }) => {
    const editBtn = page.locator('#editBtn');
    await expect(editBtn).toContainText('Editar agenda');

    // Clica em Editar agenda
    await editBtn.click();
    await expect(editBtn).toContainText('Salvar');

    // Clica em Salvar
    await editBtn.click();
    await expect(editBtn).toContainText('Editar agenda');

    // Verifica que o toast de confirmação apareceu
    await expect(page.locator('text=Alterações da agenda salvas com sucesso!')).toBeVisible();
  });

  test('Deve editar um novo voluntário via modal "editar dados" e salvar sem travar a aplicação', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Clica no primeiro botão "editar dados"
    const editVenueButtons = page.locator('button:has-text("editar dados")');
    await expect(editVenueButtons.first()).toBeVisible();
    await editVenueButtons.first().click();

    // Modal de Edição deve estar visível
    const modal = page.locator('text=Editar Dados do Local de Visita');
    await expect(modal).toBeVisible();

    // Digita um novo voluntário no primeiro slot ou adiciona um slot
    const slotInput = page.locator('input[placeholder*="Nome do companheiro"]').first();
    await slotInput.fill('Voluntário Teste Playwright');

    // Clica no botão Salvar Local (submit)
    const saveButton = page.locator('button[type="submit"]:has-text("Salvar Local")');
    await saveButton.click();

    // O modal deve fechar e NÃO permanecer travado na tela
    await expect(modal).not.toBeVisible();

    // O toast de confirmação deve aparecer e o input do slot deve conter o voluntário preenchido
    await expect(page.locator('text=Dados do local e voluntários salvos com sucesso!')).toBeVisible();
    const firstCard = page.locator('section').first();
    await expect(firstCard.locator('input[placeholder="vaga aberta"]').first()).toHaveValue('Voluntário Teste Playwright');

    // Verifica que não houve o infame "ReferenceError: notifyVolunteerScheduling is not defined"
    expect(pageErrors.filter((e) => e.includes('notifyVolunteerScheduling'))).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('Deve preencher voluntário diretamente no slot da escala com foco e flush imediato', async ({ page }) => {
    // Aguarda carregamento da página
    await expect(page.locator('#editBtn')).toBeVisible();

    // Seleciona o primeiro card de visita
    const firstCard = page.locator('section').first();
    await expect(firstCard).toBeVisible();

    // Clica no botão "+ vaga" do primeiro card
    const addSlotBtn = firstCard.locator('button:has-text("vaga")');
    await expect(addSlotBtn).toBeVisible();
    await addSlotBtn.click();

    // Localiza e preenche o novo slot dentro do mesmo primeiro card
    const targetSlot = firstCard.locator('input[placeholder="vaga aberta"]').last();
    await expect(targetSlot).toBeVisible();
    await targetSlot.fill('Companheiro Playwright');
    await targetSlot.press('Enter');

    // Valida que o slot do primeiro card contém o nome preenchido
    await expect(targetSlot).toHaveValue('Companheiro Playwright');
  });

  test('Deve abrir modal de Resumo da Visita, salvar e exibir resumo no card', async ({ page }) => {
    // Garante carregamento da página
    await expect(page.locator('#editBtn')).toBeVisible();

    const summaryBtn = page.locator('button:has-text("Resumo da Visita"), button:has-text("Ver Resumo")').first();
    await expect(summaryBtn).toBeVisible();
    await summaryBtn.click();

    // Modal de Resumo visível
    const summaryModal = page.locator('h3:has-text("Resumo da Visita")');
    await expect(summaryModal).toBeVisible();

    // Preenche relato
    const textarea = page.locator('textarea[placeholder*="servidores presentes"]');
    await textarea.fill('Reunião muito produtiva com 12 internos presentes. Teste automatizado Playwright.');

    // Salva o resumo
    const saveSummaryBtn = page.locator('button[type="submit"]:has-text("Salvar Resumo")');
    await saveSummaryBtn.click();

    // Modal deve fechar
    await expect(summaryModal).not.toBeVisible();

    // Resumo deve ser renderizado no card
    await expect(page.locator('text=Reunião muito produtiva com 12 internos presentes')).toBeVisible();
  });
});
