import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";

describe("HomePage", () => {
  it("renders the source-backed academy proposition and totals", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Learn freely. Build for real." })).toBeTruthy();
    expect(screen.getByLabelText("Academy summary").textContent).toContain("503");
    expect(screen.getByText(/Rohit Ghumare and contributors/i)).toBeTruthy();
  });
});
