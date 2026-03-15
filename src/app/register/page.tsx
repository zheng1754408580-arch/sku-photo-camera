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
        setError("密码长度至少 6 位");
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
          setError(result.error ?? "注册失败");
          return;
        }

        router.push(result.redirectTo ?? "/pending");
      } catch {
        setError("网络错误，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    [name, email, password, reason, router],
  );

  return (
    <div className="app-page flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <SurfaceCard className="mx-auto w-full max-w-sm px-6 py-7">
        <h1 className="section-title mb-1 text-center text-2xl">申请使用</h1>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          填写信息提交申请，管理员审批后即可使用
        </p>

        <FormError
          message={error}
          className="mb-4 rounded-[1.25rem] bg-[hsl(var(--destructive-soft))] px-4 py-3"
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormLabel htmlFor="name" required>
              姓名
            </FormLabel>
            <TextInput
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的姓名"
              required
              disabled={loading}
            />
          </div>
          <div>
            <FormLabel htmlFor="email" required>
              邮箱
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
              设置密码
            </FormLabel>
            <TextInput
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div>
            <FormLabel htmlFor="reason">
              申请理由
              <span className="ml-1 text-muted-foreground">（选填）</span>
            </FormLabel>
            <TextArea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="简要说明申请原因..."
              className="resize-none"
              disabled={loading}
            />
          </div>
          <Button type="submit" loading={loading} fullWidth>
            {loading ? (
              <>
                提交中…
              </>
            ) : (
              "提交申请"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          已有账号？{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            去登录
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← 返回首页
          </Link>
        </p>
      </SurfaceCard>
    </div>
  );
}
