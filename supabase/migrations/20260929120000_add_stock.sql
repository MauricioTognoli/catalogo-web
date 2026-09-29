-- Stock de productos y talles.
--
-- Regla de migración (datos existentes):
--   stock es NULLABLE y las filas existentes quedan en NULL, que significa
--   "stock sin cargar". Un NULL se considera disponible, igual que hasta
--   ahora: ningún producto ni talle desaparece ni pasa a "Sin stock" al
--   aplicar esta migración. No se inventan cantidades (poner 1 mostraría
--   en el admin un número que nadie cargó) ni se bloquea el catálogo
--   (poner 0 dejaría todo invendible).
--   La aplicación exige una cantidad al crear o guardar un producto/talle,
--   y el panel avisa cuántos quedan "sin cargar"; NULL es solo un estado
--   de transición.
--
-- Qué stock manda:
--   - Producto CON talles: el stock de cada talle. product.stock se ignora.
--   - Producto SIN talles: product.stock.
--   La regla vive en src/lib/stock/availability.ts (con tests).
--
-- Privacidad: la tienda muestra solo "En stock"/"Sin stock", nunca
-- cantidades. Para que tampoco se filtren por la REST API con la anon key,
-- anon no puede leer la columna stock: ve una columna generada in_stock.

-- =========================================================
-- Columnas
-- =========================================================
alter table public.product
  add column stock integer,
  add constraint product_stock_non_negative check (stock is null or stock >= 0);

alter table public.product
  add column in_stock boolean generated always as (stock is null or stock > 0) stored;

alter table public.product_size
  add column stock integer,
  add constraint product_size_stock_non_negative check (stock is null or stock >= 0);

alter table public.product_size
  add column in_stock boolean generated always as (stock is null or stock > 0) stored;

-- =========================================================
-- Privilegios de columna para anon (RLS filtra filas, no columnas).
-- Mismo criterio que business en 20260921021954: se reemplaza el GRANT
-- de tabla por uno explícito sin la columna sensible. Columnas futuras
-- quedan ocultas para anon hasta que se otorguen a propósito.
-- =========================================================
revoke select on public.product from anon;
grant select (
  id, business_id, category_id, name, slug, description, price, material,
  available, in_stock, created_at, updated_at
) on public.product to anon;

revoke select on public.product_size from anon;
grant select (
  id, product_id, label, available, position, in_stock, created_at
) on public.product_size to anon;

-- =========================================================
-- Talles visibles para la tienda
-- Antes anon solo veía talles available = true: un producto con todos
-- sus talles desactivados parecía "sin talles" y se podía comprar sin
-- elegir talle. Ahora anon ve todos los talles de productos visibles
-- (label/available/in_stock, nada sensible) y la aplicación decide:
-- muestra solo los activos y, si no queda ninguno comprable, el
-- producto figura "Sin stock".
-- =========================================================
drop policy "product_size_select_public" on public.product_size;

create policy "product_size_select_public"
  on public.product_size
  for select
  to anon
  using (
    exists (
      select 1
      from public.product p
      where p.id = product_size.product_id
        and p.available = true
    )
  );

-- =========================================================
-- Revalidación del carrito
-- El carrito vive en localStorage y puede quedar desactualizado. Esta
-- función devuelve, por línea, solo hechos booleanos (nunca cantidades)
-- para que la aplicación decida el estado de cada línea. SECURITY DEFINER
-- porque anon no puede leer stock; search_path fijo para que no se pueda
-- secuestrar la resolución de nombres.
--
-- covers_quantity (stock >= cantidad pedida) permite avisar "pediste más
-- de lo disponible" sin mostrar el número. Límite conocido: consultándola
-- con cantidades distintas se puede acotar el stock (máx. 99 por línea);
-- se acepta a cambio de poder avisar ese caso.
-- =========================================================
create or replace function public.cart_stock_status(lines jsonb)
returns table (
  product_id uuid,
  size_id uuid,
  product_available boolean,
  has_sizes boolean,
  size_available boolean,
  in_stock boolean,
  covers_quantity boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with requested as (
    select distinct on (r.product_id, r.size_id)
      r.product_id,
      r.size_id,
      greatest(coalesce(r.quantity, 1), 1) as quantity
    from jsonb_to_recordset(
      case when jsonb_typeof(lines) = 'array' then lines else '[]'::jsonb end
    ) as r(product_id uuid, size_id uuid, quantity integer)
    where r.product_id is not null
    limit 100
  ),
  resolved as (
    select
      req.product_id,
      req.size_id,
      req.quantity,
      coalesce(p.available, false) as product_available,
      exists (
        select 1 from product_size s2 where s2.product_id = req.product_id
      ) as has_sizes,
      case
        when req.size_id is null then null
        else coalesce(s.available, false)
      end as size_available,
      -- Fila inexistente: sin stock. NULL en la columna: sin cargar.
      case
        when p.id is null then 0
        when req.size_id is null then p.stock
        when s.id is null then 0
        else s.stock
      end as stock
    from requested req
    left join product p on p.id = req.product_id
    left join product_size s
      on s.id = req.size_id and s.product_id = req.product_id
  )
  select
    product_id,
    size_id,
    product_available,
    has_sizes,
    size_available,
    stock is null or stock > 0 as in_stock,
    stock is null or stock >= quantity as covers_quantity
  from resolved;
$$;

revoke all on function public.cart_stock_status(jsonb) from public;
grant execute on function public.cart_stock_status(jsonb) to anon, authenticated;
