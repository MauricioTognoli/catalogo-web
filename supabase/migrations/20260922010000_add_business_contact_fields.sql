-- Campos de contacto/redes opcionales del negocio, para el footer del
-- catálogo público (rediseño "ella"). Todos nullable: un negocio puede
-- no cargarlos y el catálogo simplemente no muestra esa fila.

alter table public.business
  add column email text,
  add column address text,
  add column instagram_url text;

-- El grant de lectura para `anon` sobre `business` es explícito por
-- columna (ver 20260921021954_add_public_catalog_read_access.sql), así
-- que las columnas nuevas necesitan su propio grant: RLS controla
-- filas, no columnas, y sin este grant el catálogo público no podría
-- leerlas aunque sean nullable. Grant incremental: no se toca el grant
-- existente sobre las columnas previas.
grant select (email, address, instagram_url) on public.business to anon;
