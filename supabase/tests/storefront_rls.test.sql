-- Pruebas de permisos de la portada (pgTAP). Se corren con:
--   supabase test db
-- Todo ocurre dentro de una transacción que se revierte al final.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Dos dueños, cada uno con su negocio y su portada.
insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'duena@example.com'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'otro@example.com');

insert into public.business (id, owner_id, name, slug, whatsapp_number)
values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Joyería A', 'joyeria-a', '5491100000001'),
  ('b0000000-0000-4000-8000-000000000002', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Joyería B', 'joyeria-b', '5491100000002');

insert into public.storefront (business_id, draft, published)
values
  ('a0000000-0000-4000-8000-000000000001', '{"announcement":"borrador A"}', '{"announcement":"publicado A"}'),
  ('b0000000-0000-4000-8000-000000000002', '{"announcement":"borrador B"}', '{"announcement":"publicado B"}');

-- ---------------------------------------------------------------
-- Visitante sin sesión (anon)
-- ---------------------------------------------------------------
set local role anon;

select is(
  (select published->>'announcement' from public.storefront
   where business_id = 'a0000000-0000-4000-8000-000000000001'),
  'publicado A',
  'anon lee la versión publicada'
);

select throws_ok(
  $$ select draft from public.storefront $$,
  '42501',
  null,
  'anon no puede leer el borrador'
);

select throws_ok(
  $$ update public.storefront set published = '{}' $$,
  '42501',
  null,
  'anon no puede modificar la portada'
);

-- ---------------------------------------------------------------
-- Dueña del negocio A
-- ---------------------------------------------------------------
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select draft->>'announcement' from public.storefront),
  'borrador A',
  'la dueña ve solo su propio borrador'
);

select lives_ok(
  $$ update public.storefront set draft = '{"announcement":"editado"}'
     where business_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'la dueña puede editar su borrador'
);

select is(
  (select draft->>'announcement' from public.storefront
   where business_id = 'a0000000-0000-4000-8000-000000000001'),
  'editado',
  'el cambio de la dueña quedó guardado'
);

-- Intentar tocar el negocio B no falla, pero RLS no deja ver ni cambiar filas.
update public.storefront set draft = '{"announcement":"hackeado"}'
where business_id = 'b0000000-0000-4000-8000-000000000002';

select throws_ok(
  $$ insert into public.storefront (business_id)
     values ('b0000000-0000-4000-8000-000000000002') $$,
  '42501',
  null,
  'no puede crear la portada de un negocio ajeno'
);

select throws_ok(
  $$ update public.storefront set draft = '[]'
     where business_id = 'a0000000-0000-4000-8000-000000000001' $$,
  '23514',
  null,
  'el borrador tiene que ser un objeto JSON'
);

reset role;

select is(
  (select draft->>'announcement' from public.storefront
   where business_id = 'b0000000-0000-4000-8000-000000000002'),
  'borrador B',
  'el borrador de otro negocio no cambió'
);

select * from finish();
rollback;
