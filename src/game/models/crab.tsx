import type { ComponentType } from "react";
import { CRAB } from "../constants.ts";

/**
 * 蟹のモデルの差し替え口。
 * 今は箱を組み合わせた仮置き。glTF に差し替えるときは、同じ props を受け取る
 * コンポーネントを作って CRAB_MODELS に入れる。例:
 *
 *   function GltfCrab() {
 *     const { scene } = useGLTF("/models/crab.glb"); // drei
 *     return <primitive object={scene.clone()} scale={0.3} />;
 *   }
 *
 * 原点は蟹の足元の中心。+x が右、-z が奥（車が来る側）
 */
export type CrabModelProps = {
  /** 亡骸ごとに少し色を変えたいとき用 */
  color?: string;
};

export type CrabModelComponent = ComponentType<CrabModelProps>;

const SHELL = "#e2483d";
const LEG = "#b8322a";

/** 生きている蟹（仮置き）: 甲羅 + はさみ 2 本 + 脚 6 本 + 目 2 つ */
export function PlaceholderCrab({ color = SHELL }: CrabModelProps) {
  const w = CRAB.halfWidth * 2;
  const h = CRAB.height;
  return (
    <group>
      <mesh position={[0, h * 0.55, 0]}>
        <boxGeometry args={[w * 0.75, h * 0.5, CRAB.halfDepth * 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* はさみ */}
          <mesh position={[side * w * 0.48, h * 0.6, -CRAB.halfDepth * 0.7]}>
            <boxGeometry args={[w * 0.18, h * 0.35, h * 0.35]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* 目 */}
          <mesh position={[side * w * 0.12, h * 0.95, -CRAB.halfDepth * 0.6]}>
            <sphereGeometry args={[h * 0.12, 8, 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* 脚 */}
          {[-0.5, 0, 0.5].map((dz) => (
            <mesh
              key={dz}
              position={[side * w * 0.45, h * 0.2, dz * CRAB.halfDepth]}
              rotation={[0, 0, side * 0.6]}
            >
              <boxGeometry args={[w * 0.3, h * 0.08, h * 0.08]} />
              <meshStandardMaterial color={LEG} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** 潰れた蟹（仮置き）: カニ汁の水たまり + ぺしゃんこの甲羅 + 広がった脚 + ×の目 */
export function PlaceholderSquashedCrab({ color = SHELL }: CrabModelProps) {
  const w = CRAB.halfWidth * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <circleGeometry args={[w * 0.95, 20]} />
        <meshStandardMaterial color="#ff7a3d" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[w * 1.05, 0.03, CRAB.halfDepth * 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {[-1, 1].map((side) =>
        [-0.7, 0, 0.7].map((dz) => (
          <mesh
            key={`${side},${dz}`}
            position={[side * w * 0.7, 0.012, dz * CRAB.halfDepth * 1.4]}
            rotation={[0, side * dz * 0.6, 0]}
          >
            <boxGeometry args={[w * 0.5, 0.015, 0.03]} />
            <meshStandardMaterial color={LEG} />
          </mesh>
        ))
      )}
      {[-1, 1].map((side) =>
        [-1, 1].map((r) => (
          <mesh
            key={`eye${side},${r}`}
            position={[side * w * 0.14, 0.04, -CRAB.halfDepth * 0.5]}
            rotation={[0, r * Math.PI * 0.25, 0]}
          >
            <boxGeometry args={[0.09, 0.01, 0.018]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        ))
      )}
    </group>
  );
}

/** ここを差し替えれば蟹の見た目が変わる */
export const CRAB_MODELS: { alive: CrabModelComponent; squashed: CrabModelComponent } = {
  alive: PlaceholderCrab,
  squashed: PlaceholderSquashedCrab,
};
