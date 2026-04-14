import type { Item } from "../lib/api";
import type { Tag } from "../hooks/useTags";
import { ItemCard } from "./ItemCard";

interface Props {
  items: Item[];
  allTags: Tag[];
  onItemClick: (item: Item) => void;
}

export function GridView({ items, allTags, onItemClick }: Props) {
  if (items.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 24px",
          color: "var(--color-muted)",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 32 }}>📭</span>
        <p style={{ margin: 0, fontSize: 14 }}>No items match the current filter.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        columnCount: 4,
        columnGap: 14,
        columnFill: "balance",
      }}
      className="grid-view"
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            breakInside: "avoid",
            marginBottom: 14,
          }}
        >
          <ItemCard item={item} allTags={allTags} onTitleClick={() => onItemClick(item)} />
        </div>
      ))}
    </div>
  );
}
