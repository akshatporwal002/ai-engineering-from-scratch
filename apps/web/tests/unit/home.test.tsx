import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../../app/page";

describe("HomePage", () => {
  it("identifies the local-only migration boundary", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: "Codeology" })).toBeTruthy();
    expect(screen.getByText(/legacy academy remains/i)).toBeTruthy();
  });
});
