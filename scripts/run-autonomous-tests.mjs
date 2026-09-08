import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('testes_execucao.log');
const REPORT_FILE = path.resolve('TEST_REPORT.md');

const timestamp = new Date().toLocaleString('pt-BR');
const logHeader = `\n===================================================\n` +
  `🧪 EXECUÇÃO AUTÔNOMA DE TESTES — ${timestamp}\n` +
  `===================================================\n`;

console.log(logHeader);
fs.appendFileSync(LOG_FILE, logHeader, 'utf-8');

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const commandArgs = isWindows
  ? ['/d', '/s', '/c', 'npx playwright test --reporter=list']
  : ['playwright', 'test', '--reporter=list'];

const testProcess = spawn(command, commandArgs, {
  cwd: process.cwd(),
  env: { ...process.env, CI: '1' },
});

let outputData = '';

testProcess.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  outputData += text;
  fs.appendFileSync(LOG_FILE, text, 'utf-8');
});

testProcess.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(text);
  outputData += text;
  fs.appendFileSync(LOG_FILE, text, 'utf-8');
});

testProcess.on('close', (code) => {
  const passed = code === 0;
  const statusMsg = passed
    ? `\n✅ TODOS OS TESTES PASSARAM COM SUCESSO! (Código: 0)\n`
    : `\n❌ ALGUNS TESTES FALHARAM! (Código: ${code})\n`;

  console.log(statusMsg);
  fs.appendFileSync(LOG_FILE, statusMsg + '\n', 'utf-8');

  // Gerar resumo legível em TEST_REPORT.md
  const reportContent = `# 🧪 Relatório Autônomo de Testes — Playwright
*Executado em: ${timestamp}*

- **Status Geral:** ${passed ? '✅ Aprovado (100% dos testes passaram)' : '❌ Falha identificada'}
- **Código de Saída:** ${code}

## 📋 Log Completo da Execução:
\`\`\`
${outputData.trim()}
\`\`\`
`;

  fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
  process.exit(code);
});
