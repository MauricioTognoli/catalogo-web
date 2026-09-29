-- Ofertas temporales de productos.
--
-- Una oferta tiene un precio promocional y un período [starts_at, ends_at)
-- (vale desde el inicio exacto y deja de valer en el fin exacto). El
-- precio vigente se calcula en cada request (src/lib/offers/pricing.ts):
-- al vencer, la tienda vuelve sola al precio normal, sin jobs ni volver a
-- publicar la portada.
--
-- Reglas que garantiza la base (además de validarse en la aplicación con
-- mensajes claros):
--   - fin posterior al inicio y precio promocional positivo;
--   - un producto no puede tener dos ofertas HABILITADAS superpuestas;
--   - un negocio no puede tener dos ofertas destacadas superpuestas (el
--     banner muestra una sola).
-- "Precio promocional menor al normal" se valida en la aplicación al
-- guardar; si después baja el precio normal, la oferta simplemente deja
-- de aplicarse (nunca se cobra más caro "en oferta").

create extension if not exists btree_gist with schema extensions;

create table public.product_offer (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id) on delete cascade,
  product_id uuid not null references public.product (id) on delete cascade,
  offer_price numeric(12, 2) not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  enabled boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_offer_price_positive check (offer_price > 0),
  constraint product_offer_valid_range check (ends_at > starts_at),
  constraint product_offer_no_overlap exclude using gist (
    product_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (enabled),
  constraint product_offer_one_featured exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (enabled and featured)
);

create index product_offer_business_id_idx on public.product_offer (business_id);
create index product_offer_product_id_idx on public.product_offer (product_id);

create trigger product_offer_set_updated_at
  before update on public.product_offer
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- RLS: el dueño administra las ofertas de su negocio, y solo sobre
-- productos de ese mismo negocio.
-- =========================================================
alter table public.product_offer enable row level security;

create policy "product_offer_select_own"
  on public.product_offer
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product_offer.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_offer_insert_own"
  on public.product_offer
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business b
      join public.product p on p.business_id = b.id
      where b.id = product_offer.business_id
        and p.id = product_offer.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_offer_update_own"
  on public.product_offer
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product_offer.business_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.business b
      join public.product p on p.business_id = b.id
      where b.id = product_offer.business_id
        and p.id = product_offer.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_offer_delete_own"
  on public.product_offer
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product_offer.business_id
        and b.owner_id = auth.uid()
    )
  );

-- =========================================================
-- Lectura pública: solo ofertas VIGENTES de productos visibles. Las
-- programadas no se ven antes de empezar (no se adelantan promociones).
-- now() se evalúa en cada consulta.
-- =========================================================
create policy "product_offer_select_public"
  on public.product_offer
  for select
  to anon
  using (
    product_offer.enabled
    and product_offer.starts_at <= now()
    and now() < product_offer.ends_at
    and exists (
      select 1
      from public.product p
      where p.id = product_offer.product_id
        and p.available = true
    )
  );

revoke all on public.product_offer from anon;
grant select (id, product_id, offer_price, starts_at, ends_at, enabled, featured)
  on public.product_offer to anon;
