import { useMemo, useState } from "react";

import { useCreateItem, useImportItems, useIngest, useIngestSearch, useResolveIngestSuggestion } from "../hooks/useItems";
import { parseCsv, prepareCsvImport } from "../lib/csv";
import { AUTO_DETECT_SOURCES, CONTENT_TYPES, SEARCHABLE_EXTERNAL_TYPES, STATUSES } from "../lib/constants";
import type { ContentTypeId, StatusId } from "../lib/constants";
import type { BulkImportResult, FetchedMetadata, SearchSuggestion } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_FORM = {
  title: "",
  contentType: "book" as ContentTypeId,
  status: "suggestions" as StatusId,
  creator: "",
  description: "",
  coverUrl: "",
  releaseDate: "",
  rating: "",
  notes: "",
  sourceUrl: "",
};

export function AddItemDialog({ open, onClose }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [searchType, setSearchType] = useState<ContentTypeId>("book");
  const [mode, setMode] = useState<"url" | "search" | "manual" | "csv">("url");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvImportResult, setCsvImportResult] = useState<BulkImportResult | null>(null);

  const { mutate: createItem, isPending: saving, error: saveError } = useCreateItem();
  const { mutate: importItems, isPending: importing, error: importError } = useImportItems();
  const { mutate: fetchMeta, isPending: fetching, error: fetchError } = useIngest();
  const { mutate: searchMeta, isPending: searching, error: searchError } = useIngestSearch();
  const { mutate: resolveSuggestion, isPending: resolving, error: resolveError } = useResolveIngestSuggestion();
  const csvPreparation = useMemo(() => prepareCsvImport(parseCsv(csvText)), [csvText]);

  function setField(field: keyof typeof DEFAULT_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyMetadata(meta: FetchedMetadata, fallbackSource?: string) {
    const filled: typeof DEFAULT_FORM = {
      title: meta.title ?? "",
      contentType: (meta.contentType as ContentTypeId) ?? searchType,
      status: "suggestions",
      creator: meta.creator ?? "",
      description: meta.description ?? "",
      coverUrl: meta.coverUrl ?? "",
      releaseDate: meta.releaseDate ?? "",
      rating: "",
      notes: "",
      sourceUrl: meta.sourceUrl ?? fallbackSource ?? "",
    };

    setForm(filled);
  }

  function reset() {
    setUrlInput("");
    setQueryInput("");
    setSearchType("book");
    setMode("url");
    setForm(DEFAULT_FORM);
    setSearchSuggestions([]);
    setCsvFileName("");
    setCsvText("");
    setCsvImportResult(null);
  }

  function handleFetchUrl() {
    const input = urlInput.trim();
    if (!input) return;

    fetchMeta(
      { url: input },
      {
        onSuccess(meta) {
          applyMetadata(meta, input);
        },
      }
    );
  }

  function handleSearch() {
    const input = queryInput.trim();
    if (!input) return;

    searchMeta(
      { query: input, content_type: searchType },
      {
        onSuccess(data) {
          setSearchSuggestions(data.suggestions);
        },
      }
    );
  }

  function handleResolveSuggestion(suggestion: SearchSuggestion) {
    resolveSuggestion(suggestion, {
      onSuccess(meta) {
        applyMetadata(meta, suggestion.sourceUrl);
      },
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "csv") return;

    createItem(
      {
        title: form.title.trim(),
        contentType: form.contentType,
        status: form.status,
        creator: form.creator.trim() || undefined,
        description: form.description.trim() || undefined,
        coverUrl: form.coverUrl.trim() || undefined,
        releaseDate: form.releaseDate || undefined,
        rating: form.rating ? parseInt(form.rating, 10) : undefined,
        notes: form.notes.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  }

  async function handleCsvFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvFileName(file.name);
    setCsvText(text);
    setCsvImportResult(null);
  }

  function handleImportCsv() {
    if (csvPreparation.items.length === 0) return;

    importItems(csvPreparation.items, {
      onSuccess(result) {
        setCsvImportResult(result);
      },
    });
  }

  const error = fetchError ?? searchError ?? resolveError ?? saveError ?? importError;
  const isCsvMode = mode === "csv";
  const csvImportDisabled = csvPreparation.items.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="flex max-h-[calc(100vh-2rem)] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[hsl(var(--border))] px-6 py-5">
          <DialogTitle>Add Item</DialogTitle>
          <DialogDescription>Pull metadata from a link, search by title, or fill everything in manually.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="flex flex-col gap-5 p-5">
                  <Tabs
                    value={mode}
                    onValueChange={(value) => {
                      setMode(value as "url" | "search" | "manual" | "csv");
                      setSearchSuggestions([]);
                    }}
                  >
                    <TabsList className="flex w-full flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none">
                      <TabsTrigger value="url" className="border border-[hsl(var(--border))] bg-card shadow-none">Paste URL</TabsTrigger>
                      <TabsTrigger value="search" className="border border-[hsl(var(--border))] bg-card shadow-none">Search by Name</TabsTrigger>
                      <TabsTrigger value="manual" className="border border-[hsl(var(--border))] bg-card shadow-none">Manual</TabsTrigger>
                      <TabsTrigger value="csv" className="border border-[hsl(var(--border))] bg-card shadow-none">CSV Import</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {mode === "url" ? (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... or any URL"
                        />
                        <Button type="button" onClick={handleFetchUrl} disabled={!urlInput.trim() || fetching}>
                          {fetching ? "Fetching…" : "Fetch"}
                        </Button>
                      </div>

                      <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                        <p className="text-sm font-semibold text-foreground">Auto-detect works best with these URLs</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {AUTO_DETECT_SOURCES.map((entry) => (
                            <div key={entry.type} className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{entry.label}</p>
                              <p className="text-xs leading-5 text-muted-foreground">{entry.examples.join(" · ")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : null}

                  {mode === "search" ? (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Select value={searchType} onValueChange={(value) => setSearchType(value as ContentTypeId)}>
                          <SelectTrigger className="sm:w-56">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {CONTENT_TYPES.filter((t) => SEARCHABLE_EXTERNAL_TYPES.includes(t.id as (typeof SEARCHABLE_EXTERNAL_TYPES)[number])).map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Input
                          value={queryInput}
                          onChange={(e) => setQueryInput(e.target.value)}
                          placeholder="Search by title"
                        />
                        <Button type="button" onClick={handleSearch} disabled={!queryInput.trim() || searching}>
                          {searching ? "Searching…" : "Search"}
                        </Button>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        Search suggestions currently support books, movies, TV shows, and podcasts.
                      </p>

                      {searchSuggestions.length > 0 ? (
                        <div className="grid gap-3">
                          {searchSuggestions.map((suggestion, index) => (
                            <button
                              key={`${suggestion.provider}-${suggestion.externalId ?? suggestion.sourceUrl ?? index}`}
                              type="button"
                              onClick={() => handleResolveSuggestion(suggestion)}
                              className="flex items-start gap-4 rounded-[20px] border border-[hsl(var(--border))] bg-card p-4 text-left transition-colors hover:bg-[hsl(var(--secondary)/0.35)]"
                            >
                              <div className="cover-frame flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px]">
                                {suggestion.coverUrl ? (
                                  <img src={suggestion.coverUrl} alt={suggestion.title} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-2xl">
                                    {CONTENT_TYPES.find((t) => t.id === suggestion.contentType)?.icon ?? "📄"}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">{suggestion.title}</p>
                                  <Badge variant="outline">
                                    {CONTENT_TYPES.find((t) => t.id === suggestion.contentType)?.label ?? suggestion.contentType}
                                  </Badge>
                                </div>
                                {suggestion.creator ? (
                                  <p className="mt-1 text-sm text-muted-foreground">{suggestion.creator}</p>
                                ) : null}
                                {suggestion.releaseDate ? (
                                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.releaseDate}</p>
                                ) : null}
                                {suggestion.description ? (
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{suggestion.description}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                {resolving ? "Loading…" : "Select"}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {mode === "manual" ? (
                    <p className="text-sm text-muted-foreground">Manual mode skips ingest and lets you fill in everything yourself.</p>
                  ) : null}

                  {mode === "csv" ? (
                    <div className="grid gap-4">
                      <div className="flex flex-col gap-3 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Upload a CSV file</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              Required columns: <code>title</code> and <code>contentType</code>. Optional: <code>status</code>, <code>creator</code>, <code>description</code>, <code>coverUrl</code>, <code>releaseDate</code>, <code>rating</code>, <code>notes</code>, <code>sourceUrl</code>.
                            </p>
                          </div>
                          {csvFileName ? <Badge variant="outline">{csvFileName}</Badge> : null}
                        </div>

                        <Input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            void handleCsvFileChange(file);
                          }}
                        />

                        <p className="text-xs leading-5 text-muted-foreground">
                          Aliases like <code>content_type</code>, <code>type</code>, <code>author</code>, <code>url</code>, and <code>cover_url</code> also work.
                        </p>
                      </div>

                      {csvText ? (
                        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <Card>
                            <CardContent className="grid gap-4 p-5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Import preview</p>
                                  <p className="text-xs text-muted-foreground">
                                    {csvPreparation.items.length} valid row{csvPreparation.items.length === 1 ? "" : "s"} ready to import
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">{csvPreparation.preview.length} shown</Badge>
                                  {csvPreparation.errors.length > 0 ? (
                                    <Badge variant="outline">{csvPreparation.errors.length} issue{csvPreparation.errors.length === 1 ? "" : "s"}</Badge>
                                  ) : null}
                                </div>
                              </div>

                              <div className="grid gap-3">
                                {csvPreparation.preview.map((row) => (
                                  <div key={row.rowNumber} className="rounded-[18px] border border-[hsl(var(--border))] bg-card px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline">Row {row.rowNumber}</Badge>
                                      <Badge variant="secondary">
                                        {CONTENT_TYPES.find((type) => type.id === row.contentType)?.label ?? row.contentType}
                                      </Badge>
                                      <Badge variant="outline">
                                        {STATUSES.find((status) => status.id === row.status)?.label ?? row.status}
                                      </Badge>
                                    </div>
                                    <p className="mt-3 text-sm font-semibold text-foreground">{row.title}</p>
                                    {row.creator ? <p className="mt-1 text-xs text-muted-foreground">{row.creator}</p> : null}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="grid gap-4 p-5">
                              <div>
                                <p className="text-sm font-semibold text-foreground">Validation</p>
                                <p className="text-xs text-muted-foreground">
                                  We import valid rows and leave broken ones in the report so you can fix them and retry.
                                </p>
                              </div>

                              {csvPreparation.errors.length > 0 ? (
                                <div className="grid gap-2">
                                  {csvPreparation.errors.slice(0, 8).map((entry) => (
                                    <div key={`${entry.row}-${entry.error}`} className="rounded-[18px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                                      Row {entry.row}: {entry.error}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                  No validation issues so far.
                                </div>
                              )}

                              {csvImportResult ? (
                                <div className="grid gap-3 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-4">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{csvImportResult.createdCount} imported</Badge>
                                    <Badge variant="outline">{csvImportResult.failedCount} failed</Badge>
                                  </div>
                                  {csvImportResult.errors.length > 0 ? (
                                    <div className="grid gap-2">
                                      {csvImportResult.errors.slice(0, 8).map((entry) => (
                                        <p key={`${entry.row}-${entry.error}`} className="text-xs text-muted-foreground">
                                          Row {entry.row}: {entry.error}
                                        </p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">Everything in this file imported successfully.</p>
                                  )}
                                </div>
                              ) : null}
                            </CardContent>
                          </Card>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
                </CardContent>
              </Card>

              {!isCsvMode ? (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardContent className="grid gap-4 p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Title">
                        <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Title" required />
                      </Field>

                      <Field label="Creator">
                        <Input value={form.creator} onChange={(e) => setField("creator", e.target.value)} placeholder="Author, director, channel..." />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Content Type">
                        <Select value={form.contentType} onValueChange={(value) => setField("contentType", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {CONTENT_TYPES.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field label="Status">
                        <Select value={form.status} onValueChange={(value) => setField("status", value)}>
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
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Release Date">
                        <Input type="date" value={form.releaseDate} onChange={(e) => setField("releaseDate", e.target.value)} />
                      </Field>

                      <Field label="Rating">
                        <Input type="number" min="1" max="5" value={form.rating} onChange={(e) => setField("rating", e.target.value)} placeholder="1-5" />
                      </Field>
                    </div>

                    <Field label="Cover URL">
                      <Input value={form.coverUrl} onChange={(e) => setField("coverUrl", e.target.value)} placeholder="https://..." />
                    </Field>

                    <Field label="Source URL">
                      <Input value={form.sourceUrl} onChange={(e) => setField("sourceUrl", e.target.value)} placeholder="Original source" />
                    </Field>

                    <Field label="Description">
                      <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Short description" />
                    </Field>

                    <Field label="Notes">
                      <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Private notes" />
                    </Field>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="flex h-full flex-col gap-4 p-5">
                    <p className="hero-kicker text-xs">Preview</p>
                    <div className="cover-frame flex h-56 items-center justify-center overflow-hidden rounded-[24px]">
                      {form.coverUrl ? (
                        <img src={form.coverUrl} alt={form.title || "cover"} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-5xl">
                          {CONTENT_TYPES.find((t) => t.id === form.contentType)?.icon ?? "📄"}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{CONTENT_TYPES.find((t) => t.id === form.contentType)?.label ?? form.contentType}</Badge>
                      <Badge variant="secondary">{STATUSES.find((s) => s.id === form.status)?.label ?? form.status}</Badge>
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold leading-none tracking-[-0.05em] text-foreground">{form.title || "Untitled item"}</h3>
                      {form.creator ? <p className="mt-2 text-sm text-muted-foreground">{form.creator}</p> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {form.description || "Metadata will appear here as you fetch it or fill in the form."}
                    </p>
                  </CardContent>
                </Card>
                </div>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-4">
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
                Cancel
              </Button>
              {isCsvMode ? (
                <Button type="button" onClick={handleImportCsv} disabled={importing || csvImportDisabled}>
                  {importing ? "Importing…" : `Import ${csvPreparation.items.length} item${csvPreparation.items.length === 1 ? "" : "s"}`}
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !form.title.trim()}>
                  {saving ? "Saving…" : "Save item"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
