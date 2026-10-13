import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App.tsx";

describe("App", () => {
  it("タイトルを表示する", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "よこあるき" })).toBeInTheDocument();
  });
});
