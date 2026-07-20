"use client";

import { Images, LucideIcon, Briefcase } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}[] = [
  {
    href: "/",
    label: "Home",
    icon: Briefcase,
    isActive: (pathname) => pathname === "/" || pathname.startsWith("/jobs"),
  },
  {
    href: "/posts",
    label: "Posts",
    icon: Images,
    isActive: (pathname) => pathname.startsWith("/posts"),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-6">
      <Link href="/" className="mb-6 px-3 text-base font-semibold text-[var(--color-ink)]">
        TrueRestore
      </Link>
      <div className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--color-accent-50)] text-[var(--color-primary)]"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-ink)]"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
