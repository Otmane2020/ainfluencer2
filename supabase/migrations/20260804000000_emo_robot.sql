-- emo_robot_queue : file d'attente des vidéos EMO à poster sur TikTok
create table if not exists public.emo_robot_queue (
  id           uuid primary key default gen_random_uuid(),
  video_url    text not null,          -- URL Supabase Storage
  caption      text not null,
  status       text not null default 'pending'
                check (status in ('pending', 'posted', 'failed')),
  scheduled_for timestamptz not null,  -- quand la poster
  posted_at    timestamptz,
  error_msg    text,
  created_at   timestamptz default now()
);

-- Seul l'utilisateur benyahya.otmane@gmail.com peut voir ses vidéos
alter table public.emo_robot_queue enable row level security;

create policy "emo_robot_service_only"
  on public.emo_robot_queue
  using (true)  -- edge function utilise service_role, pas de restriction
  with check (true);

-- Cron : tous les jours à 10h UTC → appelle l'edge function emo-robot-post
select cron.schedule(
  'emo-robot-daily-post',
  '0 10 * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/emo-robot-post',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body    := '{}'::jsonb
  );
  $$
);
