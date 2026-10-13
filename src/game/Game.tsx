import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const restart = useCallback(() => {
    if (stateRef.current.phase !== "gameover") return;
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
      if (e.key !== "Enter" && e.key !== " ") return;
      // ボタンにフォーカスがあると click も発火して 2 回リスタートするので既定動作を止める
      e.preventDefault();
      if (!e.repeat) restart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart]);

  return (
    <main className="game" {...pointerHandlers}>
      <Canvas>
        <GameScene
          stateRef={stateRef}
          directionRef={directionRef}
          corpses={corpses}
          onGameOver={handleGameOver}
        />
      </Canvas>
      <div className="hud">
        <h1>よこあるき</h1>
        <p>← → / 画面の左右タップで横歩き</p>
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
