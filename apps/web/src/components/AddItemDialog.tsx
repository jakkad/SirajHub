import { useMemo, useState } from "react";

import {
  useCreateItem,
  useImportItems,
  useImportJobs,
  useImportSources,
  useIngest,
  useIngestSearch,
  useIngestYouTubePlaylist,
  useResolveIngestSuggestion,
} from "../hooks/useItems";
import {
  createDefaultManualCsvMapping,
  parseCsv,
  prepareCsvImport,
  prepareMappedCsvImport,
  type ManualCsvMapping,
} from "../lib/csv";
import { prepareImportFile, type ImportSourceId, type PreparedImportResult } from "../lib/importers";
import { AUTO_DETECT_SOURCES, CONTENT_TYPES, SEARCHABLE_EXTERNAL_TYPES, STATUSES } from "../lib/constants";
import type { ContentTypeId, StatusId } from "../lib/constants";
import {
  ApiError,
  type BulkImportResult,
  type DuplicateItemSummary,
  type FetchedMetadata,
  type SearchSuggestion,
  type YouTubePlaylistImportPreview,
} from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type AddMode = "url" | "search" | "manual" | "csv";
type PlaylistType = "youtube" | "podcast";

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

type ItemDraft = typeof DEFAULT_FORM;

type ResolvedItemExtras = {
  durationMins?: number;
  externalId?: string;
  metadata?: string;
};

function createEmptyManualMapping(): ManualCsvMapping {
  return {
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
  };
}

function createEmptyImportPreparation(): PreparedImportResult {
  return { rows: [], preview: [], errors: [] };
}

function createEmptyPlaylistPreparation(): YouTubePlaylistImportPreview {
  return { rows: [], preview: [], errors: [] };
}

function metadataToDraft(meta: FetchedMetadata, fallbackSource: string | undefined, fallbackType: ContentTypeId): ItemDraft {
  return {
    title: meta.title ?? "",
    contentType: (meta.contentType as ContentTypeId) ?? fallbackType,
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
}

export function AddItemDialog({ open, onClose }: Props) {
  const [mode, setMode] = useState<AddMode>("url");
  const [form, setForm] = useState<ItemDraft>(DEFAULT_FORM);
  const [resolvedExtras, setResolvedExtras] = useState<ResolvedItemExtras>({});
  const [createDuplicate, setCreateDuplicate] = useState<DuplicateItemSummary | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [searchType, setSearchType] = useState<ContentTypeId>("book");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);

  const [importSource, setImportSource] = useState<ImportSourceId>("csv");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvImportResult, setCsvImportResult] = useState<BulkImportResult | null>(null);
  const [manualMappingEnabled, setManualMappingEnabled] = useState(false);
  const [resyncMetadata, setResyncMetadata] = useState(false);
  const [manualMapping, setManualMapping] = useState<ManualCsvMapping>(createEmptyManualMapping);
  const [youtubePlaylistUrl, setYoutubePlaylistUrl] = useState("");
  const [youtubePlaylistType, setYoutubePlaylistType] = useState<PlaylistType>("youtube");
  const [youtubePlaylistPreparation, setYoutubePlaylistPreparation] = useState<YouTubePlaylistImportPreview>(
    createEmptyPlaylistPreparation
  );

  const { mutate: createItem, isPending: saving, error: saveError } = useCreateItem();
  const { mutate: importItems, isPending: importing, error: importError } = useImportItems();
  const { data: importSources } = useImportSources();
  const { data: importJobs } = useImportJobs();
  const { mutate: fetchMeta, isPending: fetching, error: fetchError } = useIngest();
  const { mutate: searchMeta, isPending: searching, error: searchError } = useIngestSearch();
  const { mutate: fetchYouTubePlaylist, isPending: fetchingYouTubePlaylist, error: youtubePlaylistError } = useIngestYouTubePlaylist();
  const { mutate: resolveSuggestion, isPending: resolving, error: resolveError } = useResolveIngestSuggestion();

  const parsedCsv = useMemo(() => parseCsv(csvText), [csvText]);
  const fileImportPreparation = useMemo<PreparedImportResult>(() => {
    if (!csvText) return createEmptyImportPreparation();
    if (manualMappingEnabled && parsedCsv.headers.length > 0) {
      const prepared = prepareMappedCsvImport(parsedCsv, manualMapping);
      return { rows: prepared.items, preview: prepared.preview, errors: prepared.errors };
    }
    if (importSource === "csv") {
      const prepared = prepareCsvImport(parsedCsv);
      return { rows: prepared.items, preview: prepared.preview, errors: prepared.errors };
    }
    if (importSource === "youtube_playlist") return createEmptyImportPreparation();
    return prepareImportFile(importSource, csvText);
  }, [csvText, importSource, manualMapping, manualMappingEnabled, parsedCsv]);

  const activeImportPreparation = importSource === "youtube_playlist" ? youtubePlaylistPreparation : fileImportPreparation;
  const isImportMode = mode === "csv";
  const error = fetchError ?? searchError ?? youtubePlaylistError ?? resolveError ?? saveError ?? importError;

  function setField(field: keyof ItemDraft, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function applyMetadata(meta: FetchedMetadata, fallbackSource?: string) {
    setForm(metadataToDraft(meta, fallbackSource, searchType));
    setResolvedExtras({
      durationMins: meta.durationMins,
      externalId: meta.externalId,
      metadata: meta.metadata,
    });
  }

  function reset() {
    setMode("url");
    setForm(DEFAULT_FORM);
    setResolvedExtras({});
    setCreateDuplicate(null);
    setUrlInput("");
    setQueryInput("");
    setSearchType("book");
    setSearchSuggestions([]);
    setImportSource("csv");
    setCsvFileName("");
    setCsvText("");
    setCsvImportResult(null);
    setManualMappingEnabled(false);
    setResyncMetadata(false);
    setManualMapping(createEmptyManualMapping());
    setYoutubePlaylistUrl("");
    setYoutubePlaylistType("youtube");
    setYoutubePlaylistPreparation(createEmptyPlaylistPreparation());
  }

  function close() {
    reset();
    onClose();
  }

  function handleModeChange(value: string) {
    setMode(value as AddMode);
    setSearchSuggestions([]);
    setCsvImportResult(null);
  }

  function handleFetchUrl() {
    const input = urlInput.trim();
    if (!input) return;
    fetchMeta({ url: input }, { onSuccess: (meta) => applyMetadata(meta, input) });
  }

  function handleSearch() {
    const input = queryInput.trim();
    if (!input) return;
    searchMeta({ query: input, content_type: searchType }, { onSuccess: (data) => setSearchSuggestions(data.suggestions) });
  }

  function handleResolveSuggestion(suggestion: SearchSuggestion) {
    resolveSuggestion(suggestion, {
      onSuccess(meta) {
        applyMetadata(meta, suggestion.sourceUrl);
      },
    });
  }

  async function handleCsvFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    const defaultMapping = createDefaultManualCsvMapping(parsed);
    setCsvFileName(file.name);
    setCsvText(text);
    setCsvImportResult(null);
    setImportSource((prev) => (prev === "youtube_playlist" ? "csv" : prev));
    setManualMapping(defaultMapping);
    setManualMappingEnabled(Boolean(defaultMapping.fixedContentType || defaultMapping.contentType));
  }

  function handleFetchYouTubePlaylist() {
    const url = youtubePlaylistUrl.trim();
    if (!url) return;
    fetchYouTubePlaylist(
      { url, contentType: youtubePlaylistType, status: "suggestions" },
      {
        onSuccess(result) {
          setImportSource("youtube_playlist");
          setYoutubePlaylistPreparation(result);
          setCsvImportResult(null);
        },
      }
    );
  }

  function handleImport() {
    if (activeImportPreparation.rows.length === 0) return;
    importItems(
      { source: importSource, rows: activeImportPreparation.rows, resyncMetadata },
      { onSuccess: (result) => setCsvImportResult(result) }
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isImportMode) return;
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
        onSuccess: close,
        onError(error) {
          if (error instanceof ApiError && error.status === 409) {
            const body = error.body as { duplicate?: DuplicateItemSummary };
            setCreateDuplicate(body.duplicate ?? null);
          }
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? close() : undefined)}>
      <DialogContent className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[1280px] flex-col overflow-hidden rounded-[26px] p-0 sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)]">
        <DialogHeader className="shrink-0 border-b border-[hsl(var(--border))] px-5 py-4 sm:px-6">
          <div className="grid gap-4 pr-12 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <DialogTitle>Add Item</DialogTitle>
              <DialogDescription className="max-w-2xl">Capture one item or import a list without leaving the current workspace.</DialogDescription>
            </div>
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="grid w-full grid-cols-4 gap-2 bg-transparent p-0 shadow-none xl:w-[520px]">
                <TabsTrigger value="url" className="min-w-0 rounded-full border border-[hsl(var(--border))] bg-card px-3 shadow-none">URL</TabsTrigger>
                <TabsTrigger value="search" className="min-w-0 rounded-full border border-[hsl(var(--border))] bg-card px-3 shadow-none">Search</TabsTrigger>
                <TabsTrigger value="manual" className="min-w-0 rounded-full border border-[hsl(var(--border))] bg-card px-3 shadow-none">Manual</TabsTrigger>
                <TabsTrigger value="csv" className="min-w-0 rounded-full border border-[hsl(var(--border))] bg-card px-3 shadow-none">Imports</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {isImportMode ? (
              <ImportsWorkspace
                importSource={importSource}
                setImportSource={setImportSource}
                importSources={importSources?.sources ?? []}
                importJobs={importJobs?.jobs ?? []}
                csvFileName={csvFileName}
                csvText={csvText}
                parsedHeaders={parsedCsv.headers}
                manualMapping={manualMapping}
                setManualMapping={setManualMapping}
                manualMappingEnabled={manualMappingEnabled}
                setManualMappingEnabled={setManualMappingEnabled}
                activeImportPreparation={activeImportPreparation}
                csvImportResult={csvImportResult}
                youtubePlaylistUrl={youtubePlaylistUrl}
                setYoutubePlaylistUrl={setYoutubePlaylistUrl}
                youtubePlaylistType={youtubePlaylistType}
                setYoutubePlaylistType={setYoutubePlaylistType}
                fetchingYouTubePlaylist={fetchingYouTubePlaylist}
                onFetchYouTubePlaylist={handleFetchYouTubePlaylist}
                onCsvFileChange={handleCsvFileChange}
              />
            ) : (
              <ItemWorkspace
                mode={mode}
                form={form}
                setField={setField}
                urlInput={urlInput}
                setUrlInput={setUrlInput}
                fetching={fetching}
                onFetchUrl={handleFetchUrl}
                queryInput={queryInput}
                setQueryInput={setQueryInput}
                searchType={searchType}
                setSearchType={setSearchType}
                searching={searching}
                resolving={resolving}
                onSearch={handleSearch}
                searchSuggestions={searchSuggestions}
                onResolveSuggestion={handleResolveSuggestion}
                createDuplicate={createDuplicate}
              />
            )}
            {error ? <p className="mt-4 text-sm text-destructive">{(error as Error).message}</p> : null}
          </div>

          <div className="shrink-0 border-t border-[hsl(var(--border))] bg-card px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {isImportMode ? (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={resyncMetadata}
                    onChange={(e) => setResyncMetadata(e.target.checked)}
                    className="h-4 w-4 rounded border-[hsl(var(--border))] bg-card text-primary focus:ring-primary"
                  />
                  <span>Resync missing metadata after import</span>
                </label>
              ) : (
                <FooterHint form={form} />
              )}
              <div className="flex shrink-0 flex-wrap justify-end gap-3">
                <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                {isImportMode ? (
                  <Button type="button" onClick={handleImport} disabled={importing || activeImportPreparation.rows.length === 0}>
                    {importing ? "Importing..." : `Import ${activeImportPreparation.rows.length} item${activeImportPreparation.rows.length === 1 ? "" : "s"}`}
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving || !form.title.trim()}>
                    {saving ? "Saving..." : "Save item"}
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

function ItemWorkspace({
  mode,
  form,
  setField,
  urlInput,
  setUrlInput,
  fetching,
  onFetchUrl,
  queryInput,
  setQueryInput,
  searchType,
  setSearchType,
  searching,
  resolving,
  onSearch,
  searchSuggestions,
  onResolveSuggestion,
  createDuplicate,
}: {
  mode: Exclude<AddMode, "csv">;
  form: ItemDraft;
  setField: (field: keyof ItemDraft, value: string) => void;
  urlInput: string;
  setUrlInput: (value: string) => void;
  fetching: boolean;
  onFetchUrl: () => void;
  queryInput: string;
  setQueryInput: (value: string) => void;
  searchType: ContentTypeId;
  setSearchType: (value: ContentTypeId) => void;
  searching: boolean;
  resolving: boolean;
  onSearch: () => void;
  searchSuggestions: SearchSuggestion[];
  onResolveSuggestion: (suggestion: SearchSuggestion) => void;
  createDuplicate: DuplicateItemSummary | null;
}) {
  return (
    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="grid min-w-0 gap-5">
        {mode === "url" ? (
          <Panel title="Paste URL" aside={<SourceHint />}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://youtube.com/watch?v=... or any URL" />
              <Button type="button" onClick={onFetchUrl} disabled={!urlInput.trim() || fetching}>
                {fetching ? "Fetching..." : "Fetch"}
              </Button>
            </div>
          </Panel>
        ) : null}

        {mode === "search" ? (
          <Panel title="Search by Name">
            <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_auto]">
              <Select value={searchType} onValueChange={(value) => setSearchType(value as ContentTypeId)}>
                <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card">
                  <SelectGroup>
                    {CONTENT_TYPES.filter((type) => SEARCHABLE_EXTERNAL_TYPES.includes(type.id as (typeof SEARCHABLE_EXTERNAL_TYPES)[number])).map((type) => (
                      <SelectItem key={type.id} value={type.id}>{type.icon} {type.label}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder="Search by title" />
              <Button type="button" onClick={onSearch} disabled={!queryInput.trim() || searching}>
                {searching ? "Searching..." : "Search"}
              </Button>
            </div>
            <SearchSuggestions suggestions={searchSuggestions} resolving={resolving} onSelect={onResolveSuggestion} />
          </Panel>
        ) : null}

        {createDuplicate ? <DuplicateNotice duplicate={createDuplicate} /> : null}
        <ItemDetailsForm form={form} setField={setField} />
      </div>

      <ItemPreview form={form} />
    </div>
  );
}

function ImportsWorkspace({
  importSource,
  setImportSource,
  importSources,
  importJobs,
  csvFileName,
  csvText,
  parsedHeaders,
  manualMapping,
  setManualMapping,
  manualMappingEnabled,
  setManualMappingEnabled,
  activeImportPreparation,
  csvImportResult,
  youtubePlaylistUrl,
  setYoutubePlaylistUrl,
  youtubePlaylistType,
  setYoutubePlaylistType,
  fetchingYouTubePlaylist,
  onFetchYouTubePlaylist,
  onCsvFileChange,
}: {
  importSource: ImportSourceId;
  setImportSource: (value: ImportSourceId) => void;
  importSources: Array<{ id: string; label: string; status: "available" | "planned"; description: string }>;
  importJobs: Array<{ id: string; sourceLabel: string; status: string; createdCount: number; duplicateCount: number; failedCount: number }>;
  csvFileName: string;
  csvText: string;
  parsedHeaders: string[];
  manualMapping: ManualCsvMapping;
  setManualMapping: React.Dispatch<React.SetStateAction<ManualCsvMapping>>;
  manualMappingEnabled: boolean;
  setManualMappingEnabled: (value: boolean) => void;
  activeImportPreparation: PreparedImportResult | YouTubePlaylistImportPreview;
  csvImportResult: BulkImportResult | null;
  youtubePlaylistUrl: string;
  setYoutubePlaylistUrl: (value: string) => void;
  youtubePlaylistType: PlaylistType;
  setYoutubePlaylistType: (value: PlaylistType) => void;
  fetchingYouTubePlaylist: boolean;
  onFetchYouTubePlaylist: () => void;
  onCsvFileChange: (file: File | null) => void;
}) {
  const showMapping = csvText && importSource !== "youtube_playlist" && parsedHeaders.length > 0;

  return (
    <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="YouTube Playlist" meta={importSource === "youtube_playlist" ? `${activeImportPreparation.rows.length} ready` : undefined}>
            <div className="grid gap-3">
              <Input value={youtubePlaylistUrl} onChange={(e) => setYoutubePlaylistUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." />
              <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <Select value={youtubePlaylistType} onValueChange={(value) => setYoutubePlaylistType(value as PlaylistType)}>
                  <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectGroup>
                      <SelectItem value="youtube">Video</SelectItem>
                      <SelectItem value="podcast">Podcast</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button type="button" onClick={onFetchYouTubePlaylist} disabled={!youtubePlaylistUrl.trim() || fetchingYouTubePlaylist}>
                  {fetchingYouTubePlaylist ? "Fetching..." : "Fetch playlist"}
                </Button>
              </div>
            </div>
          </Panel>

          <Panel title="Upload Export" meta={csvFileName || undefined}>
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {importSources
                  .filter((source) => source.status === "available" && source.id !== "youtube_playlist")
                  .map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => setImportSource(source.id as ImportSourceId)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                        importSource === source.id
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-[hsl(var(--border))] bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {source.label}
                    </button>
                  ))}
              </div>
              <Input
                type="file"
                accept=".csv,text/csv,.json,application/json,.html,text/html,.xml,.opml,text/xml"
                onChange={(e) => onCsvFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </Panel>
        </div>

        {showMapping ? (
          <details className="rounded-[20px] border border-[hsl(var(--border))] bg-card p-4" open={manualMappingEnabled}>
            <summary className="cursor-pointer text-sm font-semibold text-foreground">
              Field mapping {manualMappingEnabled ? "enabled" : "optional"}
            </summary>
            <div className="mt-4 grid gap-4">
              <div className="flex flex-wrap gap-2">
                {parsedHeaders.map((header) => <Badge key={header} variant="outline">{header}</Badge>)}
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={manualMappingEnabled}
                  onChange={(e) => setManualMappingEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-[hsl(var(--border))] bg-card text-primary focus:ring-primary"
                />
                <span>Use manual mapping for this file</span>
              </label>
              {manualMappingEnabled ? (
                <ManualMappingGrid mapping={manualMapping} setMapping={setManualMapping} headers={parsedHeaders} />
              ) : null}
            </div>
          </details>
        ) : null}

        <ImportPreviewPanel preparation={activeImportPreparation} result={csvImportResult} />
      </div>

      <RecentJobsPanel jobs={importJobs} />
    </div>
  );
}

function ItemDetailsForm({ form, setField }: { form: ItemDraft; setField: (field: keyof ItemDraft, value: string) => void }) {
  return (
    <Panel title="Details">
      <div className="grid gap-4 xl:grid-cols-2">
        <Field label="Title">
          <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Title" required />
        </Field>
        <Field label="Creator">
          <Input value={form.creator} onChange={(e) => setField("creator", e.target.value)} placeholder="Author, director, channel..." />
        </Field>
        <Field label="Content Type">
          <ContentTypeSelect value={form.contentType} onChange={(value) => setField("contentType", value)} />
        </Field>
        <Field label="Status">
          <StatusSelect value={form.status} onChange={(value) => setField("status", value)} />
        </Field>
        <Field label="Release Date">
          <Input type="date" value={form.releaseDate} onChange={(e) => setField("releaseDate", e.target.value)} />
        </Field>
        <Field label="Rating">
          <Input type="number" min="1" max="5" value={form.rating} onChange={(e) => setField("rating", e.target.value)} placeholder="1-5" />
        </Field>
        {form.status === "finished" ? (
          <Field label="Finished Date">
            <Input type="date" value={form.finishedDate} onChange={(e) => setField("finishedDate", e.target.value)} />
          </Field>
        ) : null}
      </div>

      <details className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.25)] p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">More fields</summary>
        <div className="mt-4 grid gap-4">
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
        </div>
      </details>
    </Panel>
  );
}

function ItemPreview({ form }: { form: ItemDraft }) {
  return (
    <aside className="min-w-0 2xl:sticky 2xl:top-0">
      <Panel title="Preview" meta={CONTENT_TYPES.find((type) => type.id === form.contentType)?.label ?? form.contentType}>
        <div className="cover-frame flex aspect-[16/10] max-h-[360px] items-center justify-center overflow-hidden rounded-[18px] 2xl:aspect-[4/3]">
          {form.coverUrl ? (
            <img src={form.coverUrl} alt={form.title || "cover"} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl">{CONTENT_TYPES.find((type) => type.id === form.contentType)?.icon ?? "📄"}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{CONTENT_TYPES.find((type) => type.id === form.contentType)?.label ?? form.contentType}</Badge>
          <Badge variant="secondary">{STATUSES.find((status) => status.id === form.status)?.label ?? form.status}</Badge>
        </div>
        <div>
          <h3 className="text-2xl font-semibold leading-tight text-foreground">{form.title || "Untitled item"}</h3>
          {form.creator ? <p className="mt-1 text-sm text-muted-foreground">{form.creator}</p> : null}
        </div>
        <p className="line-clamp-5 text-sm text-muted-foreground">{form.description || "Metadata appears here as soon as it is fetched or entered."}</p>
      </Panel>
    </aside>
  );
}

function SearchSuggestions({
  suggestions,
  resolving,
  onSelect,
}: {
  suggestions: SearchSuggestion[];
  resolving: boolean;
  onSelect: (suggestion: SearchSuggestion) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="grid gap-2">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.provider}-${suggestion.externalId ?? suggestion.sourceUrl ?? index}`}
          type="button"
          onClick={() => onSelect(suggestion)}
          className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-[16px] border border-[hsl(var(--border))] bg-card p-3 text-left transition-colors hover:bg-secondary"
        >
          <div className="cover-frame flex h-12 w-12 items-center justify-center overflow-hidden rounded-[12px]">
            {suggestion.coverUrl ? (
              <img src={suggestion.coverUrl} alt={suggestion.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl">{CONTENT_TYPES.find((type) => type.id === suggestion.contentType)?.icon ?? "📄"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{suggestion.title}</p>
              <Badge variant="outline">{CONTENT_TYPES.find((type) => type.id === suggestion.contentType)?.label ?? suggestion.contentType}</Badge>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {[suggestion.creator, suggestion.releaseDate].filter(Boolean).join(" · ") || suggestion.provider}
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">{resolving ? "Loading..." : "Select"}</span>
        </button>
      ))}
    </div>
  );
}

function ImportPreviewPanel({
  preparation,
  result,
}: {
  preparation: PreparedImportResult | YouTubePlaylistImportPreview;
  result: BulkImportResult | null;
}) {
  const hasContent = preparation.rows.length > 0 || preparation.errors.length > 0 || Boolean(result);
  if (!hasContent) {
    return (
      <Panel title="Import Preview">
        <p className="text-sm text-muted-foreground">Fetch a playlist or upload an export file to review rows before importing.</p>
      </Panel>
    );
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Import Preview" meta={`${preparation.rows.length} ready`}>
        <div className="grid gap-3">
          {preparation.preview.map((row) => (
            <div key={row.rowNumber} className="rounded-[16px] border border-[hsl(var(--border))] bg-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Row {row.rowNumber}</Badge>
                <Badge variant="secondary">{CONTENT_TYPES.find((type) => type.id === row.contentType)?.label ?? row.contentType}</Badge>
                <Badge variant="outline">{STATUSES.find((status) => status.id === row.status)?.label ?? row.status}</Badge>
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{row.title}</p>
              {row.creator ? <p className="text-xs text-muted-foreground">{row.creator}</p> : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Validation" meta={preparation.errors.length ? `${preparation.errors.length} issue${preparation.errors.length === 1 ? "" : "s"}` : "Clear"}>
        {preparation.errors.length > 0 ? (
          <div className="grid gap-2">
            {preparation.errors.slice(0, 8).map((entry) => (
              <div key={`${entry.row}-${entry.error}`} className="rounded-[14px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Row {entry.row}: {entry.error}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">No validation issues.</div>
        )}
        {result ? <ImportResult result={result} /> : null}
      </Panel>
    </div>
  );
}

function ImportResult({ result }: { result: BulkImportResult }) {
  return (
    <div className="mt-4 grid gap-3 rounded-[16px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.3)] p-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{result.createdCount} imported</Badge>
        <Badge variant="outline">{result.duplicateCount} duplicates</Badge>
        <Badge variant="outline">{result.failedCount} failed</Badge>
      </div>
      {result.duplicates.slice(0, 5).map((entry) => (
        <p key={`${entry.row}-${entry.duplicate.id}`} className="text-xs text-muted-foreground">
          Row {entry.row}: matched "{entry.duplicate.title}" via {entry.duplicate.reason.replace("_", " ")}.
        </p>
      ))}
      {result.errors.slice(0, 5).map((entry) => (
        <p key={`${entry.row}-${entry.error}`} className="text-xs text-muted-foreground">Row {entry.row}: {entry.error}</p>
      ))}
      {!result.errors.length && !result.duplicates.length ? <p className="text-xs text-muted-foreground">Everything imported successfully.</p> : null}
    </div>
  );
}

function RecentJobsPanel({
  jobs,
}: {
  jobs: Array<{ id: string; sourceLabel: string; status: string; createdCount: number; duplicateCount: number; failedCount: number }>;
}) {
  return (
    <aside className="min-w-0 2xl:sticky 2xl:top-0">
      <Panel title="Recent Jobs">
        <div className="grid gap-3">
          {jobs.slice(0, 5).map((job) => (
            <div key={job.id} className="rounded-[16px] border border-[hsl(var(--border))] bg-card px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-foreground">{job.sourceLabel}</p>
                <Badge variant={job.status === "completed" ? "secondary" : "outline"}>{job.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.createdCount} created · {job.duplicateCount} duplicates · {job.failedCount} failed
              </p>
            </div>
          ))}
          {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No import jobs yet.</p> : null}
        </div>
      </Panel>
    </aside>
  );
}

function ManualMappingGrid({
  mapping,
  setMapping,
  headers,
}: {
  mapping: ManualCsvMapping;
  setMapping: React.Dispatch<React.SetStateAction<ManualCsvMapping>>;
  headers: string[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      <MappingField label="Title column" value={mapping.title} onChange={(value) => setMapping((prev) => ({ ...prev, title: value }))} headers={headers} />
      <MappingField label="Creator column" value={mapping.creator} onChange={(value) => setMapping((prev) => ({ ...prev, creator: value }))} headers={headers} />
      <Field label="Fixed creator">
        <Input value={mapping.fixedCreator} onChange={(e) => setMapping((prev) => ({ ...prev, fixedCreator: e.target.value }))} />
      </Field>
      <MappingField label="Release date / year" value={mapping.releaseDate} onChange={(value) => setMapping((prev) => ({ ...prev, releaseDate: value }))} headers={headers} />
      <Field label="Fixed release date / year">
        <Input value={mapping.fixedReleaseDate} onChange={(e) => setMapping((prev) => ({ ...prev, fixedReleaseDate: e.target.value }))} />
      </Field>
      <MappingField label="Source URL" value={mapping.sourceUrl} onChange={(value) => setMapping((prev) => ({ ...prev, sourceUrl: value }))} headers={headers} />
      <Field label="Fixed source URL">
        <Input value={mapping.fixedSourceUrl} onChange={(e) => setMapping((prev) => ({ ...prev, fixedSourceUrl: e.target.value }))} />
      </Field>
      <MappingField label="Status column" value={mapping.status} onChange={(value) => setMapping((prev) => ({ ...prev, status: value }))} headers={headers} />
      <Field label="Fixed status">
        <StatusSelect value={mapping.fixedStatus || "__none__"} includeNone onChange={(value) => setMapping((prev) => ({ ...prev, fixedStatus: value === "__none__" ? "" : (value as StatusId) }))} />
      </Field>
      <MappingField label="Content type column" value={mapping.contentType} onChange={(value) => setMapping((prev) => ({ ...prev, contentType: value }))} headers={headers} />
      <Field label="Fixed content type">
        <ContentTypeSelect value={mapping.fixedContentType || "__none__"} includeNone onChange={(value) => setMapping((prev) => ({ ...prev, fixedContentType: value === "__none__" ? "" : (value as ContentTypeId) }))} />
      </Field>
      <MappingField label="Rating column" value={mapping.rating} onChange={(value) => setMapping((prev) => ({ ...prev, rating: value }))} headers={headers} />
      <Field label="Fixed rating">
        <Input value={mapping.fixedRating} onChange={(e) => setMapping((prev) => ({ ...prev, fixedRating: e.target.value }))} placeholder="1-5" />
      </Field>
      <MappingField label="Description column" value={mapping.description} onChange={(value) => setMapping((prev) => ({ ...prev, description: value }))} headers={headers} />
      <Field label="Fixed description">
        <Textarea value={mapping.fixedDescription} onChange={(e) => setMapping((prev) => ({ ...prev, fixedDescription: e.target.value }))} />
      </Field>
      <MappingField label="Cover URL column" value={mapping.coverUrl} onChange={(value) => setMapping((prev) => ({ ...prev, coverUrl: value }))} headers={headers} />
      <Field label="Fixed cover URL">
        <Input value={mapping.fixedCoverUrl} onChange={(e) => setMapping((prev) => ({ ...prev, fixedCoverUrl: e.target.value }))} />
      </Field>
      <MappingField label="Notes column" value={mapping.notes} onChange={(value) => setMapping((prev) => ({ ...prev, notes: value }))} headers={headers} />
      <Field label="Fixed notes">
        <Textarea value={mapping.fixedNotes} onChange={(e) => setMapping((prev) => ({ ...prev, fixedNotes: e.target.value }))} />
      </Field>
    </div>
  );
}

function DuplicateNotice({ duplicate }: { duplicate: DuplicateItemSummary }) {
  return (
    <div className="rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Potential duplicate detected</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This item matches <span className="font-medium text-foreground">{duplicate.title}</span> by {duplicate.reason.replace("_", " ")}.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => { window.location.href = `/item/${duplicate.id}`; }}>
          Open existing
        </Button>
      </div>
    </div>
  );
}

function FooterHint({ form }: { form: ItemDraft }) {
  return (
    <p className="text-sm text-muted-foreground">
      {form.title.trim() ? `Ready to save "${form.title.trim()}".` : "Add a title to enable saving."}
    </p>
  );
}

function SourceHint() {
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer font-semibold text-foreground">Supported URLs</summary>
      <div className="mt-2 flex max-w-xl flex-wrap gap-x-3 gap-y-1">
        {AUTO_DETECT_SOURCES.map((entry) => (
          <span key={entry.type}>{entry.label}: {entry.examples[0]}</span>
        ))}
      </div>
    </details>
  );
}

function Panel({
  title,
  meta,
  aside,
  children,
}: {
  title: string;
  meta?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-4 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-subtle)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {meta ? <p className="mt-1 text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
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

function ContentTypeSelect({
  value,
  onChange,
  includeNone,
}: {
  value: ContentTypeId | "__none__";
  onChange: (value: ContentTypeId | "__none__") => void;
  includeNone?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as ContentTypeId | "__none__")}>
      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-card">
        <SelectGroup>
          {includeNone ? <SelectItem value="__none__">No fixed type</SelectItem> : null}
          {CONTENT_TYPES.map((type) => (
            <SelectItem key={type.id} value={type.id}>{type.icon} {type.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function StatusSelect({
  value,
  onChange,
  includeNone,
}: {
  value: StatusId | "__none__";
  onChange: (value: StatusId | "__none__") => void;
  includeNone?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as StatusId | "__none__")}>
      <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
      <SelectContent className="bg-card">
        <SelectGroup>
          {includeNone ? <SelectItem value="__none__">No fixed status</SelectItem> : null}
          {STATUSES.map((status) => (
            <SelectItem key={status.id} value={status.id}>{status.label}</SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
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
        <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-card">
          <SelectGroup>
            <SelectItem value="__none__">Not mapped</SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>{header}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
