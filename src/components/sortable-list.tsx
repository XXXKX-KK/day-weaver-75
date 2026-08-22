import type { ReactNode, CSSProperties } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

type Identifiable = { id: string };

function vibrate() {
  try {
    navigator.vibrate?.(40);
  } catch {}
}

/**
 * Vertical drag-to-reorder list. Long-press to grab (TouchSensor with delay),
 * vibration + accent glow while dragging, release to drop.
 */
export function SortableList<T extends Identifiable>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.id);
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    vibrate();
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(arrayMove(ids, oldIndex, newIndex));
    },
    [ids, onReorder],
  );

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={cn("flex flex-col gap-3", className)}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id} isDragActive={activeId === item.id}>
              {renderItem(item)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  isDragActive,
  children,
}: {
  id: string;
  isDragActive: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    position: "relative",
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none rounded-2xl transition-shadow duration-200",
        isDragActive && "ring-2 ring-primary/50 shadow-[0_0_18px_-4px] shadow-primary/40",
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
