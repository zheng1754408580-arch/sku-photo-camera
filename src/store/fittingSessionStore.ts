import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STANDARD_SHOT_TYPES } from "@/constants/fitting";
import { indexedDbStorage } from "@/lib/indexedDbStorage";
import {
  generateFittingPhotoFileName,
  getFileExtension,
} from "@/services/photoNaming";
import type {
  AnnotationAction,
  FittingPhotoItem,
  FittingPhotoType,
  FittingRound,
  FittingSession,
  StandardShotStatus,
  StandardShotType,
} from "@/types/fitting";

interface FittingSessionState {
  sessions: Record<string, FittingSession>;
  activeSessionId: string | null;
  startSession: (styleNo: string, fittingRound: FittingRound) => FittingSession;
  setActiveSession: (sessionId: string | null) => void;
  getActiveSession: () => FittingSession | null;
  getSession: (sessionId: string) => FittingSession | null;
  getSessionByStyleAndRound: (
    styleNo: string,
    fittingRound: FittingRound,
  ) => FittingSession | null;
  addPhoto: (
    sessionId: string,
    uri: string,
    photoType: FittingPhotoType,
    sourceFileName?: string,
  ) => FittingPhotoItem | null;
  updateAnnotation: (
    sessionId: string,
    photoId: string,
    uri: string,
    annotationData: AnnotationAction[],
  ) => void;
  deletePhoto: (sessionId: string, photoId: string) => void;
  completeSession: (sessionId: string) => void;
  getStandardShotStatus: (sessionId: string) => StandardShotStatus;
  getPhotoCountForStyle: (styleNo: string) => number;
  getTotalPhotoCount: () => number;
  getAllPhotosMap: () => Record<string, FittingPhotoItem[]>;
}

function createSessionId(styleNo: string, round: FittingRound): string {
  return `${styleNo}__${round}`;
}

function getNextSequence(photos: FittingPhotoItem[]): number {
  return photos.reduce((max, item) => Math.max(max, item.sequence), 0) + 1;
}

function buildShotStatus(photos: FittingPhotoItem[]): StandardShotStatus {
  return {
    front: photos.some((photo) => photo.photoType === "front"),
    side: photos.some((photo) => photo.photoType === "side"),
    back: photos.some((photo) => photo.photoType === "back"),
  };
}

function createPhoto(
  session: FittingSession,
  photos: FittingPhotoItem[],
  uri: string,
  photoType: FittingPhotoType,
  sourceFileName?: string,
): FittingPhotoItem {
  const sequence = getNextSequence(photos);
  const extension = getFileExtension(sourceFileName ?? "jpg");

  return {
    id: `${session.sessionId}_${photoType}_${sequence}_${Date.now()}`,
    sessionId: session.sessionId,
    styleNo: session.styleNo,
    fittingRound: session.fittingRound,
    sequence,
    photoType,
    uri,
    originalUri: uri,
    fileName: generateFittingPhotoFileName({
      styleNo: session.styleNo,
      round: session.fittingRound,
      sequence,
      extension,
    }),
    createdAt: Date.now(),
    annotationData: [],
    isAnnotated: false,
  };
}

export const useFittingSessionStore = create<FittingSessionState>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionId: null,

      startSession: (styleNo, fittingRound) => {
        const sessionId = createSessionId(styleNo, fittingRound);
        const existing = get().sessions[sessionId];
        if (existing) {
          set({ activeSessionId: sessionId });
          return existing;
        }

        const session: FittingSession = {
          sessionId,
          styleNo,
          fittingRound,
          startedAt: Date.now(),
          completedAt: null,
          photos: [],
        };

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: session,
          },
          activeSessionId: sessionId,
        }));

        return session;
      },

      setActiveSession: (sessionId) => {
        set({ activeSessionId: sessionId });
      },

      getActiveSession: () => {
        const { activeSessionId, sessions } = get();
        return activeSessionId ? sessions[activeSessionId] ?? null : null;
      },

      getSession: (sessionId) => get().sessions[sessionId] ?? null,

      getSessionByStyleAndRound: (styleNo, fittingRound) => {
        const sessionId = createSessionId(styleNo, fittingRound);
        return get().sessions[sessionId] ?? null;
      },

      addPhoto: (sessionId, uri, photoType, sourceFileName) => {
        const session = get().sessions[sessionId];
        if (!session) return null;

        const nextPhoto = createPhoto(session, session.photos, uri, photoType, sourceFileName);
        const nextPhotos =
          STANDARD_SHOT_TYPES.includes(photoType as StandardShotType)
            ? [
                ...session.photos.filter((photo) => photo.photoType !== photoType),
                nextPhoto,
              ].sort((a, b) => a.createdAt - b.createdAt)
            : [...session.photos, nextPhoto];

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              completedAt: null,
              photos: nextPhotos,
            },
          },
        }));

        return nextPhoto;
      },

      updateAnnotation: (sessionId, photoId, uri, annotationData) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                photos: session.photos.map((photo) =>
                  photo.id === photoId
                    ? {
                        ...photo,
                        uri,
                        annotationData,
                        isAnnotated: annotationData.length > 0,
                      }
                    : photo,
                ),
              },
            },
          };
        });
      },

      deletePhoto: (sessionId, photoId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                completedAt: null,
                photos: session.photos.filter((photo) => photo.id !== photoId),
              },
            },
          };
        });
      },

      completeSession: (sessionId) => {
        set((state) => {
          const session = state.sessions[sessionId];
          if (!session) return state;
          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                completedAt: Date.now(),
              },
            },
          };
        });
      },

      getStandardShotStatus: (sessionId) => {
        const session = get().sessions[sessionId];
        return session ? buildShotStatus(session.photos) : { front: false, side: false, back: false };
      },

      getPhotoCountForStyle: (styleNo) =>
        Object.values(get().sessions).reduce((sum, session) => {
          if (session.styleNo !== styleNo) return sum;
          return sum + session.photos.length;
        }, 0),

      getTotalPhotoCount: () =>
        Object.values(get().sessions).reduce(
          (sum, session) => sum + session.photos.length,
          0,
        ),

      getAllPhotosMap: () => {
        const map: Record<string, FittingPhotoItem[]> = {};
        Object.values(get().sessions).forEach((session) => {
          map[session.styleNo] = [...(map[session.styleNo] ?? []), ...session.photos];
        });
        return map;
      },
    }),
    {
      name: "fitting-session-storage",
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
