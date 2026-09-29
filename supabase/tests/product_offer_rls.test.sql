-- Pruebas de permisos y reglas de ofertas (pgTAP). Se corren con:
--   supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'duena@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'otro@example.com');

insert into public.business (id, owner_id, name, slug, whatsapp_number)
values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Joyería A', 'joyeria-a', '5491100000001'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Joyería B', 'joyeria-b', '5491100000002');

insert into public.product (id, business_id, name, slug, price, available)
values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Anillo', 'anillo', 1000, true),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Aros', 'aros', 2000, true),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Collar', 'collar', 3000, true);

-- Vigente, programada y vencida en el negocio A.
insert into public.product_offer (id, business_id, product_id, offer_price, starts_at, ends_at, featured)
values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 800, now() - interval '1 hour', now() + interval '1 day', true),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1500, now() + interval '2 days', now() + interval '3 days', false),
  ('a2000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1500, now() - interval '3 days', now() - interval '2 days', false);

-- ---------------------------------------------------------------
-- Reglas de la tabla
-- ---------------------------------------------------------------
select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 700,
             now() + interval '2 hours', now() + interval '1 hour') $$,
  '23514', null, 'fin anterior al inicio: rechazado'
);

select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 700,
             now() + interval '12 hours', now() + interval '2 days') $$,
  '23P01', null, 'dos ofertas habilitadas superpuestas en el mismo producto: rechazado'
);

select lives_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at, enabled)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 700,
             now() + interval '12 hours', now() + interval '2 days', false) $$,
  'superpuesta pero desactivada: permitido'
);

select lives_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 700,
             now() + interval '1 day', now() + interval '2 days') $$,
  'contigua ([inicio, fin)): permitido'
);

select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at, featured)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1200,
             now(), now() + interval '1 hour', true) $$,
  '23P01', null, 'dos destacadas superpuestas en el mismo negocio: rechazado'
);

-- ---------------------------------------------------------------
-- Visitante sin sesión
-- ---------------------------------------------------------------
set local role anon;

select results_eq(
  $$ select id::text from public.product_offer order by id $$,
  $$ values ('a2000000-0000-4000-8000-000000000001') $$,
  'anon solo ve ofertas vigentes (no programadas ni vencidas)'
);

select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1,
             now(), now() + interval '1 hour') $$,
  '42501', null, 'anon no puede crear ofertas'
);

-- ---------------------------------------------------------------
-- Otro dueño (negocio B)
-- ---------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.product_offer
   where business_id = 'a0000000-0000-4000-8000-000000000001'),
  0,
  'otro dueño no ve las ofertas del negocio A'
);

select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000002', 1,
             now() + interval '10 days', now() + interval '11 days') $$,
  '42501', null, 'no puede crear ofertas en un negocio ajeno'
);

select throws_ok(
  $$ insert into public.product_offer (business_id, product_id, offer_price, starts_at, ends_at)
     values ('b0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 1,
             now() + interval '10 days', now() + interval '11 days') $$,
  '42501', null, 'no puede ofertar un producto ajeno desde su propio negocio'
);

update public.product_offer set offer_price = 1
where id = 'a2000000-0000-4000-8000-000000000001';

reset role;

select is(
  (select offer_price from public.product_offer
   where id = 'a2000000-0000-4000-8000-000000000001'),
  800::numeric,
  'la oferta ajena no cambió'
);

select * from finish();
rollback;
