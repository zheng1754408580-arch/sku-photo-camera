import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SKUState {
  skuList: string[];
  selectedSku: string | null;
  currentIndex: number;

  setSkuList: (list: string[]) => void;
  selectSku: (sku: string) => void;
  selectNext: () => boolean;
  selectPrevious: () => boolean;
  clear: () => void;
  hasData: () => boolean;
}

export const useSkuStore = create<SKUState>()(
  persist(
    (set, get) => ({
      skuList: [],
      selectedSku: null,
      currentIndex: 0,

      setSkuList: (list) =>
        set({
          skuList: list,
          selectedSku: list.length > 0 ? list[0] : null,
          currentIndex: 0,
        }),

      selectSku: (sku) => {
        const idx = get().skuList.indexOf(sku);
        if (idx >= 0) {
          set({ selectedSku: sku, currentIndex: idx });
        }
      },

      selectNext: () => {
        const { skuList, currentIndex } = get();
        if (currentIndex < skuList.length - 1) {
          const next = currentIndex + 1;
          set({ currentIndex: next, selectedSku: skuList[next] });
          return true;
        }
        return false;
      },

      selectPrevious: () => {
        const { skuList, currentIndex } = get();
        if (currentIndex > 0) {
          const prev = currentIndex - 1;
          set({ currentIndex: prev, selectedSku: skuList[prev] });
          return true;
        }
        return false;
      },

      clear: () => set({ skuList: [], selectedSku: null, currentIndex: 0 }),
      hasData: () => get().skuList.length > 0,
    }),
    {
      name: "sku-storage",
      partialize: (state) => ({
        skuList: state.skuList,
        selectedSku: state.selectedSku,
        currentIndex: state.currentIndex,
      }),
    },
  ),
);
