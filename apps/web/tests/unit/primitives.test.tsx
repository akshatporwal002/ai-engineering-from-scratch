import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Button,
  Dialog,
  Dropdown,
  Field,
  MenuItem,
  Tabs,
} from "../../components/ui/primitives";

describe("UI primitives", () => {
  it("uses native disabled and busy states for buttons", () => {
    render(<><Button>Save fixture</Button><Button loading>Loading fixture</Button></>);
    expect(screen.getByRole("button", { name: "Save fixture" }).tagName).toBe("BUTTON");
    const loading = screen.getByRole("button", { name: "Loading fixture" });
    expect(loading.hasAttribute("disabled")).toBe(true);
    expect(loading.getAttribute("aria-busy")).toBe("true");
  });

  it("associates a field label, help, invalid state, and error message", () => {
    render(<Field label="Target role" help="Fixture help" error="Required"><input /></Field>);
    const input = screen.getByLabelText("Target role");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const descriptionIds = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(descriptionIds).toHaveLength(2);
    expect(descriptionIds.map((id) => document.getElementById(id)?.textContent)).toEqual(["Fixture help", "Required"]);
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });

  it("traps dialog focus, closes with Escape, and restores the trigger", () => {
    render(<Dialog><input aria-label="Fixture input" /></Dialog>);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Fixture dialog" });
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(document.activeElement).toBe(close);

    const confirm = screen.getByRole("button", { name: "Confirm fixture" });
    confirm.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(dialog.isConnected).toBe(false);
  });

  it("cycles dropdown items and restores focus on Escape", () => {
    render(
      <Dropdown label="Fixture account">
        <MenuItem>Profile</MenuItem>
        <MenuItem>Progress</MenuItem>
      </Dropdown>,
    );
    const trigger = screen.getByRole("button", { name: /fixture account/i });
    fireEvent.click(trigger);
    const profile = screen.getByRole("menuitem", { name: "Profile" });
    const progress = screen.getByRole("menuitem", { name: "Progress" });
    expect(document.activeElement).toBe(profile);
    fireEvent.keyDown(profile, { key: "ArrowDown" });
    expect(document.activeElement).toBe(progress);
    fireEvent.keyDown(progress, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("implements roving focus for tabs", () => {
    render(<Tabs label="Modes" tabs={[
      { id: "learn", label: "Learn", content: "Learn panel" },
      { id: "build", label: "Build", content: "Build panel" },
    ]} />);
    const learn = screen.getByRole("tab", { name: "Learn" });
    const build = screen.getByRole("tab", { name: "Build" });
    learn.focus();
    fireEvent.keyDown(learn, { key: "ArrowRight" });
    expect(document.activeElement).toBe(build);
    expect(build.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Build panel");
  });
});
