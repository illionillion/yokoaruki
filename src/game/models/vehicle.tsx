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
      {offsets.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, spec.tireRadius, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[spec.tireRadius, spec.tireRadius, spec.tireHalfWidth * 2, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </>
  );
}
