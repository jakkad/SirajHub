import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useUserProfile, useUpdateProfile, useClearAiCache } from "../hooks/useUser";
import { useTags, useDeleteTag } from "../hooks/useTags";
import { userApi } from "../lib/api";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { data: profile, isLoading } = useUserProfile();
  const { mutate: updateProfile, isPending: saving } = useUpdateProfile();
  const { mutate: clearCache, isPending: clearing, data: clearResult } = useClearAiCache();
  const { data: allTags = [] } = useTags();
  const { mutate: deleteTag } = useDeleteTag();

  const [name, setName] = useState("");
  const [preferences, setPreferences] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPreferences(profile.preferences ?? "");
    }
  }, [profile]);

  function handleSaveName() {
    updateProfile({ name }, { onSuccess: () => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); } });
  }

  function handleSavePreferences() {
    updateProfile({ preferences }, { onSuccess: () => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 2000); } });
  }

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-12" style={{ color: "var(--color-muted)", textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-10">
      {/* Back link */}
      <Link
        to="/"
        style={{ fontSize: 13, color: "var(--color-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 28 }}
      >
        ← Back to board
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 32px" }}>Settings</h1>

      {/* ── Profile ── */}
      <Section title="Profile">
        <Field label="Display name">
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
            <SaveButton onClick={handleSaveName} saving={saving} saved={profileSaved} />
          </div>
        </Field>
        <Field label="Email">
          <input
            value={profile?.email ?? ""}
            readOnly
            style={{ ...inputStyle, opacity: 0.6, cursor: "default" }}
          />
        </Field>
      </Section>

      {/* ── AI Preferences ── */}
      <Section title="AI Taste Preferences">
        <p style={{ fontSize: 13, color: "var(--color-muted)", margin: "0 0 12px", lineHeight: 1.6 }}>
          Describe what you enjoy and dislike. Gemini uses this when ranking your "Next to Consume" list.
        </p>
        <Field label="Preferences">
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={4}
            placeholder='e.g. "I love hard sci-fi and literary fiction. I dislike horror and reality TV. Currently interested in AI and philosophy."'
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <SaveButton onClick={handleSavePreferences} saving={saving} saved={prefSaved} />
        </div>
      </Section>

      {/* ── Tags ── */}
      <Section title="Tags">
        {allTags.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-muted)", margin: 0 }}>
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
                    if (window.confirm(`Delete tag "${tag.name}"? It will be removed from all items.`)) {
                      deleteTag(tag.id);
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: tag.color,
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 0,
                    opacity: 0.7,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Data ── */}
      <Section title="Data">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <DataRow
            label="Export all items"
            description="Download your entire library as a JSON file."
          >
            <ActionButton onClick={handleExport} loading={exporting} variant="secondary">
              {exporting ? "Exporting…" : "Export JSON"}
            </ActionButton>
          </DataRow>

          <DataRow
            label="Clear AI cache"
            description={
              clearResult
                ? `Cleared ${clearResult.cleared} cached analyses.`
                : "Forces Gemini to re-analyse items on next request. Does not affect your items."
            }
          >
            <ActionButton
              onClick={() => {
                if (window.confirm("Clear all cached AI analyses? Items will be re-analysed on next request.")) {
                  clearCache();
                }
              }}
              loading={clearing}
              variant="danger"
            >
              {clearing ? "Clearing…" : "Clear cache"}
            </ActionButton>
          </DataRow>
        </div>
      </Section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "var(--color-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {title}
      </h2>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-muted)" }}>{label}</span>
      {children}
    </label>
  );
}

function DataRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
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

function ActionButton({
  onClick,
  loading,
  variant,
  children,
}: {
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
