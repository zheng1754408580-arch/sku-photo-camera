"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSkuStore } from "@/store/skuStore";
import { usePhotoStore } from "@/store/photoStore";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { PhotoPreviewModal } from "@/components/PhotoPreviewModal";

type CameraStatus = "loading" | "ready" | "no-permission" | "no-camera" | "error";

export default function CameraPage() {
  const router = useRouter();
  const { selectedSku, currentIndex, skuList, selectNext, selectPrevious } = useSkuStore();
  const { photos, addPhoto, deletePhoto } = usePhotoStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<CameraStatus>("loading");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const sku = selectedSku ?? "";
  const currentPhotos = photos[sku] ?? [];
  const photoCount = currentPhotos.length;

  useEffect(() => { setHydrated(true); }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setStatus("loading");
    try {
      try {
        if (typeof navigator.permissions?.query === "function") {
          const result = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (result.state === "denied") {
            setStatus("no-permission");
            return;
          }
        }
      } catch {
        // permissions API 不可用或不被支持时忽略，继续请求摄像头
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setStatus("ready");
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError") setStatus("no-permission");
      else if (e.name === "NotFoundError") setStatus("no-camera");
      else setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (hydrated) startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (status !== "ready" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [status]);

  const handleToggleCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !sku || capturing) return;
    setCapturing(true); setFlash(true);
    setTimeout(() => setFlash(false), 150);
    const video = videoRef.current; const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    addPhoto(sku, dataUrl);
    setTimeout(() => { if (thumbnailsRef.current) thumbnailsRef.current.scrollLeft = thumbnailsRef.current.scrollWidth; }, 50);
    setCapturing(false);
  }, [sku, capturing, facingMode, addPhoto]);

  const handleDelete = useCallback((fileName: string) => { deletePhoto(sku, fileName); }, [sku, deletePhoto]);

  if (!hydrated) return <div className="flex h-dvh items-center justify-center bg-black"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" /></div>;

  if (!sku) return (
    <div className="flex h-dvh flex-col items-center justify-center bg-black px-6">
      <p className="mb-4 text-sm text-gray-400">未选择 SKU</p>
      <button onClick={() => router.push("/app/sku-list")} className="rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-black">返回列表</button>
    </div>
  );

  return (
    <div className="relative flex h-dvh flex-col bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {/* 顶部栏 */}
      <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent pb-8 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 pt-3">
          <button onClick={() => router.push("/app/sku-list")} className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            列表
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-white">{sku}</p>
            <p className="text-xs text-white/60">已拍 {photoCount} 张</p>
          </div>
          <button onClick={handleToggleCamera} className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" /></svg>
          </button>
        </div>
      </div>

      {/* 相机预览 */}
      <div className="relative flex-1 overflow-hidden">
        {status === "ready" && <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`} />}
        {status === "loading" && <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" /></div>}
        {status === "no-permission" && (
          <div className="flex h-full flex-col items-center justify-center px-8">
            <p className="mb-1 text-sm font-medium text-white">需要相机权限</p>
            <p className="mb-4 text-center text-xs text-gray-400">请在浏览器设置中允许使用相机</p>
            <button onClick={() => startCamera(facingMode)} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white">重试</button>
          </div>
        )}
        {status === "no-camera" && <div className="flex h-full flex-col items-center justify-center px-8"><p className="text-sm text-white">未检测到相机</p></div>}
        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center px-8">
            <p className="mb-3 text-sm text-gray-400">相机启动失败</p>
            <button onClick={() => startCamera(facingMode)} className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white">重试</button>
          </div>
        )}
        {flash && <div className="absolute inset-0 z-10 bg-white" />}
      </div>

      {/* 底部操作栏 */}
      <div className="bg-black pb-[env(safe-area-inset-bottom)]">
        {currentPhotos.length > 0 && (
          <div ref={thumbnailsRef} className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
            {currentPhotos.map((photo, i) => (
              <PhotoThumbnail key={photo.fileName} uri={photo.uri} fileName={photo.fileName} selected={previewIndex === i} onClick={() => setPreviewIndex(i)} onDelete={() => handleDelete(photo.fileName)} />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={() => selectPrevious()} disabled={currentIndex <= 0} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition disabled:opacity-30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={handleCapture} disabled={status !== "ready" || capturing} className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white transition active:scale-95 disabled:opacity-50">
            <div className="h-[58px] w-[58px] rounded-full bg-white transition active:bg-gray-200" />
          </button>
          <button onClick={() => selectNext()} disabled={currentIndex >= skuList.length - 1} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition disabled:opacity-30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
        <div className="flex items-center justify-center gap-4 pb-3 text-xs text-gray-500">
          {currentIndex > 0 && <span className="max-w-[100px] truncate">← {skuList[currentIndex - 1]}</span>}
          <span className="font-medium text-white">{currentIndex + 1} / {skuList.length}</span>
          {currentIndex < skuList.length - 1 && <span className="max-w-[100px] truncate">{skuList[currentIndex + 1]} →</span>}
        </div>
      </div>

      {previewIndex !== null && currentPhotos.length > 0 && (
        <PhotoPreviewModal photos={currentPhotos} initialIndex={previewIndex} onClose={() => setPreviewIndex(null)} onDelete={(fn) => handleDelete(fn)} />
      )}
    </div>
  );
}
