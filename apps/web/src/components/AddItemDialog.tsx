import { useMemo, useState } from "react";

import {
  useCreateItem,
  useImportItems,
  useImportJobs,
  useImportSources,
  useIngest,
  useIngestSearch,
  useResolveIngestSuggestion,
} from "../hooks/useItems";
import {
  createDefaultManualCsvMapping,
  parseCsv,
  prepareCsvImport,
  prepareMappedCsvImport,
  type ManualCsvMapping,
} from "../lib/csv";
import { prepareImportFile, type ImportSourceId } from "../lib/importers";
import { AUTO_DETECT_SOURCES, CONTENT_TYPES, SEARCHABLE_EXTERNAL_TYPES, STATUSES } from "../lib/constants";
import type { ContentTypeId, StatusId } from "../lib/constants";
import { ApiError, type BulkImportResult, type DuplicateItemSummary, type FetchedMetadata, type SearchSuggestion } from "../lib/api";
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
  finishedDate: "",
  rating: "",
  notes: "",
  sourceUrl: "",
};

type ResolvedItemExtras = {
  durationMins?: number;
  externalId?: string;
  metadata?: string;
};

export function AddItemDialog({ open, onClose }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [searchType, setSearchType] = useState<ContentTypeId>("book");
  const [mode, setMode] = useState<"url" | "search" | "manual" | "csv">("url");
  const [importSource, setImportSource] = useState<ImportSourceId>("csv");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [resolvedExtras, setResolvedExtras] = useState<ResolvedItemExtras>({});
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvImportResult, setCsvImportResult] = useState<BulkImportResult | null>(null);
  const [createDuplicate, setCreateDuplicate] = useState<DuplicateItemSummary | null>(null);
  const [manualMappingEnabled, setManualMappingEnabled] = useState(false);
  const [resyncMetadata, setResyncMetadata] = useState(false);
  const [manualMapping, setManualMapping] = useState<ManualCsvMapping>({
    title: "",
    contentType: "",
    fixedContentType: "",
    status: "",
    fixedStatus: "",
    creator: "",
    fixedCreator: "",
    description: "",
    fixedDescription: "",
    coverUrl: "",
    fixedCoverUrl: "",
    releaseDate: "",
    fixedReleaseDate: "",
    rating: "",
    fixedRating: "",
    notes: "",
    fixedNotes: "",
    sourceUrl: "",
    fixedSourceUrl: "",
  });

  const { mutate: createItem, isPending: saving, error: saveError } = useCreateItem();
  const { mutate: importItems, isPending: importing, error: importError } = useImportItems();
  const { data: importSources } = useImportSources();
  const { data: importJobs } = useImportJobs();
  const { mutate: fetchMeta, isPending: fetching, error: fetchError } = useIngest();
  const { mutate: searchMeta, isPending: searching, error: searchError } = useIngestSearch();
  const { mutate: resolveSuggestion, isPending: resolving, error: resolveError } = useResolveIngestSuggestion();
  const parsedCsv = useMemo(() => parseCsv(csvText), [csvText]);
  const csvPreparation = useMemo(() => {
    if (manualMappingEnabled && parsedCsv.headers.length > 0) {
      const prepared = prepareMappedCsvImport(parsedCsv, manualMapping);
      return {
        rows: prepared.items,
        preview: prepared.preview,
        errors: prepared.errors,
      };
    }
    if (importSource === "csv") {
      const prepared = prepareCsvImport(parsedCsv);
      return {
        rows: prepared.items,
        preview: prepared.preview,
        errors: prepared.errors,
      };
    }
    return prepareImportFile(importSource, csvText);
  }, [csvText, importSource, manualMappingEnabled, manualMapping, parsedCsv]);

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
      finishedDate: "",
      rating: "",
      notes: "",
      sourceUrl: meta.sourceUrl ?? fallbackSource ?? "",
    };

    setForm(filled);
    setResolvedExtras({
      durationMins: meta.durationMins,
      externalId: meta.externalId,
      metadata: meta.metadata,
    });
  }

  function reset() {
    setUrlInput("");
    setQueryInput("");
    setSearchType("book");
    setMode("url");
    setImportSource("csv");
    setForm(DEFAULT_FORM);
    setSearchSuggestions([]);
    setResolvedExtras({});
    setCsvFileName("");
    setCsvText("");
    setCsvImportResult(null);
    setCreateDuplicate(null);
    setManualMappingEnabled(false);
    setResyncMetadata(false);
    setManualMapping({
      title: "",
      contentType: "",
      fixedContentType: "",
      status: "",
      fixedStatus: "",
      creator: "",
      fixedCreator: "",
      description: "",
      fixedDescription: "",
      coverUrl: "",
      fixedCoverUrl: "",
      releaseDate: "",
      fixedReleaseDate: "",
      rating: "",
      fixedRating: "",
      notes: "",
      fixedNotes: "",
      sourceUrl: "",
      fixedSourceUrl: "",
    });
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
        finishedAt: form.finishedDate ? new Date(form.finishedDate).getTime() : undefined,
        rating: form.rating ? parseInt(form.rating, 10) : undefined,
        notes: form.notes.trim() || undefined,
        sourceUrl: form.sourceUrl.trim() || undefined,
        durationMins: resolvedExtras.durationMins,
        externalId: resolvedExtras.externalId,
        metadata: resolvedExtras.metadata ?? null,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            const body = error.body as { duplicate?: DuplicateItemSummary };
            setCreateDuplicate(body.duplicate ?? null);
          }
        },
      }
    );
  }

  async function handleCsvFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    const defaultMapping = createDefaultManualCsvMapping(parsed);
    setCsvFileName(file.name);
    setCsvText(text);
    setCsvImportResult(null);
    setManualMapping(defaultMapping);
    setManualMappingEnabled(Boolean(defaultMapping.fixedContentType || defaultMapping.contentType));
  }

  function handleImportCsv() {
    if (csvPreparation.rows.length === 0) return;

    importItems({ source: importSource, rows: csvPreparation.rows, resyncMetadata }, {
      onSuccess(result) {
        setCsvImportResult(result);
      },
    });
  }

  const error = fetchError ?? searchError ?? resolveError ?? saveError ?? importError;
  const isCsvMode = mode === "csv";
  const csvImportDisabled = csvPreparation.rows.length === 0;

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
                      <TabsTrigger value="csv" className="border border-[hsl(var(--border))] bg-card shadow-none">Imports</TabsTrigger>
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
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
                          <CardContent className="grid gap-3 p-5">
                            <div>
                              <p className="text-sm font-semibold text-foreground">Recent import jobs</p>
                              <p className="text-xs text-muted-foreground">Every CSV run is now tracked as a real import job with created, duplicate, and failed counts.</p>
                            </div>
                            {(importJobs?.jobs ?? []).slice(0, 4).map((job) => (
                              <div key={job.id} className="flex items-center justify-between gap-3 rounded-[18px] border border-[hsl(var(--border))] bg-card px-4 py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">{job.sourceLabel}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {job.createdCount} created · {job.duplicateCount} duplicates · {job.failedCount} failed
                                  </p>
                                </div>
                                <Badge variant={job.status === "completed" ? "secondary" : "outline"}>{job.status}</Badge>
                              </div>
                            ))}
                            {(importJobs?.jobs ?? []).length ? null : (
                              <p className="text-xs text-muted-foreground">No import jobs yet.</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex flex-col gap-3 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Upload an export file</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              CSV still works, but this mode also supports dedicated export formats for Goodreads, Letterboxd, IMDb, Trakt, Pocket, Raindrop, YouTube, Apple Podcasts OPML, and X bookmarks.
                            </p>
                          </div>
                          {csvFileName ? <Badge variant="outline">{csvFileName}</Badge> : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(importSources?.sources ?? [])
                            .filter((source) => source.status === "available")
                            .map((source) => (
                              <button
                                key={source.id}
                                type="button"
                                onClick={() => setImportSource(source.id as ImportSourceId)}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                  importSource === source.id
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-[hsl(var(--border))] bg-card text-foreground"
                                }`}
                              >
                                {source.label}
                              </button>
                            ))}
                        </div>

                        <Input
                          type="file"
                          accept=".csv,text/csv,.json,application/json,.html,text/html,.xml,.opml,text/xml"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            void handleCsvFileChange(file);
                          }}
                        />

                        <p className="text-xs leading-5 text-muted-foreground">
                          For CSV imports, aliases like <code>content_type</code>, <code>type</code>, <code>author</code>, <code>url</code>, and <code>cover_url</code> still work.
                        </p>
                      </div>

                      {csvText ? (
                        <div className="grid gap-4">
                          {parsedCsv.headers.length > 0 ? (
                            <Card>
                              <CardContent className="grid gap-4 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Manual field mapping</p>
                                    <p className="text-xs text-muted-foreground">
                                      Match your CSV headers to SirajHub fields when the export format does not line up automatically.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={manualMappingEnabled ? "secondary" : "outline"}
                                    onClick={() => setManualMappingEnabled((prev) => !prev)}
                                  >
                                    {manualMappingEnabled ? "Manual mapping on" : "Enable manual mapping"}
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {parsedCsv.headers.map((header) => (
                                    <Badge key={header} variant="outline">{header}</Badge>
                                  ))}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  <MappingField
                                    label="Title column"
                                    value={manualMapping.title}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, title: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <MappingField
                                    label="Creator column"
                                    value={manualMapping.creator}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, creator: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed creator">
                                    <Input
                                      value={manualMapping.fixedCreator}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedCreator: e.target.value }))}
                                      placeholder="Optional manual creator"
                                    />
                                  </Field>
                                  <MappingField
                                    label="Release date / year"
                                    value={manualMapping.releaseDate}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, releaseDate: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed release date / year">
                                    <Input
                                      value={manualMapping.fixedReleaseDate}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedReleaseDate: e.target.value }))}
                                      placeholder="e.g. 2024"
                                    />
                                  </Field>
                                  <MappingField
                                    label="Source URL"
                                    value={manualMapping.sourceUrl}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, sourceUrl: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed source URL">
                                    <Input
                                      value={manualMapping.fixedSourceUrl}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedSourceUrl: e.target.value }))}
                                      placeholder="Optional manual URL"
                                    />
                                  </Field>
                                  <MappingField
                                    label="Status column"
                                    value={manualMapping.status}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, status: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed status">
                                    <Select
                                      value={manualMapping.fixedStatus || "__none__"}
                                      onValueChange={(value) =>
                                        setManualMapping((prev) => ({
                                          ...prev,
                                          fixedStatus: value === "__none__" ? "" : (value as StatusId),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="bg-card">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-card">
                                        <SelectGroup>
                                          <SelectItem value="__none__">No fixed status</SelectItem>
                                          {STATUSES.map((status) => (
                                            <SelectItem key={status.id} value={status.id}>
                                              {status.label}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  </Field>
                                  <MappingField
                                    label="Content type column"
                                    value={manualMapping.contentType}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, contentType: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed content type">
                                    <Select
                                      value={manualMapping.fixedContentType || "__none__"}
                                      onValueChange={(value) =>
                                        setManualMapping((prev) => ({
                                          ...prev,
                                          fixedContentType: value === "__none__" ? "" : (value as ContentTypeId),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="bg-card">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-card">
                                        <SelectGroup>
                                          <SelectItem value="__none__">No fixed type</SelectItem>
                                          {CONTENT_TYPES.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                              {type.label}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                  </Field>
                                  <MappingField
                                    label="Rating column"
                                    value={manualMapping.rating}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, rating: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed rating">
                                    <Input
                                      value={manualMapping.fixedRating}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedRating: e.target.value }))}
                                      placeholder="1-5"
                                    />
                                  </Field>
                                  <MappingField
                                    label="Description column"
                                    value={manualMapping.description}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, description: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed description">
                                    <Textarea
                                      value={manualMapping.fixedDescription}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedDescription: e.target.value }))}
                                      placeholder="Optional manual description"
                                    />
                                  </Field>
                                  <MappingField
                                    label="Cover URL column"
                                    value={manualMapping.coverUrl}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, coverUrl: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed cover URL">
                                    <Input
                                      value={manualMapping.fixedCoverUrl}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedCoverUrl: e.target.value }))}
                                      placeholder="https://..."
                                    />
                                  </Field>
                                  <MappingField
                                    label="Notes column"
                                    value={manualMapping.notes}
                                    onChange={(value) => setManualMapping((prev) => ({ ...prev, notes: value }))}
                                    headers={parsedCsv.headers}
                                  />
                                  <Field label="Fixed notes">
                                    <Textarea
                                      value={manualMapping.fixedNotes}
                                      onChange={(e) => setManualMapping((prev) => ({ ...prev, fixedNotes: e.target.value }))}
                                      placeholder="Optional manual notes"
                                    />
                                  </Field>
                                </div>
                              </CardContent>
                            </Card>
                          ) : null}

                          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                          <Card>
                            <CardContent className="grid gap-4 p-5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Import preview</p>
                                  <p className="text-xs text-muted-foreground">
                                    {csvPreparation.rows.length} valid row{csvPreparation.rows.length === 1 ? "" : "s"} ready to import
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
                                    <Badge variant="outline">{csvImportResult.duplicateCount} duplicates</Badge>
                                    <Badge variant="outline">{csvImportResult.failedCount} failed</Badge>
                                  </div>
                                  {csvImportResult.duplicates.length > 0 ? (
                                    <div className="grid gap-2">
                                      {csvImportResult.duplicates.slice(0, 6).map((entry) => (
                                        <p key={`${entry.row}-${entry.duplicate.id}`} className="text-xs text-muted-foreground">
                                          Row {entry.row}: matched existing "{entry.duplicate.title}" via {entry.duplicate.reason.replace("_", " ")}.
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
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
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}
                </CardContent>
              </Card>

              {!isCsvMode ? (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                {createDuplicate ? (
                  <div className="lg:col-span-2 rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Potential duplicate detected</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This item matches <span className="font-medium text-foreground">{createDuplicate.title}</span> by {createDuplicate.reason.replace("_", " ")}.
                        </p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => { window.location.href = `/item/${createDuplicate.id}`; }}>
                        Open existing item
                      </Button>
                    </div>
                  </div>
                ) : null}

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

                    {form.status === "finished" && (
                      <Field label="Finished Date">
                        <Input type="date" value={form.finishedDate} onChange={(e) => setField("finishedDate", e.target.value)} />
                      </Field>
                    )}

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              {isCsvMode ? (
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={resyncMetadata}
                    onChange={(e) => setResyncMetadata(e.target.checked)}
                    className="h-4 w-4 rounded border-[hsl(var(--border))] bg-card text-primary focus:ring-primary"
                  />
                  <span>Resync missing metadata</span>
                </label>
              ) : <div />}
              <div className="flex flex-wrap justify-end gap-3 ml-auto">
                <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
                  Cancel
                </Button>
              {isCsvMode ? (
                <Button type="button" onClick={handleImportCsv} disabled={importing || csvImportDisabled}>
                  {importing ? "Importing…" : `Import ${csvPreparation.rows.length} item${csvPreparation.rows.length === 1 ? "" : "s"}`}
                </Button>
              ) : (
                <Button type="submit" disabled={saving || !form.title.trim()}>
                  {saving ? "Saving…" : "Save item"}
                </Button>
              )}
            </div>
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

function MappingField({
  label,
  value,
  onChange,
  headers,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  headers: string[];
}) {
  return (
    <Field label={label}>
      <Select value={value || "__none__"} onValueChange={(next) => onChange(next === "__none__" ? "" : next)}>
        <SelectTrigger className="bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-card">
          <SelectGroup>
            <SelectItem value="__none__">Not mapped</SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
