import { CAR, CRAB, CROSSING, ROAD } from "./constants.ts";

export type Car = {
  id: number;
  /** 車の中心 x */
  x: number;
  /** 車の中心 z */
  z: number;
  speed: number;
};

export type Tire = { x: number; z: number };

export type Corpse = { x: number; z: number };

export type Phase = "playing" | "gameover" | "cleared";

export type GameState = {
  phase: Phase;
  crabX: number;
  cars: Car[];
  nextCarId: number;
  spawnTimer: number;
  /** 当たった位置（ゲームオーバー時のみ） */
  hitAt: Corpse | null;
};

/** 入力: -1 = 左, 0 = 停止, 1 = 右 */
export type Direction = -1 | 0 | 1;

/** 車が出現してから消えるまでの秒数 */
export const CAR_LIFETIME = (ROAD.despawnZ - ROAD.spawnZ) / CAR.speed;

/** 開始前に交通を空回しする刻み（秒） */
const PREWARM_DT = 1 / 60;

/**
 * 初期状態。車が 1 台もいないと開始直後に押しっぱなしで渡れてしまうので、
 * 車が手前まで流れきる時間だけ交通を空回しして、最初から車が流れている状態にする
 */
export function createInitialState(rng: () => number = Math.random): GameState {
  let state: GameState = {
    phase: "playing",
    crabX: CROSSING.startX,
    cars: [],
    nextCarId: 1,
    spawnTimer: 0,
    hitAt: null,
  };
  for (let t = 0; t < CAR_LIFETIME; t += PREWARM_DT) {
    state = stepTraffic(state, PREWARM_DT, rng);
  }
  return state;
}

/** リスタート: 流れている交通はそのまま、蟹だけ出発位置（道路の外）に戻す */
export function restartState(state: GameState): GameState {
  return { ...state, phase: "playing", crabX: CROSSING.startX, hitAt: null };
}

/** 車の 4 つのタイヤ中心 */
export function getTires(car: Car): Tire[] {
  const { halfTrack, halfWheelbase } = CAR;
  return [
    { x: car.x - halfTrack, z: car.z - halfWheelbase },
    { x: car.x + halfTrack, z: car.z - halfWheelbase },
    { x: car.x - halfTrack, z: car.z + halfWheelbase },
    { x: car.x + halfTrack, z: car.z + halfWheelbase },
  ];
}

/** 蟹（xz 平面の矩形）とタイヤ（xz 平面の矩形）が重なるか。車体はくぐれるので判定しない */
export function hitsTire(crabX: number, crabZ: number, tire: Tire): boolean {
  const overlapX = Math.abs(crabX - tire.x) < CRAB.halfWidth + CAR.tireHalfWidth;
  const overlapZ = Math.abs(crabZ - tire.z) < CRAB.halfDepth + CAR.tireRadius;
  return overlapX && overlapZ;
}

export function findHit(crabX: number, cars: readonly Car[]): Tire | null {
  for (const car of cars) {
    for (const tire of getTires(car)) {
      if (hitsTire(crabX, CRAB.z, tire)) return tire;
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

/** 車が道路からはみ出さない範囲でランダムな x を返す */
export function randomCarX(rng: () => number): number {
  const limit = ROAD.width / 2 - CAR.bodyWidth / 2;
  return -limit + rng() * limit * 2;
}

/** 次に車が出るまでの秒数（平均 CAR.spawnInterval のばらつき付き） */
function nextSpawnDelay(rng: () => number): number {
  return CAR.spawnInterval * (0.6 + rng() * 0.8);
}

/** 交通（車の移動・出現・消滅）だけを進める。どのフェーズでも動かす */
export function stepTraffic(state: GameState, dt: number, rng: () => number): GameState {
  let cars = state.cars
    .map((car) => ({ ...car, z: car.z + car.speed * dt }))
    .filter((car) => car.z < ROAD.despawnZ);

  let { nextCarId, spawnTimer } = state;
  spawnTimer -= dt;
  if (spawnTimer <= 0 && cars.length < CAR.maxCars) {
    cars = [...cars, { id: nextCarId, x: randomCarX(rng), z: ROAD.spawnZ, speed: CAR.speed }];
    nextCarId += 1;
    spawnTimer = nextSpawnDelay(rng);
  }

  return { ...state, cars, nextCarId, spawnTimer };
}

/**
 * 1 フレーム進める（純粋関数）。
 * 交通はゲームオーバー / クリア後も流れ続け、蟹（亡骸）はその場に残る
 */
export function step(
  state: GameState,
  dt: number,
  direction: Direction,
  rng: () => number = Math.random
): GameState {
  const traffic = stepTraffic(state, dt, rng);
  if (state.phase !== "playing") return traffic;

  const crabX = clampCrabX(state.crabX + direction * CRAB.speed * dt);
  const next: GameState = { ...traffic, crabX };

  const tire = findHit(crabX, next.cars);
  if (tire) {
    return { ...next, phase: "gameover", hitAt: { x: crabX, z: CRAB.z } };
  }
  if (isAtGoal(crabX)) return { ...next, phase: "cleared" };
  return next;
}
