-- Portada administrable de la tienda.
--
-- Una fila por negocio con dos versiones de la configuración:
--   - draft:     lo que edita el dueño desde el panel.
--   - published: lo que ve la tienda. "Publicar" copia draft -> published
--                en un solo UPDATE, así la tienda nunca ve un estado a medias.
-- El formato del JSON lo define y valida src/lib/storefront/config.ts
-- (normalizeStorefrontConfig / parseSectionInput). Un objeto vacío '{}'
-- equivale a los valores iniciales de ese módulo, que reproducen los
-- textos que antes estaban fijos en el código: tras esta migración la
-- tienda se ve igual que antes.
--
-- Imágenes: se guardan en el bucket existente `business-assets`, bajo
-- {business_id}/storefront/{uuid}.{ext}. Ese bucket ya tiene policies de
-- insert/select/delete restringidas a la carpeta del negocio del usuario
-- (ver 20260921020250_create_business_assets_storage.sql, que reservó el
-- bucket para "futuros assets del mismo negocio"), así que no hace falta
-- otro bucket ni nuevas policies de Storage.

create table public.storefront (
  business_id uuid primary key references public.business (id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint storefront_draft_is_object check (jsonb_typeof(draft) = 'object'),
  constraint storefront_published_is_object check (jsonb_typeof(published) = 'object')
);

create trigger storefront_set_updated_at
  before update on public.storefront
  for each row
  execute function public.set_updated_at();

-- Negocios existentes: portada con valores iniciales, ya "publicada" para
-- que no aparezcan cambios pendientes sin que el dueño haya tocado nada.
insert into public.storefront (business_id, draft, published, published_at)
select b.id, '{}'::jsonb, '{}'::jsonb, now()
from public.business b
on conflict (business_id) do nothing;

-- =========================================================
-- RLS: el dueño lee y escribe su portada.
-- No hay policy de DELETE: la fila vive lo que vive el negocio (cascade).
-- =========================================================
alter table public.storefront enable row level security;

create policy "storefront_select_own"
  on public.storefront
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = storefront.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "storefront_insert_own"
  on public.storefront
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business b
      where b.id = storefront.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "storefront_update_own"
  on public.storefront
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = storefront.business_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.business b
      where b.id = storefront.business_id
        and b.owner_id = auth.uid()
    )
  );

-- =========================================================
-- Lectura pública: solo la versión publicada.
-- RLS filtra filas, no columnas: el borrador (promos sin lanzar, textos a
-- medio escribir) se oculta con privilegios de columna, mismo criterio
-- que business.owner_id y product.stock.
-- =========================================================
create policy "storefront_select_public"
  on public.storefront
  for select
  to anon
  using (true);

revoke all on public.storefront from anon;
grant select (business_id, published, published_at) on public.storefront to anon;
