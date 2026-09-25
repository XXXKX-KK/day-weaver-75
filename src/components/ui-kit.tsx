import type { CSSProperties, ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Screen({ children }: { children: ReactNode }) {
  // No pt-* here: screen-shell already clears the status bar and a notch.
  return <main className="screen-shell">{children}</main>;
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
      className={cn(
        "card-surface p-5",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform",
        className,
      )}
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

/**
 * Nagłówek grupy w Ustawieniach. Ten sam krój co `eyebrow` w ScreenHeader —
 * grupy mają wyglądać jak podtytuły ekranu, nie jak osobny wynalazek.
 */
export function SettingsGroupLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p
      className="mb-2 mt-7 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
      style={style}
    >
      {children}
    </p>
  );
}

/** Odstęp wewnątrz grupy — ciaśniej niż między grupami, żeby grupa czytała się jako całość. */
export function SettingsGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

/**
 * Pojedynczy kafelek ustawień: ikona, tytuł, podpis ze stanem i strzałka.
 * Jeden komponent dla ekranu głównego i wszystkich podekranów — inaczej każdy
 * ekran po cichu rozjeżdża się w paddingu i rozmiarze ikony.
 *
 * `right` zastępuje strzałkę (np. przełącznikiem albo godziną); kafelek bez
 * `to` i `onClick` nie jest klikalny, więc nie udaje przycisku.
 */
export function SettingsTile({
  icon: Icon,
  title,
  subtitle,
  subtitleColor,
  right,
  to,
  onClick,
  style,
  danger = false,
}: {
  icon?: LucideIcon | undefined;
  title: string;
  subtitle?: ReactNode | undefined;
  /** Kolor podpisu, gdy niesie status (zielony „działa", czerwony „brakuje"). */
  subtitleColor?: string | undefined;
  right?: ReactNode | undefined;
  to?: LinkProps["to"] | undefined;
  onClick?: (() => void) | undefined;
  style?: CSSProperties | undefined;
  danger?: boolean | undefined;
}) {
  const body = (
    <div className="flex items-center gap-[14px] rounded-3xl glass px-4 py-[14px]">
      {Icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Icon
            className={cn(
              "h-[22px] w-[22px]",
              danger ? "text-destructive" : "text-muted-foreground",
            )}
            strokeWidth={1.4}
          />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 text-left">
        <p className={cn("text-[16px] font-medium", danger && "text-destructive")}>{title}</p>
        {subtitle != null && subtitle !== "" ? (
          <p
            className="mt-px truncate text-[13px] text-muted-foreground"
            style={subtitleColor ? { color: subtitleColor } : undefined}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ??
        (to || onClick ? (
          <ChevronRight className="h-[14px] w-[14px] shrink-0 text-foreground/[0.18]" />
        ) : null)}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block" style={style}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full" style={style}>
        {body}
      </button>
    );
  }
  return <div style={style}>{body}</div>;
}

/** Nagłówek podekranu ustawień: strzałka powrotu + tytuł. */
export function SubScreenHeader({
  title,
  back = "/ustawienia",
}: {
  title: string;
  back?: LinkProps["to"];
}) {
  return (
    <div
      className="mb-5 flex items-center gap-3"
      style={{ animation: "cascadeIn 0.5s ease-out both" }}
    >
      <Link
        to={back}
        className="flex h-10 w-10 items-center justify-center rounded-2xl glass"
        aria-label="Wróć"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <h1 className="text-2xl font-bold leading-tight">{title}</h1>
    </div>
  );
}
