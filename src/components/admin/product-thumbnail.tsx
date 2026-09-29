import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ProductThumbnail({
  url,
  className,
}: {
  url: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted",
        className,
      )}
    >
      {url ? (
        <Image src={url} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <ImageOff
          className="size-4 text-muted-foreground"
          aria-label="Sin imagen"
        />
      )}
    </div>
  );
}
