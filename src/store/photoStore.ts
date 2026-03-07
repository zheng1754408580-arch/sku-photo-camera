import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  extractSequenceFromFileName,
  generatePhotoFileName,
} from "../services/photoNaming";

export interface PhotoItem {
  uri: string;
  fileName: string;
  timestamp: number;
}

export interface PhotoState {
  photos: Record<string, PhotoItem[]>;

  addPhoto: (sku: string, uri: string) => PhotoItem;
  deletePhoto: (sku: string, fileName: string) => void;
  clearPhotosForSku: (sku: string) => void;
  clearAll: () => void;
  getPhotosForSku: (sku: string) => PhotoItem[];
  getPhotoCount: (sku: string) => number;
  getTotalPhotoCount: () => number;
  getAllPhotos: () => Record<string, PhotoItem[]>;
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      photos: {},

      addPhoto: (sku, uri) => {
        const existing = get().photos[sku] ?? [];
        const maxSeq = existing.reduce(
          (max, p) => Math.max(max, extractSequenceFromFileName(p.fileName)),
          0,
        );
        const sequence = maxSeq + 1;
        const fileName = generatePhotoFileName(sku, sequence);
        const newItem: PhotoItem = { uri, fileName, timestamp: Date.now() };

        set((state) => ({
          photos: {
            ...state.photos,
            [sku]: [...(state.photos[sku] ?? []), newItem],
          },
        }));
        return newItem;
      },

      deletePhoto: (sku, fileName) => {
        set((state) => {
          const list = state.photos[sku];
          if (!list) return state;
          const updated = list.filter((p) => p.fileName !== fileName);
          return { photos: { ...state.photos, [sku]: updated } };
        });
      },

      clearPhotosForSku: (sku) => {
        set((state) => {
          const next = { ...state.photos };
          delete next[sku];
          return { photos: next };
        });
      },

      clearAll: () => set({ photos: {} }),
      getPhotosForSku: (sku) => get().photos[sku] ?? [],
      getPhotoCount: (sku) => (get().photos[sku] ?? []).length,
      getTotalPhotoCount: () =>
        Object.values(get().photos).reduce((sum, list) => sum + list.length, 0),
      getAllPhotos: () => get().photos,
    }),
    {
      name: "photo-storage",
      partialize: (state) => ({ photos: state.photos }),
    },
  ),
);
