"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 overflow-x-auto border-b px-6 md:px-10">
      {navItems.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 border-transparent py-3 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              active && "border-foreground text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
