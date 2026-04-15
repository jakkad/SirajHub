import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUserProfile, useUpdateProfile, useClearAiCache, useUserSettings, useUpdateApiKey } from "../hooks/useUser";
import { useTags, useDeleteTag } from "../hooks/useTags";
import { userApi } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const AI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Default — fast, capable, generous free tier" },
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", description: "Fastest, lowest cost — requires paid quota" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Most capable — best for complex analysis" },
];

const API_KEY_SERVICES = [
  { id: "gemini", label: "Gemini API Key", description: "For AI categorization, analysis, and ranking. Uses app default if not set." },
  { id: "tmdb", label: "TMDB API Key", description: "For fetching movie & TV show metadata." },
  { id: "youtube", label: "YouTube API Key", description: "For fetching YouTube video metadata." },
  { id: "googleBooks", label: "Google Books API Key", description: "For fetching book metadata." },
  { id: "podcastIndexKey", label: "Podcast Index Key", description: "For fetching podcast metadata." },
  { id: "podcastIndexSecret", label: "Podcast Index Secret", description: "Required alongside Podcast Index Key." },
] as const;

function SettingsPage() {
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ color: "var(--color-muted)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 28px" }}>Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6 w-full">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="apikeys">API Keys</TabsTrigger>
          <TabsTrigger value="aimodel">AI Model</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
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

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile?: { name: string; email: string; preferences: string | null } }) {
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const [name, setName] = useState(profile?.name ?? "");
  const [preferences, setPreferences] = useState(profile?.preferences ?? "");
  const [nameSaved, setNameSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPreferences(profile.preferences ?? "");
    }
  }, [profile]);

  function handleSaveName() {
    updateProfile({ name }, { onSuccess: () => { setNameSaved(true); setTimeout(() => setNameSaved(false), 2000); } });
  }

  function handleSavePreferences() {
    updateProfile({ preferences }, { onSuccess: () => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 2000); } });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Section title="Display name">
        <div style={{ display: "flex", gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <SaveButton onClick={handleSaveName} saving={saving} saved={nameSaved} />
        </div>
      </Section>

      <Section title="Email">
        <input value={profile?.email ?? ""} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: "default" }} />
      </Section>

      <Section title="AI Taste Preferences" description="Describe what you enjoy and dislike. Gemini uses this when ranking your Next to Consume list.">
        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          rows={4}
          placeholder='e.g. "I love hard sci-fi and literary fiction. I dislike horror and reality TV."'
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <div style={{ marginTop: 8 }}>
          <SaveButton onClick={handleSavePreferences} saving={saving} saved={prefSaved} />
        </div>
      </Section>
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const { data: settings } = useUserSettings();
  const { mutate: updateKey } = useUpdateApiKey();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  function handleSave(serviceId: string) {
    const val = inputs[serviceId] ?? "";
    updateKey(
      { service: serviceId, key: val },
      {
        onSuccess: () => {
          setSaved((s) => ({ ...s, [serviceId]: true }));
          setTimeout(() => setSaved((s) => ({ ...s, [serviceId]: false })), 2000);
          setInputs((prev) => ({ ...prev, [serviceId]: "" }));
        },
      }
    );
  }

  function handleClear(serviceId: string) {
    updateKey({ service: serviceId, key: "" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.6 }}>
        API keys are stored securely per-user and never returned to the client. Saved keys are shown as ●●●●●●●●.
        Leave blank and save to use the app default (where available).
      </p>

      {API_KEY_SERVICES.map((svc) => {
        const isSet = settings?.[svc.id as keyof typeof settings] === "set";
        const inputVal = inputs[svc.id] ?? "";
        return (
          <Section key={svc.id} title={svc.label} description={svc.description}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="password"
                value={inputVal}
                onChange={(e) => setInputs((prev) => ({ ...prev, [svc.id]: e.target.value }))}
                placeholder={isSet ? "●●●●●●●●●●●● (saved)" : "Paste key here…"}
                style={{ ...inputStyle, flex: 1 }}
              />
              <SaveButton
                onClick={() => handleSave(svc.id)}
                saving={false}
                saved={saved[svc.id] ?? false}
              />
              {isSet && (
                <button
                  onClick={() => handleClear(svc.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "transparent",
                    color: "oklch(65% 0.2 25)",
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {isSet && (
              <div style={{ fontSize: 11, color: "oklch(60% 0.15 150)", marginTop: 4 }}>
                Key saved
              </div>
            )}
          </Section>
        );
      })}
    </div>
  );
}

// ── AI Model Tab ──────────────────────────────────────────────────────────────

function AiModelTab() {
  const { data: settings } = useUserSettings();
  const { mutate: updateKey, isPending } = useUpdateApiKey();
  const [selected, setSelected] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setSelected(settings.aiModel ?? "gemini-2.5-flash");
  }, [settings]);

  function handleSave() {
    updateKey(
      { service: "aiModel", key: selected ?? "gemini-2.5-flash" },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0, lineHeight: 1.6 }}>
        Choose which Gemini model to use for AI features. Requires an API key with appropriate quota.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {AI_MODELS.map((m) => (
          <label
            key={m.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 16px",
              borderRadius: 10,
              border: `1px solid ${(selected ?? "gemini-2.5-flash") === m.id ? "var(--color-accent)" : "var(--color-border)"}`,
              background: (selected ?? "gemini-2.5-flash") === m.id ? "oklch(20% 0.04 265 / 0.4)" : "var(--color-surface)",
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
            }}
          >
            <input
              type="radio"
              name="aiModel"
              value={m.id}
              checked={(selected ?? "gemini-2.5-flash") === m.id}
              onChange={() => setSelected(m.id)}
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{m.description}</div>
            </div>
          </label>
        ))}
      </div>

      <div>
        <SaveButton onClick={handleSave} saving={isPending} saved={saved} />
      </div>
    </div>
  );
}

// ── Tags Tab ──────────────────────────────────────────────────────────────────

function TagsTab() {
  const { data: allTags = [] } = useTags();
  const { mutate: deleteTag } = useDeleteTag();

  return (
    <div>
      {allTags.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--color-muted)" }}>
          No tags yet. Create tags from the item detail panel.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {allTags.map((tag) => (
            <div
              key={tag.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                background: `${tag.color}28`,
                color: tag.color,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>{tag.name}</span>
              <button
                onClick={() => {
                  if (window.confirm(`Delete tag "${tag.name}"?`)) deleteTag(tag.id);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: tag.color, fontSize: 16, lineHeight: 1, padding: 0, opacity: 0.7 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Data Tab ──────────────────────────────────────────────────────────────────

function DataTab() {
  const { mutate: clearCache, isPending: clearing, data: clearResult } = useClearAiCache();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await userApi.exportItems();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sirajhub-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <DataRow label="Export all items" description="Download your entire library as a JSON file.">
        <ActionButton onClick={handleExport} loading={exporting} variant="secondary">
          {exporting ? "Exporting…" : "Export JSON"}
        </ActionButton>
      </DataRow>

      <DataRow
        label="Clear AI cache"
        description={
          clearResult
            ? `Cleared ${clearResult.cleared} cached analyses.`
            : "Forces Gemini to re-analyse items on next request."
        }
      >
        <ActionButton
          onClick={() => {
            if (window.confirm("Clear all cached AI analyses?")) clearCache();
          }}
          loading={clearing}
          variant="danger"
        >
          {clearing ? "Clearing…" : "Clear cache"}
        </ActionButton>
      </DataRow>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: "var(--color-muted)", lineHeight: 1.5 }}>{description}</div>
      )}
      {children}
    </div>
  );
}

function DataRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function SaveButton({ onClick, saving, saved }: { onClick: () => void; saving: boolean; saved: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      style={{
        padding: "8px 16px",
        borderRadius: 8,
        border: "none",
        background: saved ? "oklch(55% 0.15 150)" : "var(--color-accent)",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        cursor: saving ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "background 0.15s",
      }}
    >
      {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
    </button>
  );
}

function ActionButton({ onClick, loading, variant, children }: {
  onClick: () => void;
  loading: boolean;
  variant: "secondary" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: variant === "danger" ? "oklch(20% 0.05 25)" : "var(--color-surface)",
        color: variant === "danger" ? "oklch(65% 0.2 25)" : "var(--color-foreground)",
        fontSize: 13,
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--color-background)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "var(--color-foreground)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
