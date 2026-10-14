import { describe, expect, it } from "vitest";
import { CAR, CRAB, CROSSING, ROAD } from "./constants.ts";
import {
  clampCrabX,
  createInitialState,
  findHit,
  getTires,
  hitsTire,
  restartState,
  step,
  stepTraffic,
  type Car,
  type Direction,
  type GameState,
} from "./logic.ts";

/** シード付きの擬似乱数（mulberry32） */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 1 / 60;

/** 車のいない初期状態（当たり判定・移動だけを見たいテスト用） */
const blank = (): GameState => ({ ...createInitialState(seeded(0)), cars: [], spawnTimer: 10 });

/** policy に従って最後（または 60 秒）まで遊ぶ */
function play(seed: number, policy: (s: GameState) => Direction): GameState {
  const rng = seeded(seed);
  let s = createInitialState(rng);
  for (let t = 0; s.phase === "playing" && t < 60; t += DT) s = step(s, DT, policy(s), rng);
  return s;
}

/** 今の車だけを見て、direction で horizon 秒動いても当たらないか */
function isSafe(s: GameState, direction: Direction, horizon: number): boolean {
  let x = s;
  for (let t = 0; t < horizon; t += DT) {
    x = step(x, DT, direction, () => 0.5);
    if (x.phase === "gameover") return false;
  }
  return true;
}

/** 隙間を待つ素朴な戦略: 進めるなら右、だめなら止まる、それもだめなら下がる */
const waitForGap = (s: GameState): Direction =>
  isSafe(s, 1, 0.5) ? 1 : isSafe(s, 0, 0.5) ? 0 : isSafe(s, -1, 0.5) ? -1 : 0;

const carAt = (x: number, z: number): Car => ({ id: 1, x, z, speed: CAR.speed });

describe("タイヤとの当たり判定", () => {
  it("タイヤの真上にいると当たる", () => {
    const tire = getTires(carAt(0, 0))[0];
    expect(hitsTire(tire.x, tire.z, tire)).toBe(true);
  });

  it("車体の真下（左右タイヤの間）はくぐれる", () => {
    expect(findHit(0, [carAt(0, CRAB.z)])).toBeNull();
  });

  it("前後タイヤの間もくぐれる", () => {
    expect(findHit(CAR.halfTrack, [carAt(0, CRAB.z)])).toBeNull();
  });

  it("車の外側では当たらない", () => {
    expect(findHit(3, [carAt(0, CRAB.z + CAR.halfWheelbase)])).toBeNull();
  });

  it("後輪の位置に重なると当たる", () => {
    expect(findHit(-CAR.halfTrack, [carAt(0, CRAB.z - CAR.halfWheelbase)])).not.toBeNull();
  });
});

describe("step", () => {
  it("左右入力で蟹が動き、道路外には出ない", () => {
    const s = step(blank(), 0.1, 1, () => 0.5);
    expect(s.crabX).toBeCloseTo(CROSSING.startX + CRAB.speed * 0.1);
    expect(clampCrabX(100)).toBe(CROSSING.goalX);
    expect(clampCrabX(-100)).toBe(CROSSING.startX);
  });

  it("タイヤが来たらゲームオーバーになり、当たった位置を記録する", () => {
    const tireX = CAR.halfTrack;
    const state = {
      ...blank(),
      crabX: tireX,
      cars: [carAt(0, -CAR.halfWheelbase - 0.5)],
    };
    const s = step(state, 0.05, 0, () => 0.5);
    expect(s.phase).toBe("gameover");
    expect(s.hitAt).toEqual({ x: tireX, z: CRAB.z });
    const after = step(s, 1, 1);
    expect(after.crabX).toBe(tireX);
    expect(after.phase).toBe("gameover");
  });

  it("時間経過で車が湧く", () => {
    const empty = { ...blank(), spawnTimer: 0.5 };
    const s = step(empty, 1, 0, () => 0.5);
    expect(s.cars).toHaveLength(1);
    expect(s.cars[0].z).toBe(ROAD.spawnZ);
  });
});

describe("開始時の交通", () => {
  it("開始時点で車が道路の奥から手前まで流れている", () => {
    const s = createInitialState(seeded(1));
    expect(s.cars.length).toBeGreaterThan(5);
    expect(Math.max(...s.cars.map((c) => c.z))).toBeGreaterThan(CRAB.z);
    expect(Math.min(...s.cars.map((c) => c.z))).toBeLessThan(ROAD.spawnZ / 2);
  });

  it("開始から右を押しっぱなしにするとクリアできずゲームオーバーになる", () => {
    for (let seed = 1; seed <= 10; seed++) {
      expect(play(seed, () => 1).phase, `seed ${seed}`).toBe("gameover");
    }
  });

  it("隙間を待てば（素朴な戦略でも）ほとんどクリアできる", () => {
    // 0.5 秒先しか見ない戦略なので挟み撃ちで負けることもある。それでも大半はクリアできる
    let cleared = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (play(seed, waitForGap).phase === "cleared") cleared += 1;
    }
    expect(cleared).toBeGreaterThanOrEqual(16);
  });
});

describe("ゲームオーバー / クリア後の世界", () => {
  const ended = (phase: "gameover" | "cleared"): GameState => ({
    ...createInitialState(seeded(2)),
    phase,
    crabX: 1,
    hitAt: phase === "gameover" ? { x: 1, z: CRAB.z } : null,
  });

  it("リスタートしても交通はそのままで、蟹だけ出発位置に戻る", () => {
    const s = ended("gameover");
    const r = restartState(s);
    expect(r.phase).toBe("playing");
    expect(r.crabX).toBe(CROSSING.startX);
    expect(r.hitAt).toBeNull();
    expect(r.cars).toBe(s.cars);
  });

  for (const phase of ["gameover", "cleared"] as const) {
    it(`${phase} 後も車は流れ続け、蟹は動かない`, () => {
      const s = ended(phase);
      const next = step(s, 0.1, 1, seeded(3));
      expect(next.phase).toBe(phase);
      expect(next.crabX).toBe(1);
      expect(next.hitAt).toEqual(s.hitAt);
      const car = s.cars.find((c) => c.z < 0);
      expect(car).toBeDefined();
      expect(next.cars.find((c) => c.id === car?.id)?.z).toBeCloseTo(
        (car?.z ?? 0) + CAR.speed * 0.1
      );
      expect(next.cars).toEqual(stepTraffic(s, 0.1, seeded(3)).cars);
    });
  }
});

describe("ゴール判定", () => {
  it("道路の幅は以前（8）よりはっきり長い", () => {
    expect(ROAD.width).toBeGreaterThanOrEqual(16);
    expect(CROSSING.goalX - CROSSING.startX).toBeGreaterThan(ROAD.width);
  });

  it("向こう側に着いたらクリアになり、以後は進まない", () => {
    const state = { ...blank(), crabX: CROSSING.goalX - 0.01 };
    const s = step(state, 0.1, 1, () => 0.5);
    expect(s.phase).toBe("cleared");
    expect(s.crabX).toBe(CROSSING.goalX);
    expect(step(s, 1, -1).crabX).toBe(CROSSING.goalX);
  });

  it("ゴール手前ではクリアにならない", () => {
    const state = { ...blank(), crabX: CROSSING.goalX - 1 };
    expect(step(state, 0.1, 1, () => 0.5).phase).toBe("playing");
  });

  it("出発位置で左に押してもクリアにならない", () => {
    expect(step(blank(), 0.1, -1, () => 0.5).phase).toBe("playing");
  });

  it("ゴール地点でタイヤに当たったらゲームオーバーが優先される", () => {
    const car = {
      id: 1,
      x: CROSSING.goalX - CAR.halfTrack,
      z: -CAR.halfWheelbase - 0.1,
      speed: CAR.speed,
    };
    const state = { ...blank(), crabX: CROSSING.goalX, cars: [car] };
    expect(step(state, 0.01, 0, () => 0.5).phase).toBe("gameover");
  });
});
