/** 道路・車・蟹の寸法やゲーム定数（単位は three.js のワールド座標） */
export const ROAD = {
  /** 道路の横幅（x 方向）= 蟹が渡る距離。以前は 8 */
  width: 20,
  /** 車が出現する奥の位置（z） */
  spawnZ: -70,
  /** 車が消える手前の位置（z） */
  despawnZ: 12,
  length: 90,
} as const;

export const CRAB = {
  /** 蟹がいる z 位置（固定。前後には動かない） */
  z: 0,
  halfWidth: 0.3,
  halfDepth: 0.2,
  height: 0.25,
  /** 左右の移動速度（単位/秒） */
  speed: 4.5,
} as const;

export const CAR = {
  bodyWidth: 1.9,
  bodyLength: 4.2,
  /** 車体の底の高さ。これより低い蟹はくぐれる */
  bodyBottom: 0.45,
  bodyHeight: 1.1,
  /** 左右タイヤ中心間の半分 */
  halfTrack: 0.8,
  /** 前後タイヤ中心間の半分 */
  halfWheelbase: 1.35,
  tireRadius: 0.35,
  tireHalfWidth: 0.13,
  speed: 16,
  /** 出現間隔（秒） */
  spawnInterval: 0.45,
  /** 同時に存在できる最大台数（描画プール数） */
  maxCars: 24,
} as const;

export const STORAGE_KEY = "yokoaruki:corpses";
export const MAX_CORPSES = 200;

/** 横断: 手前の歩道から出発し、向こう側の歩道に着いたらゴール */
export const CROSSING = {
  /** 出発位置（道路の左端より少し外の歩道） */
  startX: -ROAD.width / 2 - 1,
  /** この x 以上に着いたらクリア（道路の右端より少し外の歩道） */
  goalX: ROAD.width / 2 + 1,
} as const;
