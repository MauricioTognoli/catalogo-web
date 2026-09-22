"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  MAX_QUANTITY,
  MIN_QUANTITY,
  isSameCartLine,
  type CartItem,
} from "./types";
import { readCartFromStorage, writeCartToStorage } from "./storage";

type AddItemInput = {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  sizeId: string | null;
  sizeLabel: string | null;
};

type CartState = {
  items: CartItem[];
  // Distingue "todavía no leímos localStorage" de "el carrito está vacío
  // de verdad", para no pisar lo guardado con el estado inicial del
  // primer render (ver el efecto de hidratación más abajo).
  isHydrated: boolean;
};

type CartAction =
  | { type: "HYDRATE"; items: CartItem[] }
  | { type: "ADD_ITEM"; item: AddItemInput }
  | {
      type: "UPDATE_QUANTITY";
      productId: string;
      sizeId: string | null;
      quantity: number;
    }
  | { type: "REMOVE_ITEM"; productId: string; sizeId: string | null }
  | { type: "CLEAR_CART" };

// Exportados únicamente para poder testear el reducer de forma directa y
// determinista (ver cart-context.test.ts), sin necesitar montar
// <CartProvider> con jsdom/React Testing Library. No cambia ningún
// comportamiento: CartProvider los sigue usando exactamente igual.
export const initialState: CartState = { items: [], isHydrated: false };

function clampQuantity(value: number): number {
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.trunc(value)));
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items, isHydrated: true };

    case "ADD_ITEM": {
      const quantity = clampQuantity(action.item.quantity);
      const existingIndex = state.items.findIndex((line) =>
        isSameCartLine(line, action.item),
      );

      const items =
        existingIndex === -1
          ? [...state.items, { ...action.item, quantity }]
          : state.items.map((line, index) =>
              index === existingIndex
                ? { ...line, quantity: clampQuantity(line.quantity + quantity) }
                : line,
            );

      return { ...state, items };
    }

    case "UPDATE_QUANTITY": {
      const quantity = Math.trunc(action.quantity);

      // Llegar a 0 (o menos) mediante una acción elimina la línea, no la
      // deja en un estado inválido.
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((line) => !isSameCartLine(line, action)),
        };
      }

      const clamped = clampQuantity(quantity);
      return {
        ...state,
        items: state.items.map((line) =>
          isSameCartLine(line, action) ? { ...line, quantity: clamped } : line,
        ),
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((line) => !isSameCartLine(line, action)),
      };

    case "CLEAR_CART":
      return { ...state, items: [] };

    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: AddItemInput) => void;
  updateQuantity: (
    productId: string,
    sizeId: string | null,
    quantity: number,
  ) => void;
  removeItem: (productId: string, sizeId: string | null) => void;
  clearCart: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const { items, isHydrated } = state;
  const [isOpen, setIsOpen] = useState(false);

  // El estado inicial es { items: [], isHydrated: false } tanto en
  // servidor como en el primer render de cliente (mismo HTML, sin
  // mismatch). Recién después de montar leemos localStorage: es
  // sincronización con un sistema externo al render (el storage del
  // navegador), no un ajuste de props, por eso corresponde un efecto acá.
  useEffect(() => {
    dispatch({ type: "HYDRATE", items: readCartFromStorage() });
  }, []);

  // No persistimos hasta haber hidratado, para no pisar lo guardado con
  // el estado inicial vacío del primer render.
  useEffect(() => {
    if (!isHydrated) return;
    writeCartToStorage(items);
  }, [items, isHydrated]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      subtotal,
      addItem: (item) => dispatch({ type: "ADD_ITEM", item }),
      updateQuantity: (productId, sizeId, quantity) =>
        dispatch({ type: "UPDATE_QUANTITY", productId, sizeId, quantity }),
      removeItem: (productId, sizeId) =>
        dispatch({ type: "REMOVE_ITEM", productId, sizeId }),
      clearCart: () => dispatch({ type: "CLEAR_CART" }),
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }),
    [items, itemCount, subtotal, isOpen],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de un CartProvider.");
  }
  return context;
}
