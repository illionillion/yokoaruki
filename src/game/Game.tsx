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
  const [corpses, setCorpses] = useState<Corpse[]>(() => loadCorpses());

  const restart = useCallback(() => {
    if (stateRef.current.phase === "playing") return;
    stateRef.current = createInitialState();
    setPhase("playing");
  }, []);

  const handleEnd = useCallback((state: GameState) => {
    if (state.phase === "gameover" && state.hitAt) setCorpses(addCorpse(state.hitAt));
    setPhase(state.phase);
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
          onEnd={handleEnd}
        />
      </Canvas>
      <div className="hud">
        <h1>よこあるき</h1>
        <p>← → / 画面の左右タップで横歩き ・ 向こう側の歩道（黄色い線）まで渡ればクリア</p>
      </div>
      {phase !== "playing" && (
        <div
          className={`result ${phase}`}
          role="dialog"
          aria-label={phase === "cleared" ? "クリア" : "ゲームオーバー"}
        >
          <p className="result-title">{phase === "cleared" ? "わたりきった！" : "ぺしゃんこ"}</p>
          <p>{phase === "cleared" ? "道路の向こう側に着いた" : `亡骸 ${corpses.length} 体`}</p>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={restart}>
            もう一回（Enter）
          </button>
        </div>
      )}
    </main>
  );
}
