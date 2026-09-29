import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "Panel de administración",
    template: "%s · Panel",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background font-sans text-foreground">
      {children}
      <Toaster position="top-center" richColors closeButton />
    </div>
  );
}
