import { History, Landmark, LayoutDashboard, ReceiptText, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "대시보드", description: "Dashboard", icon: LayoutDashboard },
  { href: "/loans", label: "대출", description: "Loans", icon: Landmark },
  { href: "/expenses", label: "지출", description: "Expenses", icon: ReceiptText },
  { href: "/history", label: "기록", description: "History", icon: History },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
