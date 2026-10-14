/**
 * タイヤの位置を読みやすくするための計算（純粋関数）。難しさ（当たり判定・速さ・出現）は変えない
 */
import { CRAB, VEHICLES } from "./constants.ts";
import type { Car } from "./logic.ts";

export const TRACKS = {
  /** この秒数以内に蟹の列に来る車だけ、車輪の列を出す */
  window: 1.0,
  /** 蟹からこの横距離より遠い車輪の列は出さない（1 秒で歩ける距離より少し広め） */
  lateral: 4,
  /** 蟹の列のまわりに出す線の長さ（車が来る側へ） */
  near: 2.5,
  /** 後ろから来る車は、蟹の列を越えて前（奥）にこの長さだけ伸ばす（見えない車の通り道を見せる） */
  extend: 4,
} as const;

/**
 * 車の車輪（前後の車軸）のうち、まだ蟹の列（z = crabZ）を通り過ぎていないものが
 * 蟹の列に来るまでの秒数。両方通り過ぎたら null。今まさに重なっていれば 0
 */
export function timeToReach(car: Car, crabZ: number = CRAB.z): number | null {
  const { halfWheelbase, tireRadius } = VEHICLES[car.kind];
  const d = car.direction;
  // 進む向きに沿った、蟹の列までの距離（前の車軸 / 後ろの車軸）
  const front = (crabZ - (car.z + d * halfWheelbase)) * d;
  const rear = (crabZ - (car.z - d * halfWheelbase)) * d;
  const reach = tireRadius + CRAB.halfDepth;
  if (rear < -reach) return null;
  if (front > 0) return front / car.speed;
  return 0;
}

export type WheelTrack = {
  /** 車輪の列の x */
  x: number;
  /** 線の両端の z */
  zFrom: number;
  zTo: number;
  /** 蟹の列に来るまでの秒数 */
  eta: number;
  carId: number;
};

/**
 * 出す車輪の列。情報を絞るため、
 * - window 秒以内に蟹の列に来る車で、蟹から lateral 以内の車輪の列だけ
 * - 蟹の左右それぞれで、一番早く来る車の車輪の列だけ（同じ側に 2 本あれば 2 本とも）
 * 線は蟹の列のまわりの短い区間。後ろから来る車（奥向き）は蟹の列を越えて前にも伸ばす
 */
export function wheelTracks(
  cars: readonly Car[],
  crabX: number,
  crabZ: number = CRAB.z
): WheelTrack[] {
  const candidates: WheelTrack[] = [];
  for (const car of cars) {
    const eta = timeToReach(car, crabZ);
    if (eta === null || eta > TRACKS.window) continue;
    const { halfTrack } = VEHICLES[car.kind];
    const d = car.direction;
    // 来る側（奥から来るなら -z 側、後ろから来るなら +z 側）に near、反対側には後ろから来る車だけ extend
    const zFrom = crabZ - d * TRACKS.near;
    const zTo = crabZ + d * (d === -1 ? TRACKS.extend : 0.5);
    for (const side of [-1, 1]) {
      const x = car.x + side * halfTrack;
      if (Math.abs(x - crabX) > TRACKS.lateral) continue;
      candidates.push({ x, zFrom, zTo, eta, carId: car.id });
    }
  }
  const result: WheelTrack[] = [];
  for (const left of [true, false]) {
    const sideTracks = candidates.filter((t) => t.x < crabX === left);
    if (sideTracks.length === 0) continue;
    const first = sideTracks.reduce((m, t) => (t.eta < m.eta ? t : m));
    result.push(...sideTracks.filter((t) => t.carId === first.carId));
  }
  return result;
}
