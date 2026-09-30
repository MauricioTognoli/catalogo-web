import { cn } from "@/lib/utils/cn";

/** Encabezado de sección de la portada (bajada, título y subtítulo). */
export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "text-center" : "text-left", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
          {eyebrow}
        </p>
      )}
      <h2 id={id} className={cn("font-serif text-3xl text-brand md:text-4xl", eyebrow && "mt-2")}>
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>}
    </div>
  );
}
