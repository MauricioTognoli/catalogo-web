"use client";

import Image from "next/image";
import { useActionState, useId, useState, type ChangeEvent } from "react";
import {
  uploadBusinessLogo,
  type BusinessLogoActionState,
} from "@/actions/business";
import { DeleteLogoButton } from "./delete-logo-button";

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const initialState: BusinessLogoActionState = { error: null };

export function BusinessLogo({ logoUrl }: { logoUrl: string | null }) {
  const fileInputId = useId();
  // Cambiar la `key` del <input type="file"> fuerza a React a remontarlo,
  // lo que limpia su valor sin necesitar un ref (acceder a un ref durante
  // el render, como en el ajuste de abajo, no está permitido).
  const [inputResetKey, setInputResetKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [state, formAction, pending] = useActionState(
    uploadBusinessLogo,
    initialState,
  );

  // Al terminar un upload exitoso: limpiamos la selección local y
  // mostramos el mensaje de éxito. Ajustado durante el render (mismo
  // patrón que el resto del admin) en vez de un efecto.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state !== initialState && state.error === null) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowSuccess(true);
      setInputResetKey((key) => key + 1);
    } else {
      setShowSuccess(false);
    }
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setClientError(null);
    setShowSuccess(false);

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setClientError("Formato no permitido. Usá JPG, PNG o WEBP.");
      setInputResetKey((key) => key + 1);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setClientError(`El archivo no puede superar los ${MAX_FILE_SIZE_MB} MB.`);
      setInputResetKey((key) => key + 1);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function cancelSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setClientError(null);
    setInputResetKey((key) => key + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Logo actual</p>
        <div className="mt-1 flex h-24 w-24 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {logoUrl ? (
            <div className="relative h-full w-full">
              <Image
                src={logoUrl}
                alt="Logo actual del negocio"
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          ) : (
            <span className="text-xs text-zinc-500">Sin logo</span>
          )}
        </div>
        {logoUrl && (
          <div className="mt-2">
            <DeleteLogoButton />
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        <div>
          <label htmlFor={fileInputId} className="block text-sm font-medium">
            {logoUrl ? "Reemplazar logo" : "Subir logo"}
          </label>
          <input
            key={inputResetKey}
            id={fileInputId}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            aria-describedby={`${fileInputId}-hint`}
            className="mt-1 block w-full text-sm"
          />
          <p id={`${fileInputId}-hint`} className="mt-1 text-xs text-zinc-500">
            JPG, PNG o WEBP. Máximo {MAX_FILE_SIZE_MB} MB.
          </p>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-3">
            <div className="relative h-20 w-20 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
              {/* Preview local antes de subir: blob URL, no un recurso
                  remoto, por eso <img> en vez de next/image acá. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Vista previa del logo seleccionado"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              {selectedFile && (
                <p
                  className="max-w-40 truncate text-xs text-zinc-500"
                  title={selectedFile.name}
                >
                  {selectedFile.name}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {pending
                  ? "Subiendo..."
                  : logoUrl
                    ? "Reemplazar logo"
                    : "Subir logo"}
              </button>
              <button
                type="button"
                onClick={cancelSelection}
                disabled={pending}
                className="text-sm text-zinc-500 hover:underline disabled:opacity-50"
              >
                Cancelar selección
              </button>
            </div>
          </div>
        )}

        {clientError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {clientError}
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        )}
        {showSuccess && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Logo actualizado.
          </p>
        )}
      </form>
    </div>
  );
}
