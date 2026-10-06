"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { browserShareEnvironment, shareLink } from "@/lib/share/share-link";
import { cn } from "@/lib/utils/cn";

const MESSAGE_DURATION_MS = 2500;

export function ShareProductButton({
  title,
  url,
  className,
}: {
  title: string;
  url: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const timeout = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    },
    [],
  );

  function showMessage(text: string, tone: "ok" | "error") {
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    setMessage({ text, tone });
    timeout.current = window.setTimeout(() => setMessage(null), MESSAGE_DURATION_MS);
  }

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    const result = await shareLink({ title, url }, browserShareEnvironment());
    setBusy(false);

    if (result === "copied") showMessage("Enlace copiado", "ok");
    if (result === "failed") showMessage("No se pudo copiar el enlace", "error");
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-busy={busy}
        aria-label="Compartir"
        title="Compartir"
        className="flex size-11 items-center justify-center rounded-sm border border-zinc-300 text-zinc-700 transition-colors hover:border-brand hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Share2 className="h-5 w-5" aria-hidden="true" />
      </button>
      <p
        role="status"
        className={cn(
          "pointer-events-none absolute top-full right-0 z-10 mt-2 rounded-sm px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-md transition-opacity",
          message ? "opacity-100" : "opacity-0",
          message?.tone === "error" ? "bg-red-700" : "bg-zinc-900",
        )}
      >
        {message?.text}
      </p>
    </div>
  );
}
