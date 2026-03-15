"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FittingAnnotationEditor } from "@/components/FittingAnnotationEditor";
import {
  FITTING_ROUNDS,
  FITTING_ROUND_LABELS,
  PHOTO_TYPE_LABELS,
  STANDARD_SHOT_TYPES,
} from "@/constants/fitting";
import { useFittingSessionStore } from "@/store/fittingSessionStore";
import { useSkuStore } from "@/store/skuStore";
import type { FittingRound, StandardShotType } from "@/types/fitting";

type CameraStatus = "loading" | "ready" | "no-permission" | "no-camera" | "error";
type WorkspaceTab = "detail" | "standard";

interface FittingSessionWorkspaceProps {
  promptForRound?: boolean;
  backPath?: string;
  completePath?: string;
}

export function FittingSessionWorkspace({
  promptForRound = false,
  backPath = "/app/sku-list",
  completePath = "/app/export",
}: FittingSessionWorkspaceProps) {
  const router = useRouter();
  const {
    selectedSku,
    currentIndex,
    skuList,
    selectNext,
    selectPrevious,
  } = useSkuStore();
  const {
    sessions,
    activeSessionId,
    startSession,
    setActiveSession,
    addPhoto,
    completeSession,
    deletePhoto,
    updateAnnotation,
  } = useFittingSessionStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<CameraStatus>("loading");
  const [tab, setTab] = useState<WorkspaceTab>("detail");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [currentShotType, setCurrentShotType] = useState<StandardShotType>("front");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [annotatingPhotoId, setAnnotatingPhotoId] = useState<string | null>(null);
  const [showRoundPicker, setShowRoundPicker] = useState(promptForRound);
  const [round, setRound] = useState<FittingRound>("P1");

  const session =
    !showRoundPicker && activeSessionId ? sessions[activeSessionId] ?? null : null;

  const detailPhotos = useMemo(
    () => session?.photos.filter((photo) => photo.photoType === "detail") ?? [],
    [session],
  );
  const standardPhotos = useMemo(
    () => session?.photos.filter((photo) => photo.photoType !== "detail") ?? [],
    [session],
  );
  const standardStatus = useMemo(
    () => ({
      front: standardPhotos.some((photo) => photo.photoType === "front"),
      side: standardPhotos.some((photo) => photo.photoType === "side"),
      back: standardPhotos.some((photo) => photo.photoType === "back"),
    }),
    [standardPhotos],
  );
  const missingShots = useMemo(
    () =>
      STANDARD_SHOT_TYPES.filter((type) => !standardStatus[type]).map(
        (type) => PHOTO_TYPE_LABELS[type],
      ),
    [standardStatus],
  );
  const activePhotos = tab === "detail" ? detailPhotos : standardPhotos;
  const annotatingPhoto = useMemo(
    () => detailPhotos.find((photo) => photo.id === annotatingPhotoId) ?? null,
    [annotatingPhotoId, detailPhotos],
  );

  useEffect(() => {
    if (!session) return;
    const firstMissing = STANDARD_SHOT_TYPES.find((type) => !standardStatus[type]);
    if (firstMissing) setCurrentShotType(firstMissing);
  }, [session, standardStatus]);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    setStatus("loading");
    try {
      try {
        if (typeof navigator.permissions?.query === "function") {
          const result = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          if (result.state === "denied") {
            setStatus("no-permission");
            return;
          }
        }
      } catch {
        // ignore unsupported permissions API
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
      const errorValue = err as DOMException;
      if (errorValue.name === "NotAllowedError") setStatus("no-permission");
      else if (errorValue.name === "NotFoundError") setStatus("no-camera");
      else setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [session, facingMode, startCamera]);

  useEffect(() => {
    if (status !== "ready" || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
  }, [status]);

  const handleStartSession = () => {
    if (!selectedSku) {
      setError("请先选择款号");
      return;
    }

    startSession(selectedSku, round);
    setShowRoundPicker(false);
    setError("");
    setNotice(`已进入 ${selectedSku} / ${FITTING_ROUND_LABELS[round]} Fitting Session`);
  };

  const handleSwitchSku = (direction: "prev" | "next") => {
    const switched = direction === "prev" ? selectPrevious() : selectNext();
    if (!switched) return;

    const nextSku = useSkuStore.getState().selectedSku;
    const nextRound = session?.fittingRound ?? round;
    if (!nextSku) return;

    setActiveSession(null);
    startSession(nextSku, nextRound);
    setShowRoundPicker(false);
    setError("");
    setNotice(`已切换到 ${nextSku} / ${FITTING_ROUND_LABELS[nextRound]}`);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || capturing || !session) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    setError("");
    setNotice("");
    setCapturing(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 150);

    try {
      if (
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error("相机画面尚未就绪，请稍后重试");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("无法创建拍照画布");

      ctx.save();
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const photoType = tab === "detail" ? "detail" : currentShotType;
      const nextPhoto = addPhoto(session.sessionId, dataUrl, photoType);
      if (!nextPhoto) throw new Error("保存照片失败");

      setNotice(
        photoType === "detail"
          ? `已保存细节图 ${nextPhoto.fileName}`
          : `已保存${PHOTO_TYPE_LABELS[photoType]} ${nextPhoto.fileName}`,
      );

      window.setTimeout(() => {
        if (galleryRef.current) {
          galleryRef.current.scrollLeft = galleryRef.current.scrollWidth;
        }
      }, 50);

      if (tab === "standard") {
        const nextMissing = STANDARD_SHOT_TYPES.find((type) =>
          type === photoType ? false : !standardStatus[type],
        );
        if (nextMissing) setCurrentShotType(nextMissing);
      }
    } catch (err) {
      console.error("Failed to capture fitting photo", err);
      setError(err instanceof Error ? err.message : "拍照失败，请重试");
    } finally {
      setCapturing(false);
    }
  };

  const handleDelete = (photoId: string) => {
    if (!session) return;
    deletePhoto(session.sessionId, photoId);
    setNotice("已删除照片");
  };

  const handleSaveAnnotation = (
    uri: string,
    actions: NonNullable<typeof annotatingPhoto>["annotationData"],
  ) => {
    if (!annotatingPhoto || !session) return;
    updateAnnotation(session.sessionId, annotatingPhoto.id, uri, actions);
    setAnnotatingPhotoId(null);
    setNotice(`已保存 ${annotatingPhoto.fileName} 的批注`);
  };

  const handleCompleteSession = () => {
    if (!session) return;
    if (missingShots.length > 0) {
      setError(`尚未完成全部标准照片，请先完成 ${missingShots.join(" / ")} 拍摄`);
      return;
    }
    completeSession(session.sessionId);
    setError("");
    setNotice("本次 Fitting Session 已完成并保存，正在进入导出页");
    window.setTimeout(() => {
      router.push(`${completePath}?sessionId=${encodeURIComponent(session.sessionId)}`);
    }, 300);
  };

  if (!selectedSku && showRoundPicker) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black px-6 text-white">
        <p className="mb-4 text-sm text-white/70">请先选择款号后再进入拍摄</p>
        <button
          type="button"
          onClick={() => router.push("/app/sku-list")}
          className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          返回款号列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <canvas ref={canvasRef} className="hidden" />

      <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 to-transparent pb-8 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center px-4 pt-3">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            返回
          </button>
          <div className="flex-1 px-3 text-center">
            <p className="text-sm font-semibold">{session?.styleNo ?? selectedSku}</p>
            <p className="text-xs text-white/60">
              {session
                ? `${FITTING_ROUND_LABELS[session.fittingRound]} · ${session.photos.length} 张照片`
                : "请选择本次轮次"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompleteSession}
              disabled={!session}
              className="rounded-full bg-green-500/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm disabled:opacity-50"
            >
              完成
            </button>
            <button
              type="button"
              onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
              className="rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
              disabled={!session}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="relative h-[39dvh] min-h-[220px] flex-none overflow-hidden sm:h-[46dvh]">
        {session && status === "ready" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
          />
        )}
        {session && status === "loading" && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
          </div>
        )}
        {session && status === "no-permission" && (
          <div className="flex h-full flex-col items-center justify-center px-8">
            <p className="mb-1 text-sm font-medium text-white">需要相机权限</p>
            <p className="mb-4 text-center text-xs text-white/60">请在浏览器设置中允许使用相机</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
            >
              重试
            </button>
          </div>
        )}
        {session && status === "no-camera" && (
          <div className="flex h-full items-center justify-center px-8 text-sm text-white">
            未检测到相机
          </div>
        )}
        {session && status === "error" && (
          <div className="flex h-full flex-col items-center justify-center px-8">
            <p className="mb-3 text-sm text-white/70">相机启动失败</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
            >
              重试
            </button>
          </div>
        )}
        {session && flash && <div className="absolute inset-0 z-10 bg-white" />}
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 pt-2.5">
          <div className="flex rounded-full bg-white/10 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("detail");
                setError("");
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                tab === "detail" ? "bg-white text-black" : "text-white/70"
              }`}
              disabled={!session}
            >
              Detail Review
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("standard");
                setError("");
              }}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                tab === "standard" ? "bg-white text-black" : "text-white/70"
              }`}
              disabled={!session}
            >
              Standard Shots
            </button>
          </div>
        </div>

        {session && tab === "standard" && (
          <div className="px-4 pt-2.5">
            <div className="grid grid-cols-3 gap-2">
              {STANDARD_SHOT_TYPES.map((type) => {
                const done = standardStatus[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCurrentShotType(type)}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                      currentShotType === type
                        ? "border-blue-400 bg-blue-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/80"
                    }`}
                  >
                    <div className="font-medium">{PHOTO_TYPE_LABELS[type]}</div>
                    <div className={`mt-1 text-xs ${done ? "text-green-300" : "text-white/50"}`}>
                      {done ? "已完成" : "待拍摄"}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-white/50">
              请完成 Front / Side / Back 拍摄后再完成本次 Session。
            </p>
          </div>
        )}

        {(error || notice) && (
          <div className="px-4 pt-2.5">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-100">
                {error}
              </div>
            )}
            {!error && notice && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm text-green-100">
                {notice}
              </div>
            )}
          </div>
        )}

        {session && activePhotos.length > 0 && (
          <div ref={galleryRef} className="flex gap-2.5 overflow-x-auto px-4 py-2.5">
            {activePhotos.map((photo) => (
              <div key={photo.id} className="w-28 flex-shrink-0 overflow-hidden rounded-2xl bg-white/10">
                <img src={photo.uri} alt={photo.fileName} className="h-20 w-full object-cover" />
                <div className="space-y-1 px-2 py-2">
                  <p className="truncate text-[11px] text-white/80">{photo.fileName}</p>
                  <div className="flex gap-1">
                    {photo.photoType === "detail" && (
                      <button
                        type="button"
                        onClick={() => setAnnotatingPhotoId(photo.id)}
                        className="flex-1 rounded-lg bg-blue-500 px-2 py-1 text-[10px] font-medium text-white"
                      >
                        {photo.isAnnotated ? "继续批注" : "添加批注"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id)}
                      className="rounded-lg bg-white/15 px-2 py-1 text-[10px] text-white/80"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={() => handleSwitchSku("prev")}
            disabled={currentIndex <= 0}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition disabled:opacity-30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!session || status !== "ready" || capturing}
            className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-[3px] border-white transition active:scale-95 disabled:opacity-50"
          >
            <div className="h-[50px] w-[50px] rounded-full bg-white transition active:bg-gray-200" />
          </button>
          <button
            type="button"
            onClick={() => handleSwitchSku("next")}
            disabled={currentIndex >= skuList.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition disabled:opacity-30"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {showRoundPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-gray-900 shadow-2xl">
            <h2 className="text-lg font-bold">选择轮次</h2>
            <p className="mt-1 text-sm text-gray-500">
              {selectedSku} 即将进入 Fitting Session，请先选择当前轮次。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {FITTING_ROUNDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRound(item)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                    round === item
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {FITTING_ROUND_LABELS[item]}
                </button>
              ))}
            </div>

            <p className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              命名预览：{selectedSku}_{round}_001.jpg
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => router.push(backPath)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white"
              >
                开始拍摄
              </button>
            </div>
          </div>
        </div>
      )}

      {annotatingPhoto && (
        <FittingAnnotationEditor
          imageUri={annotatingPhoto.originalUri}
          initialActions={annotatingPhoto.annotationData}
          onClose={() => setAnnotatingPhotoId(null)}
          onSave={handleSaveAnnotation}
        />
      )}
    </div>
  );
}
