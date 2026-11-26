\set ON_ERROR_STOP on

-- Execute apenas em banco PostgreSQL vazio e descartável.
create role anon;
create role authenticated;
create role service_role bypassrls;
create table public.subscription_plans (id text primary key, annual_monthly_price numeric(10,2));
alter table public.subscription_plans enable row level security;
create policy "Atualizacao autenticada de subscription_plans" on public.subscription_plans for update using (true);
grant update on public.subscription_plans to anon;
create table public.payment_transactions (
  clerk_id text, payer_name text not null, payer_email text, plan_id text, plan_name text,
  billing_cycle text, payment_method text, gateway_provider text, gateway_tx_id text unique,
  gross_amount numeric(10,2), gateway_fee numeric(10,2) not null, net_amount numeric(10,2) not null,
  status text, paid_at timestamptz
);
alter table public.payment_transactions enable row level security;
create policy "Leitura de transacoes financeiras" on public.payment_transactions for select using (true);
grant select on public.payment_transactions to authenticated;

\ir ../../supabase/migrations/20261126120000_pix_checkout.sql
\ir ../../supabase/migrations/20261126121000_pix_payment_permissions.sql

do $$
declare charge_id uuid;
begin
  insert into public.pix_charges (clerk_id, payer_name, payer_email, amount, order_id)
    values ('synthetic', 'Buyer', 'buyer@example.test', 1, 'ORDTEST') returning reference into charge_id;
  if public.confirm_pix_charge(charge_id, 'ORDTEST', 'PAYTEST', 0.99) <> 'amount_mismatch'
    or public.confirm_pix_charge(charge_id, 'ORDTEST', 'PAYTEST', 1) <> 'confirmed'
    or public.confirm_pix_charge(charge_id, 'ORDTEST', 'PAYTEST', 1) <> 'already_confirmed' then
    raise exception 'Falha na confirmação idempotente';
  end if;
  if (select count(*) from public.payment_transactions where gross_amount = 1 and net_amount is null) <> 1
    or (select count(*) from public.pix_charges where not pending and access_until = now() + interval '1 year') <> 1 then
    raise exception 'Extrato ou vigência incorretos';
  end if;
  if has_table_privilege('anon', 'public.subscription_plans', 'UPDATE')
    or has_table_privilege('authenticated', 'public.payment_transactions', 'SELECT')
    or has_function_privilege('authenticated', 'public.confirm_pix_charge(uuid,text,text,numeric)', 'EXECUTE') then
    raise exception 'Permissão indevida no navegador';
  end if;
end;
$$;
