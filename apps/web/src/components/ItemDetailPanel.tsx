import { useEffect, useState } from "react";
import { useScoreItem } from "../hooks/useAI";
import { useCreateNoteEntry, useDeleteNoteEntry, useNoteEntries } from "../hooks/useNotes";
import type { Item } from "../lib/api";
import { CONTENT_TYPES, STATUSES } from "../lib/constants";
import type { StatusId } from "../lib/constants";
import { AIPanel } from "./AIPanel";
import { InlineTagManager } from "./InlineTagManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateItem } from "@/hooks/useItems";

interface Props {
  item: Item | null;
  onClose: () => void;
}

export function ItemDetailPanel({ item, onClose }: Props) {
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [entryComposerOpen, setEntryComposerOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<{
    entryType: "highlight" | "quote" | "takeaway" | "reflection";
    content: string;
    context: string;
  }>({
    entryType: "highlight",
    content: "",
    context: "",
  });

  const { mutate: updateItem } = useUpdateItem();
  const { mutate: queueScore, isPending: queueingScore } = useScoreItem(item?.id);
  const { data: noteEntriesData } = useNoteEntries(item?.id ?? null);
  const { mutate: createNoteEntry, isPending: creatingNoteEntry } = useCreateNoteEntry(item?.id ?? "");
  const { mutate: deleteNoteEntry, isPending: deletingNoteEntry } = useDeleteNoteEntry(item?.id ?? "");

  useEffect(() => {
    setNotes(item?.notes ?? "");
    setNoteEditorOpen(false);
    setEntryComposerOpen(false);
    setEntryForm({
      entryType: "highlight",
      content: "",
      context: "",
    });
  }, [item?.id]);

  if (!item) return null;

  const currentItem = item;
  const contentType = CONTENT_TYPES.find((type) => type.id === currentItem.contentType);
  const noteEntries = noteEntriesData?.entries ?? [];

  function saveNotes() {
    if (notes !== (currentItem.notes ?? "")) {
      updateItem(
        { id: currentItem.id, notes: notes || null },
        {
          onSuccess: () => {
            setNoteEditorOpen(false);
          },
        }
      );
    } else {
      setNoteEditorOpen(false);
    }
  }

  function handleCreateEntry() {
    const content = entryForm.content.trim();
    if (!content) return;
    createNoteEntry(
      {
        entryType: entryForm.entryType,
        content,
        context: entryForm.context.trim() || undefined,
      },
      {
        onSuccess: () => {
          setEntryForm({
            entryType: "highlight",
            content: "",
            context: "",
          });
          setEntryComposerOpen(false);
        },
      }
    );
  }

  return (
    <Sheet open={!!item} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full max-w-2xl overflow-y-auto border-l border-[hsl(var(--border))] bg-card px-0"
      >
        <SheetHeader className="border-b border-[hsl(var(--border))] px-6 py-5">
          <SheetTitle className="text-[2rem]">{currentItem.title}</SheetTitle>
          {currentItem.creator ? <p className="text-sm text-muted-foreground">{currentItem.creator}</p> : null}
        </SheetHeader>

        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex gap-4">
            <div className="cover-frame flex h-40 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[24px]">
              {currentItem.coverUrl ? (
                <img src={currentItem.coverUrl} alt={currentItem.title} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl">{contentType?.icon ?? "📄"}</span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {contentType ? <Badge variant="outline">{contentType.label}</Badge> : null}
                {currentItem.releaseDate ? <Badge variant="secondary">{currentItem.releaseDate.slice(0, 4)}</Badge> : null}
                {currentItem.suggestMetricFinal != null ? (
                  <Badge variant="outline">Score {currentItem.suggestMetricFinal}</Badge>
                ) : null}
              </div>
              {currentItem.description ? (
                <p className="text-sm leading-6 text-muted-foreground">{currentItem.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description saved yet.</p>
              )}
              {currentItem.sourceUrl ? (
                <a
                  href={currentItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open original source
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                <SectionLabel>Status</SectionLabel>
                <Select
                  value={currentItem.status}
                  onValueChange={(value) =>
                    updateItem({ id: currentItem.id, status: value as StatusId })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUSES.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                <SectionLabel>Rating</SectionLabel>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant={(currentItem.rating ?? 0) >= n ? "secondary" : "outline"}
                      onClick={() =>
                        updateItem({
                          id: currentItem.id,
                          rating: currentItem.rating === n ? null : n,
                        })
                      }
                    >
                      {n}★
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="notebook">Notebook</TabsTrigger>
              <TabsTrigger value="scoring">Scoring</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <PanelSection title="AI Insights">
                <AIPanel item={currentItem} />
              </PanelSection>

              <PanelSection title="Tags">
                <InlineTagManager itemId={currentItem.id} />
              </PanelSection>
            </TabsContent>

            <TabsContent value="notebook" className="space-y-4">
              <PanelSection title="Private Notes">
                {noteEditorOpen ? (
                  <div className="space-y-3">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Private notes…"
                      className="min-h-[140px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setNoteEditorOpen(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveNotes}>
                        Save note
                      </Button>
                    </div>
                  </div>
                ) : currentItem.notes ? (
                  <div className="space-y-3">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{currentItem.notes}</p>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setNoteEditorOpen(true)}>
                        Edit Note
                      </Button>
                    </div>
                  </div>
                ) : (
                  <CompactEmptyState
                    title="No private note yet"
                    body="Add one when you need personal context for this item."
                    actionLabel="Add Note"
                    onAction={() => setNoteEditorOpen(true)}
                  />
                )}
              </PanelSection>

              <PanelSection title="Highlights & Quotes">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary">{noteEntries.length} entries</Badge>
                  <Button
                    size="sm"
                    variant={entryComposerOpen ? "secondary" : "outline"}
                    onClick={() => setEntryComposerOpen((prev) => !prev)}
                  >
                    {entryComposerOpen ? "Close composer" : "Add Entry"}
                  </Button>
                </div>

                {entryComposerOpen ? (
                  <div className="grid gap-3 rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
                    <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                      <Field label="Entry type">
                        <Select
                          value={entryForm.entryType}
                          onValueChange={(value) =>
                            setEntryForm((prev) => ({
                              ...prev,
                              entryType: value as "highlight" | "quote" | "takeaway" | "reflection",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="highlight">Highlight</SelectItem>
                              <SelectItem value="quote">Quote</SelectItem>
                              <SelectItem value="takeaway">Takeaway</SelectItem>
                              <SelectItem value="reflection">Reflection</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Context">
                        <Input
                          value={entryForm.context}
                          onChange={(e) => setEntryForm((prev) => ({ ...prev, context: e.target.value }))}
                          placeholder="Chapter, timestamp, page, or scene"
                        />
                      </Field>
                    </div>

                    <Field label="Content">
                      <Textarea
                        value={entryForm.content}
                        onChange={(e) => setEntryForm((prev) => ({ ...prev, content: e.target.value }))}
                        placeholder="Capture the note, quote, or reflection"
                      />
                    </Field>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEntryComposerOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateEntry}
                        disabled={creatingNoteEntry || !entryForm.content.trim()}
                      >
                        {creatingNoteEntry ? "Adding…" : "Save entry"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {noteEntries.length > 0 ? (
                  <div className="grid gap-3">
                    {noteEntries.map((entry) => (
                      <div key={entry.id} className="rounded-[20px] border border-[hsl(var(--border))] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{entry.entryType}</Badge>
                            {entry.context ? <Badge variant="secondary">{entry.context}</Badge> : null}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={deletingNoteEntry}
                            onClick={() => deleteNoteEntry(entry.id)}
                          >
                            Remove
                          </Button>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <CompactEmptyState
                    title="No structured entries yet"
                    body="Use the notebook to capture highlights, quotes, takeaways, and reflections."
                    actionLabel={entryComposerOpen ? undefined : "Add Entry"}
                    onAction={entryComposerOpen ? undefined : () => setEntryComposerOpen(true)}
                  />
                )}
              </PanelSection>
            </TabsContent>

            <TabsContent value="scoring" className="space-y-4">
              <PanelSection title="Suggest Metric">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => queueScore(currentItem.id)} disabled={queueingScore}>
                    {queueingScore ? "Queueing…" : currentItem.suggestMetricNeedsMoreInfo ? "Re-score" : "Refresh score"}
                  </Button>
                  {currentItem.suggestMetricModelUsed ? (
                    <Badge variant="outline">{currentItem.suggestMetricModelUsed}</Badge>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricStat
                    label="Base"
                    value={currentItem.suggestMetricBase != null ? currentItem.suggestMetricBase : "Pending"}
                  />
                  <MetricStat
                    label="Final"
                    value={currentItem.suggestMetricFinal != null ? currentItem.suggestMetricFinal : "Pending"}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentItem.trendingBoostEnabled ? <Badge variant="secondary">Trending +100</Badge> : null}
                  {currentItem.manualBoost > 0 ? <Badge variant="secondary">Manual +{currentItem.manualBoost}</Badge> : null}
                  {currentItem.hiddenFromRecommendations ? (
                    <Badge variant="outline">Hidden from recommendations</Badge>
                  ) : null}
                  {currentItem.cooldownUntil && currentItem.cooldownUntil > Date.now() ? (
                    <Badge variant="outline">
                      Cooldown until {new Date(currentItem.cooldownUntil).toLocaleDateString()}
                    </Badge>
                  ) : null}
                </div>

                <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
                  <SectionLabel>Explanation</SectionLabel>
                  <p className="mt-2 text-sm leading-7 text-foreground">
                    {currentItem.suggestMetricReason ?? "No scoring explanation yet."}
                  </p>
                </div>

                {currentItem.suggestMetricNeedsMoreInfo ? (
                  <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
                    <SectionLabel>More Info Requested</SectionLabel>
                    <p className="mt-2 text-sm leading-7 text-foreground">
                      {currentItem.suggestMetricMoreInfoRequest ?? "The scorer wants more context before it can score confidently."}
                    </p>
                  </div>
                ) : null}
              </PanelSection>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </div>
  );
}

function CompactEmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-dashed border-[hsl(var(--border))] px-4 py-5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MetricStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.22)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">{value}</div>
    </div>
  );
}
