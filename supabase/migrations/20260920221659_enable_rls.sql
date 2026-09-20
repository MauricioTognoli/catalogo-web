-- Row Level Security sobre el esquema del catálogo.
-- Alcance: business, category, product, product_image, product_size.
-- Solo cubre acceso de usuarios autenticados sobre sus propios negocios.
-- No define políticas para el rol `anon`: hasta que se agregue una policy
-- explícita de lectura pública, el catálogo público no puede leer nada
-- desde estas tablas (queda fuera de alcance de esta etapa).

-- =========================================================
-- business
-- =========================================================
alter table public.business enable row level security;

create policy "business_select_own"
  on public.business
  for select
  to authenticated
  using (business.owner_id = auth.uid());

create policy "business_insert_own"
  on public.business
  for insert
  to authenticated
  with check (business.owner_id = auth.uid());

create policy "business_update_own"
  on public.business
  for update
  to authenticated
  using (business.owner_id = auth.uid())
  with check (business.owner_id = auth.uid());

create policy "business_delete_own"
  on public.business
  for delete
  to authenticated
  using (business.owner_id = auth.uid());

-- =========================================================
-- category
-- Ownership vía category.business_id -> business.owner_id
-- =========================================================
alter table public.category enable row level security;

create policy "category_select_own"
  on public.category
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = category.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "category_insert_own"
  on public.category
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business b
      where b.id = category.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "category_update_own"
  on public.category
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = category.business_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.business b
      where b.id = category.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "category_delete_own"
  on public.category
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = category.business_id
        and b.owner_id = auth.uid()
    )
  );

-- =========================================================
-- product
-- Ownership vía product.business_id -> business.owner_id.
-- Además: si se asigna category_id, esa categoría debe pertenecer
-- al mismo business_id del producto (no a otro negocio, aunque sea
-- del mismo owner).
-- =========================================================
alter table public.product enable row level security;

create policy "product_select_own"
  on public.product
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product.business_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_insert_own"
  on public.product
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.business b
      where b.id = product.business_id
        and b.owner_id = auth.uid()
    )
    and (
      product.category_id is null
      or exists (
        select 1
        from public.category c
        where c.id = product.category_id
          and c.business_id = product.business_id
      )
    )
  );

create policy "product_update_own"
  on public.product
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product.business_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.business b
      where b.id = product.business_id
        and b.owner_id = auth.uid()
    )
    and (
      product.category_id is null
      or exists (
        select 1
        from public.category c
        where c.id = product.category_id
          and c.business_id = product.business_id
      )
    )
  );

create policy "product_delete_own"
  on public.product
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.business b
      where b.id = product.business_id
        and b.owner_id = auth.uid()
    )
  );

-- =========================================================
-- product_image
-- Ownership vía product_image.product_id -> product.business_id -> business.owner_id.
-- =========================================================
alter table public.product_image enable row level security;

create policy "product_image_select_own"
  on public.product_image
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_image.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_image_insert_own"
  on public.product_image
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_image.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_image_update_own"
  on public.product_image
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_image.product_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_image.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_image_delete_own"
  on public.product_image
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_image.product_id
        and b.owner_id = auth.uid()
    )
  );

-- =========================================================
-- product_size
-- Mismo criterio que product_image.
-- =========================================================
alter table public.product_size enable row level security;

create policy "product_size_select_own"
  on public.product_size
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_size.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_size_insert_own"
  on public.product_size
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_size.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_size_update_own"
  on public.product_size
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_size.product_id
        and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_size.product_id
        and b.owner_id = auth.uid()
    )
  );

create policy "product_size_delete_own"
  on public.product_size
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.product p
      join public.business b on b.id = p.business_id
      where p.id = product_size.product_id
        and b.owner_id = auth.uid()
    )
  );
