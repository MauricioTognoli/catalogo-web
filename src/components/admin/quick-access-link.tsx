import Link from "next/link";

const LINK_CLASSNAME =
  "flex min-h-11 items-center justify-center rounded border border-zinc-300 px-4 py-2 text-center text-sm font-medium hover:border-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-100 dark:focus-visible:outline-zinc-100";

export function QuickAccessLink({
  href,
  label,
  external = false,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASSNAME}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={LINK_CLASSNAME}>
      {label}
    </Link>
  );
}
