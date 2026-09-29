import type { OfferStatus } from "@/lib/offers/pricing";

/** Oferta lista para mostrar/editar (fechas ya convertidas a hora de la tienda). */
export type OfferView = {
  id: string;
  productId: string;
  productName: string;
  productAvailable: boolean;
  coverUrl: string | null;
  regularPrice: number;
  offerPrice: number;
  /** Valores para <input type="datetime-local"> en hora de la tienda. */
  startsAtLocal: string;
  endsAtLocal: string;
  /** Textos "01/10/2026, 20:00" en hora de la tienda. */
  startsLabel: string;
  endsLabel: string;
  enabled: boolean;
  featured: boolean;
  status: OfferStatus;
  /** El precio normal bajó y ya no es mayor al promocional. */
  priceInvalid: boolean;
};

export type ProductOption = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};
