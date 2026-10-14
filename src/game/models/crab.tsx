import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ComponentType, type RefObject } from "react";
import type { Mesh } from "three";
import { CRAB } from "../constants.ts";
import {
  SCATTER,
  scatteredLegAt,
  scatterTargets,
  walkLegPose,
  type ScatterTarget,
} from "../legs.ts";
import { seeded } from "../random.ts";

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
  /** 歩いているとき true。脚が左右に開いて閉じる */
  walkingRef?: RefObject<boolean>;
  /** 潰れた脚の散らばりを決めるシード */
  seed?: number;
  /** 潰れてからの秒。未指定なら散らばり終わって地面に寝た姿勢 */
  scatterTimeRef?: RefObject<number>;
};

export type CrabModelComponent = ComponentType<CrabModelProps>;

const SHELL = "#e2483d";
const LEG = "#b8322a";
const LEG_LENGTH = 0.34;
const LEG_THICK = 0.05;
/** ぺしゃんこの甲羅の厚み。積み上げの段間（CORPSE_THICKNESS）と揃える */
const CORPSE_BODY_HEIGHT = 0.028;

function AliveLeg({
  side,
  index,
  walkingRef,
}: {
  side: -1 | 1;
  index: number;
  walkingRef?: RefObject<boolean>;
}) {
  const ref = useRef<Mesh>(null);
  const rest = walkLegPose(0, side, index, false);
  useFrame((state) => {
    const pose = walkLegPose(state.clock.elapsedTime, side, index, walkingRef?.current ?? false);
    ref.current?.position.set(pose.x, pose.y, pose.z);
    ref.current?.rotation.set(0, 0, pose.roll);
  });
  return (
    <mesh ref={ref} position={[rest.x, rest.y, rest.z]} rotation={[0, 0, rest.roll]}>
      <boxGeometry args={[LEG_LENGTH, LEG_THICK, LEG_THICK]} />
      <meshStandardMaterial color={LEG} />
    </mesh>
  );
}

/** 生きている蟹（仮置き）: 甲羅 + はさみ 2 本 + 脚 6 本 + 目 2 つ */
export function PlaceholderCrab({ color = SHELL, walkingRef }: CrabModelProps) {
  const w = CRAB.halfWidth * 2;
  const h = CRAB.height;
  return (
    <group>
      <mesh position={[0, h * 0.55, 0]}>
        <boxGeometry args={[w * 0.75, h * 0.5, CRAB.halfDepth * 1.6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {([-1, 1] as const).map((side) => (
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
          {[0, 1, 2].map((index) => (
            <AliveLeg key={index} side={side} index={index} walkingRef={walkingRef} />
          ))}
        </group>
      ))}
    </group>
  );
}

function legGeometry() {
  return <boxGeometry args={[LEG_LENGTH, LEG_THICK, LEG_THICK]} />;
}

/** 散らばり終わって地面に寝ている脚 */
function SettledLeg({ target }: { target: ScatterTarget }) {
  const pose = scatteredLegAt(target, SCATTER.seconds);
  return (
    <mesh position={[pose.x, pose.y, pose.z]} rotation={[0, pose.rotation, pose.roll]}>
      {legGeometry()}
      <meshStandardMaterial color={LEG} />
    </mesh>
  );
}

/** 潰れた直後に、体から離れて地面へ落ちる脚 */
function FlyingLeg({ target, timeRef }: { target: ScatterTarget; timeRef: RefObject<number> }) {
  const ref = useRef<Mesh>(null);
  // 最初のフレームで useFrame が timeRef の時刻へ動かす。描画中には ref を読まない
  const start = scatteredLegAt(target, 0);
  useFrame(() => {
    const pose = scatteredLegAt(target, timeRef.current);
    const mesh = ref.current;
    if (!mesh) return;
    mesh.position.set(pose.x, pose.y, pose.z);
    mesh.rotation.set(0, pose.rotation, pose.roll);
  });
  return (
    <mesh
      ref={ref}
      position={[start.x, start.y, start.z]}
      rotation={[0, start.rotation, start.roll]}
    >
      {legGeometry()}
      <meshStandardMaterial color={LEG} />
    </mesh>
  );
}

/** 潰れた蟹（仮置き）: 地面のカニ汁 + ぺしゃんこの甲羅 + 散らばった脚 + ×の目 */
export function PlaceholderSquashedCrab({
  color = SHELL,
  seed = 1,
  scatterTimeRef,
}: CrabModelProps) {
  const w = CRAB.halfWidth * 2;
  const targets = useMemo(() => scatterTargets(seeded(seed)), [seed]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <circleGeometry args={[w * 0.95, 20]} />
        <meshStandardMaterial color="#ff7a3d" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.016, 0]}>
        <boxGeometry args={[w * 1.05, CORPSE_BODY_HEIGHT, CRAB.halfDepth * 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {targets.map((target, i) =>
        scatterTimeRef ? (
          <FlyingLeg key={i} target={target} timeRef={scatterTimeRef} />
        ) : (
          <SettledLeg key={i} target={target} />
        )
      )}
      {[-1, 1].map((side) =>
        [-1, 1].map((r) => (
          <mesh
            key={`eye${side},${r}`}
            position={[side * w * 0.14, 0.034, -CRAB.halfDepth * 0.5]}
            rotation={[0, r * Math.PI * 0.25, 0]}
          >
            <boxGeometry args={[0.09, 0.008, 0.016]} />
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
