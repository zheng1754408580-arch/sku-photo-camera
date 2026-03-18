"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { FormLabel } from "@/components/ui/FormLabel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TextArea } from "@/components/ui/TextArea";
import { TextInput } from "@/components/ui/TextInput";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (password.length < 6) {
        setError("Your password must be at least 6 characters.");
        return;
      }

      setLoading(true);

      try {
        const result = await signUp({
          email,
          password,
          displayName: name,
          reason: reason || undefined,
        });

        if (!result.success) {
          setError(result.error ?? "Sign-up failed.");
          return;
        }

        router.push(result.redirectTo ?? "/pending");
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, reason, router],
  );

  return (
    <div className="app-page flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <SurfaceCard className="mx-auto w-full max-w-sm px-6 py-7 shadow-elevated">
        <h1 className="section-title mb-1 text-center text-[1.9rem]">Request Access</h1>
        <p className="mx-auto mb-8 max-w-[28ch] text-center text-[0.95rem] leading-6 text-muted-foreground">
          Submit your details for approval. Once approved, you will be able to use the app.
        </p>

        <FormError
          message={error}
          className="mb-4 rounded-[1.25rem] bg-[hsl(var(--destructive-soft))] px-4 py-3"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormLabel htmlFor="name" required>
              Name
            </FormLabel>
            <TextInput
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              disabled={loading}
            />
          </div>
          <div>
            <FormLabel htmlFor="email" required>
              Work Email
            </FormLabel>
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
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
              placeholder="At least 6 characters"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div>
            <FormLabel htmlFor="reason">
              Reason
              <span className="ml-1 text-muted-foreground">(Optional)</span>
            </FormLabel>
            <TextArea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly explain why you need access..."
              className="resize-none"
              disabled={loading}
            />
          </div>
          <Button type="submit" loading={loading} fullWidth>
            {loading ? (
              <>
                Submitting...
              </>
            ) : (
              "Submit Request"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign In
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </p>
      </SurfaceCard>
    </div>
  );
}
