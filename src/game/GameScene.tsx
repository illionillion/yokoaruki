import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type { Group, Mesh, PerspectiveCamera as PerspectiveCameraImpl } from "three";
import { CAMERA_PRESETS } from "./camera.ts";
import { CAR, CRAB, ROAD } from "./constants.ts";
import { step, type Corpse, type Direction, type GameState } from "./logic.ts";

type Props = {
  stateRef: RefObject<GameState>;
  directionRef: RefObject<Direction>;
  cameraIndex: number;
  corpses: readonly Corpse[];
  onGameOver: (state: GameState) => void;
};

function CameraRig({ index }: { index: number }) {
  const ref = useRef<PerspectiveCameraImpl>(null);
  const preset = CAMERA_PRESETS[index];
  useEffect(() => {
    const [x, y, z] = preset.lookAt;
    ref.current?.lookAt(x, y, z);
  }, [preset]);
  return <PerspectiveCamera ref={ref} makeDefault position={preset.position} fov={preset.fov} />;
}

/** 仮置きの車: 車体の箱 + 円柱タイヤ 4 本 */
function CarModel() {
  const tireY = CAR.tireRadius;
  const offsets: [number, number][] = [
    [-CAR.halfTrack, -CAR.halfWheelbase],
    [CAR.halfTrack, -CAR.halfWheelbase],
    [-CAR.halfTrack, CAR.halfWheelbase],
    [CAR.halfTrack, CAR.halfWheelbase],
  ];
  return (
    <>
      <mesh position={[0, CAR.bodyBottom + CAR.bodyHeight / 2, 0]}>
        <boxGeometry args={[CAR.bodyWidth, CAR.bodyHeight, CAR.bodyLength]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {offsets.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, tireY, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[CAR.tireRadius, CAR.tireRadius, CAR.tireHalfWidth * 2, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </>
  );
}

export function GameScene({ stateRef, directionRef, cameraIndex, corpses, onGameOver }: Props) {
  const crabRef = useRef<Mesh>(null);
  const carRefs = useRef<(Group | null)[]>([]);

  useFrame((_, delta) => {
    const prev = stateRef.current;
    const next = step(prev, Math.min(delta, 0.05), directionRef.current);
    stateRef.current = next;

    if (crabRef.current) {
      crabRef.current.position.x = next.crabX;
      crabRef.current.visible = next.phase === "playing";
    }
    carRefs.current.forEach((group, i) => {
      if (!group) return;
      const car = next.cars[i];
      group.visible = Boolean(car);
      if (car) group.position.set(car.x, 0, car.z);
    });

    if (prev.phase === "playing" && next.phase === "gameover") onGameOver(next);
  });

  return (
    <>
      <CameraRig index={cameraIndex} />
      <color attach="background" args={["#9ad3f5"]} />
      <fog attach="fog" args={["#9ad3f5", 30, 75]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} />

      {/* 道路と歩道 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD.length / 2 + 10]}>
        <planeGeometry args={[ROAD.width, ROAD.length]} />
        <meshStandardMaterial color="#444" />
      </mesh>
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

      {/* 亡骸（前回までのプレイ分も含む） */}
      {corpses.map((c, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.015, c.z]}>
          <circleGeometry args={[CRAB.halfWidth * 1.6, 20]} />
          <meshStandardMaterial color="#8b1a1a" />
        </mesh>
      ))}

      {/* 蟹（仮置きの箱） */}
      <mesh ref={crabRef} position={[0, CRAB.height / 2, CRAB.z]}>
        <boxGeometry args={[CRAB.halfWidth * 2, CRAB.height, CRAB.halfDepth * 2]} />
        <meshStandardMaterial color="#e2483d" />
      </mesh>

      {Array.from({ length: CAR.maxCars }, (_, i) => (
        <group
          key={i}
          visible={false}
          ref={(g) => {
            carRefs.current[i] = g;
          }}
        >
          <CarModel />
        </group>
      ))}
    </>
  );
}
