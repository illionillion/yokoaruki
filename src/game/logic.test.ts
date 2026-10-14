import { describe, expect, it } from "vitest";
import { CRAB, CROSSING, LANE_WIDTH, ROAD, VEHICLES, type VehicleKind } from "./constants.ts";
import { EFFECTS } from "./effects.ts";
import {
  clampCrabX,
  createInitialState,
  createLanes,
  findHit,
  getTires,
  hitsTire,
  pickKind,
  progressOf,
  step,
  stepTraffic,
  type Car,
  type GameState,
  type Lane,
} from "./logic.ts";
import { DT, play, seeded, waitForGap } from "./testing/sim.ts";

const carAt = (x: number, z: number, kind: VehicleKind = "car"): Car => ({
  id: 1,
  lane: 0,
  kind,
  x,
  z,
  speed: 10,
  direction: 1,
});

/** 車のいない状態（当たり判定・移動だけを見たいテスト用）。車は湧かない */
const blank = (): GameState => {
  const s = createInitialState(seeded(0));
  return { ...s, cars: [], spawnTimers: s.lanes.map(() => Infinity) };
};

describe("タイヤとの当たり判定", () => {
  it("タイヤの真上にいると当たる", () => {
    const tire = getTires(carAt(0, 0))[0];
    expect(hitsTire(tire.x, tire.z, tire, "car")).toBe(true);
  });

  it("車体の真下（左右タイヤの間）はくぐれる", () => {
    expect(findHit(0, [carAt(0, CRAB.z)])).toBeNull();
  });

  it("車の外側では当たらない", () => {
    expect(findHit(3, [carAt(0, CRAB.z + VEHICLES.car.halfWheelbase)])).toBeNull();
  });

  it("後輪の位置に重なると当たる", () => {
    const { halfTrack, halfWheelbase } = VEHICLES.car;
    expect(findHit(-halfTrack, [carAt(0, CRAB.z - halfWheelbase)])).not.toBeNull();
  });

  it("トラックは車種ごとの車輪の位置で当たる", () => {
    const { halfTrack, halfWheelbase } = VEHICLES.truck;
    expect(findHit(halfTrack, [carAt(0, CRAB.z + halfWheelbase, "truck")])).not.toBeNull();
    expect(findHit(0, [carAt(0, CRAB.z + halfWheelbase, "truck")])).toBeNull();
  });
});

describe("トラックの下をくぐる", () => {
  /** 蟹の位置にトラックを 1 台走らせ、通り過ぎるまで進める */
  const passTruck = (crabX: number) => {
    const truck = { ...carAt(0, -20, "truck"), speed: 6 };
    let s: GameState = { ...blank(), crabX, cars: [truck] };
    for (let t = 0; t < 8 && s.phase === "playing"; t += DT) s = step(s, DT, 0, () => 0.5);
    return s;
  };

  it("左右の車輪の間にいれば、長いトラックが上を通り過ぎても無事", () => {
    const s = passTruck(0);
    expect(s.phase).toBe("playing");
    // 本当に上を通り過ぎたこと
    expect(s.cars.length === 0 || s.cars[0].z > CRAB.z + VEHICLES.truck.bodyLength / 2).toBe(true);
  });

  it("車輪の列にいると轢かれる", () => {
    expect(passTruck(VEHICLES.truck.halfTrack).phase).toBe("gameover");
  });

  it("トラックの車体の底は蟹より十分高い", () => {
    expect(VEHICLES.truck.bodyBottom).toBeGreaterThan(CRAB.height * 2);
    expect(VEHICLES.truck.halfWheelbase * 2).toBeGreaterThan(VEHICLES.car.halfWheelbase * 4);
  });
});

describe("車種と速さ", () => {
  it("速い車 > 普通の車 > トラックの順に速い", () => {
    expect(VEHICLES.fast.speedMul).toBeGreaterThan(2 * VEHICLES.car.speedMul);
    expect(VEHICLES.truck.speedMul).toBeLessThan(0.5 * VEHICLES.car.speedMul);
  });

  it("車線の割合に応じて車種が決まる", () => {
    const lane = { truckRate: 0.2, fastRate: 0.1 } as Lane;
    expect(pickKind(lane, 0.1)).toBe("truck");
    expect(pickKind(lane, 0.25)).toBe("fast");
    expect(pickKind(lane, 0.5)).toBe("car");
  });

  it("実際の交通に 3 車種が混ざり、速さがばらばら", () => {
    let s = createInitialState(seeded(4));
    const seen = new Map<VehicleKind, Set<number>>();
    for (let t = 0; t < 60; t += 0.1) {
      s = stepTraffic(s, 0.1, seeded(Math.round(t * 10)));
      for (const c of s.cars) seen.set(c.kind, (seen.get(c.kind) ?? new Set()).add(c.speed));
    }
    expect([...seen.keys()].sort()).toEqual(["car", "fast", "truck"]);
    const speeds = [...seen.values()].flatMap((v) => [...v]);
    expect(Math.max(...speeds) / Math.min(...speeds)).toBeGreaterThan(4);
  });

  it("同じ車線では追い越さず、前の車に詰まる", () => {
    const truck = { ...carAt(0, -30, "truck"), id: 1, speed: 5 };
    const fast = { ...carAt(0, -45, "fast"), id: 2, speed: 40 };
    let s: GameState = { ...blank(), crabX: CROSSING.startX, cars: [truck, fast] };
    for (let t = 0; t < 3; t += DT) {
      s = step(s, DT, 0, () => 0.5);
      const [a, b] = s.cars;
      const gap =
        progressOf(a) -
        progressOf(b) -
        VEHICLES.truck.bodyLength / 2 -
        VEHICLES.fast.bodyLength / 2;
      expect(gap).toBeGreaterThan(1);
    }
  });
});

describe("車線", () => {
  it("車線は道路幅を等分し、両方の向きが必ず混ざる", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const lanes = createLanes(seeded(seed));
      expect(lanes).toHaveLength(ROAD.lanes);
      expect(lanes[1].x - lanes[0].x).toBeCloseTo(LANE_WIDTH);
      expect(new Set(lanes.map((l) => l.direction)).size).toBe(2);
    }
  });

  it("向き・間隔・速さの並びはシードごとに変わる", () => {
    const signatures = new Set<string>();
    const intervals = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const lanes = createLanes(seeded(seed));
      signatures.add(lanes.map((l) => l.direction).join(","));
      intervals.add(lanes.map((l) => l.interval.toFixed(2)).join(","));
    }
    expect(signatures.size).toBeGreaterThanOrEqual(6);
    expect(intervals.size).toBe(10);
  });

  it("奥向きの車線の車は手前から出て、奥へ進む", () => {
    const s = createInitialState(seeded(1));
    const away = s.cars.find((c) => c.direction === -1);
    expect(away).toBeDefined();
    const next = stepTraffic(s, 0.1, seeded(9));
    const moved = next.cars.find((c) => c.id === away?.id);
    expect(moved?.z).toBeLessThan(away?.z ?? 0);
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
    const tireX = VEHICLES.car.halfTrack;
    const state = { ...blank(), crabX: tireX, cars: [carAt(0, -VEHICLES.car.halfWheelbase - 0.5)] };
    const s = step(state, 0.05, 0, () => 0.5);
    expect(s.phase).toBe("gameover");
    expect(s.phaseTime).toBe(0);
    expect(s.hitAt).toEqual({ x: tireX, z: CRAB.z });
    const after = step(s, 1, 1);
    expect(after.crabX).toBe(tireX);
    expect(after.phase).toBe("gameover");
  });
});

describe("開始時の交通と難しさ", () => {
  it("開始時点で車が道路の奥から手前まで流れている", () => {
    const s = createInitialState(seeded(1));
    expect(s.cars.length).toBeGreaterThan(8);
    expect(s.cars.some((c) => Math.abs(c.z - CRAB.z) < 15)).toBe(true);
  });

  it("開始から右を押しっぱなしにするとクリアできずゲームオーバーになる", () => {
    for (let seed = 1; seed <= 10; seed++) {
      expect(play(seed, () => 1).phase, `seed ${seed}`).toBe("gameover");
    }
  });

  it("隙間を待つ素朴な戦略なら半分以上はクリアできる", () => {
    let cleared = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (play(seed, waitForGap()).phase === "cleared") cleared += 1;
    }
    expect(cleared).toBeGreaterThanOrEqual(10);
  }, 60_000);
});

describe("ゲームオーバー / クリア後の世界", () => {
  const ended = (phase: "gameover" | "cleared", phaseTime = 5): GameState => ({
    ...createInitialState(seeded(2)),
    phase,
    phaseTime,
    crabX: 1,
    hitAt: phase === "gameover" ? { x: 1, z: CRAB.z } : null,
  });

  for (const phase of ["gameover", "cleared"] as const) {
    it(`${phase} 後も車は流れ続け、蟹は動かない`, () => {
      const s = ended(phase);
      const next = step(s, 0.1, 1, seeded(3));
      expect(next.phase).toBe(phase);
      expect(next.crabX).toBe(1);
      expect(next.hitAt).toEqual(s.hitAt);
      expect(next.phaseTime).toBeCloseTo(5.1);
      const car = s.cars.find((c) => Math.abs(c.z) < 30 && c.kind === "car");
      const moved = next.cars.find((c) => c.id === car?.id);
      expect(moved && car && Math.abs(moved.z - car.z)).toBeGreaterThan(0);
    });
  }

  it("ゲームオーバー直後は車がスローモーションになる", () => {
    const slow = step(ended("gameover", 0), 0.1, 0, seeded(3));
    const normal = step(ended("gameover", 5), 0.1, 0, seeded(3));
    const delta = (s: GameState) => {
      const base = ended("gameover");
      const c = s.cars.find((x) => x.id === base.cars[0].id);
      return Math.abs((c?.z ?? 0) - base.cars[0].z);
    };
    expect(delta(slow)).toBeCloseTo(delta(normal) * EFFECTS.slowMo, 3);
  });
});

describe("ゴール判定", () => {
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
});
