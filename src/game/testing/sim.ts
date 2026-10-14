import { createInitialState, step, type Direction, type GameState } from "../logic.ts";

import { seeded } from "../random.ts";

export { seeded };

export const DT = 1 / 60;

/** policy に従って最後（または limit 秒）まで遊ぶ */
export function play(seed: number, policy: (s: GameState) => Direction, limit = 90): GameState {
  const rng = seeded(seed);
  let s = createInitialState(rng);
  for (let t = 0; s.phase === "playing" && t < limit; t += DT) s = step(s, DT, policy(s), rng);
  return s;
}

/** 今の車だけを見て、direction で horizon 秒動いても当たらないか（新しく出る車は見ない） */
export function isSafe(s: GameState, direction: Direction, horizon: number): boolean {
  let x: GameState = { ...s, spawnTimers: s.spawnTimers.map(() => Infinity) };
  for (let t = 0; t < horizon; t += DT) {
    x = step(x, DT, direction, () => 0.5);
    if (x.phase === "gameover") return false;
  }
  return true;
}

/** 隙間を待つ素朴な戦略: 進めるなら右、だめなら止まる、それもだめなら下がる */
export function waitForGap(horizon = 0.6) {
  return (s: GameState): Direction =>
    isSafe(s, 1, horizon) ? 1 : isSafe(s, 0, horizon) ? 0 : isSafe(s, -1, horizon) ? -1 : 0;
}
