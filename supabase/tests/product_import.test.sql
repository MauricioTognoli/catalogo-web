-- Garantías de la base en las que se apoya la importación desde Excel
-- (pgTAP). Se corren con:
--   supabase test db
--
-- La importación inserta todas las filas en UN solo INSERT, con la sesión
-- del dueño. Estas pruebas confirman que ese INSERT es todo-o-nada y que
-- la RLS impide importar en un negocio ajeno o con categorías ajenas.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'duena@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'otro@example.com');

insert into public.business (id, owner_id, name, slug, whatsapp_number)
values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Joyería A', 'joyeria-a', '5491100000001'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Joyería B', 'joyeria-b', '5491100000002');

insert into public.category (id, business_id, name, slug)
values
  ('c0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'Anillos', 'anillos'),
  ('c0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-000000000002', 'Collares', 'collares');

insert into public.product (business_id, name, slug, price, stock)
values ('a0000000-0000-4000-8000-000000000001', 'Anillo existente', 'anillo-existente', 1000, 1);

-- ---------------------------------------------------------------
-- Dueña del negocio A
-- ---------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ insert into public.product (business_id, category_id, name, slug, price, stock)
     values
       ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000a', 'Anillo nuevo', 'anillo-nuevo', 2000, 3),
       ('a0000000-0000-4000-8000-000000000001', null, 'Aros nuevos', 'aros-nuevos', 1500, 0) $$,
  'la dueña importa varios productos en un solo INSERT'
);

select throws_ok(
  $$ insert into public.product (business_id, name, slug, price, stock)
     values
       ('a0000000-0000-4000-8000-000000000001', 'Pulsera', 'pulsera', 500, 1),
       ('a0000000-0000-4000-8000-000000000001', 'Anillo existente', 'anillo-existente', 500, 1) $$,
  '23505', null, 'un slug repetido hace fallar todo el INSERT'
);

select is(
  (select count(*)::int from public.product where slug = 'pulsera'),
  0,
  'el INSERT fallido no dejó filas a medias'
);

select throws_ok(
  $$ insert into public.product (business_id, category_id, name, slug, price, stock)
     values ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000b', 'Collar', 'collar', 500, 1) $$,
  '42501', null, 'no puede usar una categoría de otro negocio'
);

-- ---------------------------------------------------------------
-- Otro dueño y visitante
-- ---------------------------------------------------------------
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$ insert into public.product (business_id, name, slug, price, stock)
     values ('a0000000-0000-4000-8000-000000000001', 'Intruso', 'intruso', 1, 1) $$,
  '42501', null, 'otro dueño no puede importar en el negocio A'
);

reset role;
set local role anon;

select throws_ok(
  $$ insert into public.product (business_id, name, slug, price, stock)
     values ('a0000000-0000-4000-8000-000000000001', 'Anónimo', 'anonimo', 1, 1) $$,
  '42501', null, 'un visitante sin sesión no puede crear productos'
);

reset role;
select * from finish();
rollback;
