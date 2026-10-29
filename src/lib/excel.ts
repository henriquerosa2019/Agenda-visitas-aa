import * as XLSX from 'xlsx';
import { VisitItem } from '../types';
import { HOSPITAL_PRESETS } from '../data/initialData';
import { sanitizeSlots } from './validation';

export interface ExcelParseResult {
  visits: VisitItem[];
  targetYearMonth: string;
  errors: string[];
  warnings: string[];
  totalRows: number;
}

// Converte variações de formato de data para YYYY-MM-DD
export function normalizeExcelDate(val: any, fallbackYear?: number): string | null {
  if (!val) return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    // Ajuste de fuso para extrair o dia correto da data local
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();

  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Formato DD/MM/YYYY ou DD/MM/YY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, d, m, rawY] = brMatch;
    const y = rawY.length === 2 ? `20${rawY}` : rawY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Formato DD/MM (usa ano corrente ou ano sugerido)
  const shortMatch = str.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, d, m] = shortMatch;
    const y = fallbackYear || new Date().getFullYear();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Número serial do Excel (ex: 46333)
  if (!isNaN(Number(str)) && Number(str) > 30000 && Number(str) < 70000) {
    const dateObj = new Date(Math.round((Number(str) - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      const y = dateObj.getUTCFullYear();
      const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

// Normaliza variações de horário para HH:mm
export function normalizeExcelTime(val: any): string | null {
  if (!val) return null;

  const str = String(val).trim().toLowerCase();

  // HH:MM ou HH:MM:SS
  const stdMatch = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (stdMatch) {
    const [, h, m] = stdMatch;
    return `${h.padStart(2, '0')}:${m}`;
  }

  // 10h, 19h30, 16h00
  const hMatch = str.match(/^(\d{1,2})h(?:(\d{2}))?$/);
  if (hMatch) {
    const [, h, m] = hMatch;
    return `${h.padStart(2, '0')}:${m || '00'}`;
  }

  // Apenas número da hora: "10", "16", "17"
  if (/^\d{1,2}$/.test(str)) {
    return `${str.padStart(2, '0')}:00`;
  }

  return null;
}

// Localiza o endereço e nome oficial se o usuário digitar de forma abreviada
export function matchPresetHospital(nameInput: string): { name: string; addr: string } | null {
  const norm = (nameInput || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!norm) return null;

  for (const preset of HOSPITAL_PRESETS) {
    const pNorm = preset.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (pNorm.includes(norm) || norm.includes('gavea') && pNorm.includes('gavea') ||
        norm.includes('francisco') && pNorm.includes('francisco') ||
        norm.includes('evolucao') && pNorm.includes('evolucao') ||
        norm.includes('menssana') && pNorm.includes('menssana')) {
      return preset;
    }
  }
  return null;
}

// Gera e faz download do arquivo modelo .xlsx no navegador
export function downloadExcelTemplate(suggestedMonthYear?: string): void {
  const [yearStr, monthStr] = (suggestedMonthYear || new Date().toISOString().slice(0, 7)).split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const mPad = String(m).padStart(2, '0');

  // Cabeçalhos e dados de exemplo
  const headers = [
    'Data (DD/MM/AAAA)',
    'Horario (HH:MM)',
    'Instituicao',
    'Endereco',
    'Voluntario_1',
    'Voluntario_2',
    'Voluntario_3',
    'Observacoes',
  ];

  const exampleRows = [
    [
      `09/${mPad}/${y}`,
      '10:00',
      'Clínica da Gávea – Unidade Tijuca',
      'Rua Dr. Pereira dos Santos, N° 18 – Tijuca',
      'Danilo',
      '',
      '',
      'Unidade de internação - Recepção principal',
    ],
    [
      `09/${mPad}/${y}`,
      '16:00',
      'Hospital São Francisco na Providência de Deus',
      'Rua Conde de Bonfim, N° 1030 – Tijuca',
      '',
      '',
      '',
      'Apresentar documento de identificação na portaria',
    ],
    [
      `16/${mPad}/${y}`,
      '17:00',
      'Clínica Evolução',
      'Rua Mariz e Barros, N° 430 – Praça da Bandeira',
      '',
      '',
      '',
      'Reunião de partilha com pacientes',
    ],
    [
      `18/${mPad}/${y}`,
      '19:30',
      'Hospital Casa Menssana',
      'Rua Marechal Jofre, N° 30 – Grajaú',
      '',
      '',
      '',
      'Visita noturna à enfermaria',
    ],
    [
      `23/${mPad}/${y}`,
      '16:00',
      'Hospital São Francisco na Providência de Deus',
      'Rua Conde de Bonfim, N° 1030 – Tijuca',
      '',
      '',
      '',
      'Apresentar documento de identificação na portaria',
    ],
  ];

  const wsEscala = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Larguras recomendadas das colunas
  wsEscala['!cols'] = [
    { wch: 18 }, // Data
    { wch: 15 }, // Horário
    { wch: 45 }, // Instituição
    { wch: 50 }, // Endereço
    { wch: 20 }, // Voluntário 1
    { wch: 20 }, // Voluntário 2
    { wch: 20 }, // Voluntário 3
    { wch: 45 }, // Observações
  ];

  // Aba com lista dos hospitais parceiros de A.A.
  const hospitalHeaders = ['Hospital / Unidade Parceira', 'Endereço Oficial'];
  const hospitalRows = HOSPITAL_PRESETS.map((p) => [p.name, p.addr]);
  const wsHospitais = XLSX.utils.aoa_to_sheet([hospitalHeaders, ...hospitalRows]);
  wsHospitais['!cols'] = [{ wch: 45 }, { wch: 55 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala_Visitas');
  XLSX.utils.book_append_sheet(wb, wsHospitais, 'Hospitais_Cadastrados');

  const filename = `modelo_escala_visitas_aa_${y}_${mPad}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// Analisa a planilha carregada e converte para VisitItem[] com validação defensiva
export async function parseExcelFile(file: File): Promise<ExcelParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const visits: VisitItem[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    errors.push('O arquivo selecionado não contém nenhuma planilha.');
    return { visits, targetYearMonth: '', errors, warnings, totalRows: 0 };
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  if (!rawRows || rawRows.length < 2) {
    errors.push('A planilha está vazia ou não contém linhas de agendamento abaixo do cabeçalho.');
    return { visits, targetYearMonth: '', errors, warnings, totalRows: 0 };
  }

  // Identificação flexível das colunas pelo cabeçalho
  const headerRow = (rawRows[0] || []).map((h) => String(h || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  
  const colDate = headerRow.findIndex((h) => h.includes('data'));
  const colTime = headerRow.findIndex((h) => h.includes('hora') || h.includes('horario'));
  const colInst = headerRow.findIndex((h) => h.includes('instituicao') || h.includes('local') || h.includes('hospital'));
  const colAddr = headerRow.findIndex((h) => h.includes('endereco'));
  const colNotes = headerRow.findIndex((h) => h.includes('obs') || h.includes('observacao'));

  // Localiza colunas de voluntários (ex: Voluntário 1, 2, 3...)
  const volunteerCols: number[] = [];
  headerRow.forEach((h, idx) => {
    if (h.includes('voluntario') || h.includes('companheiro') || h.includes('vaga')) {
      volunteerCols.push(idx);
    }
  });

  // Fallback caso cabeçalho não seja encontrado por nome
  const idxDate = colDate >= 0 ? colDate : 0;
  const idxTime = colTime >= 0 ? colTime : 1;
  const idxInst = colInst >= 0 ? colInst : 2;
  const idxAddr = colAddr >= 0 ? colAddr : 3;
  const idxNotes = colNotes >= 0 ? colNotes : 7;
  const idxVolunteers = volunteerCols.length > 0 ? volunteerCols : [4, 5, 6];

  let detectedMonthYear = '';
  const detectedMonthsSet = new Set<string>();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || row.every((c) => !String(c || '').trim())) {
      continue; // Linha em branco
    }

    const rowNum = i + 1;
    const rawDate = row[idxDate];
    const rawTime = row[idxTime];
    const rawInst = row[idxInst];
    const rawAddr = row[idxAddr];
    const rawNotes = row[idxNotes];

    const date = normalizeExcelDate(rawDate);
    if (!date) {
      errors.push(`Linha ${rowNum}: Data inválida ou vazia ("${rawDate || ''}"). Use o formato DD/MM/AAAA.`);
      continue;
    }

    const time = normalizeExcelTime(rawTime);
    if (!time) {
      errors.push(`Linha ${rowNum}: Horário inválido ou vazio ("${rawTime || ''}"). Use o formato HH:MM (ex: 10:00 ou 16:00).`);
      continue;
    }

    const monthYear = date.slice(0, 7);
    detectedMonthsSet.add(monthYear);

    const instName = String(rawInst || '').trim();
    if (!instName) {
      errors.push(`Linha ${rowNum}: Nome da instituição/local está vazio.`);
      continue;
    }

    // Tentar localizar endereço no preset caso não tenha sido preenchido
    let addr = String(rawAddr || '').trim();
    const matchedPreset = matchPresetHospital(instName);
    const finalName = matchedPreset ? matchedPreset.name : instName;
    if (!addr && matchedPreset) {
      addr = matchedPreset.addr;
      warnings.push(`Linha ${rowNum}: Endereço de "${finalName}" foi preenchido automaticamente.`);
    }

    // Extrair voluntários e sanitizar slots
    const rawSlots: string[] = [];
    idxVolunteers.forEach((colIdx) => {
      const vName = String(row[colIdx] || '').trim();
      rawSlots.push(vName);
    });

    // Garante no mínimo 2 ou 3 vagas
    while (rawSlots.length < 3) {
      rawSlots.push('');
    }

    const sanitizedSlots = sanitizeSlots(rawSlots);

    // Validação de voluntários repetidos na mesma visita
    const nonEmpties = sanitizedSlots.filter(Boolean);
    const uniqueCount = new Set(nonEmpties.map((s) => s.toLowerCase())).size;
    if (uniqueCount < nonEmpties.length) {
      warnings.push(`Linha ${rowNum} (${finalName}): Havia voluntários duplicados na mesma visita. As duplicatas foram mantidas como vaga aberta.`);
    }

    const timeSlug = time.replace(':', 'h');
    const visitId = `visit-${date}-${timeSlug}-${Math.random().toString(36).slice(2, 7)}`;

    visits.push({
      id: visitId,
      name: finalName,
      addr: addr || 'Endereço a confirmar na escala',
      date,
      time,
      slots: sanitizedSlots,
      notes: rawNotes ? String(rawNotes).trim() : undefined,
    });
  }

  if (detectedMonthsSet.size > 1) {
    const list = Array.from(detectedMonthsSet).join(', ');
    warnings.push(`Atenção: A planilha contém datas de mais de um mês (${list}). Todas serão cadastradas no histórico correspondente.`);
    detectedMonthYear = Array.from(detectedMonthsSet).sort().reverse()[0];
  } else if (detectedMonthsSet.size === 1) {
    detectedMonthYear = Array.from(detectedMonthsSet)[0];
  }

  return {
    visits,
    targetYearMonth: detectedMonthYear,
    errors,
    warnings,
    totalRows: visits.length,
  };
}
