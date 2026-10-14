/** 道路・車・蟹の寸法やゲーム定数（単位は three.js のワールド座標） */
export const ROAD = {
  /** 道路の横幅（x 方向）= 蟹が渡る距離 */
  width: 24,
  /** 車線の数。道路幅を等分する */
  lanes: 6,
  /** 道路の奥の端（z）。手前向きの車はここから出て、奥向きの車はここで消える */
  farZ: -70,
  /** 道路の手前の端（z。カメラより後ろ）。奥向きの車はここから出て、手前向きの車はここで消える */
  nearZ: 14,
  length: 90,
} as const;

export const LANE_WIDTH = ROAD.width / ROAD.lanes;

export const CRAB = {
  /** 蟹がいる z 位置（固定。前後には動かない） */
  z: 0,
  halfWidth: 0.3,
  halfDepth: 0.2,
  height: 0.25,
  /** 左右の移動速度（単位/秒） */
  speed: 3.5,
} as const;

export type VehicleKind = "car" | "fast" | "truck";

export type VehicleSpec = {
  bodyWidth: number;
  bodyLength: number;
  /** 車体の底の高さ。これより低い蟹はくぐれる */
  bodyBottom: number;
  bodyHeight: number;
  /** 左右タイヤ中心間の半分 */
  halfTrack: number;
  /** 前後タイヤ中心間の半分 */
  halfWheelbase: number;
  tireRadius: number;
  tireHalfWidth: number;
  /** 車線の基本速度に掛ける倍率 */
  speedMul: number;
  color: string;
};

/** 車種。当たり判定はどれもタイヤだけで、車体の下はくぐれる */
export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  car: {
    bodyWidth: 1.9,
    bodyLength: 4.2,
    bodyBottom: 0.45,
    bodyHeight: 1.1,
    halfTrack: 0.8,
    halfWheelbase: 1.35,
    tireRadius: 0.35,
    tireHalfWidth: 0.13,
    speedMul: 1,
    color: "#3b82f6",
  },
  /** 突然来る速い車 */
  fast: {
    bodyWidth: 1.8,
    bodyLength: 4.4,
    bodyBottom: 0.32,
    bodyHeight: 0.7,
    halfTrack: 0.78,
    halfWheelbase: 1.5,
    tireRadius: 0.32,
    tireHalfWidth: 0.14,
    speedMul: 2.4,
    color: "#ef4444",
  },
  /** 遅くて長いトラック。前後の車輪の間が長く、下を長くくぐれる */
  truck: {
    bodyWidth: 2.4,
    bodyLength: 10,
    bodyBottom: 1.0,
    bodyHeight: 2.6,
    halfTrack: 1.0,
    halfWheelbase: 4.0,
    tireRadius: 0.5,
    tireHalfWidth: 0.18,
    speedMul: 0.45,
    color: "#f59e0b",
  },
};

/** 車線ごとの設定を毎回ランダムに決めるときの範囲 */
export const LANE_RANDOM = {
  /** 車線の基本速度（単位/秒） */
  speed: [10, 18],
  /** 平均出現間隔（秒） */
  interval: [0.8, 2.0],
  /** トラックが出る割合 */
  truckRate: [0.1, 0.35],
  /** 速い車が出る割合 */
  fastRate: [0.05, 0.2],
} as const;

/** 同じ車線の前の車との最小の隙間（追い越さず、詰まる） */
export const FOLLOW_GAP = 1.5;

/** 同時に存在できる最大台数（描画プール数） */
export const MAX_CARS = 48;

export const STORAGE_KEY = "yokoaruki:corpses";
export const MAX_CORPSES = 200;

/** 横断: 手前の歩道から出発し、向こう側の歩道に着いたらゴール */
export const CROSSING = {
  /** 出発位置（道路の左端より少し外の歩道） */
  startX: -ROAD.width / 2 - 1,
  /** この x 以上に着いたらクリア（道路の右端より少し外の歩道） */
  goalX: ROAD.width / 2 + 1,
} as const;
