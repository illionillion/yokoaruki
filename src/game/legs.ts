/**
 * 蟹の脚の姿勢（純粋関数）。
 * 歩いているときは左右に開いて閉じ、潰れたときは何本か体に残して残りが飛び散る。
 */
import { CRAB } from "./constants.ts";

export const WALK = {
  /** 開いて閉じるまでの 1 周期（秒） */
  period: 0.56,
  /** 一番開いたときに付け根が横へ動く距離 */
  spread: 0.36,
  /** 閉じているときの外側への傾き（ラジアン） */
  closedRoll: 0.4,
  /** 開いているときの外側への傾き（ラジアン） */
  openRoll: 1.15,
} as const;

export const SCATTER = {
  /** 飛びきって地面に落ちるまでの秒 */
  seconds: 0.7,
  /** 体に残すかどうかの乱数のしきい値（端の脚は必ず残す / 必ず飛ばす） */
  attachRate: 0.45,
  flyMin: 0.85,
  flyMax: 1.45,
  /** 飛んでいるあいだの高さ */
  hop: 0.55,
  /** 着地後の高さ。地面に寝かせる */
  groundY: 0.012,
} as const;

export type LegPose = {
  /** 体の中心からの位置 */
  x: number;
  y: number;
  z: number;
  /** 横への開き。0 が閉じ、WALK.spread が一番開いた状態 */
  spread: number;
  /** 体の外側が正の、z 軸まわりの傾き */
  roll: number;
};

const LEG_Z = [-0.55, 0, 0.55] as const;

/** 0 が閉じ、1 が一番開く。1 周期で閉じてから開き、また閉じる */
export function walkOpenAmount(time: number, side: -1 | 1, index: number): number {
  // 隣の脚と左右を半周期ずらして、開く脚と閉じる脚が同時にあるようにする
  const shift = (index % 2) * 0.5 + (side === 1 ? 0.5 : 0);
  const cycle = (time / WALK.period + shift) * Math.PI * 2;
  return 0.5 - 0.5 * Math.cos(cycle);
}

/** 生きている蟹の脚。止まっているときは閉じた姿勢のまま */
export function walkLegPose(time: number, side: -1 | 1, index: number, moving: boolean): LegPose {
  const open = moving ? walkOpenAmount(time, side, index) : 0;
  const spread = open * WALK.spread;
  const w = CRAB.halfWidth * 2;
  const roll = WALK.closedRoll + open * (WALK.openRoll - WALK.closedRoll);
  return {
    spread,
    x: side * (w * 0.42 + spread),
    y: CRAB.height * 0.18,
    z: LEG_Z[index] * CRAB.halfDepth,
    roll: side * roll,
  };
}

export type ScatterTarget = {
  /** 体にくっついたままか */
  attached: boolean;
  fromX: number;
  fromZ: number;
  /** 着地位置（体にくっつく脚は from と同じ） */
  x: number;
  z: number;
  rotation: number;
};

/**
 * 潰れたあとの脚の行き先。
 * 少なくとも 1 本は体に残り、少なくとも 1 本は離れる。残りはシードで決まる。
 */
export function scatterTargets(rng: () => number, count = 6): ScatterTarget[] {
  return Array.from({ length: count }, (_, i) => {
    const side: -1 | 1 = i < count / 2 ? -1 : 1;
    const slot = i % Math.max(1, count / 2);
    const fromX = side * CRAB.halfWidth * 1.05;
    const fromZ = LEG_Z[Math.min(slot, LEG_Z.length - 1)] * CRAB.halfDepth * 1.4;
    const attachRoll = rng();
    const angle = rng() * Math.PI * 2;
    const distT = rng();
    const rot = (rng() - 0.5) * Math.PI;
    const attached = i === 0 || (i !== count - 1 && attachRoll < SCATTER.attachRate);
    if (attached) {
      return { attached: true, fromX, fromZ, x: fromX, z: fromZ, rotation: side * 0.2 };
    }
    const dist = SCATTER.flyMin + distT * (SCATTER.flyMax - SCATTER.flyMin);
    return {
      attached: false,
      fromX,
      fromZ,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      rotation: rot,
    };
  });
}

export type ScatteredLeg = {
  x: number;
  y: number;
  z: number;
  /** 水平の向き */
  rotation: number;
  /** 低い視点でも棒として見える、外側への傾き */
  roll: number;
};

function outwardRoll(x: number): number {
  return (x < 0 ? -1 : 1) * 0.9;
}

/** 潰れてから t 秒後の脚。飛びきったあとは地面に寝たまま */
export function scatteredLegAt(leg: ScatterTarget, t: number): ScatteredLeg {
  if (leg.attached) {
    return {
      x: leg.fromX,
      y: 0.04,
      z: leg.fromZ,
      rotation: leg.rotation,
      roll: outwardRoll(leg.fromX),
    };
  }
  const k = Math.min(1, Math.max(0, t) / SCATTER.seconds);
  const e = k * k * (3 - 2 * k);
  const x = leg.fromX + (leg.x - leg.fromX) * e;
  return {
    x,
    y: SCATTER.groundY + Math.sin(k * Math.PI) * SCATTER.hop,
    z: leg.fromZ + (leg.z - leg.fromZ) * e,
    rotation: leg.rotation * e,
    roll: outwardRoll(x),
  };
}

/** 亡骸ごとの散らばりシード。位置と順番が同じなら同じ見た目になる */
export function corpseScatterSeed(index: number, x: number, z: number): number {
  const n =
    (Math.abs(Math.round(x * 1000)) * 13 +
      Math.abs(Math.round(z * 1000)) * 29 +
      (index + 1) * 97) >>>
    0;
  return (n % 99991) + 1;
}
