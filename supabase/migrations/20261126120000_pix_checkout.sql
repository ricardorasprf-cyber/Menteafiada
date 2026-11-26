begin;

alter table public.subscription_plans add column annual_total_price numeric(10,2)
  check (annual_total_price >= 0);
grant select, update on public.subscription_plans to service_role;

grant select, insert on public.payment_transactions to service_role;
alter table public.payment_transactions alter column gateway_fee drop not null;
alter table public.payment_transactions alter column net_amount drop not null;

create table public.pix_charges (
  reference uuid primary key default gen_random_uuid(),
  clerk_id text not null,
  payer_name text not null,
  payer_email text not null,
  amount numeric(10,2) not null check (amount > 0),
  order_id text unique,
  pending boolean not null default true,
  created_at timestamptz not null default now(),
  access_until timestamptz
);
create unique index pix_charges_one_pending on public.pix_charges (clerk_id) where pending;
create index pix_charges_access on public.pix_charges (clerk_id, access_until desc)
  where access_until is not null;
alter table public.pix_charges enable row level security;
revoke all on public.pix_charges from public, anon, authenticated;
grant select, insert, update on public.pix_charges to service_role;

create function public.confirm_pix_charge(
  p_reference uuid, p_order_id text, p_payment_id text, p_amount numeric
) returns text language plpgsql set search_path = '' as $$
declare
  charge public.pix_charges%rowtype;
  confirmed_at timestamptz := now();
  expires_at timestamptz;
begin
  select * into charge from public.pix_charges
    where reference = p_reference and order_id = p_order_id for update;
  if not found then return 'unknown_charge'; end if;
  if charge.amount is distinct from p_amount then return 'amount_mismatch'; end if;
  if charge.access_until is not null then return 'already_confirmed'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(charge.clerk_id, 1));
  select greatest(confirmed_at, max(access_until)) + interval '1 year'
    into expires_at from public.pix_charges where clerk_id = charge.clerk_id;

  insert into public.payment_transactions (
    clerk_id, payer_name, payer_email, plan_id, plan_name, billing_cycle, payment_method,
    gateway_provider, gateway_tx_id, gross_amount, gateway_fee, net_amount, status, paid_at
  ) values (
    charge.clerk_id, charge.payer_name, charge.payer_email, 'creator_pro', 'Educador Pro',
    'annual', 'pix', 'mercadopago', p_payment_id, charge.amount, null, null, 'approved', confirmed_at
  );
  update public.pix_charges set pending = false, access_until = expires_at
    where reference = p_reference;
  return 'confirmed';
end;
$$;
revoke all on function public.confirm_pix_charge(uuid, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.confirm_pix_charge(uuid, text, text, numeric) to service_role;

commit;
