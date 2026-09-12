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
  type DragMoveEvent,
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
import { useState, useCallback, useRef } from "react";

type Identifiable = { id: string };

function vibrate() {
  try {
    navigator.vibrate?.(50);
  } catch {}
}

export function SortableList<T extends Identifiable>({
  items,
  onReorder,
  onLongPress,
  selectedIds,
  onTapInSelectMode,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  onLongPress?: (id: string) => void;
  selectedIds?: ReadonlySet<string>;
  onTapInSelectMode?: (id: string) => void;
  renderItem: (item: T, selected: boolean, isDragActive: boolean) => ReactNode;
  className?: string;
}) {
  const inSelectMode = selectedIds != null && selectedIds.size > 0;
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const movedRef = useRef(false);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (inSelectMode) return;
      setActiveId(String(event.active.id));
      movedRef.current = false;
      vibrate();
    },
    [inSelectMode],
  );

  const handleDragMove = useCallback(
    (_event: DragMoveEvent) => {
      if (!movedRef.current) movedRef.current = true;
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = activeId;
      setActiveId(null);

      if (inSelectMode) {
        if (draggedId && onTapInSelectMode) onTapInSelectMode(draggedId);
        return;
      }

      if (!movedRef.current && draggedId && onLongPress) {
        onLongPress(draggedId);
        return;
      }

      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(arrayMove(ids, oldIndex, newIndex));
    },
    [ids, onReorder, activeId, onLongPress, inSelectMode, onTapInSelectMode],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleTap = useCallback(
    (id: string) => {
      if (inSelectMode && onTapInSelectMode) {
        onTapInSelectMode(id);
      }
    },
    [inSelectMode, onTapInSelectMode],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={cn("flex flex-col gap-3", className)}>
          {items.map((item) => (
            <SortableRow
              key={item.id}
              id={item.id}
              isDragActive={activeId === item.id}
              selected={selectedIds?.has(item.id) ?? false}
              inSelectMode={inSelectMode}
              onTap={() => handleTap(item.id)}
            >
              {renderItem(item, selectedIds?.has(item.id) ?? false, activeId === item.id)}
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
  selected,
  inSelectMode,
  onTap,
  children,
}: {
  id: string;
  isDragActive: boolean;
  selected: boolean;
  inSelectMode: boolean;
  onTap: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: inSelectMode,
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
      className={isDragActive && !inSelectMode ? "touch-none" : undefined}
      onClick={inSelectMode ? onTap : undefined}
      {...(inSelectMode ? {} : { ...attributes, ...listeners })}
    >
      <div
        className={cn(
          "rounded-3xl transition-shadow duration-200",
          isDragActive && !inSelectMode && "ring-2 ring-primary/50 shadow-[0_0_18px_-4px] shadow-primary/40 animate-[wiggle_.3s_ease-in-out_infinite]",
          selected && "ring-2 ring-destructive/60",
        )}
      >
        {children}
      </div>
    </div>
  );
}
