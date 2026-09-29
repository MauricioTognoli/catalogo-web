/** Encabezado de sección de la portada (mismo estilo que Top Product). */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          {eyebrow}
        </p>
      )}
      <h2 id={id} className="mt-2 font-serif text-3xl text-zinc-900">
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>}
    </div>
  );
}
