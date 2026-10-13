import { useEffect, useRef, type PointerEvent } from "react";
import type { Direction } from "./logic.ts";

/** 押されている指（pointerId）ごとの方向から、最後に押された指の方向を返す */
export function pointerDirection(active: ReadonlyMap<number, Direction>): Direction {
  let last: Direction = 0;
  for (const dir of active.values()) last = dir;
  return last;
}

/** 左右キーと、画面の左右半分タップを方向入力にまとめる */
export function useControls() {
  const directionRef = useRef<Direction>(0);
  const keys = useRef({ left: false, right: false });
  const pointers = useRef(new Map<number, Direction>());

  const update = () => {
    const { left, right } = keys.current;
    const keyDir: Direction = left === right ? 0 : left ? -1 : 1;
    directionRef.current = keyDir !== 0 ? keyDir : pointerDirection(pointers.current);
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

  const release = (e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    update();
  };

  return {
    directionRef,
    pointerHandlers: {
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // 再度押されたら最後に押した扱いにするため一度消す
        pointers.current.delete(e.pointerId);
        pointers.current.set(e.pointerId, e.clientX - rect.left < rect.width / 2 ? -1 : 1);
        update();
      },
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  };
}
