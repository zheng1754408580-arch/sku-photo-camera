"use client";

import Image from "next/image";
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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <div
        className="relative flex flex-col items-center justify-start overflow-hidden bg-transparent px-6 pt-12"
        style={{ height: "55vh", minHeight: 0 }}
      >
        <Image
          src="/brand/tagloom-login-hero-combined.png"
          alt="TagLoom hero artwork"
          width={900}
          height={1100}
          className="pointer-events-none relative z-10 h-auto w-[88%] max-w-[430px] select-none bg-transparent object-contain"
          priority
        />
      </div>

      <SurfaceCard className="relative z-10 -mt-[1.75vh] flex flex-1 flex-col rounded-t-[2rem] px-6 pb-5 pt-6 sm:mx-auto sm:mb-4 sm:max-w-md sm:rounded-2xl">
        <h1 className="mb-0.5 font-display text-xl font-semibold text-foreground">
          Sign in to get started
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Welcome back. Please enter your details to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <FormError
            message={error}
            className="mt-0 rounded-2xl bg-[hsl(var(--destructive))]/10 px-4 py-3"
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

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Request Access
          </Link>
        </p>

        <p className="mt-auto pt-4 text-center text-[7px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Designed &amp; Built by Jaden Zheng
        </p>
      </SurfaceCard>
    </div>
  );
}
