import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useCreateList, useDeleteList, useList, useLists, useReorderListItems, useReorderLists, useUpdateList } from "../hooks/useLists";
import { useLabs } from "../hooks/useLabs";
import { CONTENT_TYPES } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/lists")({
  component: ListsPage,
});

function ListsPage() {
  const { labs, isLoading: labsLoading } = useLabs();
  const { data, isLoading } = useLists({ enabled: labs.lists });
  const { mutate: createList, isPending: creatingList } = useCreateList();
  const { mutate: reorderLists, isPending: reorderingLists } = useReorderLists();
  const { mutate: updateList, isPending: savingList } = useUpdateList();
  const { mutate: deleteList, isPending: deletingList } = useDeleteList();
  const { mutate: reorderListItems, isPending: reorderingItems } = useReorderListItems();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", description: "", color: "#94a3b8" });
  const [editForm, setEditForm] = useState({ name: "", description: "", color: "#94a3b8" });

  const lists = data?.lists ?? [];
  const selectedList = useMemo(
    () => lists.find((list) => list.id === selectedListId) ?? null,
    [lists, selectedListId]
  );
  const { data: listDetail, isLoading: isLoadingDetail } = useList(selectedListId, { enabled: labs.lists });

  if (labsLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading lists…</div>;
  }

  if (!labs.lists) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-5xl font-semibold leading-none tracking-[-0.05em]">Lists</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Lists are currently disabled. You can re-enable them from Settings → Labs.
          </p>
        </div>
        <Card>
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Existing list data is preserved and will return if you turn Lists back on.
            </p>
            <Button asChild variant="outline">
              <Link to="/settings">Open Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!lists.length) {
      setSelectedListId(null);
      return;
    }
    setSelectedListId((current) => (current && lists.some((list) => list.id === current) ? current : (lists[0]?.id ?? null)));
  }, [lists]);

  useEffect(() => {
    if (!selectedList) return;
    setEditForm({
      name: selectedList.name,
      description: selectedList.description ?? "",
      color: selectedList.color,
    });
  }, [selectedList]);

  function handleCreateList() {
    const name = createForm.name.trim();
    if (!name) return;
    createList(
      {
        name,
        description: createForm.description.trim() || undefined,
        color: createForm.color,
      },
      {
        onSuccess: (created) => {
          setCreateForm({ name: "", description: "", color: "#94a3b8" });
          setSelectedListId(created.id);
        },
      }
    );
  }

  function handleSaveList() {
    if (!selectedList) return;
    updateList({
      id: selectedList.id,
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      color: editForm.color,
    });
  }

  function handleDeleteList() {
    if (!selectedList) return;
    if (!window.confirm(`Delete list "${selectedList.name}"?`)) return;
    deleteList(selectedList.id, {
      onSuccess: () => setSelectedListId(null),
    });
  }

  function moveList(listId: string, direction: -1 | 1) {
    const index = lists.findIndex((list) => list.id === listId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= lists.length) return;
    const next = [...lists];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    reorderLists(next.map((list) => list.id));
  }

  function moveListItem(itemId: string, direction: -1 | 1) {
    if (!selectedListId || !listDetail?.items.length) return;
    const index = listDetail.items.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= listDetail.items.length) return;
    const next = [...listDetail.items];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    reorderListItems({
      listId: selectedListId,
      orderedItemIds: next.map((item) => item.id),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-5xl font-semibold leading-none tracking-[-0.05em]">Lists</h1>
          <Badge variant="secondary">{lists.length} collections</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Build ordered personal collections like reading lists, research queues, seasonal watchlists, and comfort picks.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Create List</CardTitle>
              <CardDescription>Start a custom collection that stays separate from tags and statuses.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label>Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="2026 Reading List"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Description</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What makes this list distinct?"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Accent Color</Label>
                <Input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="h-11 w-full"
                />
              </div>
              <Button onClick={handleCreateList} disabled={creatingList || !createForm.name.trim()}>
                {creatingList ? "Creating…" : "Create list"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Lists</CardTitle>
              <CardDescription>Pick a list to review its items and update its details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </>
              ) : lists.length > 0 ? (
                lists.map((list) => (
                  <div
                    key={list.id}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      list.id === selectedListId
                        ? "border-[hsl(var(--border))] bg-card shadow-[var(--shadow-subtle)]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] hover:bg-[hsl(var(--secondary)/0.32)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedListId(list.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="size-3 rounded-full" style={{ backgroundColor: list.color }} />
                          <div className="truncate font-semibold text-foreground">{list.name}</div>
                        </div>
                        {list.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{list.description}</p> : null}
                      </button>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{list.itemCount}</Badge>
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            disabled={reorderingLists}
                            onClick={() => moveList(list.id, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            disabled={reorderingLists}
                            onClick={() => moveList(list.id, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[hsl(var(--border))] p-5 text-sm text-muted-foreground">
                  No lists yet. Create your first one to start curating items outside the normal status buckets.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-6 p-6">
            {selectedList ? (
              <>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>List Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="List name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Accent Color</Label>
                      <Input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, color: e.target.value }))}
                        className="h-11 w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="What belongs in this collection?"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button onClick={handleSaveList} disabled={savingList || !editForm.name.trim()}>
                      {savingList ? "Saving…" : "Save changes"}
                    </Button>
                    <Button variant="outline" onClick={handleDeleteList} disabled={deletingList}>
                      {deletingList ? "Deleting…" : "Delete list"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[hsl(var(--border))] pt-5">
                  <Badge variant="outline">{selectedList.itemCount} items</Badge>
                  <Badge variant="secondary">Ordered collection</Badge>
                </div>

                {isLoadingDetail ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Skeleton className="h-52 w-full" />
                    <Skeleton className="h-52 w-full" />
                    <Skeleton className="h-52 w-full" />
                  </div>
                ) : listDetail?.items.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {listDetail.items.map((item) => {
                      const contentType = CONTENT_TYPES.find((type) => type.id === item.contentType);
                      return (
                        <div
                          key={item.id}
                          className="group rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] p-4 transition hover:-translate-y-0.5 hover:bg-card"
                        >
                          <Link to="/item/$id" params={{ id: item.id }} className="block">
                            <div className="cover-frame flex h-36 items-center justify-center overflow-hidden rounded-[20px]">
                              {item.coverUrl ? (
                                <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-4xl">{contentType?.icon ?? "📄"}</span>
                              )}
                            </div>

                            <div className="mt-4 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary">
                                  {item.title}
                                </div>
                                {item.creator ? <div className="mt-1 text-sm text-muted-foreground">{item.creator}</div> : null}
                              </div>
                              <Badge variant="outline">#{item.listPosition + 1}</Badge>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
                              <Badge variant="secondary">{item.status.replace("_", " ")}</Badge>
                            </div>
                          </Link>

                          <div className="mt-4 flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9"
                              disabled={reorderingItems}
                              onClick={() => moveListItem(item.id, -1)}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="size-9"
                              disabled={reorderingItems}
                              onClick={() => moveListItem(item.id, 1)}
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[hsl(var(--border))] p-6 text-sm text-muted-foreground">
                    This list is empty for now. Open any item and add it to this collection from the new Lists section.
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.18)] p-8 text-center text-muted-foreground">
                Create a list or select one from the left to start curating a custom collection.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
