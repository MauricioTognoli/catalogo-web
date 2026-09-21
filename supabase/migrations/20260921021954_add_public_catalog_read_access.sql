-- Lectura pública (rol `anon`) para el catálogo público. Hasta ahora
-- todas las policies eran `to authenticated`; el catálogo público
-- necesita que un visitante sin sesión pueda leer lo estrictamente
-- necesario para navegarlo. No se toca ninguna policy existente.
--
-- Alcance de cada policy:
-- - business: cualquier fila es visible (no hay noción de negocio
--   "privado" en este modelo), pero se restringen las COLUMNAS visibles
--   con GRANT a nivel de columna (ver más abajo) para no exponer
--   owner_id: RLS solo filtra filas, no columnas.
-- - category: cualquier fila es visible (nombre/slug/position no son
--   sensibles).
-- - product: solo filas con available = true.
-- - product_image: solo si el producto al que pertenece está
--   available = true.
-- - product_size: solo filas con available = true, Y solo si el
--   producto al que pertenecen está available = true.
--
-- No se restringe por business_id en ninguna de estas policies: el
-- catálogo público de cualquier negocio es, por definición, público;
-- la resolución de "qué negocio se está mostrando" ocurre en la capa de
-- queries de la aplicación (src/lib/catalog/), no en RLS.

create policy "business_select_public"
  on public.business
  for select
  to anon
  using (true);

-- RLS decide qué FILAS son visibles, no qué COLUMNAS. Para que anon
-- nunca pueda leer owner_id (ni siquiera armando una consulta manual
-- contra la REST API con la anon key), se reemplaza el GRANT por
-- defecto (todas las columnas) por uno explícito sin owner_id.
revoke select on public.business from anon;
grant select (id, name, slug, logo_url, whatsapp_number) on public.business to anon;

create policy "category_select_public"
  on public.category
  for select
  to anon
  using (true);

create policy "product_select_public"
  on public.product
  for select
  to anon
  using (product.available = true);

create policy "product_image_select_public"
  on public.product_image
  for select
  to anon
  using (
    exists (
      select 1
      from public.product p
      where p.id = product_image.product_id
        and p.available = true
    )
  );

create policy "product_size_select_public"
  on public.product_size
  for select
  to anon
  using (
    product_size.available = true
    and exists (
      select 1
      from public.product p
      where p.id = product_size.product_id
        and p.available = true
    )
  );
