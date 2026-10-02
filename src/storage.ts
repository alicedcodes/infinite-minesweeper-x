const META_KEY = "infinite-minesweeper";
const DB_NAME = "infinite-minesweeper";
const STORE = "chunks";
const SAVE_DELAY = 500;

export type Meta = {
  seed: number;
  started: boolean;
  startX: number;
  startY: number;
  camX: number;
  camY: number;
  zoom: number;
};

export type ChunkRecord = { cx: number; cy: number; states: Uint8Array };

const request = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error);
  });

let dbPromise: Promise<IDBDatabase> | null = null;
const db = (): Promise<IDBDatabase> => {
  dbPromise ??= (() => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (): void => {
      req.result.createObjectStore(STORE);
    };
    return request(req);
  })();
  return dbPromise;
};

export function loadMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Partial<Meta>;
    const ok =
      typeof m.seed === "number" &&
      typeof m.started === "boolean" &&
      typeof m.startX === "number" &&
      typeof m.startY === "number" &&
      typeof m.camX === "number" &&
      typeof m.camY === "number" &&
      typeof m.zoom === "number";
    return ok ? (m as Meta) : null;
  } catch (err) {
    console.error("Error loading save data:", err);
    return null;
  }
}

export async function loadChunks(): Promise<ChunkRecord[]> {
  const store = (await db()).transaction(STORE, "readonly").objectStore(STORE);
  const [keys, values] = await Promise.all([request(store.getAllKeys()), request(store.getAll())]);
  return keys.map((key, i) => {
    // oxlint-disable-next-line typescript/no-base-to-string
    const [cx, cy] = String(key).split(",").map(Number) as [number, number];
    return { cx, cy, states: values[i] as Uint8Array };
  });
}

export async function clearChunks(): Promise<void> {
  await request((await db()).transaction(STORE, "readwrite").objectStore(STORE).clear());
}

export function createSaver(
  getMeta: () => Meta,
  takeDirty: () => ChunkRecord[],
): { schedule: () => void; flush: () => void } {
  const pending = new Map<string, ChunkRecord>();
  let timer: number | undefined;
  let changed = false;

  const flush = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    if (changed) {
      changed = false;
      try {
        localStorage.setItem(META_KEY, JSON.stringify(getMeta()));
      } catch (err) {
        console.error("Error saving to localStorage:", err);
      }
      for (const record of takeDirty()) pending.set(`${record.cx},${record.cy}`, record);
    }

    if (pending.size === 0) return;

    const batch = [...pending];
    db()
      .then(
        (database) =>
          new Promise<void>((resolve, reject) => {
            const tx = database.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            for (const [key, record] of batch) store.put(record.states, key);
            tx.oncomplete = (): void => resolve();
            tx.onerror = tx.onabort = (): void => reject(tx.error);
          }),
      )
      .then(() => {
        for (const [key, record] of batch) if (pending.get(key) === record) pending.delete(key);
      })
      .catch((err) => console.error("Error saving chunks:", err));
  };

  const schedule = (): void => {
    changed = true;
    timer ??= setTimeout(flush, SAVE_DELAY);
  };

  document.addEventListener("visibilitychange", () => document.hidden && flush());
  window.addEventListener("pagehide", flush);

  return { schedule, flush };
}
