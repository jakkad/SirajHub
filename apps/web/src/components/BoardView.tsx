import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateItem } from "../hooks/useItems";
import { itemsApi } from "../lib/api";
import { ItemCard } from "./ItemCard";
import type { Item } from "../lib/api";
import type { Tag } from "../hooks/useTags";
import { STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";

const STATUS_IDS = new Set<string>(STATUSES.map((s) => s.id));

interface Props {
  filteredItems: Item[];
  allTags: Tag[];
  onItemClick: (item: Item) => void;
}

export function BoardView({ filteredItems, allTags, onItemClick }: Props) {
  const { mutate: updateItem } = useUpdateItem();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byStatus = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const s of STATUSES) map[s.id] = [];
    for (const item of filteredItems) {
      const col = map[item.status];
      if (col) col.push(item);
    }
    for (const key of Object.keys(map)) {
      map[key]?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.createdAt - b.createdAt);
    }
    return map;
  }, [filteredItems]);

  const activeItem = filteredItems.find((i) => i.id === activeId) ?? null;

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

    if (sourceColumn !== destColumn) {
      // Cross-column: update status (timestamps auto-set by worker)
      updateItem({ id: activeItemId, status: destColumn });
      return;
    }

    // Within-column reorder
    const columnItems = byStatus[sourceColumn];
    if (!columnItems) return;

    const oldIndex = columnItems.findIndex((i) => i.id === activeItemId);
    const newIndex = columnItems.findIndex((i) => i.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const reordered = arrayMove(columnItems, oldIndex, newIndex);

    // Normalise all items in the column to index * 1000; only PATCH changed ones
    const updates = reordered
      .map((item, i) => ({ id: item.id, newPos: i * 1000, oldPos: item.position ?? 0 }))
      .filter(({ newPos, oldPos }) => newPos !== oldPos);

    if (updates.length === 0) return;

    Promise.all(updates.map(({ id, newPos }) => itemsApi.update(id, { position: newPos }))).then(
      () => qc.invalidateQueries({ queryKey: ["items"] })
    );
  }

  if (filteredItems.length === 0 && allTags.length === 0) {
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
              minHeight: 200,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(200px, 1fr))",
          gap: 16,
          alignItems: "start",
          overflowX: "auto",
          paddingBottom: 8,
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
            allTags={allTags}
            onItemClick={onItemClick}
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
  allTags,
  onItemClick,
}: {
  statusId: string;
  label: string;
  color: string;
  items: Item[];
  activeId: string | null;
  allTags: Tag[];
  onItemClick: (item: Item) => void;
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

      {/* Cards — wrapped in SortableContext for within-column reordering */}
      <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableCard
              key={item.id}
              item={item}
              isGhost={item.id === activeId}
              allTags={allTags}
              onItemClick={onItemClick}
            />
          ))}
        </SortableContext>
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

function SortableCard({
  item,
  isGhost,
  allTags,
  onItemClick,
}: {
  item: Item;
  isGhost: boolean;
  allTags: Tag[];
  onItemClick: (item: Item) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging || isGhost ? 0 : 1,
        touchAction: "none",
        outline: "none",
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition,
      }}
    >
      <ItemCard
        item={item}
        allTags={allTags}
        onTitleClick={() => onItemClick(item)}
      />
    </div>
  );
}
