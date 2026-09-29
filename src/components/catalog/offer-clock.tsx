"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { remainingUntil } from "@/lib/offers/time";

/**
 * Diferencia entre el reloj del servidor y el del navegador. El contador
 * y el refresco usan la hora del servidor: si la computadora del cliente
 * está adelantada, no pediría un refresco "vencido" que el servidor
 * todavía considera vigente (y viceversa).
 */
let clockSkewMs = 0;

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

// Resolución de 1 s: el valor solo cambia cuando cambia el segundo.
function getSnapshot() {
  return Math.floor((Date.now() + clockSkewMs) / 1000) * 1000;
}

// En el servidor no se dibuja el tiempo: evita diferencias de hidratación.
function getServerSnapshot() {
  return null;
}

function useServerNow(serverNow: number): number | null {
  useEffect(() => {
    clockSkewMs = serverNow - Date.now();
  }, [serverNow]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const REFRESH_GRACE_MS = 1000;
const MAX_REFRESH_ATTEMPTS = 3;

/**
 * Pide datos nuevos al servidor cuando pasa `at`. Así, al vencer una
 * oferta, la página vuelve sola al precio normal y al banner habitual.
 * Reintenta un par de veces por si el servidor todavía la ve vigente.
 */
function useRefreshWhenPassed(at: string | null, now: number | null) {
  const router = useRouter();
  const attempts = useRef(0);
  const lastAttempt = useRef(0);

  useEffect(() => {
    if (!at || now === null) return;
    const due = Date.parse(at) + REFRESH_GRACE_MS;
    if (now < due) return;
    if (attempts.current >= MAX_REFRESH_ATTEMPTS) return;
    if (now - lastAttempt.current < 5000) return;

    attempts.current += 1;
    lastAttempt.current = now;
    router.refresh();
  }, [at, now, router]);
}

/** Refresca la página al vencer la oferta más próxima que se muestra. */
export function RefreshAtOfferEnd({
  at,
  serverNow,
}: {
  at: string | null;
  serverNow: number;
}) {
  const now = useServerNow(serverNow);
  useRefreshWhenPassed(at, now);
  return null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Contador hasta el fin REAL de la oferta; al llegar a 0 refresca. */
export function OfferCountdown({
  endsAt,
  serverNow,
  tone = "light",
}: {
  endsAt: string;
  serverNow: number;
  tone?: "light" | "dark";
}) {
  const now = useServerNow(serverNow);
  useRefreshWhenPassed(endsAt, now);

  const remaining = now === null ? null : remainingUntil(endsAt, now);
  const units = remaining
    ? [
        { value: remaining.days, label: "días" },
        { value: remaining.hours, label: "horas" },
        { value: remaining.minutes, label: "min" },
        { value: remaining.seconds, label: "seg" },
      ]
    : null;

  const boxClass =
    tone === "light"
      ? "bg-white text-brand border border-zinc-200"
      : "bg-white/15 text-white";

  return (
    <div>
      <p className="sr-only">
        {remaining
          ? `La oferta termina en ${remaining.days} días, ${remaining.hours} horas y ${remaining.minutes} minutos.`
          : "Oferta por tiempo limitado."}
      </p>
      <ol className="flex gap-2" aria-hidden="true">
        {(units ?? [
          { value: null, label: "días" },
          { value: null, label: "horas" },
          { value: null, label: "min" },
          { value: null, label: "seg" },
        ]).map((unit) => (
          <li
            key={unit.label}
            className={`flex min-w-14 flex-col items-center rounded-md px-2 py-1.5 ${boxClass}`}
          >
            <span className="font-serif text-2xl leading-none tabular-nums">
              {unit.value === null ? "--" : pad(unit.value)}
            </span>
            <span className="mt-1 text-[10px] tracking-wide uppercase opacity-80">
              {unit.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
