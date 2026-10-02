import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function Card({ title, description, action, className = "", bodyClassName = "", children }: CardProps) {
  const hasHeader = title || description || action;
  return (
    <section className={`min-w-0 rounded-2xl border bg-surface shadow-soft ${className}`}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5 md:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={`p-5 md:p-6 ${hasHeader ? "pt-4 md:pt-4" : ""} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
