import { useMemo } from "react";
import { seeded } from "./random.ts";

/**
 * 画面いっぱいのカニ汁しぶき（ホラー映画風だけど、色はオレンジでふざけた感じ）。
 * 形は seed で決まるので、同じ回の再描画では変わらない
 */
export function Splat({ seed }: { seed: number }) {
  const { blobs, drips } = useMemo(() => {
    const rng = seeded(seed);
    return {
      blobs: Array.from({ length: 14 }, () => ({
        cx: rng() * 100,
        cy: rng() * 100,
        r: 4 + rng() * 14,
      })),
      drips: Array.from({ length: 18 }, (_, i) => ({
        x: (i / 18) * 100 + rng() * 4,
        w: 1.5 + rng() * 3,
        h: 10 + rng() * 45,
        delay: rng() * 0.6,
      })),
    };
  }, [seed]);

  return (
    <div className="splat" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {blobs.map((b, i) => (
          <g key={i} className="splat-blob" style={{ animationDelay: `${i * 0.02}s` }}>
            <circle cx={b.cx} cy={b.cy} r={b.r} />
            <circle cx={b.cx + b.r * 0.9} cy={b.cy - b.r * 0.4} r={b.r * 0.35} />
            <circle cx={b.cx - b.r * 0.7} cy={b.cy + b.r * 0.8} r={b.r * 0.25} />
          </g>
        ))}
        {drips.map((d, i) => (
          <rect
            key={i}
            className="splat-drip"
            x={d.x}
            y={0}
            width={d.w}
            height={d.h}
            rx={d.w / 2}
            style={{ animationDelay: `${0.2 + d.delay}s` }}
          />
        ))}
      </svg>
      <p className="splat-text">ぷしゃーっ!!</p>
    </div>
  );
}
