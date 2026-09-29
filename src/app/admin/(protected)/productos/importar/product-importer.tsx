"use client";

import { useId, useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import {
  CircleAlert,
  CircleCheck,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { commitProductImport, previewProductImport } from "@/actions/import-products";
import { IMPORT_LIMITS } from "@/lib/import/product-import";
import type { ImportOutcome } from "@/lib/import/run-import";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImportPreview } from "./import-preview";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function ProductImporter() {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewing, startReview] = useTransition();
  const [committing, startCommit] = useTransition();
  const [inputKey, setInputKey] = useState(0);

  function reset() {
    setFile(null);
    setOutcome(null);
    setInputKey((key) => key + 1);
  }

  function review(selected: File) {
    startReview(async () => {
      const formData = new FormData();
      formData.append("file", selected);
      setOutcome(await previewProductImport(formData));
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (!selected) return;

    // Chequeo rápido en el navegador; el servidor valida todo de nuevo.
    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Elegí un archivo Excel .xlsx.");
      setInputKey((key) => key + 1);
      return;
    }
    if (selected.size > IMPORT_LIMITS.maxFileBytes) {
      toast.error(`El archivo pesa más de ${IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB.`);
      setInputKey((key) => key + 1);
      return;
    }

    setFile(selected);
    review(selected);
  }

  function commit() {
    if (!file) return;
    startCommit(async () => {
      const formData = new FormData();
      // Se vuelve a enviar el archivo: el servidor lo valida otra vez
      // contra el catálogo actual antes de guardar.
      formData.append("file", file);
      const result = await commitProductImport(formData);
      setConfirmOpen(false);
      setOutcome(result);

      if (result.kind === "imported") {
        toast.success(plural(result.created.length, "producto importado", "productos importados"));
      } else if (result.kind === "preview") {
        toast.error("El catálogo cambió desde la vista previa. No se guardó nada.");
      } else {
        toast.error("No se guardó ningún producto.");
      }
    });
  }

  // ------------------------------------------------------------------
  // Resultado final
  // ------------------------------------------------------------------
  if (outcome?.kind === "imported") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-success" aria-hidden="true" />
            Importación terminada
          </CardTitle>
          <CardDescription>
            Se {outcome.created.length === 1 ? "creó" : "crearon"}{" "}
            {plural(outcome.created.length, "producto", "productos")}. Ninguna fila fue
            rechazada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Recordá sumarles fotos y, si corresponde, talles desde la ficha de cada uno.
          </p>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {outcome.created.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="block truncate px-3 py-2 text-sm hover:bg-accent"
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex-wrap justify-end gap-2 border-t">
          <Button variant="outline" onClick={reset}>
            <RotateCcw />
            Importar otro archivo
          </Button>
          <Button asChild>
            <Link href="/admin/productos">Ver productos</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const rows =
    outcome?.kind === "preview" || outcome?.kind === "save_failed" ? outcome.rows : null;
  const errorCount = outcome?.kind === "preview" ? outcome.errorCount : 0;
  const canImport = outcome?.kind === "preview" && outcome.errorCount === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>2. Elegí el archivo</CardTitle>
          <CardDescription>
            Se revisa completo antes de guardar. Nada se guarda hasta que confirmes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label
            htmlFor={inputId}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:bg-accent/50 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
          >
            {reviewing ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="text-sm font-medium break-all">
              {reviewing ? "Revisando el archivo..." : (file?.name ?? "Elegir archivo .xlsx")}
            </span>
            <span className="text-xs text-muted-foreground">
              Hasta {IMPORT_LIMITS.maxRows} productos y {IMPORT_LIMITS.maxFileBytes / 1024 / 1024} MB.
            </span>
            <input
              key={inputKey}
              id={inputId}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={reviewing || committing}
              className="sr-only"
            />
          </label>
        </CardContent>
      </Card>

      {outcome?.kind === "file_error" && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            No se puede importar este archivo
          </p>
          <ul className="list-disc space-y-1 pl-6 text-destructive">
            {outcome.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Partí de la plantilla y volvé a elegir el archivo. No se guardó nada.
          </p>
        </div>
      )}

      {outcome?.kind === "save_failed" && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          <p className="flex items-center gap-2 font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            No se guardó ningún producto
          </p>
          <p>{outcome.error}</p>
          <p className="text-muted-foreground">
            Las {outcome.rows.length} filas quedaron sin importar. Podés intentar de nuevo.
          </p>
          <Button size="sm" variant="outline" onClick={() => file && review(file)}>
            <RotateCcw />
            Revisar de nuevo
          </Button>
        </div>
      )}

      {rows && (
        <Card>
          <CardHeader>
            <CardTitle>3. Revisá y confirmá</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{plural(rows.length, "fila", "filas")}</Badge>
              {outcome?.kind === "preview" && (
                <>
                  <Badge variant="outline" className="border-success/40 text-success">
                    {plural(outcome.validCount, "lista", "listas")}
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      {errorCount} con errores
                    </Badge>
                  )}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorCount > 0 && (
              <p role="alert" className="text-sm text-destructive">
                {errorCount === 1
                  ? "Hay 1 fila con errores."
                  : `Hay ${errorCount} filas con errores.`}{" "}
                Corregilas en el Excel y volvé a elegir el archivo: si queda alguna
                fila con errores no se importa ninguna, para no dejar el catálogo a
                medias.
              </p>
            )}
            <ImportPreview key={`${file?.name}-${rows.length}-${errorCount}`} rows={rows} />
          </CardContent>
          <CardFooter className="flex-wrap justify-end gap-2 border-t">
            <Button variant="outline" onClick={reset} disabled={committing}>
              Elegir otro archivo
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canImport || committing}>
              <Upload />
              {canImport
                ? `Importar ${plural(rows.length, "producto", "productos")}`
                : "Importar"}
            </Button>
          </CardFooter>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !committing && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Crear {plural(rows?.length ?? 0, "producto", "productos")}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se crean como productos nuevos, sin talles ni imágenes. Los que
              marcaste como visibles aparecen en la tienda enseguida. No se
              modifica ningún producto existente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={committing}>Cancelar</AlertDialogCancel>
            <Button onClick={commit} disabled={committing}>
              {committing && <Loader2 className="animate-spin" aria-hidden="true" />}
              {committing ? "Importando..." : "Importar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
