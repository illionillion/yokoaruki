import type { VehicleSpec } from "../constants.ts";
import type { Car } from "../logic.ts";
import { VEHICLES } from "../constants.ts";

/** 箱: 中心と大きさ（ワールド座標、車の原点からの相対） */
export type Box = { center: [number, number, number]; size: [number, number, number] };

/**
 * 荷台が車輪の上に乗って見えるようにする車台（左右の縦ばり）。
 * はりは車輪の列の真上に置き、下端はタイヤの上端より低くしてタイヤに食い込ませる。
 * 左右のはりの間は空けるので、蟹は今まで通り車輪の間をくぐれる
 */
export function chassisBeams(spec: VehicleSpec): Box[] {
  const bottom = spec.tireRadius * 1.4;
  const height = spec.bodyBottom - bottom;
  if (height <= 0) return [];
  const length = spec.halfWheelbase * 2 + spec.tireRadius * 2;
  const width = spec.tireHalfWidth * 2 + 0.1;
  return [-1, 1].map((side) => ({
    center: [side * spec.halfTrack, bottom + height / 2, 0],
    size: [width, height, length],
  }));
}

/**
 * 車体がカメラに重なるか（車の箱をカメラの近さ margin だけ膨らませて判定）。
 * 重なる車は描画しない。奥向きの車はカメラの後ろから出て蟹の上を通るので、
 * そのままだとカメラが車体の中に入って画面が車の色で埋まる。
 * トラックは車体の底がカメラより高いので隠れず、下をくぐる様子が見える
 */
export function blocksCamera(
  car: Pick<Car, "kind" | "x" | "z">,
  camera: readonly [number, number, number],
  margin = 0.3
): boolean {
  const spec = VEHICLES[car.kind];
  const [cx, cy, cz] = camera;
  return (
    Math.abs(cx - car.x) < spec.bodyWidth / 2 + margin &&
    Math.abs(cz - car.z) < spec.bodyLength / 2 + margin &&
    cy > spec.bodyBottom - margin &&
    cy < spec.bodyBottom + spec.bodyHeight + margin
  );
}
