import { useSyncExternalStore } from "react";

export type StoredReceipt = {
  slug: string;
  title: string;
  hash: `0x${string}`;
  /** Stored as a string because localStorage cannot hold BigInt. */
  priceUsdCents: string;
  /** Unix seconds, captured at confirmation time on this device. */
  paidAt: number;
};

const STORAGE_KEY = "railsplit:receipts:v1";
const MAX_STORED = 20;
const EMPTY_SNAPSHOT: StoredReceipt[] = [];

type RawReceipt = {
  slug?: unknown;
  title?: unknown;
  hash?: unknown;
  priceUsdCents?: unknown;
  paidAt?: unknown;
};

function isStoredReceipt(value: RawReceipt): value is StoredReceipt {
  return (
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    typeof value.hash === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(value.hash) &&
    typeof value.priceUsdCents === "string" &&
    /^\d+$/.test(value.priceUsdCents) &&
    typeof value.paidAt === "number"
  );
}

function readStorage(): StoredReceipt[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry): entry is StoredReceipt =>
          typeof entry === "object" &&
          entry !== null &&
          isStoredReceipt(entry as RawReceipt),
      );
  } catch {
    return [];
  }
}

function writeStorage(list: StoredReceipt[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // The storage quota can be full; a missed receipt is not worth breaking checkout for.
  }
}

/**
 * Receipts confirmed on this device, held as an external store so the list
 * survives the checkout tab closing. The transaction hash is not stored
 * on-chain, so without this the receipt URL would be lost forever.
 */
let snapshot: StoredReceipt[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function ensureHydrated() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  snapshot = readStorage();
}

function subscribe(onStoreChange: () => void) {
  ensureHydrated();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  ensureHydrated();
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function commit(next: StoredReceipt[]) {
  snapshot = next;
  writeStorage(next);
  for (const listener of listeners) listener();
}

export function saveStoredReceipt(receipt: StoredReceipt) {
  ensureHydrated();
  const next = [
    receipt,
    ...snapshot.filter((entry) => entry.hash !== receipt.hash),
  ].slice(0, MAX_STORED);
  commit(next);
}

export function clearStoredReceipts() {
  ensureHydrated();
  commit([]);
}

/** The stored receipts for this device, as a reactive value. */
export function useStoredReceipts(): StoredReceipt[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
