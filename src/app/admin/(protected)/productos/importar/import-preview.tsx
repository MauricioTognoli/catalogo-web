"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { ImportRowPreview } from "@/lib/import/product-import";
import { formatPrice } from "@/lib/utils/formatPrice";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";

function RowErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CircleCheck className="size-3.5" aria-hidden="true" />
        Lista
      </span>
    );
  }
  return (
    <ul className="grid gap-1">
      {errors.map((error) => (
        <li key={error} className="flex items-start gap-1 text-xs text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </li>
      ))}
    </ul>
  );
}

function display(value: string | number | null, format?: (value: number) => string) {
  if (value === null || value === "") return <span className="text-muted-foreground">—</span>;
  return typeof value === "number" && format ? format(value) : value;
}

/** Vista previa de TODAS las filas, con sus errores; tabla o tarjetas en móvil. */
export function ImportPreview({ rows }: { rows: ImportRowPreview[] }) {
  const errorCount = rows.filter((row) => row.errors.length > 0).length;
  const [onlyErrors, setOnlyErrors] = useState(errorCount > 0);
  const visible = onlyErrors ? rows.filter((row) => row.errors.length > 0) : rows;

  return (
    <div className="space-y-3">
      {errorCount > 0 && (
        <div className="flex items-center gap-2">
          <Switch id="only-errors" checked={onlyErrors} onCheckedChange={setOnlyErrors} />
          <Label htmlFor="only-errors" className="font-normal">
            Mostrar solo filas con errores ({errorCount})
          </Label>
        </div>
      )}

      <ul className="grid gap-2 md:hidden" aria-label="Filas del archivo">
        {visible.map((row) => (
          <li
            key={row.rowNumber}
            className={cn(
              "grid gap-2 rounded-lg border p-3",
              row.errors.length > 0 && "border-destructive/40 bg-destructive/5",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 font-medium break-words">
                {row.name || <span className="text-muted-foreground">Sin nombre</span>}
              </p>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                Fila {row.rowNumber}
              </Badge>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Precio</dt>
                <dd className="tabular-nums">{display(row.price, formatPrice)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Stock</dt>
                <dd className="tabular-nums">{display(row.stock)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Visible</dt>
                <dd>{row.available === null ? "—" : row.available ? "Sí" : "No"}</dd>
              </div>
              <div className="col-span-3">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{row.categoryName ?? "Sin categoría"}</dd>
              </div>
            </dl>
            <RowErrors errors={row.errors} />
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-16 pl-4">Fila</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="min-w-64 pr-4">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row) => (
              <TableRow
                key={row.rowNumber}
                className={cn(row.errors.length > 0 && "bg-destructive/5 hover:bg-destructive/10")}
              >
                <TableCell className="pl-4 text-muted-foreground tabular-nums">
                  {row.rowNumber}
                </TableCell>
                <TableCell className="max-w-56 truncate font-medium">
                  {display(row.name)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {display(row.price, formatPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{display(row.stock)}</TableCell>
                <TableCell>{row.categoryName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  {row.available === null ? "—" : row.available ? "Sí" : "No"}
                </TableCell>
                <TableCell className="pr-4 whitespace-normal">
                  <RowErrors errors={row.errors} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
