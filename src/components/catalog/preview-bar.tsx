/**
 * Aviso fijo mientras el dueño mira la portada en vista previa. Solo se
 * muestra si la tienda efectivamente está leyendo el borrador.
 */
export function PreviewBar() {
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-zinc-900 px-4 py-2 text-center text-xs text-white"
    >
      <span>Vista previa de la portada: estos cambios todavía no están publicados.</span>
      {/* <a> y no <Link>: es un route handler que borra la cookie de vista previa. */}
      <a
        href="/admin/portada/vista-previa/salir"
        className="font-medium underline underline-offset-2"
      >
        Volver al editor
      </a>
    </div>
  );
}
