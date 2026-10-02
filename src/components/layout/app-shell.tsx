import type { ReactNode } from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 md:px-6 md:pt-8 md:pb-12 lg:px-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
