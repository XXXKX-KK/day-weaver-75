import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayLocalISO } from "@/lib/day";

const PL_MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
const PL_DAYS_SHORT = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

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
    cells.push({ day: d, current: false, iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
  }
  const fill = 42 - cells.length;
  for (let d = 1; d <= fill; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: d, current: false, iso: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` });
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
        className="safe-bottom w-full rounded-t-3xl bg-background px-5 pt-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <button onClick={prev} className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-base font-bold">
            {PL_MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={next} className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7">
          {PL_DAYS_SHORT.map((d) => (
            <div key={d} className="py-1 text-center text-[11px] font-semibold text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            const sel = c.iso === value;
            const today = c.iso === logical;
            return (
              <button
                key={i}
                onClick={() => { onChange(c.iso); onClose(); }}
                className={cn(
                  "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                  !c.current && "text-foreground/20",
                  c.current && !sel && "text-foreground",
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

const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

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
    const nearest = MINUTES.reduce((prev, m) => (Math.abs(m - raw) < Math.abs(prev - raw) ? m : prev));
    return nearest;
  });

  const confirm = () => {
    onChange(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    onClose();
  };

  const clear = () => {
    onChange("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="safe-bottom w-full rounded-t-3xl bg-background px-5 pt-5 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 text-center text-base font-bold">Wybierz godzinę</div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1">
            <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">Godzina</div>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setHour(i)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                    hour === i
                      ? "accent-gradient font-bold text-primary-foreground"
                      : "bg-foreground/5 text-foreground",
                  )}
                >
                  {String(i).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px shrink-0 bg-border" />

          <div className="min-w-[5.5rem]">
            <div className="mb-2 text-center text-xs font-semibold text-muted-foreground">Minuta</div>
            <div className="grid grid-cols-2 gap-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinute(m)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                    minute === m
                      ? "accent-gradient font-bold text-primary-foreground"
                      : "bg-foreground/5 text-foreground",
                  )}
                >
                  {String(m).padStart(2, "0")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={clear}
            className="h-13 flex-1 rounded-2xl bg-foreground/5 text-sm font-bold text-muted-foreground"
          >
            Wyczyść
          </button>
          <button
            onClick={confirm}
            className="accent-gradient h-13 flex-1 rounded-2xl text-sm font-bold text-primary-foreground"
          >
            Gotowe
          </button>
        </div>
      </div>
    </div>
  );
}
