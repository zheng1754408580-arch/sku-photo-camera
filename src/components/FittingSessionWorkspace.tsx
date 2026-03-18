"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  FITTING_ROUNDS,
  FITTING_ROUND_LABELS,
  PHOTO_TYPE_LABELS,
  STANDARD_SHOT_TYPES,
} from "@/constants/fitting";
import { useFittingSessionStore } from "@/store/fittingSessionStore";
import { useSkuStore } from "@/store/skuStore";
import type { FittingRound, StandardShotType } from "@/types/fitting";

const FittingAnnotationEditor = dynamic(
  () =>
    import("@/components/FittingAnnotationEditor").then((mod) => ({
      default: mod.FittingAnnotationEditor,
    })),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))/0.18] backdrop-blur-sm">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[hsl(var(--surface-raised))/0.24] border-t-[hsl(var(--surface-raised))/0.9]" />
      </div>
    ),
  },
);

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
  const [facingMode] = useState<"environment" | "user">("environment");
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);
  const [currentShotType, setCurrentShotType] = useState<StandardShotType>("front");
  const [error, setError] = useState("");
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
  const standardPhotoMap = useMemo(
    () =>
      standardPhotos.reduce<Record<StandardShotType, (typeof standardPhotos)[number] | null>>(
        (map, photo) => {
          if (photo.photoType !== "detail") {
            map[photo.photoType] = photo;
          }
          return map;
        },
        { front: null, side: null, back: null },
      ),
    [standardPhotos],
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
  const previewStripPhotos = useMemo(
    () => session?.photos.slice(-6) ?? [],
    [session],
  );
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
          width: { ideal: 1080 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 3 / 4 },
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
      setError("Please select a style first.");
      return;
    }

    startSession(selectedSku, round);
    setShowRoundPicker(false);
    setError("");
  };

  const handleSwitchSku = (direction: "prev" | "next") => {
    const switched = direction === "prev" ? selectPrevious() : selectNext();
    if (!switched) return;

    const nextSku = useSkuStore.getState().selectedSku;
    const nextRound = session?.fittingRound ?? round;
    if (!nextSku) return;

    setActiveSession(null);
    startSession(nextSku, nextRound);
    setTab("detail");
    setAnnotatingPhotoId(null);
    setShowRoundPicker(false);
    setError("");
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || capturing || !session) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    setError("");
    setCapturing(true);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 150);

    try {
      if (
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        throw new Error("The camera preview is not ready yet. Please try again.");
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to create the capture canvas.");

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
      if (!nextPhoto) throw new Error("Failed to save the photo.");

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
      setError(err instanceof Error ? err.message : "Capture failed. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  const handleSaveAnnotation = (
    uri: string,
    actions: NonNullable<typeof annotatingPhoto>["annotationData"],
  ) => {
    if (!annotatingPhoto || !session) return;
    updateAnnotation(session.sessionId, annotatingPhoto.id, uri, actions);
    setAnnotatingPhotoId(null);
  };

  const handleCompleteSession = () => {
    if (!session) return;
    if (missingShots.length > 0) {
      setError(`Please complete all standard shots first: ${missingShots.join(" / ")}.`);
      return;
    }
    completeSession(session.sessionId);
    setError("");
    window.setTimeout(() => {
      router.push(completePath);
    }, 300);
  };

  if (!selectedSku && showRoundPicker) {
    return (
      <div className="app-page flex min-h-dvh items-center justify-center px-6">
        <SurfaceCard className="w-full max-w-sm p-6 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Please select a style before opening the camera.</p>
          <Button type="button" onClick={() => router.push("/app/sku-list")}>
            Back to SKU List
          </Button>
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden app-dark-stage app-overlay-text">
      <canvas ref={canvasRef} className="hidden" />

      <div className="shrink-0 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="app-overlay mx-auto flex w-full max-w-[430px] items-start gap-3 rounded-[1.4rem] px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(backPath)}
            className="relative rounded-pill app-overlay-chip px-3 py-2 text-sm font-medium transition hover:brightness-110 before:absolute before:-inset-1.5 before:content-['']"
          >
            List
          </button>
          <div className="min-w-0 flex-1 pt-0.5 text-center">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] app-overlay-text">
              {session?.styleNo ?? selectedSku}
            </p>
            <p className="mt-1 text-[11px] app-overlay-muted">
              {session
                ? `${FITTING_ROUND_LABELS[session.fittingRound]} · ${session.photos.length} photos`
                : "Choose the round for this session"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCompleteSession}
            disabled={!session}
            className="relative rounded-pill app-overlay-chip px-3 py-2 text-sm font-medium transition hover:brightness-110 disabled:opacity-40 before:absolute before:-inset-1.5 before:content-['']"
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2">
        <div className="relative mx-auto flex aspect-[3/4] max-h-full w-full max-w-[430px] items-center justify-center overflow-hidden rounded-[2rem] border border-[hsl(var(--overlay-border))] bg-[hsl(var(--overlay-surface-strong))/0.16] shadow-[0_14px_32px_hsl(220_20%_8%_/0.12)]">
          {session && status === "ready" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-contain ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          )}
          {session && status === "loading" && (
            <div className="flex h-full w-full items-center justify-center app-dark-stage">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
          {session && status === "no-permission" && (
            <div className="flex h-full w-full flex-col items-center justify-center px-8">
              <p className="mb-1 text-sm font-medium app-overlay-text">Camera Access Required</p>
              <p className="mb-4 text-center text-xs app-overlay-muted">Please allow camera access in your browser settings.</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="rounded-pill app-overlay-chip px-4 py-2 text-sm font-medium transition hover:brightness-110"
              >
                Retry
              </button>
            </div>
          )}
          {session && status === "no-camera" && (
            <div className="flex h-full w-full items-center justify-center px-8 text-sm app-overlay-text">
              No camera detected
            </div>
          )}
          {session && status === "error" && (
            <div className="flex h-full w-full flex-col items-center justify-center px-8">
              <p className="mb-3 text-sm app-overlay-muted">The camera failed to start.</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="rounded-pill app-overlay-chip px-4 py-2 text-sm font-medium transition hover:brightness-110"
              >
                Retry
              </button>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,16,14,0.18),transparent_14%,transparent_82%,rgba(18,16,14,0.28))]" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[8%] top-[8%] h-9 w-9 rounded-tl-[1rem] border-l-2 border-t-2 border-white/82" />
            <div className="absolute right-[8%] top-[8%] h-9 w-9 rounded-tr-[1rem] border-r-2 border-t-2 border-white/82" />
            <div className="absolute bottom-[8%] left-[8%] h-9 w-9 rounded-bl-[1rem] border-b-2 border-l-2 border-white/82" />
            <div className="absolute bottom-[8%] right-[8%] h-9 w-9 rounded-br-[1rem] border-b-2 border-r-2 border-white/82" />
          </div>
          {session && flash && <div className="absolute inset-0 z-10 bg-white" />}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        <div className="mx-auto w-full max-w-[430px]">
          {error && (
            <div className="mb-2">
              <div className="rounded-[1rem] border border-[hsl(var(--destructive))/0.2] bg-[hsl(var(--destructive-soft))/0.78] px-3.5 py-2 text-sm text-destructive backdrop-blur-xl">
                {error}
              </div>
            </div>
          )}

          <div className="app-overlay mb-2 rounded-[1.35rem] px-2.5 py-2">
            {tab === "detail" ? (
              <div ref={galleryRef} className="flex h-[52px] gap-2 overflow-x-auto scrollbar-hide">
                {(previewStripPhotos.length > 0 ? previewStripPhotos : activePhotos).map((photo) => (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() => {
                      if (photo.photoType === "detail") {
                        setAnnotatingPhotoId(photo.id);
                      }
                    }}
                    className="relative h-[52px] w-[42px] flex-shrink-0 overflow-hidden rounded-[0.9rem] border border-[hsl(var(--overlay-border))] bg-[hsl(var(--overlay-surface))/0.36] before:absolute before:-inset-1 before:content-['']"
                  >
                    <img
                      src={photo.uri}
                      alt={photo.fileName}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
                {previewStripPhotos.length === 0 && (
                  <div className="flex h-[52px] items-center text-[11px] app-overlay-muted">
                    Capture detail photos
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[52px] gap-2">
                {STANDARD_SHOT_TYPES.map((type) => {
                  const done = standardStatus[type];
                  const photo = standardPhotoMap[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCurrentShotType(type)}
                      className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[0.9rem] border px-2.5 py-1.5 text-[11px] font-medium transition before:absolute before:-inset-1 before:content-[''] ${
                        currentShotType === type
                          ? "border-[hsl(var(--overlay-border))] bg-[hsl(var(--surface-raised))/0.16] app-overlay-text"
                          : done
                            ? "border-[hsl(var(--overlay-border))] bg-[hsl(var(--surface-raised))/0.12] app-overlay-text"
                            : "border-[hsl(var(--overlay-border))] bg-[hsl(var(--overlay-surface))/0.44] app-overlay-muted"
                      }`}
                    >
                      {photo ? (
                        <>
                          <img
                            src={photo.uri}
                            alt={photo.fileName}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-[hsl(var(--overlay-surface-strong))/0.16]" />
                        </>
                      ) : null}
                      <span className={`relative z-10 ${photo ? "sr-only" : ""}`}>
                        {PHOTO_TYPE_LABELS[type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="app-overlay mb-2 flex items-center justify-between rounded-[1.5rem] px-3.5 py-2.5">
            <button
              type="button"
              onClick={() => handleSwitchSku("prev")}
              disabled={currentIndex <= 0}
              className="relative app-overlay-chip flex h-[46px] w-[46px] items-center justify-center rounded-full transition hover:brightness-110 disabled:opacity-25 before:absolute before:-inset-2 before:content-['']"
              aria-label="Previous look"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.25 19.25 8 12l7.25-7.25" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCapture}
              disabled={!session || status !== "ready" || capturing}
              className="relative app-overlay-strong flex h-[82px] w-[82px] items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40 before:absolute before:-inset-2 before:content-['']"
              aria-label="Capture"
            >
              <span className="absolute inset-[6px] rounded-full border border-white/62" />
              <span className="h-[52px] w-[52px] rounded-full bg-[rgba(255,255,255,0.96)]" />
            </button>

            <button
              type="button"
              onClick={() => handleSwitchSku("next")}
              disabled={currentIndex >= skuList.length - 1}
              className="relative app-overlay-chip flex h-[46px] w-[46px] items-center justify-center rounded-full transition hover:brightness-110 disabled:opacity-25 before:absolute before:-inset-2 before:content-['']"
              aria-label="Next look"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.75 4.75 7.25 7.25-7.25 7.25" />
              </svg>
            </button>
          </div>

          <div className="app-overlay mx-auto max-w-[210px] rounded-[1.1rem] p-1">
            <div className="flex">
              <button
                type="button"
                onClick={() => {
                  setTab("detail");
                  setError("");
                }}
                className={`relative flex-1 rounded-[0.9rem] px-3 py-1.5 text-[13px] font-medium transition before:absolute before:-inset-1 before:content-[''] ${
                  tab === "detail" ? "bg-[hsl(var(--surface-raised))/0.16] app-overlay-text" : "app-overlay-muted"
                }`}
                disabled={!session}
              >
                Detail
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("standard");
                  setError("");
                }}
                className={`relative flex-1 rounded-[0.9rem] px-3 py-1.5 text-[13px] font-medium transition before:absolute before:-inset-1 before:content-[''] ${
                  tab === "standard" ? "bg-[hsl(var(--surface-raised))/0.16] app-overlay-text" : "app-overlay-muted"
                }`}
                disabled={!session}
              >
                Fitting
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRoundPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(var(--foreground))/0.2] px-6 backdrop-blur-sm">
          <SurfaceCard className="w-full max-w-sm p-6">
            <h2 className="section-title text-lg">Choose Round</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedSku} is about to enter a fitting session. Please choose the current round first.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {FITTING_ROUNDS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRound(item)}
                  className={`rounded-[1.15rem] border px-4 py-3 text-sm font-medium transition ${
                    round === item
                      ? "border-transparent bg-primary text-primary-foreground shadow-soft"
                      : "border-soft bg-surface-raised text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {FITTING_ROUND_LABELS[item]}
                </button>
              ))}
            </div>

            <p className="mt-4 rounded-[1.15rem] border border-soft bg-surface-soft px-4 py-3 text-sm text-muted-foreground">
              Naming preview: {selectedSku}_{round}_001.jpg
            </p>

            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                onClick={() => router.push(backPath)}
                variant="secondary"
                fullWidth
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStartSession}
                fullWidth
              >
                Start Shooting
              </Button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {annotatingPhoto && (
        <FittingAnnotationEditor
          imageUri={annotatingPhoto.originalUri}
          initialActions={annotatingPhoto.annotationData}
          onClose={() => setAnnotatingPhotoId(null)}
          onDelete={() => {
            if (!session || !annotatingPhoto) return;
            deletePhoto(session.sessionId, annotatingPhoto.id);
            setAnnotatingPhotoId(null);
          }}
          onSave={handleSaveAnnotation}
        />
      )}
    </div>
  );
}
