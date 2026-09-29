"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <DropdownMenuItem
      disabled={loading}
      onSelect={(event) => {
        // Evita que el menú se cierre antes de que termine el signOut.
        event.preventDefault();
        void handleLogout();
      }}
    >
      <LogOut />
      {loading ? "Cerrando sesión..." : "Cerrar sesión"}
    </DropdownMenuItem>
  );
}
