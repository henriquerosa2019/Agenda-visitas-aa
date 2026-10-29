import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  normalizeExcelDate,
  normalizeExcelTime,
  matchPresetHospital,
} from '../src/lib/excel.ts';

test('normalizeExcelDate - formatação de datas', () => {
  // DD/MM/YYYY
  assert.equal(normalizeExcelDate('09/11/2026'), '2026-11-09');
  assert.equal(normalizeExcelDate('9/11/2026'), '2026-11-09');
  assert.equal(normalizeExcelDate('23/11/2026'), '2026-11-23');

  // YYYY-MM-DD
  assert.equal(normalizeExcelDate('2026-11-09'), '2026-11-09');

  // DD/MM com ano fallback
  assert.equal(normalizeExcelDate('09/11', 2026), '2026-11-09');

  // Objeto Date
  const d = new Date(Date.UTC(2026, 10, 9));
  assert.equal(normalizeExcelDate(d), '2026-11-09');

  // Data inválida
  assert.equal(normalizeExcelDate('texto_invalido'), null);
});

test('normalizeExcelTime - formatação de horários', () => {
  assert.equal(normalizeExcelTime('10:00'), '10:00');
  assert.equal(normalizeExcelTime('10:00:00'), '10:00');
  assert.equal(normalizeExcelTime('10h'), '10:00');
  assert.equal(normalizeExcelTime('19h30'), '19:30');
  assert.equal(normalizeExcelTime('16'), '16:00');
  assert.equal(normalizeExcelTime('invalido'), null);
});

test('matchPresetHospital - auto-completar de hospitais parceiros', () => {
  const g = matchPresetHospital('Clínica da Gávea');
  assert.ok(g);
  assert.equal(g.name, 'Clínica da Gávea – Unidade Tijuca');
  assert.ok(g.addr.includes('Pereira dos Santos'));

  const sf = matchPresetHospital('São Francisco');
  assert.ok(sf);
  assert.equal(sf.name, 'Hospital São Francisco na Providência de Deus');

  const ev = matchPresetHospital('Evolução');
  assert.ok(ev);
  assert.equal(ev.name, 'Clínica Evolução');

  const ms = matchPresetHospital('Hospital Casa Menssana');
  assert.ok(ms);
  assert.equal(ms.name, 'Hospital Casa Menssana');
});
