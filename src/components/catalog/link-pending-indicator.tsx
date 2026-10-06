"use client";

import { useEffect, useState } from "react";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils/cn";

const SHOW_DELAY_MS = 200;

export function LinkPendingIndicator({
  variant = "badge",
  className,
}: {
  variant?: "badge" | "inline";
  className?: string;
}) {
  const { pending } = useLinkStatus();
  const [delayPassed, setDelayPassed] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setDelayPassed(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timeout);
      setDelayPassed(false);
    };
  }, [pending]);

  if (!pending || !delayPassed) return null;

  const spinner = (
    <span
      className={cn(
        "block rounded-full border-2 border-zinc-300 border-t-brand motion-safe:animate-spin",
        variant === "badge" ? "size-4" : "size-3",
      )}
    />
  );

  return (
    <span
      aria-hidden="true"
      data-link-pending=""
      className={cn(
        "pointer-events-none",
        variant === "badge"
          ? "flex items-center justify-center rounded-full bg-white/90 p-1.5 shadow-sm"
          : "inline-flex align-middle",
        className,
      )}
    >
      {spinner}
    </span>
  );
}
