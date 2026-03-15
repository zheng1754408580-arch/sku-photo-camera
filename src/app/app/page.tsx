"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { useFittingSessionStore } from "@/store/fittingSessionStore";
import { pickFile, parseFile, FileParseError } from "@/services/fileParser";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export default function AppHomePage() {
  const router = useRouter();
  const { skuList, setSkuList, hasData } = useSkuStore();
  const { getTotalPhotoCount } = usePhotoStore();
  const { getTotalPhotoCount: getFittingTotalPhotoCount } = useFittingSessionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const skuCount = skuList.length;
  const photoCount = hydrated ? getTotalPhotoCount() + getFittingTotalPhotoCount() : 0;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleUpload = useCallback(async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const file = await pickFile();
      const list = await parseFile(file);
      setSkuList(list);
      setNotice(`已识别 ${list.length} 个 SKU`);
    } catch (err) {
      if (err instanceof FileParseError && err.code === "USER_CANCELLED") {
        // noop
      } else {
        console.error("Failed to parse SKU file", err);
        setError(
          err instanceof FileParseError ? err.message : "文件解析失败，请重试",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [setSkuList]);

  const handleEnterCamera = useCallback(() => {
    router.push("/app/camera");
  }, [router]);

  const handleViewList = useCallback(() => {
    router.push("/app/sku-list");
  }, [router]);

  return (
    <div className="app-page flex min-h-dvh flex-col">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-40 border-b border-soft bg-[hsl(var(--surface-raised))/0.9] backdrop-blur-lg">
        <div className="relative flex h-11 items-center justify-center px-4">
          <span className="text-sm font-semibold tracking-[-0.01em]">SKU 照片命名相机</span>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-surface-raised shadow-soft transition hover:bg-secondary active:scale-[0.98]"
            aria-label="设置"
          >
            <svg
              className="h-[18px] w-[18px] text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="flex flex-1 flex-col items-center px-6 pt-10">
        {/* 相机图标 */}
        <div className="icon-badge mb-4 h-24 w-24 bg-primary-soft">
          <span className="text-5xl">📷</span>
        </div>

        {/* 标题 */}
        <h1 className="section-title mb-1.5 text-xl">SKU 照片命名相机</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          上传 SKU 文件，按编号自动命名拍摄的照片
        </p>

        {/* 数据卡片 */}
        <SurfaceCard className="mb-8 w-full max-w-xs px-4 py-5 shadow-soft">
          <div className="flex items-center">
            <div className="flex flex-1 flex-col items-center">
              <span className="text-xs text-muted-foreground">SKU 数量</span>
              <span className="mt-1 text-2xl font-bold text-primary">
                {hydrated ? skuCount : "-"}{" "}
                <span className="text-sm font-medium">个</span>
              </span>
            </div>
            <div className="hairline-divider h-10 w-px" />
            <div className="flex flex-1 flex-col items-center">
              <span className="text-xs text-muted-foreground">已拍照片</span>
              <span className="mt-1 text-2xl font-bold text-primary">
                {hydrated ? photoCount : "-"}{" "}
                <span className="text-sm font-medium">张</span>
              </span>
            </div>
          </div>
        </SurfaceCard>

        {/* 错误提示 */}
        {error && (
          <div className="status-note status-note-danger mb-4 w-full max-w-xs">
            <p className="text-center">{error}</p>
          </div>
        )}

        {notice && (
          <div className="status-note status-note-success mb-4 w-full max-w-xs">
            <p className="text-center">{notice}</p>
          </div>
        )}

        {/* 按钮组 */}
        <div className="w-full max-w-xs space-y-3">
          <Button onClick={handleUpload} loading={loading} fullWidth>
            {loading ? (
              "解析中…"
            ) : hydrated && hasData() ? (
              "重新上传 SKU 文件"
            ) : (
              "上传 SKU 文件"
            )}
          </Button>

          {hydrated && hasData() && (
            <>
              <Button
                onClick={handleEnterCamera}
                variant="primary"
                fullWidth
                className="bg-[hsl(var(--success))] hover:brightness-[0.98]"
              >
                进入拍摄
              </Button>
              <Button onClick={handleViewList} variant="secondary" fullWidth>
                查看 SKU 列表
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 署名 */}
      <p className="py-6 text-center text-xs tracking-[0.12em] text-muted-foreground/60">
        Designed &amp; Built by Jaden Zheng
      </p>

      {/* 设置 / 关于 弹窗 */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="app-panel w-full max-w-sm rounded-t-[2rem] p-6 sm:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title text-lg">关于</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary active:scale-[0.98]"
                aria-label="关闭"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-foreground">SKU 照片命名相机</p>
            <p className="mt-1 text-xs text-muted-foreground">上传 SKU 文件，按编号自动命名拍摄的照片</p>
            <p className="mt-4 text-center text-xs text-muted-foreground">Designed &amp; Built by Jaden Zheng</p>
            <Button
              type="button"
              onClick={() => setShowSettings(false)}
              variant="secondary"
              fullWidth
              className="mt-6"
            >
              关闭
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
