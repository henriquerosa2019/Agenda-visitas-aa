import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, anonKey);
  }

  return supabaseClient;
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
