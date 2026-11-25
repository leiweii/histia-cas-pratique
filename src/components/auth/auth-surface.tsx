import type { ReactNode } from "react";
import { CompanyBackdrop } from "@/components/company/company-backdrop";
import { cn } from "@/lib/utils";
import type { AuthLocale } from "./messages";
import "./auth-surface.css";

export function StolosMark({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("auth-mark", className)}>
      <span />
      <span />
      <span />
    </div>
  );
}

export function AuthSurface({ children, locale }: { children: ReactNode; locale?: AuthLocale }) {
  return (
    <main className="auth-screen">
      {locale && <CompanyBackdrop locale={locale} />}
      <StolosMark />
      <section className="auth-card glassmorphism rounded-m text-center">
        {children}
      </section>
    </main>
  );
}
