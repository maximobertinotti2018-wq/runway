import { describe, it, expect } from "vitest";
import { computeRunway } from "./runway";

describe("computeRunway", () => {
  it("reports indefinite runway (null months, good) when there is no burn", () => {
    expect(computeRunway(1000, 0)).toEqual({ months: null, status: "good" });
    expect(computeRunway(1000, -50)).toEqual({ months: null, status: "good" }); // net positive
  });

  it("reports 0 months / critical when there's burn but no cash", () => {
    expect(computeRunway(0, 500)).toEqual({ months: 0, status: "critical" });
    expect(computeRunway(-100, 500)).toEqual({ months: 0, status: "critical" });
  });

  it("computes months as cash / burn", () => {
    const { months } = computeRunway(6000, 1000);
    expect(months).toBe(6);
  });

  it("is good at exactly 6 months, warning just under it", () => {
    expect(computeRunway(6000, 1000).status).toBe("good");
    expect(computeRunway(5999, 1000).status).toBe("warning");
  });

  it("is warning at exactly 3 months, critical just under it", () => {
    expect(computeRunway(3000, 1000).status).toBe("warning");
    expect(computeRunway(2999, 1000).status).toBe("critical");
  });
});
