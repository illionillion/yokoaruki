import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { createInitialState, type Corpse, type GameState } from "./logic.ts";
import { GameScene } from "./GameScene.tsx";
import { Splat } from "./Splat.tsx";
import { addCorpse, corpsesAfterReset, loadCorpses } from "./storage.ts";
import { useControls } from "./useControls.ts";

export function Game() {
  // 初期状態は交通の空回しを含むので、毎レンダーで作り直さないよう 1 回だけ作る
  const [initialState] = useState(() => createInitialState());
  const stateRef = useRef<GameState>(initialState);
  const { directionRef, pointerHandlers } = useControls();
  const [phase, setPhase] = useState<GameState["phase"]>("playing");
  const [corpses, setCorpses] = useState<Corpse[]>(() => loadCorpses());
  const [confirmingReset, setConfirmingReset] = useState(false);

  const restart = useCallback(() => {
    if (stateRef.current.phase === "playing") return;
    // 車線の向き・間隔・速さを毎回引き直す
    stateRef.current = createInitialState();
    setPhase("playing");
  }, []);

  const handleEnd = useCallback((state: GameState) => {
    if (state.phase === "gameover" && state.hitAt) setCorpses(addCorpse(state.hitAt));
    setPhase(state.phase);
  }, []);

  const requestReset = useCallback(() => setConfirmingReset(true), []);
  const cancelReset = useCallback(() => setConfirmingReset(false), []);
  const confirmReset = useCallback(() => {
    setCorpses((current) => corpsesAfterReset(current, "ok"));
    setConfirmingReset(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      // 確認ダイアログを開いているときは、結果画面のリスタートに使わない
      if (confirmingReset) return;
      // ボタンにフォーカスがあると click も発火して 2 回リスタートするので既定動作を止める
      e.preventDefault();
      if (!e.repeat) restart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [restart, confirmingReset]);

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
        {phase === "playing" && (
          <p className="hud-actions">
            <button
              type="button"
              className="reset-corpses"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={requestReset}
            >
              亡骸を消す
            </button>
          </p>
        )}
      </div>
      {phase === "gameover" && <Splat seed={corpses.length} />}
      {phase !== "playing" && (
        <div
          className={`result ${phase}`}
          role="dialog"
          aria-label={phase === "cleared" ? "クリア" : "ゲームオーバー"}
        >
          <p className="result-title">{phase === "cleared" ? "わたりきった！" : "ぺしゃんこ"}</p>
          <p>{phase === "cleared" ? "道路の向こう側に着いた" : `亡骸 ${corpses.length} 体`}</p>
          <div className="result-actions">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={restart}>
              もう一回（Enter）
            </button>
            <button
              type="button"
              className="reset-corpses"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={requestReset}
            >
              亡骸を消す
            </button>
          </div>
        </div>
      )}
      {confirmingReset && (
        <div
          className="confirm-layer"
          role="presentation"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="confirm-box" role="dialog" aria-modal="true" aria-label="亡骸を消す確認">
            <p>残っている亡骸をすべて消しますか？</p>
            <div className="confirm-actions">
              <button type="button" onClick={confirmReset}>
                OK
              </button>
              <button type="button" onClick={cancelReset}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
