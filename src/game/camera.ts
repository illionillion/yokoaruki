/** 正面視点のカメラ。蟹のちょっと上（車のフロント下くらい）から奥を見る */
export const CAMERA = {
  /** 蟹からの相対位置 */
  offset: [0, 0.55, 2.4],
  /** 注視点（x は蟹に合わせる） */
  lookAt: [0, 0.3, -20],
  fov: 60,
  /** 左右追従の速さ（大きいほどすぐ追いつく、1/秒） */
  followRate: 12,
} as const;

/**
 * カメラの x を蟹の x へ近づける。
 * 奥から来るタイヤの位置は錯覚で見誤りやすいので、常に蟹の真後ろから見るようにする。
 */
export function followCameraX(currentX: number, crabX: number, dt: number): number {
  const t = 1 - Math.exp(-CAMERA.followRate * Math.max(0, dt));
  return currentX + (crabX - currentX) * t;
}
