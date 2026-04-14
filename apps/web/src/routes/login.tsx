import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || email,
        });
        if (err) {
          console.error("Sign up error:", err);
          throw new Error(err.message || err.statusText || `Error ${err.status}` || "Sign up failed");
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        });
        if (err) {
          console.error("Sign in error:", err);
          throw new Error(err.message || err.statusText || `Error ${err.status}` || "Sign in failed");
        }
      }

      await router.invalidate();
      router.navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-background)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "2rem",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 16,
              color: "white",
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>SirajHub</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, letterSpacing: "-0.02em" }}>
          {mode === "signin" ? "Welcome back" : "Create account"}
        </h1>
        <p style={{ fontSize: 14, color: "var(--color-muted)", marginBottom: "1.5rem" }}>
          {mode === "signin"
            ? "Sign in to your personal content hub."
            : "Set up your personal content hub."}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              style={inputStyle}
            />
          </div>

          {error && (
            <p
              style={{
                fontSize: 13,
                color: "oklch(65% 0.2 25)",
                backgroundColor: "oklch(65% 0.2 25 / 0.1)",
                padding: "10px 12px",
                borderRadius: 8,
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 0",
              borderRadius: 8,
              border: "none",
              backgroundColor: loading ? "var(--color-muted)" : "var(--color-accent)",
              color: "white",
              fontWeight: 600,
              fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {/* Mode toggle */}
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-muted)", marginTop: "1.25rem" }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-accent)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              padding: 0,
            }}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-background)",
  color: "var(--color-foreground)",
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};
