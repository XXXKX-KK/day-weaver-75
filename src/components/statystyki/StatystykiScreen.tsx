import { useEffect, useMemo, useRef, useState } from 'react';
import type { DayProgress, StatsSummary, TabView, RangeKey, ViewState } from './types';
import { MOCK_SUMMARY } from './mockData';
import './statystyki.css';

// ---------------------------------------------------------------------------
// StatystykiScreen — ekran „Statystyki" (TENAX)
// Tailwind do layoutu; kolory akcentu / siatki jako zmienne (łatwa zmiana motywu).
// Wymaga: `tailwind.config` z domyślną paletą + rodzina Manrope (opcjonalnie).
// ---------------------------------------------------------------------------

export interface StatystykiScreenProps {
  summary?: StatsSummary;
  viewState?: ViewState;
  defaultView?: TabView;
}

const LEVEL_COLORS = ['#181b21', '#0e4429', '#196c3a', '#26a641', '#39d353'];
const MONTHS_SHORT = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
const WEEKDAYS = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
const MONTHS_FULL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad = (n: number) => String(n).padStart(2, '0');
const plDni = (n: number) => (n === 1 ? 'dzień' : 'dni');
const fmtFull = (isoStr: string) => {
  const d = new Date(isoStr);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`;
};
const levelFor = (pct: number, completed: number) =>
  completed === 0 ? 0 : pct < 0.3 ? 1 : pct < 0.6 ? 2 : pct < 0.85 ? 3 : 4;

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

interface Selected {
  label: string;
  pctInt: number;
  xp: number;
  x: number;
  y: number;
  w: number;
  caret: number;
}

export default function StatystykiScreen({
  summary = MOCK_SUMMARY,
  viewState = 'loaded',
  defaultView = 'postep',
}: StatystykiScreenProps) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [view, setView] = useState<TabView>(defaultView);
  const [range, setRange] = useState<RangeKey>('30');
  const [sel, setSel] = useState<Selected | null>(null);
  const [counts, setCounts] = useState({ streak: 0, longest: 0, level: 0, days: 0 });

  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScroll = useRef(false);

  const isReady = viewState === 'loaded';

  const finalCounts = useMemo(
    () => ({
      streak: summary.currentStreak,
      longest: summary.longestStreak,
      level: summary.level,
      days: summary.daysDone,
    }),
    [summary]
  );

  const countUpDone = useRef(false);
  useEffect(() => {
    if (!isReady || prefersReduced || countUpDone.current) {
      setCounts(finalCounts);
      return;
    }
    countUpDone.current = true;
    let raf = 0;
    const start = performance.now();
    const dur = 1150;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = ease(t);
      setCounts({
        streak: Math.round(finalCounts.streak * e),
        longest: Math.round(finalCounts.longest * e),
        level: Math.round(finalCounts.level * e),
        days: Math.round(finalCounts.days * e),
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isReady, prefersReduced, finalCounts]);

  const tryScroll = () => {
    if (!pendingScroll.current) return;
    const el = scrollRef.current;
    const cell = el?.querySelector<HTMLElement>('[data-today]');
    if (el && cell && el.scrollHeight > el.clientHeight + 4) {
      const cr = el.getBoundingClientRect();
      const rr = cell.getBoundingClientRect();
      el.scrollTop = Math.max(0, el.scrollTop + (rr.top - cr.top) - el.clientHeight / 2 + rr.height / 2);
      pendingScroll.current = false;
    }
  };
  useEffect(() => {
    if (view !== 'siatka' || !isReady) return;
    pendingScroll.current = true;
    tryScroll();
    const el = scrollRef.current;
    if (el && 'ResizeObserver' in window) {
      const ro = new ResizeObserver(() => tryScroll());
      ro.observe(el);
      const t = setTimeout(() => ro.disconnect(), 2500);
      return () => {
        ro.disconnect();
        clearTimeout(t);
      };
    }
  }, [view, isReady]);

  const changeView = (v: TabView) => {
    setSel(null);
    setView(v);
  };

  const selectDay = (cd: { label: string; pctInt: number; xp: number }, e: React.MouseEvent) => {
    const card = gridRef.current;
    if (!card) return;
    const cr = card.getBoundingClientRect();
    const rr = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = rr.left - cr.left + rr.width / 2;
    const top = rr.top - cr.top + rr.height;
    const w = 156;
    let left = cx - w / 2;
    left = Math.max(8, Math.min(left, cr.width - w - 8));
    setSel({ ...cd, x: left, y: top, w, caret: cx - left });
  };

  // -------- pochodne dane widoku „Postęp" --------
  const { xpPath, xpArea, xpEnd, xpTotalLabel, bars } = useMemo(() => {
    const n = range === '7' ? 7 : range === '30' ? 30 : summary.days.length;
    const slice = summary.days.slice(-n);
    let c = 0;
    const cumVals = slice.map((d) => (c += d.xp));
    const W = 318, H = 104, ptop = 12, pbot = 10;
    const max = Math.max(...cumVals, 1);
    const pts = cumVals.map((v, i) => ({
      x: slice.length > 1 ? (i / (slice.length - 1)) * W : 0,
      y: H - pbot - (v / max) * (H - ptop - pbot),
    }));
    const path = smoothPath(pts);
    const area = pts.length > 1 ? `${path} L ${W} ${H} L 0 ${H} Z` : '';
    const end = pts[pts.length - 1] || { x: 0, y: H };
    const totalLabel = `+${slice.reduce((a, d) => a + d.xp, 0).toLocaleString('pl-PL')} XP`;

    let barList: { pct: number; label: string; strong: boolean }[];
    if (range === '7') {
      const wd = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
      barList = summary.days.slice(-7).map((d) => {
        const pct = d.planned ? Math.round((d.completed / d.planned) * 100) : 0;
        return { pct, label: wd[(new Date(d.date).getDay() + 6) % 7], strong: pct >= 60 };
      });
    } else {
      const cnt = range === '30' ? 5 : 9;
      const src = range === '30' ? summary.days.slice(-35) : summary.days;
      const per = Math.ceil(src.length / cnt);
      barList = [];
      for (let i = 0; i < cnt; i++) {
        const grp = src.slice(i * per, (i + 1) * per);
        if (!grp.length) continue;
        const pct = Math.round(
          (grp.reduce((a, d) => a + (d.planned ? d.completed / d.planned : 0), 0) / grp.length) * 100
        );
        barList.push({ pct, label: i === cnt - 1 ? 'ten' : `-${cnt - 1 - i}`, strong: pct >= 60 });
      }
    }
    return { xpPath: path, xpArea: area, xpEnd: end, xpTotalLabel: totalLabel, bars: barList };
  }, [range, summary]);

  // -------- kalendarz (miesiące = kolumny, dni 1..31 = wiersze) --------
  const { months, calRows, todayPct } = useMemo(() => {
    const dataMap: Record<string, DayProgress> = {};
    summary.days.forEach((d) => (dataMap[d.date] = d));
    const todayISO = summary.days[summary.days.length - 1].date;
    const year = new Date(todayISO).getFullYear();
    const curMonth = new Date(todayISO).getMonth();

    const monthCols = MONTHS_SHORT.map((label, m) => ({ label, cur: m === curMonth }));

    interface Cell {
      empty?: boolean;
      bg?: string;
      border?: string;
      clickable?: boolean;
      today?: boolean;
      cd?: { label: string; pctInt: number; xp: number };
      cur?: boolean;
    }
    const rows: { day: number; cells: Cell[] }[] = [];
    for (let day = 1; day <= 31; day++) {
      const cells: Cell[] = [];
      for (let m = 0; m < 12; m++) {
        const cur = m === curMonth;
        if (day > DIM[m]) {
          cells.push({ empty: true });
          continue;
        }
        const isoStr = `${year}-${pad(m + 1)}-${pad(day)}`;
        if (isoStr > todayISO) {
          cells.push({ bg: cur ? 'color-mix(in oklab, var(--primary) 6%, transparent)' : 'transparent', cur });
          continue;
        }
        const isToday = isoStr === todayISO;
        const rec = dataMap[isoStr];
        if (rec) {
          const pct = rec.planned ? rec.completed / rec.planned : 0;
          const lvl = levelFor(pct, rec.completed);
          let bg = LEVEL_COLORS[lvl];
          if (cur && lvl === 0) bg = 'color-mix(in oklab, var(--primary) 7%, transparent)';
          cells.push({
            bg,
            border: lvl === 0 ? '1px solid var(--border)' : '1px solid transparent',
            clickable: true,
            today: isToday,
            cur,
            cd: { label: fmtFull(isoStr), pctInt: Math.round(pct * 100), xp: rec.xp },
          });
        } else {
          cells.push({
            bg: cur ? 'color-mix(in oklab, var(--primary) 6%, transparent)' : 'transparent',
            border: '1px solid var(--border)',
            clickable: true,
            today: isToday,
            cur,
            cd: { label: fmtFull(isoStr), pctInt: 0, xp: 0 },
          });
        }
      }
      rows.push({ day, cells });
    }
    const last = summary.days[summary.days.length - 1];
    return {
      months: monthCols,
      calRows: rows,
      todayPct: last.planned ? Math.round((last.completed / last.planned) * 100) : 0,
    };
  }, [summary]);

  const motiv = useMemo(() => {
    const cs = summary.currentStreak;
    const ls = summary.longestStreak;
    if (cs >= ls) return 'Rekord pobity — utrzymaj passę!';
    const diff = ls - cs;
    return `${diff} ${plDni(diff)} do rekordu (najdłuższa: ${ls})`;
  }, [summary]);

  const isPostep = view === 'postep';
  const anim = (cls: string) => (prefersReduced ? '' : cls);

  return (
    <div className="px-5 pt-[22px]" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 7rem)' }}>
        {/* Nagłówek */}
        <div className="mb-[18px]">
          <div className="text-[26px] font-extrabold tracking-tight text-foreground">Statystyki</div>
          <div className="mt-[3px] text-[13.5px] font-medium text-muted-foreground">Twój postęp w czasie</div>
        </div>

        {/* Segment */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full glass p-1">
          {(['postep', 'siatka'] as TabView[]).map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              className={`h-11 rounded-full text-[13.5px] font-bold transition-colors ${
                view === v ? 'accent-gradient text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {v === 'postep' ? 'Postęp' : 'Siatka'}
            </button>
          ))}
        </div>

        {/* Stany */}
        {viewState === 'loading' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-[10px]">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[84px]" />
              ))}
            </div>
            <Skeleton className="h-[150px]" />
            <Skeleton className="h-[150px]" />
          </div>
        )}

        {viewState === 'empty' && (
          <div className="flex flex-col items-center px-5 pb-10 pt-[54px] text-center">
            <div className="mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-[20px] glass text-3xl">
              📈
            </div>
            <div className="text-[17px] font-bold text-foreground">Zacznij dzień, żeby zobaczyć swój postęp</div>
            <div className="mt-2 max-w-[250px] text-[13.5px] leading-relaxed text-muted-foreground">
              Odhaczaj zadania z planu dnia — Twoje statystyki i passa pojawią się tutaj.
            </div>
          </div>
        )}

        {/* Widok: Postęp */}
        {isReady && isPostep && (
          <div className={anim('animate-[fadeUp_.45s_ease_both]')}>
            <div className="grid grid-cols-2 gap-[10px]">
              <Tile
                delay={0}
                accentTile
                anim={anim}
                label="Obecna passa"
                labelColor="var(--primary)"
              >
                <span className="text-[30px] font-extrabold tracking-tight text-white tabular-nums">{counts.streak}</span>
                <span className="text-[13px] font-semibold text-primary">dni</span>
                <span className={`ml-[2px] inline-block text-[15px] ${anim('animate-[flamePulse_1.9s_ease-in-out_1.3s_infinite]')}`}>🔥</span>
              </Tile>
              <Tile delay={0.07} anim={anim} label="Najdłuższa passa">
                <span className="text-[30px] font-extrabold tracking-tight text-foreground tabular-nums">{counts.longest}</span>
                <span className="text-[13px] font-semibold text-muted-foreground">dni</span>
              </Tile>
              <Tile
                delay={0.14}
                anim={anim}
                label="Poziom"
                footer={
                  <div className="mt-1.5 flex flex-col gap-0.5 text-[10.5px] font-semibold text-muted-foreground">
                    <span>{summary.toNext} XP do poz. {summary.level + 1}</span>
                    <span>{summary.totalXp.toLocaleString('pl-PL')} XP łącznie</span>
                  </div>
                }
              >
                <span className="text-[15px] font-bold text-muted-foreground">Lv</span>
                <span className="text-[30px] font-extrabold tracking-tight text-foreground tabular-nums">{counts.level}</span>
              </Tile>
              <Tile delay={0.21} anim={anim} label="Dni zrobione">
                <span className="text-[30px] font-extrabold tracking-tight text-foreground tabular-nums">{counts.days}</span>
              </Tile>
            </div>

            <div className={`mx-[2px] mb-1 mt-[14px] flex items-center gap-2 ${anim('animate-[fadeUp_.38s_cubic-bezier(.2,.7,.3,1)_.32s_both]')}`}>
              <span className="text-[15px] text-primary">▹</span>
              <span className="text-[13.5px] font-semibold text-muted-foreground">{motiv}</span>
            </div>

            {/* Zakres */}
            <div className="my-[18px] mb-[14px] flex gap-[6px]">
              {(['7', '30', 'all'] as RangeKey[]).map((key) => {
                const label = key === '7' ? '7 dni' : key === '30' ? '30 dni' : 'wszystko';
                const active = range === key;
                return (
                  <button
                    key={key}
                    onClick={() => setRange(key)}
                    className={`flex-1 rounded-xl py-[7px] text-[12px] font-bold transition-all duration-200 ${!active ? 'bg-foreground/5' : ''}`}
                    style={{
                      border: active ? '1px solid var(--primary)' : undefined,
                      background: active ? 'color-mix(in oklab, var(--primary) 12%, transparent)' : undefined,
                      color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Wykres XP */}
            <div className="mb-3 rounded-[18px] glass p-4">
              <div className="mb-[10px] flex items-baseline justify-between">
                <span className="text-[14px] font-bold text-foreground">XP w czasie</span>
                <span className="text-[12.5px] font-bold tabular-nums text-primary">{xpTotalLabel}</span>
              </div>
              <svg viewBox="0 0 318 104" className="block h-auto w-full overflow-visible">
                <line x1="0" y1="26" x2="318" y2="26" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
                <line x1="0" y1="64" x2="318" y2="64" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 4" />
                <defs>
                  <linearGradient id="xpfill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <path d={xpArea} fill="url(#xpfill)" className={anim('animate-[areaIn_.6s_ease_.55s_forwards]')} style={{ opacity: prefersReduced ? 1 : 0 }} />
                <path
                  d={xpPath}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  className={anim('animate-[drawLine_1.15s_cubic-bezier(.4,0,.2,1)_forwards]')}
                  style={{ strokeDasharray: prefersReduced ? 'none' : 1 }}
                />
                <circle cx={xpEnd.x} cy={xpEnd.y} r={3.5} fill="#fff" stroke="var(--primary)" strokeWidth={2} className={anim('animate-[areaIn_.3s_ease_1.15s_forwards]')} style={{ opacity: prefersReduced ? 1 : 0 }} />
              </svg>
            </div>

            {/* Słupki */}
            <div className="rounded-[18px] glass p-4">
              <div className="mb-[14px] text-[14px] font-bold text-foreground">Ukończenia — tydzień po tygodniu</div>
              <div className="flex h-24 items-end gap-[7px]">
                {bars.map((b, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end">
                    <span className="mb-[5px] text-[10px] font-bold tabular-nums text-muted-foreground">{b.pct}%</span>
                    <div
                      className={`w-full max-w-[30px] origin-bottom rounded-t-[6px] ${anim('animate-[barRise_.6s_cubic-bezier(.4,0,.2,1)_both]')}`}
                      style={{
                        height: `${Math.max(3, Math.round((b.pct / 100) * 90))}px`,
                        background: b.strong ? 'linear-gradient(180deg, var(--primary), color-mix(in oklab, var(--primary) 73%, transparent))' : 'color-mix(in oklch, var(--foreground) 6%, transparent)',
                        animationDelay: prefersReduced ? '0ms' : `${i * 70}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-[7px]">
                {bars.map((b, i) => (
                  <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted-foreground">{b.label}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Widok: Siatka (kalendarz) */}
        {isReady && !isPostep && (
          <div className={anim('animate-[fadeUp_.45s_ease_both]')}>
            <div ref={gridRef} className="relative rounded-[18px] glass px-[14px] py-4">
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[14px] font-bold text-foreground">Aktywność dzienna</span>
                <span className="text-[12px] font-bold tabular-nums text-muted-foreground">{new Date(summary.days[summary.days.length - 1].date).getFullYear()}</span>
              </div>

              <div ref={scrollRef} className="-mx-1 max-h-[290px] overflow-y-auto overflow-x-hidden px-1">
                <div className="grid items-center gap-[3px]" style={{ gridTemplateColumns: '16px repeat(12, 1fr)' }}>
                  <div className="sticky top-0 z-[2] h-[22px]" style={{ background: 'transparent' }} />
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="sticky top-0 z-[2] h-[22px] text-center text-[9.5px] font-bold leading-[22px]"
                      style={{
                        background: m.cur ? 'var(--primary-soft)' : 'transparent',
                        color: m.cur ? 'var(--primary)' : 'var(--muted-foreground)',
                        borderRadius: m.cur ? '6px 6px 0 0' : 0,
                      }}
                    >
                      {m.label}
                    </div>
                  ))}
                  {calRows.map((row, ri) => (
                    <RowFragment key={row.day} day={row.day}>
                      {row.cells.map((cell, ci) =>
                        cell.empty ? (
                          <div key={ci} className="aspect-square w-full" />
                        ) : (
                          <div
                            key={ci}
                            {...(cell.today ? { 'data-today': '1' } : {})}
                            onClick={cell.clickable && cell.cd ? (e) => selectDay(cell.cd!, e) : undefined}
                            className={`aspect-square w-full rounded-[3px] ${anim('animate-[cellIn_.35s_ease_both]')}`}
                            style={{
                              background: cell.bg,
                              border: cell.border,
                              cursor: cell.clickable ? 'pointer' : 'default',
                              position: cell.today ? 'relative' : undefined,
                              zIndex: cell.today ? 1 : undefined,
                              boxShadow: cell.today ? '0 0 0 1.5px var(--card), 0 0 0 3px var(--primary)' : undefined,
                              animationDelay: prefersReduced ? '0ms' : `${Math.min(650, ri * 20 + ci * 6)}ms`,
                            }}
                          />
                        )
                      )}
                    </RowFragment>
                  ))}
                </div>
              </div>

              <div className="mt-[14px] flex items-center justify-between">
                <span className="text-[12px] font-semibold text-muted-foreground">
                  Dziś zrobione <span className="font-extrabold text-primary">{todayPct}%</span>
                </span>
                <div className="flex items-center gap-[5px]">
                  <span className="text-[10.5px] font-semibold text-muted-foreground">mniej</span>
                  {LEVEL_COLORS.map((c, l) => (
                    <div
                      key={l}
                      className="h-[11px] w-[11px] rounded-[3px]"
                      style={{ background: c, border: l === 0 ? '1px solid var(--border)' : 'none' }}
                    />
                  ))}
                  <span className="text-[10.5px] font-semibold text-muted-foreground">więcej</span>
                </div>
              </div>

              {/* Dymek */}
              {sel && (
                <>
                  <div onClick={() => setSel(null)} className="fixed inset-0 z-40" />
                  <div
                    className={`absolute z-50 rounded-xl bg-foreground/5 px-[13px] py-[11px] shadow-[0_16px_40px_rgba(0,0,0,.6)] backdrop-blur-xl ${anim('animate-[popIn_.18s_ease_both]')}`}
                    style={{ left: sel.x, top: sel.y + 10, width: sel.w }}
                  >
                    <div
                      className="absolute h-[11px] w-[11px] rotate-45 bg-foreground/5"
                      style={{ top: -6, left: sel.caret - 6 }}
                    />
                    <div className="text-[12.5px] font-bold capitalize text-foreground">{sel.label}</div>
                    <div className="mt-2 flex justify-between gap-[14px]">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Zrobione</div>
                        <div className="text-[15px] font-extrabold tabular-nums text-success">{sel.pctInt}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">XP</div>
                        <div className="text-[15px] font-extrabold tabular-nums text-primary">+{sel.xp}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
}

// --- pomocnicze komponenty ---

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[16px] glass ${className}`}
      style={{
        animation: 'shimmer 1.3s infinite linear',
      }}
    />
  );
}

function Tile({
  children,
  footer,
  label,
  labelColor = 'var(--muted-foreground)',
  delay,
  accentTile = false,
  anim,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  label: string;
  labelColor?: string;
  delay: number;
  accentTile?: boolean;
  anim: (c: string) => string;
}) {
  return (
    <div
      className={`rounded-[16px] px-[15px] py-[14px] ${!accentTile ? 'glass' : ''} ${anim('animate-[fadeUp_.38s_cubic-bezier(.2,.7,.3,1)_both]')} ${
        accentTile ? anim('[animation:fadeUp_.38s_cubic-bezier(.2,.7,.3,1)_both,pulseGlow_2.8s_ease-in-out_1.1s_infinite]') : ''
      }`}
      style={{
        animationDelay: `${delay}s`,
        border: accentTile ? '1px solid color-mix(in oklab, var(--primary) 32%, transparent)' : undefined,
        background: accentTile
          ? 'linear-gradient(160deg, color-mix(in oklab, var(--primary) 16%, transparent), color-mix(in oklab, var(--primary) 4%, transparent))'
          : undefined,
      }}
    >
      <div className="text-[11px] font-bold uppercase tracking-[.06em]" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-[5px]">{children}</div>
      {footer}
    </div>
  );
}

function RowFragment({ day, children }: { day: number; children: React.ReactNode }) {
  return (
    <>
      <div className="pr-px text-right text-[8.5px] font-bold leading-none tabular-nums text-muted-foreground">{day}</div>
      {children}
    </>
  );
}
