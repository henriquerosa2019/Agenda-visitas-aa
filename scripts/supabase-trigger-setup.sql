-- ====================================================================
-- GATILHO EM TEMPO REAL: NOTIFICAÇÃO DE VOLUNTÁRIOS VIA BREVO (SUPABASE)
-- Execute este script no SQL Editor do Supabase se desejar que o banco
-- também envie e-mails diretamente via pg_net (camada redundante de segurança).
-- ====================================================================

-- 1. Habilitar a extensão pg_net (schema net)
create extension if not exists pg_net with schema net;

-- 2. Função acionada pelo Trigger na tabela public.aa_visits
create or replace function public.tr_notify_volunteer_changes()
returns trigger
language plpgsql
security definer
as $$
declare
  old_slots text[];
  new_slots text[];
  added_vols text[] := array[]::text[];
  removed_vols text[] := array[]::text[];
  item text;
  email_subject text;
  email_body text;
  brevo_api_key text := 'SUA_CHAVE_BREVO_AQUI'; -- Substitua pela sua chave BREVO_API_KEY do arquivo .env
  date_br text;
begin
  -- Converter slots JSONB para arrays de texto
  select coalesce(array_agg(trim(value::text, '"')), array[]::text[])
    into old_slots
    from jsonb_array_elements_text(coalesce(OLD.slots, '[]'::jsonb));

  select coalesce(array_agg(trim(value::text, '"')), array[]::text[])
    into new_slots
    from jsonb_array_elements_text(coalesce(NEW.slots, '[]'::jsonb));

  -- Identificar novos voluntários adicionados
  foreach item in array new_slots loop
    if item is not null and trim(item) <> '' and not (item = any(old_slots)) then
      added_vols := array_append(added_vols, trim(item));
    end if;
  end loop;

  -- Identificar voluntários que desmarcaram
  foreach item in array old_slots loop
    if item is not null and trim(item) <> '' and not (item = any(new_slots)) then
      removed_vols := array_append(removed_vols, trim(item));
    end if;
  end loop;

  -- Formatar data brasileira DD/MM/AAAA
  date_br := to_char(NEW.date::date, 'DD/MM/YYYY');

  -- Cenário 1: Novo voluntário confirmado
  if cardinality(added_vols) > 0 then
    email_subject := '🎉 Novo Voluntário Confirmado: ' || NEW.name || ' (' || date_br || ')';
    email_body := '<div style="font-family: Arial, sans-serif; color: #1E2A3F; padding: 20px;">' ||
      '<h2 style="color: #123C6B;">🤝 Presença Confirmada na Escala A.A.</h2>' ||
      '<p>Um novo companheiro confirmou presença na escala de visitas:</p>' ||
      '<ul>' ||
        '<li><strong>Local:</strong> ' || NEW.name || '</li>' ||
        '<li><strong>Data e Hora:</strong> ' || date_br || ' às ' || NEW.time || '</li>' ||
        '<li><strong>Voluntário(s) adicionado(s):</strong> <span style="color: #15803D; font-weight: bold;">' || array_to_string(added_vols, ', ') || '</span></li>' ||
      '</ul>' ||
      '<p><a href="https://agenda-visitas-aa.vercel.app" style="background-color: #123C6B; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">Abrir Agenda de Visitas</a></p>' ||
      '</div>';

    perform net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
        'api-key', brevo_api_key,
        'Content-Type', 'application/json',
        'accept', 'application/json'
      ),
      body := jsonb_build_object(
        'sender', jsonb_build_object('name', 'Agenda de Visitas A.A.', 'email', 'henrique.rosa@poli.ufrj.br'),
        'to', jsonb_build_array(
          jsonb_build_object('email', 'henrique.rosa@poli.ufrj.br'),
          jsonb_build_object('email', 'dinizdanfer@gmail.com')
        ),
        'subject', email_subject,
        'htmlContent', email_body
      )
    );
  end if;

  -- Cenário 2: Voluntário retirou o nome (vaga reaberta)
  if cardinality(removed_vols) > 0 then
    email_subject := '⚠️ Atenção: Vaga Reaberta em ' || NEW.name || ' (' || date_br || ')';
    email_body := '<div style="font-family: Arial, sans-serif; color: #1E2A3F; padding: 20px;">' ||
      '<h2 style="color: #B91C1C;">⚠️ Retirada de Nome / Vaga Reaberta</h2>' ||
      '<p>Um companheiro desmarcou ou retirou o nome da escala de visitas:</p>' ||
      '<ul>' ||
        '<li><strong>Local:</strong> ' || NEW.name || '</li>' ||
        '<li><strong>Data e Hora:</strong> ' || date_br || ' às ' || NEW.time || '</li>' ||
        '<li><strong>Voluntário(s) que desmarcou:</strong> <span style="color: #B91C1C; font-weight: bold;">' || array_to_string(removed_vols, ', ') || '</span></li>' ||
      '</ul>' ||
      '<p><em>A vaga está novamente aberta para outros companheiros.</em></p>' ||
      '<p><a href="https://agenda-visitas-aa.vercel.app" style="background-color: #123C6B; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">Abrir Agenda de Visitas</a></p>' ||
      '</div>';

    perform net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object(
        'api-key', brevo_api_key,
        'Content-Type', 'application/json',
        'accept', 'application/json'
      ),
      body := jsonb_build_object(
        'sender', jsonb_build_object('name', 'Agenda de Visitas A.A.', 'email', 'henrique.rosa@poli.ufrj.br'),
        'to', jsonb_build_array(
          jsonb_build_object('email', 'henrique.rosa@poli.ufrj.br'),
          jsonb_build_object('email', 'dinizdanfer@gmail.com')
        ),
        'subject', email_subject,
        'htmlContent', email_body
      )
    );
  end if;

  return NEW;
end;
$$;

-- 3. Criar ou recriar o Trigger na tabela aa_visits
drop trigger if exists on_volunteer_change on public.aa_visits;

create trigger on_volunteer_change
after update on public.aa_visits
for each row
execute function public.tr_notify_volunteer_changes();
