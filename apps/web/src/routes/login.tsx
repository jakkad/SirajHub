import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { authClient } from "../lib/auth-client";
import { useTheme } from "@/components/ThemeProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
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
    <div className="paper-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="soft-panel hidden rounded-[36px] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">SirajHub</Badge>
            <h1 className="page-title mt-6 max-w-xl">A cleaner home for your reading, watching, and listening queue.</h1>
            <p className="page-subtitle mt-4 max-w-lg">
              Keep every saved item in one soft analytics-style workspace with better ranking, metadata, notes, and AI assistance.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Track", value: "7 media types" },
              { label: "Organize", value: "status + tags" },
              { label: "Decide", value: "AI ranking" },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-[hsl(var(--border))] bg-card/80 p-5">
                <p className="metric-label">{item.label}</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.04em]">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[32px]">
          <CardContent className="p-8">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-[16px] bg-primary text-sm font-semibold text-primary-foreground">S</div>
                <div>
                  <p className="text-lg font-semibold tracking-[-0.04em]">SirajHub</p>
                  <p className="text-xs text-muted-foreground">Personal media dashboard</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? <SunMedium /> : <MoonStar />}
              </Button>
            </div>

            <h1 className="text-[1.9rem] font-semibold tracking-[-0.05em]">
              {mode === "signin" ? "Welcome back" : "Create account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your personal content hub."
                : "Set up your personal content hub."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === "signup" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && (
            <p className="m-0 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="mt-2"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                className="font-semibold text-primary"
              >
                {mode === "signin" ? "Create one" : "Sign in"}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
