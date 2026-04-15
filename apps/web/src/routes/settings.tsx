import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAiJobs, useRetryAiJob } from "../hooks/useAI";
import { useTags, useDeleteTag } from "../hooks/useTags";
import {
  useClearAiCache,
  useTestApiKey,
  useUpdateApiKey,
  useUpdateProfile,
  useUserProfile,
  useUserSettings,
} from "../hooks/useUser";
import { userApi } from "../lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const AI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Recommended balance of speed and quality." },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", description: "Fastest and lightest option." },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Most capable model for deeper reasoning." },
];

const API_KEY_SERVICES = [
  { id: "gemini", label: "Gemini API Key", description: "Used for categorization, analysis, and ranking." },
  { id: "tmdb", label: "TMDB API Key", description: "Used for movie and TV metadata." },
  { id: "youtube", label: "YouTube API Key", description: "Used for YouTube metadata." },
  { id: "googleBooks", label: "Google Books API Key", description: "Used for fallback book metadata." },
  { id: "podcastIndexKey", label: "Podcast Index Key", description: "Used for podcast search and metadata." },
  { id: "podcastIndexSecret", label: "Podcast Index Secret", description: "Pairs with the Podcast Index Key." },
] as const;

function SettingsPage() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <p className="hero-kicker text-xs">Control room</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-5xl font-semibold leading-none tracking-[-0.05em]">Settings</h1>
            <Badge variant="secondary">personal</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Tune your profile, plug in your own API keys, pick an AI model, manage tags, and maintain your data.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="flex flex-col gap-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none">
          <TabsTrigger value="profile" className="border border-[hsl(var(--border))] bg-card shadow-none">Profile</TabsTrigger>
          <TabsTrigger value="apikeys" className="border border-[hsl(var(--border))] bg-card shadow-none">API Keys</TabsTrigger>
          <TabsTrigger value="aimodel" className="border border-[hsl(var(--border))] bg-card shadow-none">AI Model</TabsTrigger>
          <TabsTrigger value="tags" className="border border-[hsl(var(--border))] bg-card shadow-none">Tags</TabsTrigger>
          <TabsTrigger value="data" className="border border-[hsl(var(--border))] bg-card shadow-none">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="aimodel">
          <AiModelTab />
        </TabsContent>
        <TabsContent value="tags">
          <TagsTab />
        </TabsContent>
        <TabsContent value="data">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab({ profile }: { profile?: { name: string; email: string; preferences: string | null } }) {
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [preferences, setPreferences] = useState(profile?.preferences ?? "");
  const [saved, setSaved] = useState<"name" | "preferences" | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPreferences(profile.preferences ?? "");
    }
  }, [profile]);

  function flash(which: "name" | "preferences") {
    setSaved(which);
    setTimeout(() => setSaved(null), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Keep your profile details in sync across the app.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input id="display-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} readOnly className="opacity-70" />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => updateProfile({ name }, { onSuccess: () => flash("name") })}
              disabled={saving}
            >
              Save name
            </Button>
            {saved === "name" ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taste Profile</CardTitle>
          <CardDescription>Tell the AI what you lean toward so recommendations feel more personal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="taste">Preferences</Label>
            <Textarea
              id="taste"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder='I love cerebral sci-fi, essays, and stylish thrillers. I skip reality TV and gore-heavy horror.'
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => updateProfile({ preferences }, { onSuccess: () => flash("preferences") })}
              disabled={saving}
            >
              Save preferences
            </Button>
            {saved === "preferences" ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeysTab() {
  const { data: settings } = useUserSettings();
  const { mutate: updateKey, isPending } = useUpdateApiKey();
  const { mutate: testKey, isPending: testing } = useTestApiKey();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [tested, setTested] = useState<Record<string, string>>({});

  function handleSave(serviceId: string) {
    updateKey(
      { service: serviceId, key: inputs[serviceId] ?? "" },
      {
        onSuccess: () => {
          setSaved(serviceId);
          setInputs((prev) => ({ ...prev, [serviceId]: "" }));
          setTimeout(() => setSaved(null), 1800);
        },
      }
    );
  }

  function handleTest(serviceId: string) {
    const input = inputs[serviceId]?.trim();
    testKey(
      { service: serviceId, key: input || undefined },
      {
        onSuccess: (result) => {
          setTested((prev) => ({ ...prev, [serviceId]: result.message }));
        },
        onError: (err) => {
          setTested((prev) => ({ ...prev, [serviceId]: err.message }));
        },
      }
    );
  }

  return (
    <div className="grid gap-5">
      {API_KEY_SERVICES.map((svc) => {
        const isSet = settings?.[svc.id as keyof typeof settings] === "set";
        return (
          <Card key={svc.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle>{svc.label}</CardTitle>
                {isSet ? <Badge variant="secondary">saved</Badge> : <Badge variant="outline">using default</Badge>}
              </div>
              <CardDescription>{svc.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                type="password"
                value={inputs[svc.id] ?? ""}
                onChange={(e) => setInputs((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                placeholder={isSet ? "•••••••••••• already stored" : "Paste new key"}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={() => handleSave(svc.id)} disabled={isPending}>
                  Save key
                </Button>
                {svc.id === "gemini" ? (
                  <Button variant="outline" onClick={() => handleTest(svc.id)} disabled={testing}>
                    {testing ? "Testing…" : "Test key"}
                  </Button>
                ) : null}
                {isSet ? (
                  <Button variant="outline" onClick={() => updateKey({ service: svc.id, key: "" })} disabled={isPending}>
                    Clear
                  </Button>
                ) : null}
                {saved === svc.id ? <span className="text-xs text-muted-foreground">Saved</span> : null}
              </div>
              {tested[svc.id] ? <div className="text-xs text-muted-foreground">{tested[svc.id]}</div> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AiModelTab() {
  const { data: settings } = useUserSettings();
  const { mutate: updateKey, isPending } = useUpdateApiKey();
  const [selected, setSelected] = useState("gemini-2.5-flash");
  const [queueInterval, setQueueInterval] = useState("60");
  const [saved, setSaved] = useState<"model" | "queue" | null>(null);

  useEffect(() => {
    setSelected(settings?.aiModel ?? "gemini-2.5-flash");
    setQueueInterval(String(settings?.aiQueueIntervalMinutes ?? 60));
  }, [settings]);

  function handleSaveModel() {
    updateKey(
      { service: "aiModel", key: selected },
      {
        onSuccess: () => {
          setSaved("model");
          setTimeout(() => setSaved(null), 1800);
        },
      }
    );
  }

  function handleSaveQueue() {
    updateKey(
      { service: "aiQueueIntervalMinutes", key: queueInterval },
      {
        onSuccess: () => {
          setSaved("queue");
          setTimeout(() => setSaved(null), 1800);
        },
      }
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>Choose the Gemini model used for categorization, ranking, and analysis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadioGroup value={selected} onValueChange={setSelected} className="gap-4">
            {AI_MODELS.map((model) => (
              <Label
                key={model.id}
                htmlFor={model.id}
                className="flex cursor-pointer items-start gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85)]"
              >
                <RadioGroupItem id={model.id} value={model.id} className="mt-1 size-5 border-[hsl(var(--border-strong))]" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground">{model.label}</span>
                  <span className="text-sm text-muted-foreground">{model.description}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveModel} disabled={isPending}>
              Save model
            </Button>
            {saved === "model" ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Queue</CardTitle>
          <CardDescription>
            Control how long queued AI jobs wait before they are processed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="queue-interval">Queue interval (minutes)</Label>
            <Input
              id="queue-interval"
              type="number"
              min="5"
              step="5"
              value={queueInterval}
              onChange={(e) => setQueueInterval(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Analysis refreshes and next-to-consume rankings are saved as jobs, then processed automatically after this delay. The default is 60 minutes.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveQueue} disabled={isPending}>
              Save queue interval
            </Button>
            {saved === "queue" ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Queue Tasks</CardTitle>
          <CardDescription>
            Monitor queued and completed AI jobs, then retry failed tasks when needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiQueueSection />
        </CardContent>
      </Card>
    </div>
  );
}

function AiQueueSection() {
  const { data, isLoading, refetch } = useAiJobs();
  const { mutate: retryJob, isPending: retrying } = useRetryAiJob();
  const jobs = data?.jobs ?? [];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading AI queue…</div>;
  }

  if (jobs.length === 0) {
    return <div className="text-sm text-muted-foreground">No AI jobs have been created yet.</div>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {jobs.filter((job: (typeof jobs)[number]) => job.status === "queued").length} queued,{" "}
          {jobs.filter((job: (typeof jobs)[number]) => job.status === "processing").length} processing,{" "}
          {jobs.filter((job: (typeof jobs)[number]) => job.status === "failed").length} failed
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh queue
        </Button>
      </div>

      {jobs.map((job: (typeof jobs)[number]) => (
        <div
          key={job.id}
          className="flex flex-col gap-3 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {job.jobType === "analyze_item" ? "Item analysis" : "Next to consume"}
                </span>
                <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "secondary" : "outline"}>
                  {job.status.replace("_", " ")}
                </Badge>
              </div>
              {job.itemTitle ? <div className="text-sm text-foreground">{job.itemTitle}</div> : null}
              <div className="text-xs text-muted-foreground">
                Created {new Date(job.createdAt).toLocaleString()}
              </div>
            </div>

            {job.status === "failed" ? (
              <Button variant="outline" onClick={() => retryJob(job.id)} disabled={retrying}>
                {retrying ? "Retrying…" : "Retry"}
              </Button>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <div>Attempts: {job.attempts}</div>
            <div>Run after: {new Date(job.runAfter).toLocaleString()}</div>
            <div>Updated: {new Date(job.updatedAt).toLocaleString()}</div>
          </div>

          {job.lastError ? (
            <div className="rounded-[16px] bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {job.lastError}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TagsTab() {
  const { data: tags = [], isLoading } = useTags();
  const { mutate: deleteTag, isPending } = useDeleteTag();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag Library</CardTitle>
        <CardDescription>Review the tags you have created and remove the ones you no longer need.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? <div className="text-sm text-muted-foreground">Loading tags…</div> : null}
        {!isLoading && tags.length === 0 ? <div className="text-sm text-muted-foreground">No tags yet.</div> : null}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between gap-4 rounded-[20px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] px-4 py-3 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85)]"
          >
            <div className="flex items-center gap-3">
              <span className="size-4 rounded-full border border-[hsl(var(--border-strong))]" style={{ backgroundColor: tag.color }} />
              <span className="font-semibold">{tag.name}</span>
            </div>
            <Button variant="outline" onClick={() => deleteTag(tag.id)} disabled={isPending}>
              Delete
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DataTab() {
  const { mutate: clearAiCache, isPending: clearing } = useClearAiCache();
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      const response = await userApi.exportItems();
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sirajhub-export.json";
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export Library</CardTitle>
          <CardDescription>Download your tracked items as a JSON file.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing export…" : "Download export"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clear AI Cache</CardTitle>
          <CardDescription>Force fresh summaries and rankings the next time you ask the AI for them.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" onClick={() => clearAiCache(undefined, { onSuccess: (res) => setMessage(`Cleared ${res.cleared} cached items.`) })} disabled={clearing}>
            {clearing ? "Clearing…" : "Clear cache"}
          </Button>
        </CardContent>
      </Card>

      {message ? (
        <Card className="lg:col-span-2">
          <CardContent className="p-4 text-sm text-muted-foreground">{message}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
