import { useState, useRef, useCallback, useEffect } from "react";
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

  const logical = todayLocalISO();
  const cells = generateCalendar(viewYear, viewMonth);

  const prev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="safe-bottom w-full rounded-t-3xl border border-foreground/[0.06] bg-foreground/5 px-5 pt-5 pb-6 backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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

        <div className="grid grid-cols-7 gap-[3px]">
          {cells.map((c, i) => {
            const sel = c.iso === value;
            const today = c.iso === logical;
            const isSunday = i % 7 === 6;
            return (
              <button
                key={i}
                onClick={() => { onChange(c.iso); onClose(); }}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full text-sm transition-colors",
                  !c.current && "text-muted-foreground/30",
                  c.current && !sel && (isSunday ? "text-destructive/70" : "text-foreground"),
                  today && !sel && "bg-foreground/8 font-bold",
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
  );
}

function DrumColumn({
  value,
  wrap,
  step,
  onChange,
}: {
  value: number;
  wrap: (n: number) => number;
  step: number;
  onChange: (n: number) => void;
}) {
  const touchY = useRef<number | null>(null);
  const [dir, setDir] = useState<"up" | "down" | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!animating) return;
    const id = setTimeout(() => {
      setAnimating(false);
      setDir(null);
    }, 180);
    return () => clearTimeout(id);
  }, [animating]);

  const go = useCallback(
    (direction: "up" | "down") => {
      setDir(direction);
      setAnimating(true);
      onChange(wrap(direction === "up" ? value + step : value - step));
    },
    [value, step, wrap, onChange],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchY.current = e.touches[0]!.clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (touchY.current === null) return;
      const delta = touchY.current - e.changedTouches[0]!.clientY;
      touchY.current = null;
      if (Math.abs(delta) > 20) {
        go(delta > 0 ? "up" : "down");
      }
    },
    [go],
  );

  const slideClass = animating
    ? dir === "up"
      ? "drum-slide-up"
      : "drum-slide-down"
    : "";

  return (
    <div
      className="flex w-[6.5rem] flex-col items-center gap-3"
      style={{ touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={() => go("down")}
        className="text-[34px] font-medium text-muted-foreground/40 transition-colors active:text-muted-foreground/70"
      >
        {pad(wrap(value - step))}
      </button>
      <div className={cn("overflow-hidden rounded-2xl bg-foreground/5 px-5 py-1")}>
        <div className={cn("text-[60px] font-extrabold leading-tight", slideClass)}>
          {pad(value)}
        </div>
      </div>
      <button
        onClick={() => go("up")}
        className="text-[34px] font-medium text-muted-foreground/40 transition-colors active:text-muted-foreground/70"
      >
        {pad(wrap(value + step))}
      </button>
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
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="safe-bottom w-full rounded-t-3xl border border-foreground/[0.06] bg-foreground/5 px-5 pt-5 pb-6 backdrop-blur-2xl"
        style={{ overscrollBehavior: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-center text-[22px] font-extrabold tracking-tight">
          Wybierz godzinę
        </div>

        <div className="flex items-center justify-center gap-0 py-10">
          <DrumColumn value={hour} wrap={wrapH} step={1} onChange={setHour} />
          <div className="-mt-2 select-none text-[60px] font-extrabold px-1">:</div>
          <DrumColumn value={minute} wrap={wrapM} step={5} onChange={setMinute} />
        </div>

        <div className="flex gap-3">
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
