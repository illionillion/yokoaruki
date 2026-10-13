import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App.tsx";

// jsdom には WebGL が無いので Canvas は差し替える
vi.mock("@react-three/fiber", () => ({
  Canvas: () => null,
  useFrame: () => undefined,
  useThree: () => undefined,
}));

describe("App", () => {
  it("タイトルを表示する", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "よこあるき" })).toBeInTheDocument();
  });
});
