begin;

revoke insert, update, delete, truncate on public.subscription_plans from public, anon, authenticated;
drop policy if exists "Atualizacao autenticada de subscription_plans" on public.subscription_plans;
alter table public.payment_transactions enable row level security;
revoke all on public.payment_transactions from public, anon, authenticated;
drop policy if exists "Leitura de transacoes financeiras" on public.payment_transactions;

commit;
