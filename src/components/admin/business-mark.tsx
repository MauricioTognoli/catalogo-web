import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/** Logo del negocio, o su inicial cuando todavía no subió uno. */
export function BusinessMark({
  name,
  logoUrl,
  className,
}: {
  name: string | null;
  logoUrl: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-sm font-semibold text-primary-foreground",
        className,
      )}
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          fill
          sizes="48px"
          className="bg-background object-cover"
        />
      ) : (
        <span aria-hidden="true">
          {name ? name.charAt(0).toUpperCase() : "A"}
        </span>
      )}
    </span>
  );
}
