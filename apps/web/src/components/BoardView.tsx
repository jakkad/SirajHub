import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useItems, useUpdateItem } from "../hooks/useItems";
import { ItemCard } from "./ItemCard";
import type { Item } from "../lib/api";
import { STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";

const STATUS_IDS = new Set<string>(STATUSES.map((s) => s.id));

export function BoardView() {
  const { data: items = [], isLoading } = useItems();
  const { mutate: updateItem } = useUpdateItem();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStatus = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const s of STATUSES) map[s.id] = [];
    for (const item of items) {
      if (map[item.status]) map[item.status].push(item);
    }
    // Sort within each column by position then createdAt
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.createdAt - b.createdAt);
    }
    return map;
  }, [items]);

  const activeItem = items.find((i) => i.id === activeId) ?? null;

  function findItemColumn(itemId: string): StatusId | null {
    for (const s of STATUSES) {
      if (byStatus[s.id]?.some((i) => i.id === itemId)) return s.id;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeItemId = active.id as string;
    const overId = over.id as string;

    const sourceColumn = findItemColumn(activeItemId);
    const destColumn: StatusId | null = STATUS_IDS.has(overId)
      ? (overId as StatusId)
      : findItemColumn(overId);

    if (!sourceColumn || !destColumn) return;
    if (sourceColumn === destColumn) return; // no cross-column movement

    updateItem({ id: activeItemId, status: destColumn });
  }

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {STATUSES.map((s) => (
          <div
            key={s.id}
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-border)",
              borderTop: `3px solid ${s.color}`,
              background: "var(--color-surface)",
              height: 200,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        {STATUSES.map((status) => (
          <BoardColumn
            key={status.id}
            statusId={status.id}
            label={status.label}
            color={status.color}
            items={byStatus[status.id] ?? []}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? <ItemCard item={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  statusId,
  label,
  color,
  items,
  activeId,
}: {
  statusId: string;
  label: string;
  color: string;
  items: Item[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusId });

  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${isOver ? color : "var(--color-border)"}`,
        borderTop: `3px solid ${color}`,
        background: isOver
          ? `color-mix(in oklch, ${color} 6%, var(--color-surface))`
          : "var(--color-surface)",
        minHeight: 200,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: "14px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 999,
            background: `color-mix(in oklch, ${color} 18%, transparent)`,
            color,
          }}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} isGhost={item.id === activeId} />
        ))}
        {items.length === 0 && (
          <p
            style={{
              fontSize: 12,
              color: "var(--color-muted)",
              textAlign: "center",
              padding: "24px 8px",
              margin: 0,
            }}
          >
            Drop items here
          </p>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ item, isGhost }: { item: Item; isGhost: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging || isGhost ? 0 : 1,
        touchAction: "none",
        outline: "none",
      }}
    >
      <ItemCard item={item} />
    </div>
  );
}
