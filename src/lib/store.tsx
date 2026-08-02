import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type DayBlock = "morning" | "forenoon" | "afternoon" | "evening";
export type Priority = "low" | "normal" | "high";
export type ItemStatus = "pending" | "done" | "skipped";

export const BLOCK_LABELS: Record<DayBlock, string> = {
  morning: "Poranek",
  forenoon: "Przedpołudnie",
  afternoon: "Popołudnie",
  evening: "Wieczór",
};

export const BLOCK_ORDER: DayBlock[] = ["morning", "forenoon", "afternoon", "evening"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
};

export type Subtask = { id: string; title: string; isDone: boolean };

export type DayItem = {
  id: string;
  sourceType: "routine" | "task";
  title: string;
  description?: string;
  block: DayBlock;
  priority: Priority;
  estimatedMinutes: number;
  status: ItemStatus;
  subtasks: Subtask[];
};

export type Routine = {
  id: string;
  title: string;
  block: DayBlock;
  estimatedMinutes: number;
  isActive: boolean;
  subtasks: string[];
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  block: DayBlock;
  priority: Priority;
  estimatedMinutes: number;
  isDone: boolean;
  subtasks: string[];
};

export type BlockedApp = { id: string; name: string; pkg: string; isEnabled: boolean };

const uid = () => Math.random().toString(36).slice(2, 10);

const initialRoutines: Routine[] = [
  { id: "r1", title: "Umyj zęby", block: "morning", estimatedMinutes: 3, isActive: true, subtasks: [] },
  {
    id: "r2",
    title: "Zjedz śniadanie",
    block: "morning",
    estimatedMinutes: 20,
    isActive: true,
    subtasks: [],
  },
  {
    id: "r3",
    title: "Weź suplementy",
    block: "morning",
    estimatedMinutes: 2,
    isActive: true,
    subtasks: ["Witamina D", "Omega 3", "Magnez"],
  },
  {
    id: "r4",
    title: "Trening",
    block: "afternoon",
    estimatedMinutes: 60,
    isActive: true,
    subtasks: ["Rozgrzewka", "Część główna", "Rozciąganie"],
  },
  {
    id: "r5",
    title: "Podsumuj dzień",
    block: "evening",
    estimatedMinutes: 5,
    isActive: true,
    subtasks: [],
  },
];

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Dokończ aplikację",
    description: "Ostatnie poprawki przed wydaniem wersji testowej.",
    block: "forenoon",
    priority: "high",
    estimatedMinutes: 120,
    isDone: false,
    subtasks: ["Popraw logo", "Dokończ ekran logowania", "Napraw eksport PDF"],
  },
  {
    id: "t2",
    title: "Odpowiedz na maile",
    block: "forenoon",
    priority: "normal",
    estimatedMinutes: 20,
    isDone: false,
    subtasks: [],
  },
  {
    id: "t3",
    title: "Zamów części do roweru",
    block: "afternoon",
    priority: "low",
    estimatedMinutes: 15,
    isDone: false,
    subtasks: [],
  },
];

const initialApps: BlockedApp[] = [
  { id: "a1", name: "Instagram", pkg: "com.instagram.android", isEnabled: true },
  { id: "a2", name: "Facebook", pkg: "com.facebook.katana", isEnabled: true },
  { id: "a3", name: "TikTok", pkg: "com.zhiliaoapp.musically", isEnabled: true },
  { id: "a4", name: "YouTube", pkg: "com.google.android.youtube", isEnabled: false },
  { id: "a5", name: "X", pkg: "com.twitter.android", isEnabled: false },
  { id: "a6", name: "Reddit", pkg: "com.reddit.frontpage", isEnabled: false },
];

type DayStatus = "planned" | "in_progress" | "completed";

type Store = {
  dayStatus: DayStatus;
  items: DayItem[];
  routines: Routine[];
  tasks: Task[];
  apps: BlockedApp[];
  blockingEnabled: boolean;
  breaksUsed: number;
  startDay: () => void;
  completeDay: () => void;
  resetDay: () => void;
  setItemStatus: (id: string, status: ItemStatus) => void;
  toggleSubtask: (itemId: string, subtaskId: string) => void;
  postponeItem: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "isDone">, addToToday: boolean) => void;
  toggleRoutine: (id: string) => void;
  toggleApp: (id: string) => void;
  setBlockingEnabled: (v: boolean) => void;
  useBreak: () => void;
};

const StoreContext = createContext<Store | null>(null);

function buildDay(routines: Routine[], tasks: Task[]): DayItem[] {
  const items: DayItem[] = [];
  for (const block of BLOCK_ORDER) {
    routines
      .filter((r) => r.isActive && r.block === block)
      .forEach((r) =>
        items.push({
          id: uid(),
          sourceType: "routine",
          title: r.title,
          block,
          priority: "normal",
          estimatedMinutes: r.estimatedMinutes,
          status: "pending",
          subtasks: r.subtasks.map((s) => ({ id: uid(), title: s, isDone: false })),
        }),
      );
    const weight: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
    tasks
      .filter((t) => !t.isDone && t.block === block)
      .sort((a, b) => weight[a.priority] - weight[b.priority] || a.estimatedMinutes - b.estimatedMinutes)
      .forEach((t) =>
        items.push({
          id: uid(),
          sourceType: "task",
          title: t.title,
          description: t.description,
          block,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          status: "pending",
          subtasks: t.subtasks.map((s) => ({ id: uid(), title: s, isDone: false })),
        }),
      );
  }
  return items;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [dayStatus, setDayStatus] = useState<DayStatus>("planned");
  const [items, setItems] = useState<DayItem[]>([]);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [apps, setApps] = useState<BlockedApp[]>(initialApps);
  const [blockingEnabled, setBlockingEnabled] = useState(true);
  const [breaksUsed, setBreaksUsed] = useState(0);

  const value = useMemo<Store>(
    () => ({
      dayStatus,
      items,
      routines,
      tasks,
      apps,
      blockingEnabled,
      breaksUsed,
      startDay: () => {
        setItems(buildDay(routines, tasks));
        setDayStatus("in_progress");
      },
      completeDay: () => setDayStatus("completed"),
      resetDay: () => {
        setItems([]);
        setDayStatus("planned");
        setBreaksUsed(0);
      },
      setItemStatus: (id, status) =>
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i))),
      toggleSubtask: (itemId, subtaskId) =>
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  subtasks: i.subtasks.map((s) =>
                    s.id === subtaskId ? { ...s, isDone: !s.isDone } : s,
                  ),
                }
              : i,
          ),
        ),
      postponeItem: (id) =>
        setItems((prev) => {
          const item = prev.find((i) => i.id === id);
          if (!item) return prev;
          const rest = prev.filter((i) => i.id !== id);
          const lastOfBlock = rest.map((i) => i.block).lastIndexOf(item.block);
          const at = lastOfBlock === -1 ? rest.length : lastOfBlock + 1;
          return [...rest.slice(0, at), item, ...rest.slice(at)];
        }),
      addTask: (task, addToToday) => {
        const created: Task = { ...task, id: uid(), isDone: false };
        setTasks((prev) => [created, ...prev]);
        if (addToToday && dayStatus === "in_progress") {
          setItems((prev) => [
            ...prev,
            {
              id: uid(),
              sourceType: "task",
              title: created.title,
              description: created.description,
              block: created.block,
              priority: created.priority,
              estimatedMinutes: created.estimatedMinutes,
              status: "pending",
              subtasks: created.subtasks.map((s) => ({ id: uid(), title: s, isDone: false })),
            },
          ]);
        }
      },
      toggleRoutine: (id) =>
        setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))),
      toggleApp: (id) =>
        setApps((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))),
      setBlockingEnabled,
      useBreak: () => setBreaksUsed((n) => n + 1),
    }),
    [dayStatus, items, routines, tasks, apps, blockingEnabled, breaksUsed],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore musi być użyty wewnątrz StoreProvider");
  return ctx;
}

export function useDayProgress() {
  const { items } = useStore();
  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
