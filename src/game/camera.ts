/** カメラ位置のプリセット。蟹は原点付近、車は奥（-z）から手前へ来る */
export type CameraPreset = {
  id: string;
  label: string;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov: number;
};

export const CAMERA_PRESETS = [
  {
    // 車のフロント下端くらいの高さ。基本の画角
    id: "low",
    label: "蟹のちょっと上（標準）",
    position: [0, 0.55, 2.4],
    lookAt: [0, 0.3, -20],
    fov: 60,
  },
  {
    id: "mid",
    label: "やや高め",
    position: [0, 1.6, 4],
    lookAt: [0, 0, -15],
    fov: 60,
  },
  {
    id: "high",
    label: "斜め上から",
    position: [0, 6, 7],
    lookAt: [0, 0, -6],
    fov: 55,
  },
  {
    id: "side",
    label: "横から（道路を横向きに見る）",
    position: [9, 2.5, 3],
    lookAt: [0, 0, -4],
    fov: 55,
  },
] as const satisfies readonly CameraPreset[];

export type CameraPresetId = (typeof CAMERA_PRESETS)[number]["id"];

export const DEFAULT_CAMERA_ID: CameraPresetId = "low";

export function findCameraIndex(id: string | null | undefined): number {
  const index = CAMERA_PRESETS.findIndex((p) => p.id === id);
  return index === -1 ? 0 : index;
}

/** `?cam=high` のようなクエリからプリセットを選ぶ */
export function cameraIndexFromSearch(search: string): number {
  return findCameraIndex(new URLSearchParams(search).get("cam"));
}

export function nextCameraIndex(index: number): number {
  return (index + 1) % CAMERA_PRESETS.length;
}
