/**
 * 正面視点のカメラ。蟹の後ろ上（普通の車の屋根より少し高い）から、少し見下ろして奥を見る。
 * 低すぎると奥向きの車のタイヤの位置が地面と重なって読めないので、地面の轍の予告が見える高さにする
 */
export const CAMERA = {
  /** 蟹からの相対位置 */
  offset: [0, 1.9, 3.0],
  /** 注視点（x は蟹に合わせる） */
  lookAt: [0, 0, -9],
  fov: 60,
} as const;

export type CameraPose = {
  position: [number, number, number];
  lookAt: [number, number, number];
};

/**
 * 蟹の x からカメラの位置と注視点を求める。
 * 奥から来るタイヤの位置は錯覚で見誤りやすいので、常に蟹の真後ろから見る。
 * 補間はせず x をそのまま合わせるので、止まったときの行き過ぎ（揺れ戻し）は起きない。
 * 本体と注視点は同じ x を使い、ずれる速さの違いを作らない。
 */
export function cameraPoseFor(crabX: number, crabZ: number): CameraPose {
  const [, y, z] = CAMERA.offset;
  const [, ly, lz] = CAMERA.lookAt;
  return { position: [crabX, y, crabZ + z], lookAt: [crabX, ly, lz] };
}
