"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { signIn } from "@/lib/auth";
import { FormError } from "@/components/ui/FormError";
import { FormLabel } from "@/components/ui/FormLabel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TextInput } from "@/components/ui/TextInput";

export function AuthLanding() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        const result = await signIn(email, password);
        if (!result.success) {
          setError(result.error ?? "Unable to sign in.");
          return;
        }
        router.push(result.redirectTo ?? "/app");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, router],
  );

  return (
    <div className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-0 sm:px-6 sm:py-6">
      <div className="relative flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-background sm:h-[956px] sm:w-auto sm:max-w-[440px] sm:rounded-[2.5rem] sm:shadow-elevated">
        <img
          src="/brand/login-bg-fitnote.png"
          alt="FitNote background illustration"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(248,245,238,0.02),rgba(248,245,238,0.08)_40%,rgba(248,245,238,0.42)_62%,rgba(248,245,238,0.88)_78%,rgba(248,245,238,0.98)_100%)]" />

        <div className="relative flex-[0_0_45%] sm:flex-[0_0_47%]" />

        <SurfaceCard className="relative z-10 flex flex-1 flex-col rounded-t-[2rem] px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-4 sm:rounded-t-[2rem]">
          <h1 className="mb-0.5 font-display text-xl font-semibold text-foreground">
            Sign in to get started
          </h1>
          <p className="mb-2.5 text-sm text-muted-foreground">
            Welcome back. Please enter your details to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-2" noValidate>
            <FormError
              message={error}
              className="mt-0 rounded-2xl bg-[hsl(var(--destructive))]/10 px-4 py-2.5"
            />

            <div>
              <FormLabel htmlFor="email" required>
                Work Email
              </FormLabel>
              <TextInput
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={loading}
                error={!!error}
                autoComplete="email"
              />
            </div>

            <div>
              <FormLabel htmlFor="password" required>
                Password
              </FormLabel>
              <TextInput
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                error={!!error}
                autoComplete="current-password"
              />
            </div>

            <PrimaryButton type="submit" loading={loading} fullWidth>
              {loading ? "Signing In..." : "Sign In"}
            </PrimaryButton>
          </form>

          <p className="mt-2.5 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Request Access
            </Link>
          </p>

          <p className="mt-2 text-center text-[7px] uppercase tracking-[0.18em] text-muted-foreground/70">
            Designed &amp; Built by Jaden Zheng
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
