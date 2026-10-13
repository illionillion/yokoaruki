import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_PRESETS, cameraIndexFromSearch, nextCameraIndex } from "./camera.ts";
import { createInitialState, type Corpse, type GameState } from "./logic.ts";
import { GameScene } from "./GameScene.tsx";
import { addCorpse, loadCorpses } from "./storage.ts";
import { useControls } from "./useControls.ts";

export function Game() {
  const stateRef = useRef<GameState>(createInitialState());
  const { directionRef, pointerHandlers } = useControls();
  const [phase, setPhase] = useState<GameState["phase"]>("playing");
  const [score, setScore] = useState(0);
  const [corpses, setCorpses] = useState<Corpse[]>(() => loadCorpses());
  const [cameraIndex, setCameraIndex] = useState(() =>
    cameraIndexFromSearch(window.location.search)
  );

  const restart = useCallback(() => {
    stateRef.current = createInitialState();
    setPhase("playing");
  }, []);

  const handleGameOver = useCallback((state: GameState) => {
    if (state.hitAt) setCorpses(addCorpse(state.hitAt));
    setScore(state.elapsed);
    setPhase("gameover");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 開発用: C でカメラ切り替え
      if (e.key === "c" || e.key === "C") setCameraIndex(nextCameraIndex);
      if (stateRef.current.phase === "gameover" && (e.key === "Enter" || e.key === " ")) restart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  const preset = CAMERA_PRESETS[cameraIndex];

  return (
    <main className="game" {...pointerHandlers}>
      <Canvas>
        <GameScene
          stateRef={stateRef}
          directionRef={directionRef}
          cameraIndex={cameraIndex}
          corpses={corpses}
          onGameOver={handleGameOver}
        />
      </Canvas>
      <div className="hud">
        <h1>よこあるき</h1>
        <p>← → / 画面の左右タップで横歩き ・ カメラ: {preset.id}（C で切替）</p>
      </div>
      {phase === "gameover" && (
        <div className="gameover" role="dialog" aria-label="ゲームオーバー">
          <p className="gameover-title">ぺしゃんこ</p>
          <p>
            {score.toFixed(1)} 秒 生き延びた ・ 亡骸 {corpses.length} 体
          </p>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={restart}>
            もう一回（Enter）
          </button>
        </div>
      )}
    </main>
  );
}
