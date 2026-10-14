import {
  CRAB,
  CROSSING,
  FOLLOW_GAP,
  LANE_RANDOM,
  LANE_WIDTH,
  MAX_CARS,
  ROAD,
  VEHICLES,
  type VehicleKind,
} from "./constants.ts";
import { timeScale } from "./effects.ts";

/** 進む向き: 1 = 奥から手前（+z）, -1 = 手前から奥（-z） */
export type LaneDirection = 1 | -1;

/** 車線の設定。毎回のプレイ開始時にランダムに決める */
export type Lane = {
  /** 車線の中心 x */
  x: number;
  direction: LaneDirection;
  /** 基本速度（単位/秒）。車種ごとの倍率を掛ける */
  speed: number;
  /** 平均出現間隔（秒） */
  interval: number;
  truckRate: number;
  fastRate: number;
};

export type Car = {
  id: number;
  lane: number;
  kind: VehicleKind;
  /** 車の中心 x */
  x: number;
  /** 車の中心 z */
  z: number;
  /** 速さ（正の値。向きは車線の direction） */
  speed: number;
  direction: LaneDirection;
};

export type Tire = { x: number; z: number };

export type Corpse = { x: number; z: number };

export type Phase = "playing" | "gameover" | "cleared";

export type GameState = {
  phase: Phase;
  /** 今のフェーズになってからの実時間（秒）。演出のタイミングに使う */
  phaseTime: number;
  crabX: number;
  lanes: Lane[];
  cars: Car[];
  nextCarId: number;
  /** 車線ごとの次の出現までの秒数 */
  spawnTimers: number[];
  /** 当たった位置（ゲームオーバー時のみ） */
  hitAt: Corpse | null;
};

/** 入力: -1 = 左, 0 = 停止, 1 = 右 */
export type Direction = -1 | 0 | 1;

const lerp = (range: readonly [number, number], t: number) => range[0] + (range[1] - range[0]) * t;

/** 車線を毎回ランダムに作る。向きは必ず両方の車線が混ざるようにする */
export function createLanes(rng: () => number): Lane[] {
  const lanes: Lane[] = Array.from({ length: ROAD.lanes }, (_, i) => ({
    x: -ROAD.width / 2 + LANE_WIDTH * (i + 0.5),
    direction: rng() < 0.5 ? 1 : -1,
    speed: lerp(LANE_RANDOM.speed, rng()),
    interval: lerp(LANE_RANDOM.interval, rng()),
    truckRate: lerp(LANE_RANDOM.truckRate, rng()),
    fastRate: lerp(LANE_RANDOM.fastRate, rng()),
  }));
  if (lanes.every((l) => l.direction === lanes[0].direction)) {
    const i = Math.floor(rng() * lanes.length);
    lanes[i] = { ...lanes[i], direction: lanes[i].direction === 1 ? -1 : 1 };
  }
  return lanes;
}

/** 開始前に交通を空回しする時間と刻み（秒）。一番遅いトラックが道路を抜けきる程度 */
export const PREWARM_SECONDS = 20;
const PREWARM_DT = 1 / 20;

/**
 * 初期状態。車線を毎回ランダムに決め、交通を空回しして最初から車が流れている状態にする
 */
export function createInitialState(rng: () => number = Math.random): GameState {
  const lanes = createLanes(rng);
  let state: GameState = {
    phase: "playing",
    phaseTime: 0,
    crabX: CROSSING.startX,
    lanes,
    cars: [],
    nextCarId: 1,
    spawnTimers: lanes.map((l) => rng() * l.interval),
    hitAt: null,
  };
  for (let t = 0; t < PREWARM_SECONDS; t += PREWARM_DT) {
    state = stepTraffic(state, PREWARM_DT, rng);
  }
  return state;
}

/** 車の 4 つのタイヤ中心 */
export function getTires(car: Car): Tire[] {
  const { halfTrack, halfWheelbase } = VEHICLES[car.kind];
  return [
    { x: car.x - halfTrack, z: car.z - halfWheelbase },
    { x: car.x + halfTrack, z: car.z - halfWheelbase },
    { x: car.x - halfTrack, z: car.z + halfWheelbase },
    { x: car.x + halfTrack, z: car.z + halfWheelbase },
  ];
}

/** 蟹（xz 平面の矩形）とタイヤ（xz 平面の矩形）が重なるか。車体はくぐれるので判定しない */
export function hitsTire(crabX: number, crabZ: number, tire: Tire, kind: VehicleKind): boolean {
  const spec = VEHICLES[kind];
  const overlapX = Math.abs(crabX - tire.x) < CRAB.halfWidth + spec.tireHalfWidth;
  const overlapZ = Math.abs(crabZ - tire.z) < CRAB.halfDepth + spec.tireRadius;
  return overlapX && overlapZ;
}

export function findHit(crabX: number, cars: readonly Car[]): Tire | null {
  for (const car of cars) {
    for (const tire of getTires(car)) {
      if (hitsTire(crabX, CRAB.z, tire, car.kind)) return tire;
    }
  }
  return null;
}

/** 蟹は出発位置からゴールまでの間だけ動ける */
export function clampCrabX(x: number): number {
  return Math.min(CROSSING.goalX, Math.max(CROSSING.startX, x));
}

export function isAtGoal(crabX: number): boolean {
  return crabX >= CROSSING.goalX;
}

/** 出現位置からどれだけ進んだか（車線の向きに沿った距離） */
export function progressOf(car: Pick<Car, "z" | "direction">): number {
  return car.direction === 1 ? car.z - ROAD.farZ : ROAD.nearZ - car.z;
}

function zFromProgress(progress: number, direction: LaneDirection): number {
  return direction === 1 ? ROAD.farZ + progress : ROAD.nearZ - progress;
}

const ROAD_LENGTH = ROAD.nearZ - ROAD.farZ;

export function pickKind(lane: Lane, r: number): VehicleKind {
  if (r < lane.truckRate) return "truck";
  if (r < lane.truckRate + lane.fastRate) return "fast";
  return "car";
}

/** 次に車が出るまでの秒数（平均 interval、0.5〜1.5 倍でばらつく） */
function nextSpawnDelay(lane: Lane, rng: () => number): number {
  return lane.interval * (0.5 + rng());
}

/**
 * 交通（車の移動・出現・消滅）だけを進める。どのフェーズでも動かす。
 * 同じ車線では追い越さず、前の車に詰まる（速い車がトラックの後ろで詰まる）
 */
export function stepTraffic(state: GameState, dt: number, rng: () => number): GameState {
  const moved: Car[] = [];
  state.lanes.forEach((_, laneIndex) => {
    const laneCars = state.cars
      .filter((c) => c.lane === laneIndex)
      .sort((a, b) => progressOf(b) - progressOf(a));
    let aheadProgress = Infinity;
    let aheadHalfLength = 0;
    for (const car of laneCars) {
      const halfLength = VEHICLES[car.kind].bodyLength / 2;
      const limit = aheadProgress - aheadHalfLength - halfLength - FOLLOW_GAP;
      const progress = Math.max(progressOf(car), Math.min(progressOf(car) + car.speed * dt, limit));
      if (progress - halfLength < ROAD_LENGTH) {
        moved.push({ ...car, z: zFromProgress(progress, car.direction) });
      }
      aheadProgress = progress;
      aheadHalfLength = halfLength;
    }
  });

  let { nextCarId } = state;
  const spawnTimers = state.spawnTimers.map((t) => t - dt);
  const cars = [...moved].sort((a, b) => a.id - b.id);
  state.lanes.forEach((lane, laneIndex) => {
    if (spawnTimers[laneIndex] > 0 || cars.length >= MAX_CARS) return;
    const kind = pickKind(lane, rng());
    const spec = VEHICLES[kind];
    const last = cars
      .filter((c) => c.lane === laneIndex)
      .reduce<Car | null>((m, c) => (m && progressOf(m) < progressOf(c) ? m : c), null);
    // 出現位置に前の車が残っていたら、空くまで待つ
    if (last) {
      const room = progressOf(last) - VEHICLES[last.kind].bodyLength / 2;
      if (room < spec.bodyLength / 2 + FOLLOW_GAP) return;
    }
    const jitterLimit = Math.max(0, (LANE_WIDTH - spec.bodyWidth) / 2 - 0.2);
    cars.push({
      id: nextCarId,
      lane: laneIndex,
      kind,
      x: lane.x + (rng() * 2 - 1) * jitterLimit,
      z: zFromProgress(0, lane.direction),
      speed: lane.speed * spec.speedMul,
      direction: lane.direction,
    });
    nextCarId += 1;
    spawnTimers[laneIndex] = nextSpawnDelay(lane, rng);
  });

  return { ...state, cars, nextCarId, spawnTimers };
}

/**
 * 1 フレーム進める（純粋関数）。
 * 交通はゲームオーバー / クリア後も流れ続け、蟹（亡骸）はその場に残る。
 * ゲームオーバー直後はスローモーションになる（timeScale）
 */
export function step(
  state: GameState,
  dt: number,
  direction: Direction,
  rng: () => number = Math.random
): GameState {
  if (state.phase !== "playing") {
    const scale = state.phase === "gameover" ? timeScale(state.phaseTime) : 1;
    return { ...stepTraffic(state, dt * scale, rng), phaseTime: state.phaseTime + dt };
  }

  const traffic = stepTraffic(state, dt, rng);
  const crabX = clampCrabX(state.crabX + direction * CRAB.speed * dt);
  const next: GameState = { ...traffic, crabX, phaseTime: state.phaseTime + dt };

  if (findHit(crabX, next.cars)) {
    return { ...next, phase: "gameover", phaseTime: 0, hitAt: { x: crabX, z: CRAB.z } };
  }
  if (isAtGoal(crabX)) return { ...next, phase: "cleared", phaseTime: 0 };
  return next;
}
