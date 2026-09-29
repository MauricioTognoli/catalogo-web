"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Plus, Sparkles, TicketPercent, Trash2, TriangleAlert } from "lucide-react";
import { deleteOffer } from "@/actions/offers";
import { discountPercent, type OfferStatus } from "@/lib/offers/pricing";
import { formatPrice } from "@/lib/utils/formatPrice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { OfferDialog } from "./offer-dialog";
import { OfferEnabledSwitch } from "./offer-enabled-switch";
import { OFFER_STATUS_LABELS, OfferStatusBadge } from "./offer-status-badge";
import type { OfferView, ProductOption } from "./types";

type Filter = "todas" | OfferStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "active", label: OFFER_STATUS_LABELS.active },
  { value: "scheduled", label: OFFER_STATUS_LABELS.scheduled },
  { value: "disabled", label: OFFER_STATUS_LABELS.disabled },
  { value: "ended", label: OFFER_STATUS_LABELS.ended },
];

function OfferPrice({ offer }: { offer: OfferView }) {
  return (
    <div className="grid gap-0.5">
      <span className="font-medium tabular-nums">{formatPrice(offer.offerPrice)}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        <s>{formatPrice(offer.regularPrice)}</s>
        {!offer.priceInvalid && ` · -${discountPercent(offer.regularPrice, offer.offerPrice)}%`}
      </span>
    </div>
  );
}

function OfferWarnings({ offer }: { offer: OfferView }) {
  if (offer.status === "ended") return null;
  const warnings = [
    offer.priceInvalid && "El precio normal bajó: esta oferta no se aplica.",
    !offer.productAvailable && "Producto oculto: la oferta no se ve.",
  ].filter(Boolean) as string[];
  if (warnings.length === 0) return null;
  return (
    <ul className="mt-1 grid gap-0.5">
      {warnings.map((warning) => (
        <li key={warning} className="flex items-start gap-1 text-xs text-warning">
          <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          {warning}
        </li>
      ))}
    </ul>
  );
}

function OfferActions({
  offer,
  onEdit,
}: {
  offer: OfferView;
  onEdit: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Acciones para la oferta de ${offer.productName}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {offer.status === "ended" ? "Reutilizar" : "Editar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar la oferta de "${offer.productName}"?`}
        description={
          offer.status === "active"
            ? "La oferta está activa: el producto vuelve al precio normal ahora. Los carritos se actualizan antes de enviar el pedido."
            : "Esta acción no se puede deshacer."
        }
        action={deleteOffer}
        fields={{ offerId: offer.id }}
        successMessage="Oferta eliminada"
      />
    </>
  );
}

export function OffersList({
  offers,
  products,
  defaultStartsAt,
  defaultEndsAt,
}: {
  offers: OfferView[];
  products: ProductOption[];
  defaultStartsAt: string;
  defaultEndsAt: string;
}) {
  const [filter, setFilter] = useState<Filter>("todas");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OfferView | null>(null);

  const filtered = filter === "todas" ? offers : offers.filter((offer) => offer.status === filter);
  const dialogProps = { products, defaultStartsAt, defaultEndsAt };

  const createButton = (
    <Button onClick={() => setCreateOpen(true)} disabled={products.length === 0}>
      <Plus />
      Nueva oferta
    </Button>
  );

  return (
    <div className="space-y-4">
      {offers.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title="Todavía no creaste ofertas"
          description={
            products.length === 0
              ? "Primero cargá productos; después podés ponerles un precio promocional por tiempo limitado."
              : "Elegí un producto, un precio promocional y hasta cuándo dura. La tienda muestra el precio anterior tachado y vuelve sola al normal al terminar."
          }
          action={createButton}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
              <SelectTrigger className="w-44" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                    {item.value !== "todas" &&
                      ` (${offers.filter((offer) => offer.status === item.value).length})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {createButton}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={TicketPercent}
              title="No hay ofertas con ese estado"
              action={
                <Button variant="outline" onClick={() => setFilter("todas")}>
                  Ver todas
                </Button>
              }
            />
          ) : (
            <>
              <ul className="divide-y rounded-xl border md:hidden">
                {filtered.map((offer) => (
                  <li key={offer.id} className="grid gap-3 p-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail url={offer.coverUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{offer.productName}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <OfferStatusBadge status={offer.status} />
                          {offer.featured && (
                            <Badge variant="secondary">
                              <Sparkles aria-hidden="true" />
                              Banner
                            </Badge>
                          )}
                        </div>
                      </div>
                      <OfferEnabledSwitch
                        offerId={offer.id}
                        productName={offer.productName}
                        enabled={offer.enabled}
                        ended={offer.status === "ended"}
                      />
                      <OfferActions offer={offer} onEdit={() => setEditing(offer)} />
                    </div>
                    <div className="flex items-end justify-between gap-3 text-sm">
                      <OfferPrice offer={offer} />
                      <p className="text-right text-xs text-muted-foreground">
                        {offer.startsLabel}
                        <br />
                        hasta {offer.endsLabel}
                      </p>
                    </div>
                    <OfferWarnings offer={offer} />
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-hidden rounded-xl border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="pl-4">Producto</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Período (hora Argentina)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-24">Habilitada</TableHead>
                      <TableHead className="w-14 pr-4">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-3">
                            <ProductThumbnail url={offer.coverUrl} />
                            <div className="min-w-0">
                              <p className="max-w-56 truncate font-medium">{offer.productName}</p>
                              <OfferWarnings offer={offer} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <OfferPrice offer={offer} />
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="block tabular-nums">{offer.startsLabel}</span>
                          <span className="block text-muted-foreground tabular-nums">
                            hasta {offer.endsLabel}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            <OfferStatusBadge status={offer.status} />
                            {offer.featured && (
                              <Badge variant="secondary">
                                <Sparkles aria-hidden="true" />
                                Banner
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <OfferEnabledSwitch
                            offerId={offer.id}
                            productName={offer.productName}
                            enabled={offer.enabled}
                            ended={offer.status === "ended"}
                          />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <OfferActions offer={offer} onEdit={() => setEditing(offer)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}

      {/* Montado solo abierto: cada apertura arranca con valores frescos. */}
      {createOpen && (
        <OfferDialog open onOpenChange={setCreateOpen} {...dialogProps} />
      )}
      {editing && (
        <OfferDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          offer={editing}
          {...dialogProps}
        />
      )}
    </div>
  );
}
