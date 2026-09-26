import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Jedna tafla szkła zakotwiczona przy elemencie na ekranie — karta dnia z
 * siatki i dymek samouczka to ten sam komponent, różnią się tylko treścią.
 *
 * Dziobek nie jest osobnym elementem doklejonym do karty: jest wycięty z tej
 * samej tafli przez `clip-path`, więc tafla i czubek to dosłownie jedno szkło —
 * jedna zasłona, jedno rozmycie, bez szwu i bez niczego, co mogłoby się
 * rozjechać. Obwódka rysuje się tą samą funkcją kształtu, tylko odsuniętą do
 * środka o połowę grubości linii, żeby clip nie obciął jej zewnętrznej połowy.
 *
 * Pozycja jest mierzona, nigdy zgadywana: tafla ląduje pod celem, gdy jest tam
 * miejsce, a nad nim w przeciwnym razie, i jest domknięta do ekranu razem z
 * bezpiecznym obszarem. Zaczepiona jest czubkiem, więc dziobek trzyma się celu
 * niezależnie od tego, co zrobi treść.
 */

/** Wysokość i szerokość dziobka. */
export const ARROW_H = 13;
export const ARROW_W = 26;
/** Zaokrąglenie rogów — wpisane w kształt, więc nie ma tu klasy `rounded-*`. */
export const RADIUS = 18;
/** Grubość obwódki. Od niej zależy odsunięcie ścieżki do środka. */
export const STROKE = 1.5;
/**
 * Ta sama tafla co w reszcie apki: 5% zasłony z koloru tekstu na mocnym
 * rozmyciu tła. Celowo klasami Tailwinda — ręcznie pisany `backdrop-filter`
 * w naszych plikach CSS przeżywa minifikację tylko w formie `-webkit-`, którą
 * Chromium ignoruje, więc reguła w arkuszu nie zmroziłaby na telefonie nic.
 */
export const GLASS = "bg-foreground/5 backdrop-blur-xl";

export type PopoverSide = "below" | "above";

export interface PopoverMargins {
  side?: number;
  top?: number;
  /** Na dole mieszka pływająca nawigacja — tam się nie wjeżdża. */
  bottom?: number;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

/** Do połowy piksela — na ekranach 2x/3x linia zostaje ostra. */
const q = (n: number) => Math.round(n * 2) / 2;
/** Rozmiar tafli w dół do połowy piksela: kształt nigdy nie wystaje poza
 *  element, więc wycięcie nie potrafi zjeść czubka dziobka. */
const qFloor = (n: number) => Math.floor(n * 2) / 2;

/**
 * Obrys tafli: prostokąt z zaokrąglonymi rogami i trójkątem wypchniętym z
 * jednej krawędzi, jednym ciągłym przebiegiem (bok → podstawa dziobka → czubek
 * → podstawa → dalej bok).
 *
 * `inset` przesuwa KAŻDY punkt o tyle do środka kształtu: krawędzie o `inset`,
 * promienie rogów o `inset` mniejsze, podstawy dziobka do przecięcia
 * odsuniętych krawędzi, a czubek wzdłuż osi dziobka o `inset / sin(połowy kąta
 * przy czubku)`. Dzięki temu obwódka leży równolegle do krawędzi tafli na całym
 * obwodzie, łącznie z czubkiem.
 *
 * Element rezerwuje pas wysokości dziobka u góry I u dołu, więc jego zmierzona
 * wysokość nie zależy od tego, która strona wygrała — wypełniony jest zawsze
 * tylko jeden pas, drugi zostaje odcięty.
 */
export function outline(
  w0: number,
  h0: number,
  tipX0: number,
  side: PopoverSide,
  inset: number,
): string {
  // Do połowy piksela zaokrągla się KSZTAŁT BAZOWY, raz, wspólnie dla obu
  // ścieżek — samego odsunięcia już nie, bo zaokrąglone osobno rozjechałoby
  // obwódkę względem krawędzi o ćwierć piksela w losową stronę.
  const w = q(w0);
  const h = q(h0);
  const a = ARROW_W / 2;
  const len = Math.hypot(a, ARROW_H);
  const r = Math.max(0, RADIUS - inset);
  const x0 = inset;
  const x1 = w - inset;
  const top = ARROW_H + inset;
  const bottom = h - ARROW_H - inset;
  // Czubek z nieodsuniętego promienia, żeby obie ścieżki celowały dokładnie
  // w ten sam punkt celu.
  const x = q(clamp(tipX0, RADIUS + a, w - RADIUS - a));
  const delta = (inset * (ARROW_H * ARROW_H - a * (len - a))) / (ARROW_H * len);
  const apex = (inset * len) / a;

  const n = (v: number) => Math.round(v * 1000) / 1000;
  const arc = (ex: number, ey: number) => `A ${n(r)} ${n(r)} 0 0 1 ${n(ex)} ${n(ey)}`;
  const L = (px: number, py: number) => `L ${n(px)} ${n(py)}`;

  if (side === "below") {
    return [
      `M ${n(x0 + r)} ${n(top)}`,
      L(x - a + delta, top),
      L(x, apex),
      L(x + a - delta, top),
      L(x1 - r, top),
      arc(x1, top + r),
      L(x1, bottom - r),
      arc(x1 - r, bottom),
      L(x0 + r, bottom),
      arc(x0, bottom - r),
      L(x0, top + r),
      arc(x0 + r, top),
      "Z",
    ].join(" ");
  }
  return [
    `M ${n(x0 + r)} ${n(top)}`,
    L(x1 - r, top),
    arc(x1, top + r),
    L(x1, bottom - r),
    arc(x1 - r, bottom),
    L(x + a - delta, bottom),
    L(x, h - apex),
    L(x - a + delta, bottom),
    L(x0 + r, bottom),
    arc(x0, bottom - r),
    L(x0, top + r),
    arc(x0 + r, top),
    "Z",
  ].join(" ");
}

interface Geometry {
  /** Zmierzona szerokość i wysokość tafli, w pikselach CSS. */
  w: number;
  h: number;
  left: number;
  /** Odległość od góry ekranu, albo od dołu, gdy tafla stoi nad celem. */
  offset: number;
  side: PopoverSide;
  maxHeight: number;
  clip: string;
  stroke: string;
}

const same = (a: Geometry | null, b: Geometry) =>
  !!a &&
  a.w === b.w &&
  a.h === b.h &&
  a.left === b.left &&
  a.offset === b.offset &&
  a.side === b.side &&
  a.maxHeight === b.maxHeight &&
  a.clip === b.clip;

/** Bezpieczny obszar czytany z CSS — `env()` rozstrzyga się dopiero tutaj. */
function safeInsets(): { top: number; bottom: number } {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;" +
    "padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const top = parseFloat(cs.paddingTop) || 0;
  const bottom = parseFloat(cs.paddingBottom) || 0;
  probe.remove();
  return { top, bottom };
}

export interface GlassPopoverProps {
  /** Prostokąt celu w układzie ekranu. Przy kilku celach — wspólny obszar. */
  anchor: DOMRect | { top: number; left: number; width: number; height: number };
  children: ReactNode;
  width?: number;
  maxHeight?: number;
  minHeight?: number;
  /** Odstęp między celem a krawędzią tafli; w nim mieszka dziobek. */
  gap?: number;
  margins?: PopoverMargins;
  zIndex?: number;
  className?: string;
  style?: CSSProperties;
  role?: string;
  "aria-label"?: string;
  "aria-live"?: "off" | "polite" | "assertive";
}

export const GlassPopover = forwardRef<HTMLDivElement, GlassPopoverProps>(function GlassPopover(
  {
    anchor,
    children,
    width = 300,
    maxHeight = 420,
    minHeight = 120,
    gap = 15,
    margins,
    zIndex = 70,
    className = "",
    style,
    role,
    "aria-label": ariaLabel,
    "aria-live": ariaLive,
  },
  ref,
) {
  const paneRef = useRef<HTMLDivElement | null>(null);
  const [geom, setGeom] = useState<Geometry | null>(null);

  const sideMargin = margins?.side ?? 12;
  const topMargin = margins?.top ?? 16;
  const bottomMargin = margins?.bottom ?? 104;

  const anchorTop = anchor.top;
  const anchorLeft = anchor.left;
  const anchorWidth = anchor.width;
  const anchorHeight = anchor.height;

  /**
   * Jedno miejsce, w którym liczy się CAŁA geometria: strona, pozycja, wycięcie
   * tafli i ścieżka obwódki. Clip i obwódka wychodzą z tych samych zmierzonych
   * `w` i `h`, więc nie ma jak się rozejść.
   */
  const measure = useCallback(() => {
    const el = paneRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const insets = safeInsets();
    const rect = el.getBoundingClientRect();
    const w = qFloor(rect.width);
    const h = qFloor(rect.height);

    // Miejsce na sam widoczny prostokąt, czyli bez dwóch pasów na dziobek.
    const strips = ARROW_H * 2;
    const tipGap = gap - ARROW_H;
    const anchorBottom = anchorTop + anchorHeight;
    const roomBelow = vh - insets.bottom - bottomMargin - (anchorBottom + gap);
    const roomAbove = anchorTop - gap - topMargin - insets.top;
    const side: PopoverSide = h - strips <= roomBelow || roomBelow >= roomAbove ? "below" : "above";
    const room = side === "below" ? roomBelow : roomAbove;
    const cap = q(Math.max(minHeight, Math.min(maxHeight, room)) + strips);
    const offset = q(side === "below" ? anchorBottom + tipGap : vh - (anchorTop - tipGap));
    const left = q(clamp(anchorLeft + anchorWidth / 2 - w / 2, sideMargin, vw - sideMargin - w));
    const tipX = anchorLeft + anchorWidth / 2 - left;
    const hClipped = Math.min(h, cap);

    const next: Geometry = {
      w,
      h: hClipped,
      left,
      offset,
      side,
      maxHeight: cap,
      clip: outline(w, hClipped, tipX, side, 0),
      stroke: outline(w, hClipped, tipX, side, STROKE / 2),
    };
    setGeom((prev) => (same(prev, next) ? prev : next));
  }, [
    anchorTop,
    anchorLeft,
    anchorWidth,
    anchorHeight,
    gap,
    topMargin,
    bottomMargin,
    sideMargin,
    maxHeight,
    minHeight,
  ]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Treść (liczba linii, doładowane pozycje) i obrót ekranu zmieniają wysokość
  // albo miejsce wokół celu — jedno i drugie przelicza tę samą geometrię.
  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [measure]);

  return (
    <div
      ref={(node) => {
        paneRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role={role}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      className={`${GLASS} fixed flex flex-col ${className}`}
      style={{
        top: geom?.side === "above" ? undefined : (geom?.offset ?? 0),
        bottom: geom?.side === "above" ? geom.offset : undefined,
        left: geom?.left ?? 0,
        zIndex,
        width: `min(${width}px, calc(100vw - ${sideMargin * 2}px))`,
        maxHeight: geom?.maxHeight ?? maxHeight,
        visibility: geom ? "visible" : "hidden",
        // Pasy na dziobek u góry i u dołu; wypełnia się zawsze tylko jeden,
        // drugi znika w wycięciu.
        paddingTop: ARROW_H,
        paddingBottom: ARROW_H,
        clipPath: geom ? `path("${geom.clip}")` : undefined,
        // Wycięcie obcina też `box-shadow`, więc głębia musi iść filtrem —
        // ten idzie za kształtem, razem z dziobkiem.
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,.55))",
        ...style,
      }}
    >
      {geom && (
        <svg
          aria-hidden
          className="pointer-events-none absolute left-0 top-0"
          width={geom.w}
          height={geom.h}
          viewBox={`0 0 ${geom.w} ${geom.h}`}
        >
          <path
            d={geom.stroke}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={STROKE}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </div>
  );
});

export default GlassPopover;
