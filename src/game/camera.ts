/** 正面視点のカメラ。蟹のちょっと上（車のフロント下くらい）から奥を見る */
export const CAMERA = {
  /** 蟹からの相対位置 */
  offset: [0, 0.55, 2.4],
  /** 注視点（x は蟹に合わせる） */
  lookAt: [0, 0.3, -20],
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
