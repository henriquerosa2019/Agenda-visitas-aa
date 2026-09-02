import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VisitItem } from '../types';

let supabaseClient: SupabaseClient | null = null;

const STORAGE_URL_KEY = 'supabase_project_url';
const STORAGE_KEY_KEY = 'supabase_anon_key';

export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  // Remove /rest/v1 or /rest/v1/ if user accidentally pasted full rest endpoint
  url = url.replace(/\/rest\/v1\/?$/, '');
  return url;
}

export function getSupabaseConfig(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const url = normalizeSupabaseUrl(localUrl || envUrl);
  const key = (localKey || envKey).trim();

  return { url, key };
}

export function saveSupabaseConfig(url: string, key: string) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeSupabaseUrl(url);
  localStorage.setItem(STORAGE_URL_KEY, normalized);
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  supabaseClient = null; // Reset client so it reconnects with new credentials
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseConfig();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key);
    } catch (err) {
      console.error('[Supabase] Erro ao instanciar cliente:', err);
      return null;
    }
  }

  return supabaseClient;
}

export function mapVisitToRow(v: VisitItem) {
  return {
    id: v.id,
    name: v.name,
    addr: v.addr,
    date: v.date,
    time: v.time,
    slots: Array.isArray(v.slots) ? v.slots : [],
    notes: v.notes || null,
    visit_summary: v.visitSummary || null,
    completed_by: v.completedBy || null,
    completed_at: v.completedAt || null,
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToVisit(row: any): VisitItem {
  return {
    id: row.id,
    name: row.name,
    addr: row.addr,
    date: typeof row.date === 'string' ? row.date.slice(0, 10) : String(row.date),
    time: row.time || '10:00',
    slots: Array.isArray(row.slots) ? row.slots : [],
    notes: row.notes || undefined,
    visitSummary: row.visit_summary || undefined,
    completedBy: row.completed_by || undefined,
    completedAt: row.completed_at || undefined,
    isCompleted: Boolean(row.is_completed || row.visit_summary),
  };
}

export async function fetchVisitsFromSupabase(): Promise<VisitItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('aa_visits')
      .select('*')
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('[Supabase] Erro ao buscar visitas:', error);
      return null;
    }

    if (!data) return [];
    return data.map(mapRowToVisit);
  } catch (err) {
    console.error('[Supabase] Falha de conexão em fetchVisits:', err);
    return null;
  }
}

export async function upsertVisitToSupabase(visit: VisitItem): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = mapVisitToRow(visit);
    const { error } = await client.from('aa_visits').upsert(row);
    if (error) {
      console.error('[Supabase] Erro ao gravar visita:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Falha ao gravar visita:', err);
    return false;
  }
}

export async function bulkUpsertVisits(visits: VisitItem[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || visits.length === 0) return false;

  try {
    const rows = visits.map(mapVisitToRow);
    const { error } = await client.from('aa_visits').upsert(rows);
    if (error) {
      console.error('[Supabase] Erro no bulk upsert:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Falha no bulk upsert:', err);
    return false;
  }
}

export async function deleteVisitFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('aa_visits').delete().eq('id', id);
    if (error) {
      console.error('[Supabase] Erro ao deletar visita:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Falha ao deletar visita:', err);
    return false;
  }
}

export function subscribeToVisitsChanges(onPayload: () => void): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('public:aa_visits')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'aa_visits' },
        () => {
          onPayload();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Supabase] Erro ao assinar canal realtime:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `
-- Script SQL para criar a tabela de visitas e resumos no Supabase

create table if not exists public.aa_visits (
  id text primary key,
  name text not null,
  addr text not null,
  date date not null,
  time text not null,
  slots jsonb not null default '[]'::jsonb,
  notes text,
  visit_summary text,
  completed_by text,
  completed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.aa_visits enable row level security;

-- Política de leitura pública
create policy "Leitura pública de visitas AA"
  on public.aa_visits
  for select
  using (true);

-- Política de escrita e atualização pública (ou autenticada)
create policy "Atualização e inserção de visitas AA"
  on public.aa_visits
  for all
  using (true)
  with check (true);
`;
