import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";

import { useAiJobs, useDeleteAiJob, useRepeatAiJob, useRetryAiJob } from "../hooks/useAI";
import { useDuplicateGroups, useMergeItems } from "../hooks/useItems";
import { useReminders, useUpdateReminder } from "../hooks/useReminders";
import { useTags, useDeleteTag } from "../hooks/useTags";
import {
  useClearAiCache,
  useUpdateAiPrompts,
  useUpdateInterestProfiles,
  useTestAiModel,
  useTestApiKey,
  useUpdateApiKey,
  useUpdateProfile,
  useUserProfile,
  useUserSettings,
} from "../hooks/useUser";
import { userApi, type AiPrompts, type InterestProfiles, type InterestWeight } from "../lib/api";
import { CONTENT_TYPES } from "../lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Trash2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const API_KEY_SERVICES = [
  { id: "gemini", label: "Gemini API Key", description: "Used for item analysis and scoring." },
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-5xl font-semibold leading-none tracking-[-0.05em]">Settings</h1>
          <Badge variant="secondary">personal</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Tune your profile, plug in your own API keys, pick an AI model, manage tags, and maintain your data.
        </p>
      </div>

      <Tabs defaultValue="profile" className="flex flex-col gap-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none mb-4">
          {[
            { id: "profile", label: "Profile" },
            { id: "apikeys", label: "API Keys" },
            { id: "aimodel", label: "AI Model" },
            { id: "interests", label: "Interests" },
            { id: "reminders", label: "Reminders" },
            { id: "duplicates", label: "Duplicates" },
            { id: "tags", label: "Tags" },
            { id: "data", label: "Data" },
          ].map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="rounded-full px-5 py-2 font-medium transition-all data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-md data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-card border border-transparent data-[state=inactive]:border-[hsl(var(--border)_/_0.8)] data-[state=inactive]:text-muted-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="apikeys" className="mt-0">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="aimodel" className="mt-0">
          <AiModelTab />
        </TabsContent>
        <TabsContent value="interests" className="mt-0">
          <InterestProfilesTab />
        </TabsContent>
        <TabsContent value="reminders" className="mt-0">
          <RemindersTab />
        </TabsContent>
        <TabsContent value="duplicates" className="mt-0">
          <DuplicateReviewTab />
        </TabsContent>
        <TabsContent value="tags" className="mt-0">
          <TagsTab />
        </TabsContent>
        <TabsContent value="data" className="mt-0">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const INTEREST_WEIGHTS: Array<{ id: InterestWeight; label: string }> = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function RemindersTab() {
  const { data, isLoading } = useReminders();
  const { mutate: updateReminder, isPending } = useUpdateReminder();
  const reminders = data?.reminders ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder Inbox</CardTitle>
        <CardDescription>
          Review resurfaced items that have gone stale, stalled in progress, or sat too long despite a strong score.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading reminders…</div>
        ) : reminders.length > 0 ? (
          reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.2)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-foreground">{reminder.title}</div>
                    <Badge variant="secondary">{reminder.ageDays}d</Badge>
                    <Badge variant="outline">{reminder.item.contentType}</Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{reminder.message}</div>
                </div>
                <Link
                  to="/item/$id"
                  params={{ id: reminder.item.id }}
                  className="rounded-full border border-[hsl(var(--border))] px-3 py-1.5 text-sm font-medium text-foreground no-underline hover:bg-card"
                >
                  Open item
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => updateReminder({ itemId: reminder.item.id, type: reminder.type, action: "snooze" })}
                >
                  Snooze 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => updateReminder({ itemId: reminder.item.id, type: reminder.type, action: "dismiss" })}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-dashed border-[hsl(var(--border))] p-5 text-sm text-muted-foreground">
            No active reminders right now.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InterestProfilesTab() {
  const { data: settings } = useUserSettings();
  const { mutate: saveProfiles, isPending } = useUpdateInterestProfiles();
  const [profiles, setProfiles] = useState<InterestProfiles>({});
  const profilesRef = useRef<InterestProfiles>({});
  const [drafts, setDrafts] = useState<Record<string, { label: string; weight: InterestWeight }>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const nextProfiles = settings?.interestProfiles ?? {};
    profilesRef.current = nextProfiles;
    setProfiles(nextProfiles);
  }, [settings?.interestProfiles]);

  function setProfilesState(next: InterestProfiles | ((current: InterestProfiles) => InterestProfiles)) {
    setProfiles((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      profilesRef.current = resolved;
      return resolved;
    });
  }

  function updateDraft(contentType: string, key: "label" | "weight", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [contentType]: {
        label: prev[contentType]?.label ?? "",
        weight: (prev[contentType]?.weight ?? "medium") as InterestWeight,
        [key]: value,
      },
    }));
  }

  function addChip(contentType: string) {
    const draft = drafts[contentType];
    const label = draft?.label?.trim();
    if (!label) return;

    setProfilesState((prev) => {
      const current = prev[contentType as keyof InterestProfiles] ?? [];
      return {
        ...prev,
        [contentType]: [
          ...current,
          {
            id: crypto.randomUUID(),
            label,
            weight: (draft?.weight ?? "medium") as InterestWeight,
          },
        ],
      };
    });

    setDrafts((prev) => ({
      ...prev,
      [contentType]: { label: "", weight: (draft?.weight ?? "medium") as InterestWeight },
    }));
  }

  function removeChip(contentType: string, id: string) {
    setProfilesState((prev) => ({
      ...prev,
      [contentType]: (prev[contentType as keyof InterestProfiles] ?? []).filter((chip) => chip.id !== id),
    }));
  }

  function updateChipWeight(contentType: string, id: string, weight: InterestWeight) {
    setProfilesState((prev) => ({
      ...prev,
      [contentType]: (prev[contentType as keyof InterestProfiles] ?? []).map((chip) =>
        chip.id === id ? { ...chip, weight } : chip
      ),
    }));
  }

  function handleSave() {
    saveProfiles(profilesRef.current, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 1800);
      },
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Interest Profiles</CardTitle>
          <CardDescription>
            Define what each media type should optimize for. These weighted chips are used when the AI scores new items for next-to-consume.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {CONTENT_TYPES.map((type) => {
            const chips = profiles[type.id] ?? [];
            const draft = drafts[type.id] ?? { label: "", weight: "medium" as InterestWeight };

            return (
              <div key={type.id} className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="text-2xl">{type.icon}</div>
                  <div>
                    <div className="font-semibold text-foreground">{type.label}</div>
                    <div className="text-sm text-muted-foreground">Used only for {type.label.toLowerCase()} suggestions.</div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {chips.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No interests added yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) => (
                        <DropdownMenu key={chip.id}>
                          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--border)_/_0.6)] bg-card/60 px-3 py-1.5 text-[0.85rem] font-medium text-foreground transition-all hover:bg-card hover:border-[hsl(var(--primary)_/_0.4)] hover:shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                            {chip.label}
                            <div className={`ml-1 size-2 rounded-full ${
                              chip.weight === "high" ? "bg-[hsl(var(--destructive))] shadow-[0_0_8px_hsl(var(--destructive)_/_0.3)]" : 
                              chip.weight === "medium" ? "bg-[hsl(var(--warm-accent))] shadow-[0_0_8px_hsl(var(--warm-accent)_/_0.3)]" : 
                              "bg-[hsl(var(--success))] shadow-[0_0_8px_hsl(var(--success)_/_0.3)]"
                            }`} title={`Weight: ${chip.weight}`} />
                            <ChevronDown className="size-3 text-muted-foreground opacity-70" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[140px] rounded-[18px]">
                            <DropdownMenuLabel className="text-xs opacity-70">Weight</DropdownMenuLabel>
                            {INTEREST_WEIGHTS.map((w) => (
                              <DropdownMenuItem 
                                key={w.id} 
                                onClick={() => updateChipWeight(type.id, chip.id, w.id)}
                                className="flex items-center justify-between text-xs rounded-xl"
                              >
                                {w.label}
                                {chip.weight === w.id && <div className="size-1.5 rounded-full bg-[hsl(var(--primary))]" />}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator className="bg-[hsl(var(--border)_/_0.5)]" />
                            <DropdownMenuItem 
                              onClick={() => removeChip(type.id, chip.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 text-xs rounded-xl"
                            >
                              <Trash2 className="size-3" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-[hsl(var(--border)_/_0.3)]">
                    <Input
                      value={draft.label}
                      onChange={(e) => updateDraft(type.id, "label", e.target.value)}
                      placeholder={`Add new...`}
                      className="h-8 max-w-[180px] rounded-full px-4 text-xs bg-transparent border-[hsl(var(--border)_/_0.6)] focus-visible:ring-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addChip(type.id);
                      }}
                    />
                    <Select value={draft.weight} onValueChange={(value) => updateDraft(type.id, "weight", value)}>
                      <SelectTrigger className="h-8 w-[100px] rounded-full text-xs bg-transparent border-[hsl(var(--border)_/_0.6)] focus:ring-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-[18px]">
                        <SelectGroup>
                          {INTEREST_WEIGHTS.map((weight) => (
                            <SelectItem key={weight.id} value={weight.id} className="text-xs rounded-xl">
                              {weight.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => addChip(type.id)} size="sm" className="h-8 rounded-full px-4 text-[11px] font-bold shadow-none uppercase tracking-wider">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isPending}>
              Save interest profiles
            </Button>
            {saved ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
        </CardContent>
      </Card>
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
  const { mutate: updateAiPrompts, isPending: savingPrompts } = useUpdateAiPrompts();
  const { mutate: testModel, isPending: testingModel } = useTestAiModel();
  const [selected, setSelected] = useState("gemini-2.5-flash-lite");
  const [queueInterval, setQueueInterval] = useState("60");
  const [aiPrompts, setAiPrompts] = useState<AiPrompts>({ analyze: "", score: "" });
  const [saved, setSaved] = useState<"model" | "queue" | null>(null);
  const [promptsSaved, setPromptsSaved] = useState(false);
  const [modelTestMessage, setModelTestMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelected(settings?.aiModel ?? "gemini-2.5-flash-lite");
    setQueueInterval(String(settings?.aiQueueIntervalMinutes ?? 60));
    setAiPrompts(
      settings?.aiPrompts ?? {
        analyze: "",
        score: "",
      }
    );
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

  function handleTestModel() {
    testModel(
      { model: selected },
      {
        onSuccess: (result) => setModelTestMessage(result.message),
        onError: (error) => setModelTestMessage(error.message),
      }
    );
  }

  function handleSavePrompts() {
    updateAiPrompts(aiPrompts, {
      onSuccess: () => {
        setPromptsSaved(true);
        setTimeout(() => setPromptsSaved(false), 1800);
      },
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Model Selection</CardTitle>
          <CardDescription>Choose the backend-supported model used for item analysis and scoring jobs.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadioGroup value={selected} onValueChange={setSelected} className="gap-4">
            {(settings?.aiModels ?? []).map((model) => (
              <Label
                key={model.id}
                htmlFor={model.id}
                className="flex cursor-pointer items-start gap-4 rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.85)]"
              >
                <RadioGroupItem id={model.id} value={model.id} className="mt-1 size-5 border-[hsl(var(--border-strong))]" />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{model.label}</span>
                    <Badge variant={model.supportLevel === "experimental" ? "outline" : "secondary"}>
                      {model.supportLevel}
                    </Badge>
                    <Badge variant="outline">{model.family}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{model.description}</span>
                  <span className="text-xs text-muted-foreground">
                    Analyze: {model.capabilities.analyze === "schema" ? "schema JSON" : "prompt JSON"} · Score: {model.capabilities.score === "schema" ? "schema JSON" : "prompt JSON"}
                  </span>
                </div>
              </Label>
            ))}
          </RadioGroup>
          <div className="flex items-center gap-3">
            <Button onClick={handleSaveModel} disabled={isPending}>
              Save model
            </Button>
            <Button onClick={handleTestModel} disabled={testingModel} variant="outline">
              {testingModel ? "Testing…" : "Test selected model"}
            </Button>
            {saved === "model" ? <span className="text-xs text-muted-foreground">Saved</span> : null}
          </div>
          {modelTestMessage ? <div className="text-xs text-muted-foreground">{modelTestMessage}</div> : null}
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
            Analysis and scoring jobs are saved in the queue, then processed automatically after this delay. The default is 60 minutes.
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
          <CardTitle>AI Prompt Templates</CardTitle>
          <CardDescription>
            These prompt templates are used for the two supported AI actions. The system automatically appends the item metadata and interest profile context before sending the request.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="analyze-prompt">Analyze prompt</Label>
              <Textarea
                id="analyze-prompt"
                value={aiPrompts.analyze}
                onChange={(e) => setAiPrompts((prev) => ({ ...prev, analyze: e.target.value }))}
                className="min-h-44"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="score-prompt">Score prompt</Label>
              <Textarea
                id="score-prompt"
                value={aiPrompts.score}
                onChange={(e) => setAiPrompts((prev) => ({ ...prev, score: e.target.value }))}
                className="min-h-44"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSavePrompts} disabled={savingPrompts}>
              Save prompts
            </Button>
            {promptsSaved ? <span className="text-xs text-muted-foreground">Saved</span> : null}
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
  const { mutate: repeatJob, isPending: repeating } = useRepeatAiJob();
  const { mutate: deleteJob, isPending: deleting } = useDeleteAiJob();
  const jobs = data?.jobs ?? [];
  const queuedJobs = jobs.filter((job: (typeof jobs)[number]) => job.status === "queued");
  const failedJobs = jobs.filter((job: (typeof jobs)[number]) => job.status === "failed");
  const completedJobs = jobs.filter((job: (typeof jobs)[number]) => job.status === "completed");

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
          {queuedJobs.length} queued,{" "}
          {jobs.filter((job: (typeof jobs)[number]) => job.status === "processing").length} processing,{" "}
          {failedJobs.length} failed
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          Refresh queue
        </Button>
      </div>

      <Tabs defaultValue="queued" className="flex flex-col gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0 shadow-none">
          <TabsTrigger value="queued" className="border border-[hsl(var(--border))] bg-card shadow-none">
            Queued {queuedJobs.length}
          </TabsTrigger>
          <TabsTrigger value="failed" className="border border-[hsl(var(--border))] bg-card shadow-none">
            Failed {failedJobs.length}
          </TabsTrigger>
          <TabsTrigger value="completed" className="border border-[hsl(var(--border))] bg-card shadow-none">
            Completed {completedJobs.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queued" className="mt-0">
          <QueueJobList
            jobs={queuedJobs}
            emptyLabel="No queued jobs."
            onDelete={(jobId) => deleteJob(jobId)}
            deleting={deleting}
          />
        </TabsContent>

        <TabsContent value="failed" className="mt-0">
          <QueueJobList
            jobs={failedJobs}
            emptyLabel="No failed jobs."
            onRetry={(jobId) => retryJob(jobId)}
            retrying={retrying}
            onDelete={(jobId) => deleteJob(jobId)}
            deleting={deleting}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <QueueJobList
            jobs={completedJobs}
            emptyLabel="No completed jobs yet."
            onRepeat={(jobId) => repeatJob(jobId)}
            repeating={repeating}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QueueJobList({
  jobs,
  emptyLabel,
  onRetry,
  retrying,
  onRepeat,
  repeating,
  onDelete,
  deleting,
}: {
  jobs: Array<{
    id: string;
    itemId?: string | null;
    itemTitle?: string | null;
    jobType: "analyze_item" | "score_item";
    status: "queued" | "processing" | "completed" | "failed";
    runAfter: number;
    completedAt: number | null;
    lastError: string | null;
    result: unknown | null;
    modelUsed: string | null;
    modelFamily: "gemini" | "gemma" | null;
    supportLevel: "stable" | "experimental" | null;
    attempts: number;
    createdAt: number;
    updatedAt: number;
  }>;
  emptyLabel: string;
  onRetry?: (jobId: string) => void;
  retrying?: boolean;
  onRepeat?: (jobId: string) => void;
  repeating?: boolean;
  onDelete?: (jobId: string) => void;
  deleting?: boolean;
}) {
  if (jobs.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {jobs.map((job) => {
        const title =
          job.jobType === "analyze_item"
            ? "Item analysis"
            : "Suggest score";

        const itemLabel = job.itemTitle ?? "Untitled item";
        const metaLabel =
          job.status === "completed" && job.completedAt
            ? `Completed ${new Date(job.completedAt).toLocaleString()}`
            : job.status === "queued"
              ? `Runs ${new Date(job.runAfter).toLocaleString()}`
              : `Updated ${new Date(job.updatedAt).toLocaleString()}`;

        return (
          <div
            key={job.id}
            className="rounded-[18px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{title}</span>
                  <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "secondary" : "outline"}>
                    {job.status.replace("_", " ")}
                  </Badge>
                  <span className="truncate text-sm text-muted-foreground">{itemLabel}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Attempts {job.attempts} · {metaLabel}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {job.status === "failed" && onRetry ? (
                  <Button variant="outline" size="sm" onClick={() => onRetry(job.id)} disabled={retrying}>
                    {retrying ? "Retrying…" : "Retry"}
                  </Button>
                ) : null}
                {job.status === "completed" && onRepeat ? (
                  <Button variant="outline" size="sm" onClick={() => onRepeat(job.id)} disabled={repeating}>
                    {repeating ? "Repeating…" : "Repeat"}
                  </Button>
                ) : null}
                {(job.status === "failed" || job.status === "queued") && onDelete ? (
                  <Button variant="outline" size="sm" onClick={() => onDelete(job.id)} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete"}
                  </Button>
                ) : null}
              </div>
            </div>

            {job.lastError ? (
              <div className="mt-2 rounded-[14px] bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {job.lastError}
              </div>
            ) : null}
            {job.modelUsed || job.result ? (
              <div className="mt-2 rounded-[14px] border border-[hsl(var(--border))] bg-card/70 px-3 py-2 text-xs text-muted-foreground">
                {job.modelUsed ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Model: {job.modelUsed}</span>
                    {job.modelFamily ? <Badge variant="outline">{job.modelFamily}</Badge> : null}
                    {job.supportLevel ? (
                      <Badge variant={job.supportLevel === "experimental" ? "outline" : "secondary"}>
                        {job.supportLevel}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                {job.result ? (
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px]">
                    {JSON.stringify(job.result, null, 2)}
                  </pre>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
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

function DuplicateReviewTab() {
  const { data, isLoading, refetch } = useDuplicateGroups();
  const { mutate: mergeItems, isPending: merging } = useMergeItems();
  const groups = data?.groups ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate Review</CardTitle>
        <CardDescription>
          Review likely duplicates across your library and merge them without cleaning everything up by hand.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {groups.length} duplicate group{groups.length === 1 ? "" : "s"} found
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh duplicates
          </Button>
        </div>

        {isLoading ? <div className="text-sm text-muted-foreground">Scanning for duplicates…</div> : null}
        {!isLoading && groups.length === 0 ? (
          <div className="text-sm text-muted-foreground">No duplicate groups detected right now.</div>
        ) : null}

        {groups.map((group) => {
          const [target, ...sources] = group.items;
          if (!target) return null;

          return (
            <div key={group.id} className="rounded-[24px] border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.35)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Duplicate group</p>
                  <p className="text-xs text-muted-foreground">Matched by {group.reason.replace("_", " ")}.</p>
                </div>
                <Badge variant="outline">{group.items.length} items</Badge>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-[18px] border border-[hsl(var(--border))] bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{target.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Keep target · {target.creator ?? "Unknown creator"} · {target.status.replace("_", " ")}
                      </p>
                    </div>
                    <Link to="/item/$id" params={{ id: target.id }} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground no-underline">
                      Open
                    </Link>
                  </div>
                </div>

                {sources.map((source) => (
                  <div key={source.id} className="rounded-[18px] border border-[hsl(var(--border))] bg-card px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{source.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Merge into target · {source.creator ?? "Unknown creator"} · {source.status.replace("_", " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to="/item/$id" params={{ id: source.id }} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground no-underline">
                          Open
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            mergeItems(
                              { sourceId: source.id, targetId: target.id },
                              {
                                onSuccess: () => refetch(),
                              }
                            )
                          }
                          disabled={merging}
                        >
                          {merging ? "Merging…" : "Merge"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
