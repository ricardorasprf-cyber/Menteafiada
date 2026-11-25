create table public.site_user_presence (
  clerk_id text primary key,
  last_seen_at timestamptz not null
);

create index site_user_presence_last_seen_idx
  on public.site_user_presence (last_seen_at);

alter table public.site_user_presence enable row level security;
revoke all on public.site_user_presence from public, anon, authenticated;
grant select, insert, update on public.site_user_presence to service_role;
