import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { type Group, type Mesh, type PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { CAMERA, cameraPoseFor } from "./camera.ts";
import { CRAB, CROSSING, MAX_CARS, ROAD, VEHICLES, type VehicleKind } from "./constants.ts";
import {
  EFFECTS,
  makeParticles,
  particleAt,
  shakeOffset,
  squashScale,
  stackCorpses,
  type Particle,
} from "./effects.ts";
import { step, type Corpse, type Direction, type GameState } from "./logic.ts";
import { seeded } from "./random.ts";
import { CRAB_MODELS } from "./models/crab.tsx";
import { wheelTracks } from "./readability.ts";
import { blocksCamera } from "./models/layout.ts";
import { VehicleModel } from "./models/vehicle.tsx";

type Props = {
  stateRef: RefObject<GameState>;
  directionRef: RefObject<Direction>;
  corpses: readonly Corpse[];
  /** ゲームオーバーかクリアになった瞬間に 1 回呼ばれる */
  onEnd: (state: GameState) => void;
};

const KINDS: VehicleKind[] = ["car", "fast", "truck"];

/** 出す車輪の列は最大でも蟹の左右 2 本ずつ */
const TRACK_POOL = 4;

/** カニ汁の粒は少しゆっくり飛ばす（スローモーションに合わせる） */
const PARTICLE_TIME_SCALE = 0.5;

/** 粒の見た目の大きさ（描画用に固定）。飛び方は当たるたびに引き直す */
const PARTICLE_SIZES = makeParticles(seeded(1)).map((p) => p.size);

export function GameScene({ stateRef, directionRef, corpses, onEnd }: Props) {
  const crabRef = useRef<Group>(null);
  const carRefs = useRef<(Group | null)[]>([]);
  const kindRefs = useRef<(Group | null)[][]>([]);
  const cameraRef = useRef<PerspectiveCameraImpl>(null);
  const particleGroupRef = useRef<Group>(null);
  const particleRefs = useRef<(Group | null)[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const newestCorpseRef = useRef<Group | null>(null);
  const trackRefs = useRef<(Mesh | null)[]>([]);

  const stacked = useMemo(() => stackCorpses(corpses), [corpses]);
  const AliveCrab = CRAB_MODELS.alive;
  const SquashedCrab = CRAB_MODELS.squashed;

  useFrame((_, delta) => {
    const prev = stateRef.current;
    const next = step(prev, Math.min(delta, 0.05), directionRef.current);
    stateRef.current = next;
    const over = next.phase === "gameover";
    const t = next.phaseTime;
    const ended = prev.phase === "playing" && next.phase !== "playing";
    // 当たるたびにカニ汁の飛び方を引き直す
    if (ended && over) particlesRef.current = makeParticles(Math.random);

    // 蟹を動かしたのと同じフレームでカメラを合わせる（1 フレーム遅れも作らない）
    const pose = cameraPoseFor(next.crabX, CRAB.z);
    const camera = cameraRef.current;
    if (camera) {
      const [sx, sy] = over ? shakeOffset(t) : [0, 0];
      camera.position.set(pose.position[0] + sx, pose.position[1] + sy, pose.position[2]);
      camera.lookAt(pose.lookAt[0] + sx, pose.lookAt[1] + sy, pose.lookAt[2]);
    }

    const crab = crabRef.current;
    if (crab) {
      crab.position.x = next.crabX;
      const [spread, height] = over ? squashScale(t) : [1, 1];
      crab.scale.set(spread, height, spread);
      // 潰れきったら、積まれた亡骸の方に入れ替える
      crab.visible = !over || t < EFFECTS.squashSeconds;
    }
    if (newestCorpseRef.current) {
      newestCorpseRef.current.visible = !over || t >= EFFECTS.squashSeconds;
    }

    const group = particleGroupRef.current;
    if (group) {
      group.visible = over;
      if (over && next.hitAt) {
        group.position.set(next.hitAt.x, 0, next.hitAt.z);
        particlesRef.current.forEach((p, i) => {
          particleRefs.current[i]?.position.set(...particleAt(p, t * PARTICLE_TIME_SCALE));
        });
      }
    }

    carRefs.current.forEach((g, i) => {
      if (!g) return;
      const car = next.cars[i];
      // カメラに重なる車は隠す（カメラが車体の中に入らないように）
      g.visible = Boolean(car) && !blocksCamera(car, pose.position);
      if (!car) return;
      g.position.set(car.x, 0, car.z);
      g.rotation.y = car.direction === 1 ? 0 : Math.PI;
      kindRefs.current[i]?.forEach((k, j) => {
        if (k) k.visible = KINDS[j] === car.kind;
      });
    });

    // もうすぐ蟹の列に来る車の車輪の列だけ、蟹のまわりに短く出す
    const tracks = next.phase === "playing" ? wheelTracks(next.cars, next.crabX) : [];
    trackRefs.current.forEach((m, i) => {
      if (!m) return;
      const tr = tracks[i];
      m.visible = Boolean(tr);
      if (!tr) return;
      m.position.set(tr.x, 0.008, (tr.zFrom + tr.zTo) / 2);
      m.scale.set(1, Math.abs(tr.zTo - tr.zFrom), 1);
    });

    if (ended) onEnd(next);
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={cameraPoseFor(CROSSING.startX, CRAB.z).position}
        fov={CAMERA.fov}
        near={0.05}
      />
      <color attach="background" args={["#9ad3f5"]} />
      <fog attach="fog" args={["#9ad3f5", 30, 75]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />

      {/* 道路と歩道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD.length / 2 + 10]}>
        <planeGeometry args={[ROAD.width, ROAD.length]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {Array.from({ length: ROAD.lanes - 1 }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            -ROAD.width / 2 + (ROAD.width / ROAD.lanes) * (i + 1),
            0.005,
            -ROAD.length / 2 + 10,
          ]}
        >
          <planeGeometry args={[0.08, ROAD.length]} />
          <meshStandardMaterial color="#cbd5e1" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * (ROAD.width / 2 + 3), 0.01, -ROAD.length / 2 + 10]}
        >
          <planeGeometry args={[6, ROAD.length]} />
          <meshStandardMaterial color="#d6c49a" />
        </mesh>
      ))}

      {/* ゴールライン（向こう側の歩道） */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[CROSSING.goalX, 0.02, -ROAD.length / 2 + 10]}
      >
        <planeGeometry args={[0.25, ROAD.length]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>

      {/* もうすぐ来る車の車輪の列 */}
      {Array.from({ length: TRACK_POOL }, (_, i) => (
        <mesh
          key={`track${i}`}
          visible={false}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(m) => {
            trackRefs.current[i] = m;
          }}
        >
          <planeGeometry args={[0.3, 1]} />
          <meshBasicMaterial color="#ffe600" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}

      {/* 亡骸の山（前回までのプレイ分も含む。同じ場所には積み重なる） */}
      {stacked.map((c, i) => (
        <group
          key={i}
          position={[c.x, 0.015 + c.y, c.z]}
          rotation={[0, c.rotation, 0]}
          ref={i === stacked.length - 1 ? newestCorpseRef : undefined}
        >
          <SquashedCrab />
        </group>
      ))}

      {/* 蟹 */}
      <group ref={crabRef} position={[CROSSING.startX, 0, CRAB.z]}>
        <AliveCrab />
      </group>

      {/* カニ汁 */}
      <group ref={particleGroupRef} visible={false}>
        {PARTICLE_SIZES.map((size, i) => (
          <group
            key={i}
            ref={(g) => {
              particleRefs.current[i] = g;
            }}
          >
            <mesh>
              <sphereGeometry args={[size, 6, 6]} />
              <meshStandardMaterial color={i % 3 === 0 ? "#ffd166" : "#ff5a1f"} />
            </mesh>
          </group>
        ))}
      </group>

      {Array.from({ length: MAX_CARS }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            carRefs.current[i] = g;
          }}
        >
          {KINDS.map((kind, j) => (
            <group
              key={kind}
              visible={false}
              ref={(g) => {
                (kindRefs.current[i] ??= [])[j] = g;
              }}
            >
              <VehicleModel spec={VEHICLES[kind]} cab={kind === "truck"} />
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
