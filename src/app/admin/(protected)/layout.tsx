import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    business,
    cookieStore,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCurrentBusiness(),
    cookies(),
  ]);

  // Cookie que escribe el propio SidebarProvider al expandir/colapsar.
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar
          businessName={business?.name ?? null}
          logoUrl={business?.logo_url ?? null}
          userEmail={user?.email ?? null}
        />
        <SidebarInset>
          <AdminHeader />
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
