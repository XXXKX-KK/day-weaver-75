import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Screen({ children }: { children: ReactNode }) {
  return <main className="screen-shell pt-8">{children}</main>;
}

export function ScreenHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-3xl font-bold leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function Card({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("card-surface p-5", onClick && "cursor-pointer active:scale-[0.99] transition-transform", className)}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="accent-gradient h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-[22rem] text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
