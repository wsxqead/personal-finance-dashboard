"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { profile } from "@/data/profile";
import { isActivePath, navItems } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";

/**
 * Tablet(768~1023px): 아이콘 중심의 좁은 사이드바
 * Desktop(>=1024px): 라벨이 있는 넓은 사이드바
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-surface md:flex md:w-20 lg:w-60">
      <div className="flex h-16 items-center justify-center gap-2.5 px-4 lg:justify-start lg:px-6">
        <BrandMark />
        <span className="hidden text-[15px] font-semibold tracking-tight lg:inline">{profile.title}</span>
      </div>

      <nav aria-label="주 메뉴" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-current={active ? "page" : undefined}
              className={`group flex h-11 items-center justify-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors lg:justify-start ${
                active
                  ? "bg-primary-soft text-foreground"
                  : "text-muted hover:bg-surface-alt hover:text-foreground"
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${active ? "text-primary-text" : ""}`}
                strokeWidth={active ? 2.2 : 1.8}
                aria-hidden
              />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <div className="flex justify-center lg:hidden">
          <ThemeToggle variant="compact" />
        </div>
      </div>
    </aside>
  );
}
