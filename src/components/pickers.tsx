import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayLocalISO } from "@/lib/day";

const PL_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const PL_DAYS_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

const pad = (n: number) => String(n).padStart(2, "0");
const wrapH = (h: number) => ((h % 24) + 24) % 24;
const wrapM = (m: number) => ((m % 60) + 60) % 60;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const ITEM_H = 56;
const VISIBLE_COUNT = 5;
const CONTAINER_H = ITEM_H * VISIBLE_COUNT;
const PAD_SLOTS = Math.floor(VISIBLE_COUNT / 2);

function generateCalendar(year: number, month: number) {
  let startDay = new Date(year, month, 1).getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean; iso: string }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, current: false, iso: `${y}-${pad(m + 1)}-${pad(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, iso: `${year}-${pad(month + 1)}-${pad(d)}` });
  }
  const fill = 42 - cells.length;
  for (let d = 1; d <= fill; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, current: false, iso: `${y}-${pad(m + 1)}-${pad(d)}` });
  }
  return cells;
}

export function CalendarPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  const parts = value.split("-").map(Number);
  const [viewYear, setViewYear] = useState(parts[0] ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState((parts[1] ?? new Date().getMonth() + 1) - 1);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const touchStartX = useRef(0);

  const logical = todayLocalISO();
  const cells = generateCalendar(viewYear, viewMonth);

  const prev = useCallback(() => {
    setSlideDir("left");
    setSlideKey((k) => k + 1);
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const next = useCallback(() => {
    setSlideDir("right");
    setSlideKey((k) => k + 1);
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0]!.clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx > 0) prev();
        else next();
      }
    },
    [prev, next],
  );

  return (
    <div className="overlay-bg fixed inset-0 z-[60] sheet-slide-up">
      <div className="safe-bottom relative z-10 flex h-full flex-col px-5 pt-5">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[22px] font-extrabold tracking-tight">Wybierz datę</h2>
        </div>

        <div className="mb-5 flex items-center justify-between px-2">
          <button onClick={prev} className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-[17px] font-bold">
            {PL_MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
            <ChevronRight className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7">
          {PL_DAYS_SHORT.map((d, i) => (
            <div
              key={d}
              className={cn(
                "py-1.5 text-center text-xs font-semibold",
                i === 6 ? "text-destructive/60" : "text-muted-foreground",
              )}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          className="overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            key={slideKey}
            className={cn(
              "grid grid-cols-7 gap-[3px]",
              slideDir === "left" && "cal-slide-left",
              slideDir === "right" && "cal-slide-right",
            )}
          >
            {cells.map((c, i) => {
              const sel = c.iso === value;
              const today = c.iso === logical;
              const isSunday = i % 7 === 6;
              return (
                <button
                  key={i}
                  onClick={() => { onChange(c.iso); onClose(); }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full text-sm transition-transform duration-150 active:scale-[0.82] active:opacity-70",
                    !c.current && "text-muted-foreground/30",
                    c.current && !sel && (isSunday ? "text-destructive/70" : "text-foreground"),
                    today && !sel && "ring-2 ring-primary/30 font-bold",
                    sel && "accent-gradient font-bold text-primary-foreground",
                  )}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DrumColumn({
  items,
  value,
  onChange,
}: {
  items: number[];
  value: number;
  onChange: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;
  const allItems = useMemo(() => [...items, ...items, ...items], [items]);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const isUserScroll = useRef(false);

  const valueIndex = items.indexOf(value);
  const initIdx = count + (valueIndex >= 0 ? valueIndex : 0);
  const [centerIdx, setCenterIdx] = useState(initIdx);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = initIdx * ITEM_H;
    setCenterIdx(initIdx);
    requestAnimationFrame(() => { isUserScroll.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = ref.current;
    if (!el || !isUserScroll.current) return;
    const currentVal = allItems[centerIdx];
    if (currentVal === value) return;
    const vi = items.indexOf(value);
    if (vi < 0) return;
    const targetIdx = count + vi;
    isUserScroll.current = false;
    el.scrollTo({ top: targetIdx * ITEM_H, behavior: "smooth" });
    setTimeout(() => { isUserScroll.current = true; }, 350);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const idx = Math.round(el.scrollTop / ITEM_H);
    setCenterIdx(idx);

    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const snappedIdx = Math.round(el.scrollTop / ITEM_H);
      const val = allItems[snappedIdx];

      if (val !== undefined && isUserScroll.current) {
        onChange(val);
      }

      const copyNum = Math.floor(snappedIdx / count);
      if (copyNum !== 1) {
        const posInCopy = ((snappedIdx % count) + count) % count;
        const middleIdx = count + posInCopy;
        isUserScroll.current = false;
        el.style.scrollBehavior = "auto";
        el.scrollTop = middleIdx * ITEM_H;
        el.style.scrollBehavior = "";
        setCenterIdx(middleIdx);
        requestAnimationFrame(() => { isUserScroll.current = true; });
      }
    }, 150);
  }, [allItems, count, onChange]);

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="scrollbar-hide w-[6.5rem]"
      style={{
        height: CONTAINER_H,
        overflowY: "auto",
        scrollSnapType: "y mandatory",
        scrollBehavior: "smooth",
        overscrollBehavior: "contain",
      }}
    >
      <div style={{ height: PAD_SLOTS * ITEM_H }} />
      {allItems.map((item, i) => {
        const dist = Math.abs(i - centerIdx);
        const isCenter = dist === 0;
        const opacity = dist === 0 ? 1 : dist === 1 ? 0.5 : dist === 2 ? 0.25 : 0.12;

        return (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center select-none",
              isCenter ? "text-primary" : "text-foreground",
            )}
            style={{
              height: ITEM_H,
              scrollSnapAlign: "center",
              scrollSnapStop: "always",
              opacity,
              fontSize: isCenter ? 48 : 32,
              fontWeight: isCenter ? 800 : 500,
            }}
          >
            {pad(item)}
          </div>
        );
      })}
      <div style={{ height: PAD_SLOTS * ITEM_H }} />
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (time: string) => void;
  onClose: () => void;
}) {
  const parts = value ? value.split(":").map(Number) : [12, 0];
  const [hour, setHour] = useState(parts[0] ?? 12);
  const [minute, setMinute] = useState(() => {
    const raw = parts[1] ?? 0;
    const snapped = Math.round(raw / 5) * 5;
    return wrapM(snapped);
  });

  const confirm = () => {
    onChange(`${pad(hour)}:${pad(minute)}`);
    onClose();
  };

  const clear = () => {
    onChange("");
    onClose();
  };

  return (
    <div className="overlay-bg fixed inset-0 z-[60] sheet-slide-up">
      <div
        className="safe-bottom relative z-10 flex h-full flex-col px-5 pt-5"
        style={{ overscrollBehavior: "none" }}
      >
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-[22px] font-extrabold tracking-tight">Wybierz godzinę</h2>
        </div>

        <div className="flex flex-1 items-center justify-center gap-0">
          <DrumColumn items={HOURS} value={hour} onChange={setHour} />
          <div className="-mt-2 select-none text-[60px] font-extrabold text-primary px-1">:</div>
          <DrumColumn items={MINUTES} value={minute} onChange={setMinute} />
        </div>

        <div className="flex gap-3 pb-6">
          <button
            onClick={clear}
            className="h-14 flex-1 rounded-[28px] bg-foreground/5 text-[15px] font-bold text-muted-foreground"
          >
            Wyczyść
          </button>
          <button
            onClick={confirm}
            className="accent-gradient h-14 flex-1 rounded-[28px] text-[15px] font-bold text-primary-foreground"
          >
            Wybierz
          </button>
        </div>
      </div>
    </div>
  );
}
