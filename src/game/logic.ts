import { CAR, CRAB, ROAD } from "./constants.ts";

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

export type Phase = "playing" | "gameover";

export type GameState = {
  phase: Phase;
  crabX: number;
  cars: Car[];
  nextCarId: number;
  spawnTimer: number;
  elapsed: number;
  /** 当たった位置（ゲームオーバー時のみ） */
  hitAt: Corpse | null;
};

/** 入力: -1 = 左, 0 = 停止, 1 = 右 */
export type Direction = -1 | 0 | 1;

export function createInitialState(): GameState {
  return {
    phase: "playing",
    crabX: 0,
    cars: [],
    nextCarId: 1,
    spawnTimer: 0.5,
    elapsed: 0,
    hitAt: null,
  };
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

export function clampCrabX(x: number): number {
  const limit = ROAD.width / 2 - CRAB.halfWidth;
  return Math.min(limit, Math.max(-limit, x));
}

/** 車が道路からはみ出さない範囲でランダムな x を返す */
export function randomCarX(rng: () => number): number {
  const limit = ROAD.width / 2 - CAR.bodyWidth / 2;
  return -limit + rng() * limit * 2;
}

/** 1 フレーム進める（純粋関数） */
export function step(
  state: GameState,
  dt: number,
  direction: Direction,
  rng: () => number = Math.random
): GameState {
  if (state.phase !== "playing") return state;

  const crabX = clampCrabX(state.crabX + direction * CRAB.speed * dt);

  let cars = state.cars
    .map((car) => ({ ...car, z: car.z + car.speed * dt }))
    .filter((car) => car.z < ROAD.despawnZ);

  let { nextCarId, spawnTimer } = state;
  spawnTimer -= dt;
  if (spawnTimer <= 0 && cars.length < CAR.maxCars) {
    cars = [...cars, { id: nextCarId, x: randomCarX(rng), z: ROAD.spawnZ, speed: CAR.speed }];
    nextCarId += 1;
    spawnTimer = CAR.spawnInterval * (0.6 + rng() * 0.8);
  }

  const next: GameState = {
    ...state,
    crabX,
    cars,
    nextCarId,
    spawnTimer,
    elapsed: state.elapsed + dt,
  };

  const tire = findHit(crabX, cars);
  if (tire) {
    return { ...next, phase: "gameover", hitAt: { x: crabX, z: CRAB.z } };
  }
  return next;
}
