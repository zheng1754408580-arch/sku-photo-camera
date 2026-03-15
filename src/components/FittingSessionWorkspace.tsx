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

      <div className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black via-black/92 to-transparent pb-8 pt-[env(safe-area-inset-top)]">
        <div className="flex items-start px-5 pt-3">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="text-sm font-medium tracking-[-0.01em] text-white/82 transition hover:text-white"
          >
            List
          </button>
          <div className="flex-1 px-3 pt-0.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/92">
              {session?.styleNo ?? selectedSku}
            </p>
            <p className="mt-1 text-[10px] font-medium tracking-[0.08em] text-white/42">
              {session
                ? `${FITTING_ROUND_LABELS[session.fittingRound]} · ${session.photos.length} PHOTOS`
                : "请选择本次轮次"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCompleteSession}
            disabled={!session}
            className="text-sm font-medium tracking-[-0.01em] text-[#C8FF3D] transition hover:text-[#E5FF8A] disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pt-16">
        <div className="relative w-full max-w-[246px] overflow-hidden rounded-[2rem] bg-black shadow-[0_32px_80px_rgba(0,0,0,0.55)] aspect-[9/16]">
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
            <div className="flex h-full items-center justify-center bg-black">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
          {session && status === "no-permission" && (
            <div className="flex h-full flex-col items-center justify-center bg-black px-8">
              <p className="mb-1 text-sm font-medium text-white">需要相机权限</p>
              <p className="mb-4 text-center text-xs text-white/60">请在浏览器设置中允许使用相机</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="rounded-pill border border-white/20 bg-white/8 px-4 py-2 text-sm text-white"
              >
                重试
              </button>
            </div>
          )}
          {session && status === "no-camera" && (
            <div className="flex h-full items-center justify-center bg-black px-8 text-sm text-white">
              未检测到相机
            </div>
          )}
          {session && status === "error" && (
            <div className="flex h-full flex-col items-center justify-center bg-black px-8">
              <p className="mb-3 text-sm text-white/70">相机启动失败</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="rounded-pill border border-white/20 bg-white/8 px-4 py-2 text-sm text-white"
              >
                重试
              </button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[14%] top-[16%] h-9 w-9 rounded-tl-[1rem] border-l-2 border-t-2 border-white/88" />
            <div className="absolute right-[14%] top-[16%] h-9 w-9 rounded-tr-[1rem] border-r-2 border-t-2 border-white/88" />
            <div className="absolute bottom-[16%] left-[14%] h-9 w-9 rounded-bl-[1rem] border-b-2 border-l-2 border-white/88" />
            <div className="absolute bottom-[16%] right-[14%] h-9 w-9 rounded-br-[1rem] border-b-2 border-r-2 border-white/88" />
          </div>
          {session && flash && <div className="absolute inset-0 z-10 bg-white" />}
        </div>
      </div>

      <div className="relative flex-none bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2">
        <div className="mx-auto max-w-sm">
          <div className="mb-3 flex rounded-full bg-white/8 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("detail");
                setError("");
              }}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                tab === "detail" ? "bg-white text-black shadow-soft" : "text-white/58"
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
              className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition ${
                tab === "standard" ? "bg-white text-black shadow-soft" : "text-white/58"
              }`}
              disabled={!session}
            >
              Standard Shots
            </button>
          </div>

          {session && tab === "standard" && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {STANDARD_SHOT_TYPES.map((type) => {
                const done = standardStatus[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCurrentShotType(type)}
                    className={`rounded-[1.1rem] px-3 py-2.5 text-left transition ${
                      currentShotType === type
                        ? "bg-white text-black shadow-soft"
                        : done
                          ? "bg-[#112208] text-[#C8FF3D]"
                          : "bg-white/6 text-white/68"
                    }`}
                  >
                    <div className="text-sm font-semibold">{PHOTO_TYPE_LABELS[type]}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.1em]">
                      {done ? "DONE" : "OPEN"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-[1.2rem] border border-[#C8FF3D]/30 bg-[#10160A] px-4 py-3 text-sm text-[#E8FFC3]">
              {error}
            </div>
          )}

          {session && activePhotos.length > 0 && (
            <div
              ref={galleryRef}
              className="mb-4 flex gap-2.5 overflow-x-auto pb-1"
            >
              {activePhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative w-[88px] flex-shrink-0 overflow-hidden rounded-[1.25rem] bg-[#0E0E0E] shadow-[0_18px_36px_rgba(0,0,0,0.34)]"
                >
                  <img
                    src={photo.uri}
                    alt={photo.fileName}
                    className="h-[118px] w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/92 to-transparent" />
                  <p className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-medium text-white/82">
                    {photo.fileName}
                  </p>
                  <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    {photo.photoType === "detail" && (
                      <button
                        type="button"
                        onClick={() => setAnnotatingPhotoId(photo.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/58 text-white backdrop-blur-md"
                        aria-label={photo.isAnnotated ? "继续批注" : "添加批注"}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L8.25 19.04l-4.5 1.125 1.125-4.5L16.862 4.487Z" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(photo.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/58 text-white/88 backdrop-blur-md"
                      aria-label="删除"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={() => handleSwitchSku("prev")}
              disabled={currentIndex <= 0}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white/88 transition hover:bg-white/[0.08] disabled:opacity-25"
              aria-label="上一款"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.25 19.25 8 12l7.25-7.25" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCapture}
              disabled={!session || status !== "ready" || capturing}
              className="relative flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white/6 shadow-[0_0_30px_rgba(255,255,255,0.14)] transition active:scale-95 disabled:opacity-40"
              aria-label="拍照"
            >
              <span className="absolute inset-[7px] rounded-full border border-white/28" />
              <span className="h-[56px] w-[56px] rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.16)]" />
            </button>

            <button
              type="button"
              onClick={() => handleSwitchSku("next")}
              disabled={currentIndex >= skuList.length - 1}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white/88 transition hover:bg-white/[0.08] disabled:opacity-25"
              aria-label="下一款"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.75 4.75 7.25 7.25-7.25 7.25" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-white/34">
            <span>{tab === "detail" ? "Detail Review" : PHOTO_TYPE_LABELS[currentShotType]}</span>
            <span className="h-1 w-1 rounded-full bg-white/22" />
            <span>
              {currentIndex + 1}/{skuList.length}
            </span>
          </div>
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
