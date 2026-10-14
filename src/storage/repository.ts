/**
 * Persistence behind a small repository interface so localStorage can be
 * swapped for IndexedDB or a sync backend later. Nothing leaves the device.
 */
import type { AppData } from '../domain/types';
import { emptyData, parseAppData } from './schema';

export interface Repository {
  load(): { data: AppData; error?: string };
  save(data: AppData): { ok: boolean; error?: string };
  clear(): void;
}

const KEY = 'frontier:data:v1';

export function createLocalRepository(storage: Storage | undefined = typeof localStorage !== 'undefined' ? localStorage : undefined): Repository {
  return {
    load() {
      if (!storage) return { data: emptyData(), error: 'Local storage is unavailable; data will not persist.' };
      let raw: string | null = null;
      try {
        raw = storage.getItem(KEY);
      } catch {
        return { data: emptyData(), error: 'Local storage is blocked in this browser; data will not persist.' };
      }
      if (!raw) return { data: emptyData() };
      try {
        return { data: parseAppData(JSON.parse(raw)) };
      } catch (e) {
        // Keep the unreadable copy so nothing is silently destroyed.
        try {
          storage.setItem(`${KEY}:corrupt:${Date.now()}`, raw);
        } catch {
          /* ignore */
        }
        return { data: emptyData(), error: `Saved data could not be read (${(e as Error).message}). A backup copy was kept.` };
      }
    },
    save(data) {
      if (!storage) return { ok: false, error: 'Local storage is unavailable.' };
      try {
        storage.setItem(KEY, JSON.stringify(data));
        return { ok: true };
      } catch (e) {
        return { ok: false, error: `Could not save: ${(e as Error).message}` };
      }
    },
    clear() {
      try {
        storage?.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
}
