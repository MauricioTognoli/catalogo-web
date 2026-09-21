-- Bucket de Storage para assets del negocio (por ahora, solo el logo).
--
-- Mismo criterio de seguridad y de derivación de path que product-images
-- (ver 20260921013449_create_product_images_storage.sql): bucket público,
-- MIME types y tamaño máximo aplicados también a nivel de Storage (defensa
-- en profundidad), y NO se agrega storage_path a `business` porque el path
-- se deriva de la URL pública igual que con las imágenes de producto.
--
-- Estructura de paths: {business_id}/logo/{uuid}.{extension}. Se usa un
-- segmento fijo ("logo") en vez de un id de entidad, dejando lugar para
-- futuros assets del mismo negocio bajo el mismo bucket (ej: banner) sin
-- necesitar otro bucket ni otra migración de policies.
--
-- No se permite SVG: solo jpeg/png/webp, igual que product-images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Mismas 3 policies y mismos motivos que en product-images:
-- - `objects.name` calificado explícitamente (business.name también existe
--   como columna; sin calificar, Postgres resuelve mal la referencia).
-- - Policy de SELECT necesaria para que DELETE funcione (Postgres exige
--   que la fila sea visible por SELECT además de cumplir el USING del
--   propio DELETE), aunque la lectura pública real use el endpoint HTTP
--   que no pasa por RLS de storage.objects.
create policy "business_assets_select_own_business"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'business-assets'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "business_assets_insert_own_business"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-assets'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "business_assets_delete_own_business"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-assets'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );
