import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY } from "./constants.ts";
import { Game } from "./Game.tsx";

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useFrame: () => undefined,
}));

vi.mock("./GameScene.tsx", () => ({
  GameScene: ({ corpses }: { corpses: readonly { x: number }[] }) => (
    <div data-testid="corpses">{corpses.length}</div>
  ),
}));

describe("亡骸のリセット", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { x: 1, z: 0 },
        { x: 2, z: -1 },
        { x: 3, z: 1 },
      ])
    );
  });

  it("確認して OK のときだけ消し、キャンセルではシーンにも保存にも残す", async () => {
    const user = userEvent.setup();
    render(<Game />);

    expect(screen.getByTestId("corpses")).toHaveTextContent("3");
    await user.click(screen.getByRole("button", { name: "亡骸を消す" }));
    expect(screen.getByRole("dialog", { name: "亡骸を消す確認" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(screen.queryByRole("dialog", { name: "亡骸を消す確認" })).not.toBeInTheDocument();
    expect(screen.getByTestId("corpses")).toHaveTextContent("3");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: "亡骸を消す" }));
    await user.click(screen.getByRole("button", { name: "OK" }));
    expect(screen.queryByRole("dialog", { name: "亡骸を消す確認" })).not.toBeInTheDocument();
    expect(screen.getByTestId("corpses")).toHaveTextContent("0");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
