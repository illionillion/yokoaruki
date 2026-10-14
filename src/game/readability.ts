/**
 * タイヤの位置を読みやすくするための計算（純粋関数）。難しさ（当たり判定・速さ・出現）は変えない
 */
import { CRAB, VEHICLES } from "./constants.ts";
import type { Car } from "./logic.ts";

export const TRACKS = {
  /** この秒数以内に蟹の列に来る車の轍を予告する */
  horizon: 2.5,
  /** この秒数以内なら危険（蟹の列に赤い印を出す） */
  danger: 0.8,
  /** 蟹の列を越えて、車がこの先進む向きにも轍を伸ばす長さ（後ろから来る車の予告を前に見せる） */
  extend: 8,
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
  /** 轍の始まり（今の車軸の位置）と終わり（蟹の列の先）の z */
  zFrom: number;
  zTo: number;
  /** 蟹の列に来るまでの秒数 */
  eta: number;
  /** 0（まだ先）〜 1（もう来る） */
  urgency: number;
  danger: boolean;
};

/** 予告する轍の一覧。車 1 台につき左右 2 本 */
export function wheelTracks(
  cars: readonly Car[],
  crabZ: number = CRAB.z,
  horizon: number = TRACKS.horizon
): WheelTrack[] {
  const tracks: WheelTrack[] = [];
  for (const car of cars) {
    const eta = timeToReach(car, crabZ);
    if (eta === null || eta > horizon) continue;
    const { halfTrack, halfWheelbase } = VEHICLES[car.kind];
    const d = car.direction;
    const frontAxle = car.z + d * halfWheelbase;
    const rearAxle = car.z - d * halfWheelbase;
    const zFrom = eta > 0 ? frontAxle : rearAxle;
    const zTo = crabZ + d * TRACKS.extend;
    const urgency = 1 - eta / horizon;
    for (const side of [-1, 1]) {
      tracks.push({
        x: car.x + side * halfTrack,
        zFrom,
        zTo,
        eta,
        urgency,
        danger: eta <= TRACKS.danger,
      });
    }
  }
  return tracks;
}
