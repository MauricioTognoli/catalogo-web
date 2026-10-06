"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export type StoreBrand = { name: string; logoUrl: string | null };

const StoreBrandContext = createContext<StoreBrand | null>(null);

export function StoreBrandProvider({
  brand,
  children,
}: {
  brand: StoreBrand;
  children: ReactNode;
}) {
  return <StoreBrandContext.Provider value={brand}>{children}</StoreBrandContext.Provider>;
}

export function StoreLoader({
  message,
  brand,
  className,
}: {
  message: string;
  brand?: StoreBrand;
  className?: string;
}) {
  const contextBrand = useContext(StoreBrandContext);
  const resolved = brand ?? contextBrand;
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const logoUrl = resolved?.logoUrl ?? null;
  const showLogo = logoUrl !== null && failedLogo !== logoUrl;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-16 text-center",
        className,
      )}
    >
      <div aria-hidden="true" className="size-20 motion-safe:animate-brand-jump">
        <div className="relative size-full motion-safe:animate-brand-spin">
          {showLogo ? (
            <Image
              src={logoUrl}
              alt=""
              fill
              sizes="80px"
              loading="eager"
              className="object-contain"
              onError={() => setFailedLogo(logoUrl)}
            />
          ) : (
            <span className="flex size-full items-center justify-center rounded-full bg-brand font-serif text-3xl text-brand-foreground">
              {resolved?.name.charAt(0).toUpperCase() ?? ""}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm tracking-wide text-zinc-600">{message}</p>
    </div>
  );
}
