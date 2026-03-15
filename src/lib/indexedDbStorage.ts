import type { StateStorage } from "zustand/middleware";

const DB_NAME = "sku-web-storage";
const STORE_NAME = "zustand";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export const indexedDbStorage: StateStorage = {
  getItem: async (name) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return null;
    const result = await withStore("readonly", (store) => store.get(name));
    return typeof result === "string" ? result : null;
  },

  setItem: async (name, value) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return;
    await withStore("readwrite", (store) => store.put(value, name));
  },

  removeItem: async (name) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return;
    await withStore("readwrite", (store) => store.delete(name));
  },
};
