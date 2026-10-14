import type { VehicleSpec } from "../constants.ts";
import { chassisBeams } from "./layout.ts";

/** 仮置きの車: 車体の箱 + 円柱タイヤ 4 本（トラックは運転席付き）。前は +z */
export function VehicleModel({ spec, cab = false }: { spec: VehicleSpec; cab?: boolean }) {
  const offsets: [number, number][] = [
    [-spec.halfTrack, -spec.halfWheelbase],
    [spec.halfTrack, -spec.halfWheelbase],
    [-spec.halfTrack, spec.halfWheelbase],
    [spec.halfTrack, spec.halfWheelbase],
  ];
  const cabLength = cab ? 2.2 : 0;
  return (
    <>
      <mesh position={[0, spec.bodyBottom + spec.bodyHeight / 2, -cabLength / 2]}>
        <boxGeometry args={[spec.bodyWidth, spec.bodyHeight, spec.bodyLength - cabLength]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
      {cab && (
        <mesh
          position={[
            0,
            spec.bodyBottom + spec.bodyHeight * 0.35,
            spec.bodyLength / 2 - cabLength / 2,
          ]}
        >
          <boxGeometry args={[spec.bodyWidth * 0.95, spec.bodyHeight * 0.7, cabLength]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
      )}
      {chassisBeams(spec).map((b, i) => (
        <mesh key={`beam${i}`} position={b.center}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      ))}
      {/* 前照灯（前 = +z）と尾灯。向きが一目で分かるように光らせる */}
      {[-1, 1].map((side) => (
        <group key={`light${side}`}>
          <mesh
            position={[
              side * spec.bodyWidth * 0.32,
              spec.bodyBottom + 0.18,
              spec.bodyLength / 2 + 0.02,
            ]}
          >
            <boxGeometry args={[spec.bodyWidth * 0.22, 0.14, 0.04]} />
            <meshStandardMaterial color="#fff6c2" emissive="#ffe066" emissiveIntensity={2} />
          </mesh>
          <mesh
            position={[
              side * spec.bodyWidth * 0.36,
              spec.bodyBottom + 0.18,
              -spec.bodyLength / 2 - 0.02,
            ]}
          >
            <boxGeometry args={[spec.bodyWidth * 0.18, 0.14, 0.04]} />
            <meshStandardMaterial color="#ff3030" emissive="#ff0000" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
      {/* タイヤの接地影。地面のどこにタイヤがあるかを見やすくする */}
      {offsets.map(([x, z]) => (
        <mesh
          key={`shadow${x},${z}`}
          position={[x, 0.012, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1, 1.6, 1]}
        >
          <circleGeometry args={[spec.tireHalfWidth * 2.4, 16]} />
          <meshBasicMaterial color="#000" transparent opacity={0.75} />
        </mesh>
      ))}
      {offsets.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, spec.tireRadius, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[spec.tireRadius, spec.tireRadius, spec.tireHalfWidth * 2, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </>
  );
}
