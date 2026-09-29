"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronsUpDown,
  ExternalLink,
  FolderTree,
  Gem,
  LayoutDashboard,
  PanelsTopLeft,
  Settings,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BusinessMark } from "./business-mark";
import { LogoutMenuItem } from "./logout-button";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Catálogo",
    items: [
      { href: "/admin/dashboard", label: "Inicio", icon: LayoutDashboard },
      { href: "/admin/productos", label: "Productos", icon: Gem },
      { href: "/admin/categorias", label: "Categorías", icon: FolderTree },
    ],
  },
  {
    label: "Tienda",
    items: [
      { href: "/admin/portada", label: "Portada", icon: PanelsTopLeft },
      { href: "/admin/ofertas", label: "Ofertas", icon: TicketPercent },
    ],
  },
  {
    label: "Negocio",
    items: [
      { href: "/admin/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

export function AppSidebar({
  businessName,
  logoUrl,
  userEmail,
}: {
  businessName: string | null;
  logoUrl: string | null;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  // En móvil el sidebar es un drawer: se cierra al navegar.
  function handleNavigate() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={businessName ?? "Panel"}>
              <Link href="/admin/dashboard" onClick={handleNavigate}>
                <BusinessMark name={businessName} logoUrl={logoUrl} />
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">
                    {businessName ?? "Tu negocio"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Panel de administración
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  // Las subrutas (/admin/productos/nuevo, /[id]) marcan
                  // activa su sección.
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          onClick={handleNavigate}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ver tienda">
                  <a href="/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink />
                    <span>Ver tienda</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold uppercase">
                    {userEmail?.charAt(0) ?? "?"}
                  </span>
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-xs text-muted-foreground">
                      Sesión iniciada
                    </span>
                    <span className="truncate text-sm">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                  {userEmail}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/configuracion" onClick={handleNavigate}>
                    <Settings />
                    Configuración
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <LogoutMenuItem />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
