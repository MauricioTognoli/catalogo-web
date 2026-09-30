import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const STORE_CONTAINER = "mx-auto w-full max-w-6xl px-4";

export function StoreSection({
  tone = "plain",
  className,
  children,
  ...props
}: ComponentProps<"section"> & { tone?: "plain" | "cream" }) {
  return (
    <section
      className={cn(
        "py-12 md:py-16",
        tone === "cream" ? "bg-cream" : "bg-white",
        className,
      )}
      {...props}
    >
      <div className={STORE_CONTAINER}>{children}</div>
    </section>
  );
}
