"use client";

import { useActionState } from "react";
import { createBusiness, type CreateBusinessState } from "@/actions/business";

const initialState: CreateBusinessState = { error: null };

export function CreateBusinessForm() {
  const [state, formAction, pending] = useActionState(
    createBusiness,
    initialState,
  );

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nombre del negocio
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="mi-negocio"
          aria-describedby="slug-hint"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="slug-hint" className="mt-1 text-xs text-zinc-500">
          Minúsculas, números y guiones. Ej: mi-negocio
        </p>
      </div>

      <div>
        <label htmlFor="whatsapp_number" className="block text-sm font-medium">
          WhatsApp
        </label>
        <input
          id="whatsapp_number"
          name="whatsapp_number"
          type="tel"
          required
          pattern="\d{6,15}"
          placeholder="5491122334455"
          aria-describedby="whatsapp-hint"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-transparent"
        />
        <p id="whatsapp-hint" className="mt-1 text-xs text-zinc-500">
          Solo números, con código de país. Ej: 5491122334455
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Creando..." : "Crear negocio"}
      </button>
    </form>
  );
}
