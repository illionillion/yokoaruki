/**
 * やられ演出の計算（純粋関数）。描画側は経過時間を渡して値を受け取るだけにする
 */
import { CRAB } from "./constants.ts";

export const EFFECTS = {
  /** スローモーションの速さ（1 = 等速） */
  slowMo: 0.12,
  /** スローモーションを続ける実時間（秒） */
  slowMoSeconds: 1.0,
  /** そこから等速に戻るまでの実時間（秒） */
  slowMoRecover: 0.6,
  /** 画面の揺れの最大幅（ワールド座標） */
  shakeAmplitude: 0.35,
  /** 揺れの減衰の速さ（大きいほど早く収まる） */
  shakeDecay: 4,
  /** 揺れを止める時刻（秒） */
  shakeSeconds: 1.5,
  /** 潰れきるまでの時間（秒） */
  squashSeconds: 0.08,
  /** カニ汁の粒の数 */
  particles: 48,
  gravity: 9.8,
} as const;

/** 経過時間に対する時間の進み方。直後はスロー、その後なめらかに等速へ戻る */
export function timeScale(t: number): number {
  const { slowMo, slowMoSeconds, slowMoRecover } = EFFECTS;
  if (t < slowMoSeconds) return slowMo;
  const k = Math.min(1, (t - slowMoSeconds) / slowMoRecover);
  return slowMo + (1 - slowMo) * k;
}

/** 画面の揺れ（カメラに足すずれ）。時間とともに減衰し、最後は 0 になる */
export function shakeOffset(t: number): [number, number] {
  const { shakeAmplitude, shakeDecay, shakeSeconds } = EFFECTS;
  if (t < 0 || t >= shakeSeconds) return [0, 0];
  const a = shakeAmplitude * Math.exp(-shakeDecay * t);
  return [a * Math.sin(t * 55), a * Math.cos(t * 47)];
}

/** 潰れ具合: [横の広がり, 高さ] の倍率。一瞬でぺしゃんこになり、横に少しはみ出してから落ち着く */
export function squashScale(t: number): [number, number] {
  const { squashSeconds } = EFFECTS;
  if (t <= 0) return [1, 1];
  const k = Math.min(1, t / squashSeconds);
  const height = 1 - 0.88 * k;
  // 潰れた直後に横へ 1.8 倍まで広がり、1.5 倍に戻る
  const wobble = t < squashSeconds ? 0 : 0.3 * Math.exp(-8 * (t - squashSeconds));
  const spread = 1 + 0.5 * k + wobble;
  return [spread, height];
}

export type Particle = {
  /** 初速（単位/秒） */
  vx: number;
  vy: number;
  vz: number;
  size: number;
};

/** カニ汁の粒を作る（シード付き rng で決まる） */
export function makeParticles(rng: () => number, count: number = EFFECTS.particles): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = rng() * Math.PI * 2;
    const speed = 1.5 + rng() * 3.5;
    return {
      vx: Math.cos(angle) * speed,
      vy: 2 + rng() * 4,
      vz: Math.sin(angle) * speed * 0.6,
      size: 0.04 + rng() * 0.08,
    };
  });
}

/** 粒の位置（当たった位置からの相対）。地面より下には行かず、地面で止まる */
export function particleAt(p: Particle, t: number): [number, number, number] {
  const { gravity } = EFFECTS;
  const landT = (2 * p.vy) / gravity;
  const tt = Math.min(Math.max(t, 0), landT);
  const y = Math.max(0, p.vy * tt - (gravity * tt * tt) / 2);
  return [p.vx * tt, y + CRAB.height / 2, p.vz * tt];
}

export type StackedCorpse = {
  x: number;
  z: number;
  /** 積み重なった高さ（ワールド座標） */
  y: number;
  /** 何段目か（0 始まり） */
  level: number;
  /** 見た目の回転（ラジアン）。順番から決まる */
  rotation: number;
};

/** 潰れた蟹 1 匹分の厚み */
export const CORPSE_THICKNESS = 0.05;

/** 近くに落ちた亡骸は上に積む。古い順に置き、重なる亡骸の数で段を決める */
export function stackCorpses(
  corpses: readonly { x: number; z: number }[],
  radius = CRAB.halfWidth * 1.2
): StackedCorpse[] {
  const placed: StackedCorpse[] = [];
  corpses.forEach((c, i) => {
    const below = placed.filter((p) => Math.hypot(p.x - c.x, p.z - c.z) < radius);
    const level = below.length === 0 ? 0 : Math.max(...below.map((p) => p.level)) + 1;
    placed.push({
      x: c.x,
      z: c.z,
      level,
      y: level * CORPSE_THICKNESS,
      rotation: ((i * 2.399) % (Math.PI * 2)) - Math.PI,
    });
  });
  return placed;
}
