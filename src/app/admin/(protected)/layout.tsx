import Image from "next/image";
import { getCurrentBusiness } from "@/lib/business/getCurrentBusiness";
import { LogoutButton } from "@/components/admin/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getCurrentBusiness();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {business?.logo_url ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                <Image
                  src={business.logo_url}
                  alt={`Logo de ${business.name}`}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              </div>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {business ? business.name.charAt(0).toUpperCase() : "A"}
              </span>
            )}
            <span className="truncate text-lg font-semibold">
              {business?.name ?? "Admin"}
            </span>
          </div>

          <div className="flex w-full items-center gap-4 sm:w-auto">
            <AdminNav />
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
