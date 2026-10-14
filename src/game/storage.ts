import { MAX_CORPSES, STORAGE_KEY } from "./constants.ts";
import type { Corpse } from "./logic.ts";

function toCorpse(value: unknown): Corpse | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.x !== "number" || typeof v.z !== "number") return null;
  if (!Number.isFinite(v.x) || !Number.isFinite(v.z)) return null;
  return { x: v.x, z: v.z };
}

/** 壊れた要素を除き、新しい MAX_CORPSES 体だけ残す。保存形式が違うときは changed */
export function sanitizeCorpses(parsed: unknown): { corpses: Corpse[]; changed: boolean } {
  if (!Array.isArray(parsed)) return { corpses: [], changed: true };
  const valid = parsed.map(toCorpse).filter((c): c is Corpse => c !== null);
  const corpses = valid.slice(-MAX_CORPSES);
  const changed =
    corpses.length !== parsed.length ||
    parsed.some((item, i) => {
      const kept = corpses[i - (parsed.length - corpses.length)];
      if (!kept || typeof item !== "object" || item === null) return true;
      const rec = item as Record<string, unknown>;
      const keys = Object.keys(rec);
      return keys.length !== 2 || rec.x !== kept.x || rec.z !== kept.z;
    });
  return { corpses, changed };
}

function persist(storage: Storage, corpses: readonly Corpse[]): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(corpses));
  } catch {
    // 保存できなくても遊べるようにする
  }
}

/** 保存済みの亡骸を読む。壊れたデータや多すぎる分は捨て、必要なら保存し直す */
export function loadCorpses(storage: Storage | undefined = globalThis.localStorage): Corpse[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { corpses, changed } = sanitizeCorpses(JSON.parse(raw) as unknown);
    if (changed) persist(storage, corpses);
    return corpses;
  } catch {
    persist(storage, []);
    return [];
  }
}

/** 亡骸を 1 つ追加して保存し、新しい一覧を返す。古いものから捨てる */
export function addCorpse(
  corpse: Corpse,
  storage: Storage | undefined = globalThis.localStorage
): Corpse[] {
  const next = [...loadCorpses(storage), corpse].slice(-MAX_CORPSES);
  if (storage) persist(storage, next);
  return next;
}

export function clearCorpses(storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、画面上の亡骸は呼び出し側が空にする
  }
}

/** 確認で OK のときだけ亡骸を空にする。キャンセルでは今の一覧をそのまま返す */
export function corpsesAfterReset(
  current: readonly Corpse[],
  choice: "ok" | "cancel",
  storage: Storage | undefined = globalThis.localStorage
): Corpse[] {
  if (choice !== "ok") return [...current];
  clearCorpses(storage);
  return [];
}
