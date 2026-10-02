import Link from "next/link";
import { profile } from "@/data/profile";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "./theme-toggle";

/** Mobile(<768px) 전용 상단 헤더 */
export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-surface/90 px-4 backdrop-blur-sm md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <BrandMark />
        <span className="text-[15px] font-semibold tracking-tight">{profile.title}</span>
      </Link>
      <ThemeToggle variant="compact" />
    </header>
  );
}
