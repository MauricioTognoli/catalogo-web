-- Bucket de Storage para imágenes de productos.
--
-- Decisión: bucket PÚBLICO. Las fotos de producto de un catálogo de
-- joyería no tienen ningún requisito de confidencialidad (son contenido
-- pensado para mostrarse a cualquier visitante del catálogo público), y
-- un bucket privado obligaría a generar signed URLs que expiran, lo cual
-- complicaría innecesariamente el catálogo público que todavía no existe.
-- Con bucket público, la URL pública es estable y su path se puede
-- derivar directamente (sin guardar storage_path aparte): por eso NO se
-- modifica el schema de `product_image`.
--
-- Límite de tamaño (5 MB) y MIME types permitidos se aplican a nivel de
-- Storage además de la validación en la Server Action (defensa en
-- profundidad: Supabase Storage rechaza el archivo aunque el código de
-- la app tuviera un bug de validación).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies sobre storage.objects. RLS ya viene habilitado por Supabase en
-- esta tabla desde la creación del proyecto; no hace falta re-habilitarlo.
--
-- El primer segmento del path (`storage.foldername(objects.name)[1]`) es
-- el business_id. Se exige que ese negocio sea del usuario autenticado,
-- igual criterio de ownership que las policies de las tablas. Se califica
-- `objects.name` explícitamente porque `business` también tiene una
-- columna `name`: sin calificar, Postgres resolvía la referencia contra
-- `business.name` en lugar de la fila de storage.objects (bug detectado
-- y corregido durante la validación de esta migración).
--
-- SÍ hace falta una policy de SELECT para `authenticated`, aunque el
-- bucket sea público: la lectura pública vía el endpoint HTTP
-- /storage/v1/object/public/... no pasa por RLS, pero DELETE (y UPDATE)
-- SÍ requieren que la fila sea visible por una policy de SELECT además
-- de cumplir el USING del propio DELETE. Sin esta policy, el admin nunca
-- puede borrar sus propias imágenes (también detectado en la validación).
create policy "product_images_select_own_business"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "product_images_insert_own_business"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );

create policy "product_images_delete_own_business"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.business b
      where b.id::text = (storage.foldername(objects.name))[1]
        and b.owner_id = auth.uid()
    )
  );
