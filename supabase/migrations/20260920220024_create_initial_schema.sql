-- Esquema inicial del catálogo: business, category, product, product_image, product_size.
-- No incluye RLS, Storage, Auth ni datos de ejemplo: se agregan en etapas posteriores.

create extension if not exists pgcrypto;

-- Función auxiliar para mantener updated_at al día en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- business
-- =========================================================
create table public.business (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  logo_url text,
  whatsapp_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint business_slug_key unique (slug)
);

create index business_owner_id_idx on public.business (owner_id);

create trigger business_set_updated_at
  before update on public.business
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- category
-- =========================================================
create table public.category (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint category_position_non_negative check (position >= 0),
  constraint category_business_slug_key unique (business_id, slug)
);

create index category_business_id_idx on public.category (business_id);
create index category_business_position_idx on public.category (business_id, position);

create trigger category_set_updated_at
  before update on public.category
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- product
-- =========================================================
create table public.product (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business (id) on delete cascade,
  category_id uuid references public.category (id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  price numeric(12, 2) not null,
  material text,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint product_price_non_negative check (price >= 0),
  constraint product_business_slug_key unique (business_id, slug)
);

create index product_business_id_idx on public.product (business_id);
create index product_category_id_idx on public.product (category_id);
-- Acelera el listado público del catálogo (filtrado habitual por negocio + disponibilidad).
create index product_business_available_idx on public.product (business_id, available);

create trigger product_set_updated_at
  before update on public.product
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- product_image
-- =========================================================
create table public.product_image (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product (id) on delete cascade,
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_image_position_non_negative check (position >= 0)
);

create index product_image_product_id_idx on public.product_image (product_id);
create index product_image_product_position_idx on public.product_image (product_id, position);

-- =========================================================
-- product_size (opcional: un producto puede no tener filas aquí)
-- =========================================================
create table public.product_size (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product (id) on delete cascade,
  label text not null,
  available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_size_position_non_negative check (position >= 0),
  constraint product_size_product_label_key unique (product_id, label)
);

create index product_size_product_id_idx on public.product_size (product_id);
create index product_size_product_position_idx on public.product_size (product_id, position);
