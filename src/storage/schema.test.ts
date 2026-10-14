import { describe, expect, it } from 'vitest';
import { emptyData, mergeData, parseAppData, toExportFile, ValidationError } from './schema';
import { createLocalRepository } from './repository';
import { at, makeProfile, makeSession } from '../domain/testUtils';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

describe('import validation', () => {
  it('rejects files that are not FRONTIER data', () => {
    expect(() => parseAppData('hello')).toThrow(ValidationError);
    expect(() => parseAppData({ foo: 1 })).toThrow(/does not contain FRONTIER data/);
    expect(() => parseAppData({ sessions: 'nope' })).toThrow(/must be a list/);
  });

  it('rejects sessions with invalid fields, with a helpful message', () => {
    expect(() => parseAppData({ sessions: [{ id: 'a', modality: 'jousting', startAt: at(0), activeDurationSeconds: 60 }] })).toThrow(/Session #1 has an unknown activity type/);
    expect(() => parseAppData({ sessions: [{ id: 'a', modality: 'meditation', startAt: 'yesterday', activeDurationSeconds: 60 }] })).toThrow(/invalid start time/);
    expect(() => parseAppData({ sessions: [{ id: 'a', modality: 'meditation', startAt: at(0), activeDurationSeconds: -5 }] })).toThrow(/invalid duration/);
  });

  it('rejects files from a newer schema', () => {
    expect(() => parseAppData({ schemaVersion: 99, sessions: [] })).toThrow(/newer version/);
  });

  it('round-trips an export file', () => {
    const d = { ...emptyData(), profile: makeProfile(), sessions: [makeSession({ id: 'a', startAt: at(0) })] };
    const parsed = parseAppData(JSON.parse(JSON.stringify(toExportFile(d))));
    expect(parsed.sessions).toEqual(d.sessions);
    expect(parsed.profile?.enabledModalities).toEqual(d.profile.enabledModalities);
  });

  it('drops duplicate session ids inside one file', () => {
    const s = makeSession({ id: 'dup', startAt: at(0) });
    expect(parseAppData({ sessions: [s, s] }).sessions).toHaveLength(1);
  });

  it('merge keeps the newer version of a session', () => {
    const old = makeSession({ id: 'a', startAt: at(0), minutes: 10, updatedAt: at(0) });
    const newer = { ...old, activeDurationSeconds: 1200, updatedAt: at(2) };
    const merged = mergeData({ ...emptyData(), sessions: [old] }, { ...emptyData(), sessions: [newer] });
    expect(merged.sessions).toEqual([newer]);
  });
});

describe('local repository', () => {
  it('persists across a reload', () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository(storage);
    const d = { ...emptyData(), profile: makeProfile(), sessions: [makeSession({ id: 'a', startAt: at(0) })] };
    expect(repo.save(d).ok).toBe(true);
    const again = createLocalRepository(storage).load();
    expect(again.error).toBeUndefined();
    expect(again.data.sessions).toHaveLength(1);
    expect(again.data.profile?.id).toBe('p1');
  });

  it('keeps a backup instead of destroying unreadable data', () => {
    const storage = new MemoryStorage();
    storage.setItem('frontier:data:v1', '{broken');
    const r = createLocalRepository(storage).load();
    expect(r.error).toMatch(/could not be read/);
    expect(storage.length).toBe(2);
  });

  it('clear removes user data', () => {
    const storage = new MemoryStorage();
    const repo = createLocalRepository(storage);
    repo.save({ ...emptyData(), profile: makeProfile() });
    repo.clear();
    expect(repo.load().data.profile).toBeNull();
  });
});
