import { useEffect, useRef, type PointerEvent } from "react";
import type { Direction } from "./logic.ts";

/** 左右キーと、画面の左右半分タップを方向入力にまとめる */
export function useControls() {
  const directionRef = useRef<Direction>(0);
  const keys = useRef({ left: false, right: false });
  const pointer = useRef<Direction>(0);

  const update = () => {
    const { left, right } = keys.current;
    const keyDir: Direction = left === right ? 0 : left ? -1 : 1;
    directionRef.current = keyDir !== 0 ? keyDir : pointer.current;
  };

  useEffect(() => {
    const onKey = (pressed: boolean) => (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = pressed;
      else if (e.key === "ArrowRight") keys.current.right = pressed;
      else return;
      e.preventDefault();
      update();
    };
    const down = onKey(true);
    const up = onKey(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const pointerHandlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      pointer.current = e.clientX - rect.left < rect.width / 2 ? -1 : 1;
      update();
    },
    onPointerUp: () => {
      pointer.current = 0;
      update();
    },
  };
  return {
    directionRef,
    pointerHandlers: {
      ...pointerHandlers,
      onPointerCancel: pointerHandlers.onPointerUp,
      onPointerLeave: pointerHandlers.onPointerUp,
    },
  };
}
