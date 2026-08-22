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
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef } from "react";

type Identifiable = { id: string };

function vibrate() {
  try {
    navigator.vibrate?.(40);
  } catch {}
}

export function SortableList<T extends Identifiable>({
  items,
  onReorder,
  onLongPress,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  onLongPress?: (id: string) => void;
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const movedRef = useRef(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setHasMoved(false);
    movedRef.current = false;
    vibrate();
  }, []);

  const handleDragMove = useCallback((_event: DragMoveEvent) => {
    if (!movedRef.current) {
      movedRef.current = true;
      setHasMoved(true);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = activeId;
      setActiveId(null);
      setHasMoved(false);

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
    [ids, onReorder, activeId, onLongPress],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setHasMoved(false);
  }, []);

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
              showTrash={activeId === item.id && !hasMoved && !!onLongPress}
            >
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
  showTrash,
  children,
}: {
  id: string;
  isDragActive: boolean;
  showTrash: boolean;
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
      {showTrash ? (
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-destructive/15 p-2 animate-in fade-in zoom-in-75 duration-200">
          <Trash2 className="h-5 w-5 text-destructive" />
        </div>
      ) : null}
    </div>
  );
}
