import { describe, it, expect } from "vitest";
import { lookup, interpolate } from "./format";

describe("lookup", () => {
  it("resolves a nested dot-path", () => {
    expect(lookup("en", "common.appName")).toBe("Runway");
    expect(lookup("es", "common.signIn")).toBe("Iniciar sesión");
  });

  it("returns the path itself when a key is missing (visible, not silent)", () => {
    expect(lookup("en", "nope.missing")).toBe("nope.missing");
  });
});

describe("interpolate", () => {
  it("substitutes named placeholders", () => {
    expect(interpolate("Hello {name}", { name: "Max" })).toBe("Hello Max");
    expect(interpolate("{count} of {total}", { count: 3, total: 8 })).toBe("3 of 8");
  });

  it("leaves unmatched placeholders untouched", () => {
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });

  it("returns the template unchanged when no vars are given", () => {
    expect(interpolate("Plain text")).toBe("Plain text");
  });
});
